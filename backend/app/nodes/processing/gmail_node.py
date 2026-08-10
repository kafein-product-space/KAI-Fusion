"""
Gmail Node
==========

Reads and writes mail in a Gmail account inside a workflow.

Gmail hands over a message as a tree of MIME parts with the body encoded, which
is faithful to what was sent but of little use to the node downstream. What is
returned here is a flat record: who sent it, what it says, when it arrived. The
raw shape is available for the cases that need it.

Addresses, subjects and search terms are passed to the API as parameters rather
than spliced into a query string, so a value coming from a form or an upstream
node cannot change what the operation does.
"""

from __future__ import annotations

import re
import json
import html
import time
import base64
import logging
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Any, Dict, List, Optional, Tuple

import requests

from ..base import (
    ProcessorNode,
    NodeInput,
    NodeOutput,
    NodeType,
    NodeProperty,
    NodePropertyType,
    NodePosition,
)

logger = logging.getLogger(__name__)

API_ROOT = "https://gmail.googleapis.com/gmail/v1/users/me"

EMAIL_PATTERN = re.compile(r"^[^@\s,<>]+@[^@\s,<>]+\.[^@\s,<>]+$")

# Permanently deleting a message is deliberately not offered. Gmail puts it
# behind full account access rather than the narrower modify scope, and asking
# every account for the run of the mailbox to serve one operation is out of
# proportion. Move to Trash reaches the same end: Gmail empties the bin after
# thirty days, and until then the message can be brought back.

# Operations that change the mailbox. Refused while read-only mode is on.
WRITE_OPERATIONS = {
    "send", "reply", "trash", "untrash", "mark_read", "mark_unread",
    "add_label", "remove_label", "create_draft", "delete_draft", "send_draft",
    "create_label", "delete_label",
}

# Labels Gmail maintains itself. They cannot be created or deleted.
SYSTEM_LABELS = {
    "INBOX", "SENT", "DRAFT", "SPAM", "TRASH", "UNREAD", "STARRED",
    "IMPORTANT", "CHAT", "CATEGORY_PERSONAL", "CATEGORY_SOCIAL",
    "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS",
}


class GmailNode(ProcessorNode):
    """Runs a Gmail operation and returns what it produced."""

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "GmailNode",
            "display_name": "Gmail",
            "description": (
                "Read, send and organise mail in a Gmail account. Covers messages, drafts, "
                "labels and threads."
            ),
            "category": "Communication",
            "node_type": NodeType.PROCESSOR,
            "icon": {
                "name": "gmail",
                "path": "icons/gmail.svg",
                "alt": "Gmail",
            },
            "colors": ["red-500", "orange-500"],
            "inputs": [
                NodeInput(
                    name="input",
                    type="any",
                    description=(
                        "Message details to send. Used when the fields below are left empty."
                    ),
                    required=False,
                    is_connection=True,
                    direction=NodePosition.LEFT,
                ),
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    displayName="Output",
                    type="dict",
                    description=(
                        "Result of the operation: the messages it returned, how many were "
                        "affected and how long it took."
                    ),
                    is_connection=True,
                    direction=NodePosition.RIGHT,
                ),
                NodeOutput(
                    name="success",
                    type="boolean",
                    description="Whether the operation completed without an error.",
                ),
                NodeOutput(
                    name="error",
                    type="string",
                    description="Error message when the operation failed.",
                ),
            ],
            "properties": [
                # ----------------------------------------------------------
                # Basic
                # ----------------------------------------------------------
                NodeProperty(
                    name="credential_id",
                    displayName="Credential",
                    type=NodePropertyType.CREDENTIAL_SELECT,
                    description="Gmail account to work in.",
                    placeholder="Select Credential",
                    required=True,
                    serviceType="gmail",
                    tabName="basic",
                ),
                NodeProperty(
                    name="operation",
                    displayName="Operation",
                    type=NodePropertyType.SELECT,
                    description="What to do in the mailbox.",
                    required=True,
                    default="get_many",
                    options=[
                        {"label": "Get Many - read messages", "value": "get_many"},

                        {"label": "Send - send a message", "value": "send"},
                        {"label": "Reply - reply to a message", "value": "reply"},

                        {"label": "Get Many Drafts", "value": "get_many_drafts"},
                        {"label": "Create Draft", "value": "create_draft"},
                        {"label": "Send Draft", "value": "send_draft"},
                        {"label": "Delete Draft", "value": "delete_draft"},

                        {"label": "Get Many Labels", "value": "get_many_labels"},
                        {"label": "Create Label", "value": "create_label"},
                        {"label": "Delete Label", "value": "delete_label"},
                        {"label": "Add Label", "value": "add_label"},
                        {"label": "Remove Label", "value": "remove_label"},

                        {"label": "Mark as Read", "value": "mark_read"},
                        {"label": "Mark as Unread", "value": "mark_unread"},

                        {"label": "Move to Trash", "value": "trash"},
                        {"label": "Restore from Trash", "value": "untrash"},
                    ],
                    tabName="basic",
                ),

                # --- Composing --------------------------------------------
                NodeProperty(
                    name="message_source",
                    displayName="Which Message",
                    type=NodePropertyType.SELECT,
                    description="How the message to act on is chosen.",
                    required=True,
                    default="input",
                    options=[
                        {"label": "First from the previous node", "value": "input"},
                        {"label": "Newest match for a search", "value": "search"},
                        {"label": "By identifier", "value": "id"},
                    ],
                    hint=(
                        "A Gmail node upstream passes its messages along, so the first of "
                        "them is used unless another way is chosen here."
                    ),
                    displayOptions={"show": {"operation": "reply"}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="message_source",
                    displayName="Which Messages",
                    type=NodePropertyType.SELECT,
                    description="Which of the messages that came in are acted on.",
                    required=True,
                    default="all",
                    options=[
                        {"label": "All from the previous node", "value": "all"},
                        {"label": "First from the previous node", "value": "input"},
                        {"label": "Newest match for a search", "value": "search"},
                        {"label": "By identifier", "value": "id"},
                    ],
                    hint=(
                        "Acting on one message is something a person would do in Gmail "
                        "itself; a workflow earns its place by doing the same to everything "
                        "a search turned up."
                    ),
                    displayOptions={
                        "show": {
                            "operation": [
                                "mark_read", "mark_unread", "add_label", "remove_label",
                                "trash",
                            ]
                        }
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="message_search",
                    displayName="Find the Message",
                    type=NodePropertyType.TEXT,
                    description=(
                        "Gmail search terms. The newest message that matches is the one acted "
                        "on, so the search should be narrow enough to mean one message."
                    ),
                    placeholder="Gmail search terms",
                    required=False,
                    default="",
                    hint=(
                        "from: subject: has:attachment is:unread newer_than:2d label:invoices"
                    ),
                    displayOptions={
                        "show": {
                            "operation": [
                                "reply", "mark_read", "mark_unread",
                                "add_label", "remove_label", "trash",
                            ],
                            "message_source": "search",
                        }
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="message_id",
                    displayName="Message Identifier",
                    type=NodePropertyType.TEXT,
                    description=(
                        "Identifier Gmail gave the message. It appears in the output of a "
                        "read, and is what a template would carry over."
                    ),
                    placeholder="Message identifier",
                    required=False,
                    default="",
                    displayOptions={
                        "show": {
                            "operation": [
                                "reply", "mark_read", "mark_unread",
                                "add_label", "remove_label", "trash",
                            ],
                            "message_source": "id",
                        }
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="draft_source",
                    displayName="Which Draft",
                    type=NodePropertyType.SELECT,
                    description="How the draft to act on is chosen.",
                    required=True,
                    default="input",
                    options=[
                        {"label": "From the previous node", "value": "input"},
                        {"label": "Newest match for a subject", "value": "subject"},
                        {"label": "By identifier", "value": "id"},
                    ],
                    hint=(
                        "A draft is usually written by one workflow and sent by another, so "
                        "the subject is often the only thing the sending end knows about it."
                    ),
                    displayOptions={
                        "show": {"operation": ["send_draft", "delete_draft"]}
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="draft_subject",
                    displayName="Find the Draft",
                    type=NodePropertyType.TEXT,
                    description=(
                        "Subject to look for. The newest draft whose subject holds this text "
                        "is the one acted on, so it should be specific enough to mean one "
                        "draft."
                    ),
                    placeholder="Part of the subject line",
                    required=False,
                    default="",
                    displayOptions={
                        "show": {
                            "operation": ["send_draft", "delete_draft"],
                            "draft_source": "subject",
                        }
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="draft_id",
                    displayName="Draft Identifier",
                    type=NodePropertyType.TEXT,
                    description=(
                        "Identifier Gmail gave the draft. It appears in the output of a Get "
                        "Many Drafts."
                    ),
                    placeholder="Draft identifier",
                    required=False,
                    default="",
                    displayOptions={
                        "show": {
                            "operation": ["send_draft", "delete_draft"],
                            "draft_source": "id",
                        }
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="untrash_search",
                    displayName="Find in the Bin",
                    type=NodePropertyType.TEXT,
                    description=(
                        "What to look for among the messages in the bin. Everything that "
                        "matches is restored."
                    ),
                    placeholder="Gmail search terms",
                    required=True,
                    default="",
                    hint=(
                        "from: subject: newer_than:7d — the search runs over the bin alone, "
                        "so in:trash need not be written."
                    ),
                    displayOptions={"show": {"operation": "untrash"}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="untrash_limit",
                    displayName="Limit",
                    type=NodePropertyType.NUMBER,
                    description="Largest number of messages to restore in one run.",
                    required=False,
                    default=25,
                    min=1,
                    max=200,
                    displayOptions={"show": {"operation": "untrash"}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="to",
                    displayName="To",
                    type=NodePropertyType.TEXT,
                    description="Who the message goes to. Separate several with commas.",
                    placeholder="Recipient address",
                    required=False,
                    default="",
                    displayOptions={"show": {"operation": ["send", "create_draft"]}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="subject",
                    displayName="Subject",
                    type=NodePropertyType.TEXT,
                    description="Subject line.",
                    placeholder="",
                    required=False,
                    default="",
                    displayOptions={"show": {"operation": ["send", "create_draft"]}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="body",
                    displayName="Message Body",
                    type=NodePropertyType.TEXT_AREA,
                    description="What the message says.",
                    placeholder="",
                    required=False,
                    default="",
                    rows=8,
                    displayOptions={
                        "show": {"operation": ["send", "reply", "create_draft"]}
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="email_type",
                    displayName="Message Format",
                    type=NodePropertyType.SELECT,
                    description=(
                        "How the message is written. HTML allows formatting; plain text is "
                        "read the same way everywhere."
                    ),
                    required=False,
                    default="text",
                    options=[
                        {"label": "Plain text", "value": "text"},
                        {"label": "HTML", "value": "html"},
                    ],
                    displayOptions={
                        "show": {"operation": ["send", "reply", "create_draft"]}
                    },
                    tabName="basic",
                ),

                # --- Picking a message ------------------------------------
                NodeProperty(
                    name="label_ids",
                    displayName="Labels",
                    type=NodePropertyType.DYNAMIC_SELECT,
                    description="Labels to add or remove.",
                    placeholder="Select labels",
                    required=False,
                    default="",
                    multiple=True,
                    optionsMethod="load_labels",
                    optionsDependsOn=["credential_id"],
                    displayOptions={
                        "show": {"operation": ["add_label", "remove_label"]}
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="label_name",
                    displayName="Label Name",
                    type=NodePropertyType.TEXT,
                    description="Name of the label to create.",
                    placeholder="Name of the new label",
                    required=False,
                    default="",
                    displayOptions={"show": {"operation": "create_label"}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="label_to_delete",
                    displayName="Label",
                    type=NodePropertyType.DYNAMIC_SELECT,
                    description="Label to delete. Labels Gmail maintains cannot be removed.",
                    placeholder="Select a label",
                    required=False,
                    default="",
                    optionsMethod="load_labels",
                    optionsDependsOn=["credential_id"],
                    displayOptions={"show": {"operation": "delete_label"}},
                    tabName="basic",
                ),

                # --- Searching --------------------------------------------
                NodeProperty(
                    name="search_query",
                    displayName="Search",
                    type=NodePropertyType.TEXT,
                    description=(
                        "Gmail search terms, the same ones the mailbox itself accepts. Leave "
                        "empty to read everything."
                    ),
                    placeholder="Gmail search terms",
                    required=False,
                    default="",
                    hint=(
                        "from: to: subject: has:attachment is:unread is:starred "
                        "after:2026/01/01 before:2026/12/31 label:invoices"
                    ),
                    displayOptions={"show": {"operation": "get_many"}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="filter_labels",
                    displayName="In Labels",
                    type=NodePropertyType.DYNAMIC_SELECT,
                    description="Only read messages carrying these labels.",
                    placeholder="Any label",
                    required=False,
                    default="",
                    multiple=True,
                    optionsMethod="load_labels",
                    optionsDependsOn=["credential_id"],
                    displayOptions={"show": {"operation": "get_many"}},
                    tabName="basic",
                ),
                NodeProperty(
                    name="return_all",
                    displayName="Return All",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Read every message that matches. A busy mailbox holds thousands, and "
                        "each one is a separate request to Gmail, so this is worth leaving off "
                        "unless the search is narrow."
                    ),
                    required=False,
                    default=False,
                    displayOptions={
                        "show": {"operation": ["get_many", "get_many_drafts"]}
                    },
                    tabName="basic",
                ),
                NodeProperty(
                    name="limit",
                    displayName="Limit",
                    type=NodePropertyType.NUMBER,
                    description="Largest number of messages to return.",
                    required=False,
                    default=25,
                    min=1,
                    max=500,
                    displayOptions={
                        "show": {
                            "operation": ["get_many", "get_many_drafts"],
                            "return_all": False,
                        }
                    },
                    tabName="basic",
                ),

                # ----------------------------------------------------------
                # Advanced
                # ----------------------------------------------------------
                NodeProperty(
                    name="read_only",
                    displayName="Read Only",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Refuse any operation that would change the mailbox. Useful when the "
                        "node runs on an account you cannot afford to disturb."
                    ),
                    required=False,
                    default=False,
                    tabName="advanced",
                ),
                NodeProperty(
                    name="simplify",
                    displayName="Simplify Output",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Return a flat record for each message rather than the whole MIME "
                        "tree. Turn this off to see everything Gmail sent."
                    ),
                    required=False,
                    default=True,
                    tabName="advanced",
                ),
                NodeProperty(
                    name="include_body",
                    displayName="Include the Body",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Read the text of each message. Turning this off leaves only the "
                        "headers and the snippet, which is quicker over many messages."
                    ),
                    required=False,
                    default=True,
                    displayOptions={"show": {"operation": "get_many"}},
                    tabName="advanced",
                ),
                NodeProperty(
                    name="cc",
                    displayName="Cc",
                    type=NodePropertyType.TEXT,
                    description="Who else receives a copy.",
                    placeholder="",
                    required=False,
                    default="",
                    displayOptions={
                        "show": {"operation": ["send", "reply", "create_draft"]}
                    },
                    tabName="advanced",
                ),
                NodeProperty(
                    name="bcc",
                    displayName="Bcc",
                    type=NodePropertyType.TEXT,
                    description="Who receives a copy without the others seeing.",
                    placeholder="",
                    required=False,
                    default="",
                    displayOptions={
                        "show": {"operation": ["send", "reply", "create_draft"]}
                    },
                    tabName="advanced",
                ),
                NodeProperty(
                    name="reply_to",
                    displayName="Reply To",
                    type=NodePropertyType.TEXT,
                    description="Where replies should go, if not the sending account.",
                    placeholder="",
                    required=False,
                    default="",
                    displayOptions={
                        "show": {"operation": ["send", "reply", "create_draft"]}
                    },
                    tabName="advanced",
                ),
                NodeProperty(
                    name="include_spam_trash",
                    displayName="Include Spam and Trash",
                    type=NodePropertyType.CHECKBOX,
                    description="Read messages Gmail has set aside as well.",
                    required=False,
                    default=False,
                    displayOptions={"show": {"operation": "get_many"}},
                    tabName="advanced",
                ),
                NodeProperty(
                    name="request_timeout",
                    displayName="Request Timeout (seconds)",
                    type=NodePropertyType.NUMBER,
                    description="How long to wait for Gmail to answer.",
                    required=False,
                    default=30,
                    min=5,
                    max=180,
                    tabName="advanced",
                ),
                NodeProperty(
                    name="continue_on_error",
                    displayName="Continue on Error",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Carry the error in the output instead of stopping the workflow."
                    ),
                    required=False,
                    default=False,
                    tabName="advanced",
                ),
            ],
        }

    # ------------------------------------------------------------------
    # Talking to Gmail
    # ------------------------------------------------------------------

    def _access_token(self, credential_id: Optional[str]) -> str:
        """Read the credential and turn it into a usable access token."""
        if not credential_id:
            raise ValueError("A Gmail credential is required.")

        credential = self.get_credential(credential_id)
        if not credential or not credential.get("secret"):
            raise ValueError(
                "The selected credential could not be read. It may have been created with a "
                "different encryption key; try recreating it."
            )

        from app.core.google_oauth import access_token_for, GoogleOAuthError

        try:
            return access_token_for(credential["secret"])
        except GoogleOAuthError as exc:
            raise ValueError(str(exc)) from exc

    def _call(
        self,
        token: str,
        method: str,
        path: str,
        timeout: int = 30,
        params: Optional[Dict[str, Any]] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Make one request to Gmail.

        A refusal is turned into a message worth reading, since what Gmail
        returns is a nested structure the person configuring a node has no
        reason to be shown.
        """
        response = requests.request(
            method,
            f"{API_ROOT}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            params=params,
            json=payload,
            timeout=timeout,
        )

        if response.status_code == 204 or not response.content:
            return {}

        try:
            body = response.json()
        except ValueError:
            body = {}

        if response.status_code >= 400:
            error = body.get("error", {})
            message = error.get("message") or f"Gmail returned status {response.status_code}"

            if response.status_code == 401:
                message = (
                    "Gmail did not accept the credential. Connect the account again from "
                    "the credential card."
                )
            elif response.status_code == 403:
                message = (
                    f"Gmail refused the request: {message}. The account may not have granted "
                    "everything this operation needs."
                )
            elif response.status_code == 404:
                message = f"Gmail found nothing at that address: {message}"

            raise ValueError(message)

        return body

    # ------------------------------------------------------------------
    # Option loaders
    # ------------------------------------------------------------------

    def load_labels(self, values: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Fill a label dropdown.

        Gmail keeps its own labels alongside the ones the account owner made,
        and refers to both by an identifier rather than the name shown in the
        mailbox. The name is what goes on the list; the identifier is what is
        stored.
        """
        token = self._access_token(values.get("credential_id"))
        body = self._call(token, "GET", "/labels")

        labels = body.get("labels", [])
        own, system = [], []

        for label in labels:
            entry = {"label": label.get("name", ""), "value": label.get("id", "")}
            if label.get("type") == "system":
                system.append(entry)
            else:
                own.append(entry)

        # The account owner's own labels come first, since those are what a
        # workflow usually reaches for.
        own.sort(key=lambda entry: entry["label"].lower())
        system.sort(key=lambda entry: entry["label"].lower())
        return own + system

    # ------------------------------------------------------------------
    # Reading a message
    # ------------------------------------------------------------------

    @staticmethod
    def _header(payload: Dict[str, Any], name: str) -> str:
        """Read one header out of a message payload."""
        for header in payload.get("headers", []):
            if header.get("name", "").lower() == name.lower():
                return header.get("value", "")
        return ""

    @staticmethod
    def _text_from_html(markup: str) -> str:
        """
        Read what a person would see out of an HTML message.

        A marketing message often carries no plain part at all, and its HTML runs
        to thousands of lines of layout, styling and tracking. Handing that on as
        the body buries the few sentences that matter and, where an agent is
        reading, fills its context with markup.

        Scripts, styles and comments are dropped, tags are removed, and what is
        left is collapsed into readable lines.
        """
        if not markup:
            return ""

        text = re.sub(
            r"<(script|style|head)[^>]*>.*?</\1>", " ", markup,
            flags=re.IGNORECASE | re.DOTALL,
        )
        text = re.sub(r"<!--.*?-->", " ", text, flags=re.DOTALL)

        # A break or a block ending becomes a line, so sentences do not run
        # together once the tags are gone.
        text = re.sub(r"<br[^>]*>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(
            r"</(p|div|tr|li|h[1-6]|table)>", "\n", text, flags=re.IGNORECASE
        )
        text = re.sub(r"<[^>]+>", " ", text)

        # Entities are decoded rather than stripped, or a letter written as
        # &#351; would be lost along with the markup.
        text = html.unescape(text)

        # What is left of the invisible padding a marketing message pads its
        # preview with: non-breaking spaces, zero-width joiners, soft hyphens.
        text = text.replace("\u200c", "").replace("\u00ad", "")

        lines = [line.strip() for line in text.split("\n")]
        lines = [re.sub(r"[ \t\xa0]+", " ", line).strip() for line in lines]
        lines = [line for line in lines if line]

        return "\n".join(lines).strip()

    @classmethod
    def _body_text(cls, payload: Dict[str, Any]) -> Tuple[str, str]:
        """
        Pull the text and the HTML out of a message.

        A message is a tree: a plain part and an HTML part side by side, each
        possibly nested under another, with attachments among them. Both are
        collected so the node downstream can take whichever suits it.
        """
        plain, html = "", ""

        def decode(part: Dict[str, Any]) -> str:
            data = part.get("body", {}).get("data", "")
            if not data:
                return ""
            try:
                return base64.urlsafe_b64decode(data + "===").decode("utf-8", "replace")
            except Exception:
                return ""

        def walk(part: Dict[str, Any], depth: int = 0) -> None:
            nonlocal plain, html
            if depth > 10:
                return

            mime = part.get("mimeType", "")
            if mime == "text/plain" and not plain:
                plain = decode(part)
            elif mime == "text/html" and not html:
                html = decode(part)

            for child in part.get("parts", []):
                walk(child, depth + 1)

        walk(payload)
        return plain, html

    @classmethod
    def _attachments(cls, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """List what came attached, without fetching any of it."""
        found: List[Dict[str, Any]] = []

        def walk(part: Dict[str, Any], depth: int = 0) -> None:
            if depth > 10:
                return
            filename = part.get("filename", "")
            if filename:
                found.append({
                    "filename": filename,
                    "mime_type": part.get("mimeType", ""),
                    "size": part.get("body", {}).get("size", 0),
                    "attachment_id": part.get("body", {}).get("attachmentId", ""),
                })
            for child in part.get("parts", []):
                walk(child, depth + 1)

        walk(payload)
        return found

    @classmethod
    def _simplify(cls, message: Dict[str, Any], include_body: bool) -> Dict[str, Any]:
        """
        Flatten a message into the record a workflow can work with.

        What Gmail returns is faithful to the message as it was sent, which
        makes it a poor thing to hand to the next node: the body is encoded and
        buried, and the headers are a list to be searched. This is the same
        message with the parts a workflow asks for lifted to the top.
        """
        payload = message.get("payload", {})
        record: Dict[str, Any] = {
            "id": message.get("id", ""),
            "thread_id": message.get("threadId", ""),
            "from": cls._header(payload, "From"),
            "to": cls._header(payload, "To"),
            "cc": cls._header(payload, "Cc"),
            "subject": cls._header(payload, "Subject"),
            "date": cls._header(payload, "Date"),
            "snippet": message.get("snippet", ""),
            "labels": message.get("labelIds", []),
            "is_unread": "UNREAD" in message.get("labelIds", []),
        }

        # The timestamp Gmail keeps is milliseconds since the epoch, which is
        # harder to read than the date it carries.
        internal = message.get("internalDate")
        if internal:
            try:
                record["received_at"] = datetime.fromtimestamp(
                    int(internal) / 1000, tz=timezone.utc
                ).isoformat()
            except (TypeError, ValueError):
                pass

        if include_body:
            plain, html = cls._body_text(payload)
            # The plain part is preferred; where a message carries only HTML,
            # the readable text is pulled out of it rather than passed on raw.
            record["body"] = plain or cls._text_from_html(html)
            if html:
                record["body_html"] = html

        attachments = cls._attachments(payload)
        if attachments:
            record["attachments"] = attachments

        return record

    # ------------------------------------------------------------------
    # Writing a message
    # ------------------------------------------------------------------

    @staticmethod
    def _bare_address(header: str) -> str:
        """
        Pull the address out of a From or Reply-To header.

        A header carries a display name as often as not, and one holding a
        comma or a non-ASCII character cannot be handed back to Gmail as it
        stands. The address inside the angle brackets is what a reply is
        addressed to.
        """
        header = (header or "").strip()
        if not header:
            return ""

        match = re.search(r"<([^>]+)>", header)
        if match:
            return match.group(1).strip()

        # No brackets means the header is the address, unless it carries a
        # display name that was never quoted.
        for part in header.split():
            if "@" in part:
                return part.strip("<>,;")

        return header

    @staticmethod
    def _validate_addresses(raw: str, field: str) -> str:
        """
        Check the addresses before Gmail is asked to.

        A typo caught here says which field it was in; the same typo caught by
        Gmail comes back as a refusal with the whole header quoted.
        """
        raw = (raw or "").strip()
        if not raw:
            return ""

        for part in raw.split(","):
            address = part.strip()
            if not address:
                continue
            # A display name may be wrapped around the address itself.
            match = re.search(r"<([^>]+)>", address)
            if match:
                address = match.group(1).strip()
            if not EMAIL_PATTERN.match(address):
                raise ValueError(
                    f"'{address}' in {field} is not an address Gmail will accept."
                )

        return raw

    @classmethod
    def _compose(
        cls,
        to: str,
        subject: str,
        body: str,
        email_type: str = "text",
        cc: str = "",
        bcc: str = "",
        reply_to: str = "",
        thread_headers: Optional[Dict[str, str]] = None,
    ) -> str:
        """Build the message and encode it the way Gmail expects."""
        subtype = "html" if email_type == "html" else "plain"

        message = MIMEMultipart("alternative") if email_type == "html" else MIMEText(
            body, subtype, "utf-8"
        )
        if email_type == "html":
            message.attach(MIMEText(body, "html", "utf-8"))

        message["To"] = to
        if subject:
            message["Subject"] = subject
        if cc:
            message["Cc"] = cc
        if bcc:
            message["Bcc"] = bcc
        if reply_to:
            message["Reply-To"] = reply_to

        # A reply only lands in the same conversation when it points back at
        # the message it answers.
        for name, value in (thread_headers or {}).items():
            if value:
                message[name] = value

        return base64.urlsafe_b64encode(message.as_bytes()).decode()

    # ------------------------------------------------------------------
    # Guards
    # ------------------------------------------------------------------

    @staticmethod
    def _guard_read_only(operation: str) -> None:
        """Refuse anything that would change the mailbox while read-only is on."""
        if operation in WRITE_OPERATIONS:
            raise ValueError(
                f"Read Only is enabled, so the '{operation}' operation is not allowed. "
                "Turn Read Only off in the Advanced tab to change the mailbox."
            )

    @staticmethod
    def _parse_list(raw: Any) -> List[str]:
        """Read a comma separated selection into a list."""
        if not raw:
            return []
        parts = raw if isinstance(raw, (list, tuple)) else str(raw).split(",")
        return [str(part).strip() for part in parts if str(part).strip()]

    def _resolve_message_ids(
        self,
        inputs: Dict[str, Any],
        connected_nodes: Dict[str, Any],
        token: str,
        timeout: int,
    ) -> List[str]:
        """
        Work out which messages the operation acts on.

        Marking one message read or moving one to the bin is something a person
        would do in Gmail itself; a workflow earns its place when it does the
        same to everything a search turned up. Where the choice is "all", every
        message that came in is returned, and the caller applies the operation
        to each in turn.
        """
        if (inputs.get("message_source") or "input").strip() != "all":
            return [self._resolve_message_id(inputs, connected_nodes, token, timeout)]

        incoming = self._unwrap(connected_nodes.get("input"))

        candidates: List[Any] = []
        if isinstance(incoming, dict):
            if isinstance(incoming.get("messages"), list):
                candidates = incoming["messages"]
            else:
                candidates = [incoming]
        elif isinstance(incoming, list):
            candidates = incoming

        found: List[str] = []
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("id"):
                # A label listing carries identifiers too, and Gmail refuses one
                # of those where a message was meant. Saying so here is clearer
                # than the refusal that comes back otherwise.
                if candidate.get("type") in ("system", "user") and "threadId" not in candidate:
                    raise ValueError(
                        "The node before returned labels rather than messages. Use a Get Many "
                        "that reads messages."
                    )
                found.append(str(candidate["id"]))
            elif isinstance(candidate, str) and candidate.strip():
                found.append(candidate.strip())

        if not found:
            raise ValueError(
                "No messages came in from the node before. Connect a Gmail node that reads "
                "messages, or choose another way of picking one under Which Message."
            )

        return found

    def _resolve_message_id(
        self,
        inputs: Dict[str, Any],
        connected_nodes: Dict[str, Any],
        token: str,
        timeout: int,
    ) -> str:
        """
        Work out which message the operation acts on.

        Copying an identifier from one run into the next is no way to build a
        workflow, so the usual case is that a Gmail node upstream already read
        the message and its identifier is taken from there. A search is offered
        for the times nothing came in, and the identifier itself for the times a
        template carries one.
        """
        source = (inputs.get("message_source") or "input").strip()

        if source == "id":
            return self._require(inputs.get("message_id"), "Message Identifier")

        if source == "search":
            query = self._require(inputs.get("message_search"), "Find the Message")
            listing = self._call(
                token, "GET", "/messages", timeout, params={"q": query, "maxResults": 1}
            )
            found = listing.get("messages", [])
            if not found:
                raise ValueError(
                    f"No message matches '{query}'. Check the search terms, or widen them."
                )
            return found[0]["id"]

        # Whatever the node before produced, unwrapped and searched for an
        # identifier. A Gmail read hands over a list under "messages".
        incoming = self._unwrap(connected_nodes.get("input"))

        candidates: List[Any] = []
        if isinstance(incoming, dict):
            if isinstance(incoming.get("messages"), list):
                candidates = incoming["messages"]
            else:
                candidates = [incoming]
        elif isinstance(incoming, list):
            candidates = incoming

        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("id"):
                return str(candidate["id"])
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

        raise ValueError(
            "No message came in from the node before. Connect a Gmail node that reads "
            "messages, or choose another way of picking one under Which Message."
        )

    def _resolve_draft_id(
        self,
        inputs: Dict[str, Any],
        connected_nodes: Dict[str, Any],
        token: Optional[str] = None,
        timeout: int = 30,
    ) -> str:
        """
        Work out which draft the operation acts on.

        A draft is usually written by one workflow and sent by another, once
        somebody has read it over. The sending end rarely has the identifier to
        hand, so the subject is offered as a way of finding it.
        """
        source = (inputs.get("draft_source") or "input").strip()

        if source == "id":
            return self._require(inputs.get("draft_id"), "Draft Identifier")

        if source == "subject":
            wanted = self._require(inputs.get("draft_subject"), "Find the Draft").lower()

            # Gmail's draft listing takes no search terms, so the drafts are
            # read and matched here. The newest is first, which is what a
            # subject match should mean.
            listing = self._call(
                token, "GET", "/drafts", timeout, params={"maxResults": 100}
            )
            for reference in listing.get("drafts", []):
                detail = self._call(
                    token, "GET", f"/drafts/{reference['id']}", timeout
                )
                subject = self._header(
                    detail.get("message", {}).get("payload", {}), "Subject"
                )
                if wanted in subject.lower():
                    return reference["id"]

            raise ValueError(
                f"No draft has '{inputs.get('draft_subject')}' in its subject. "
                "Check the wording, or list the drafts first to see what is there."
            )

        incoming = self._unwrap(connected_nodes.get("input"))

        candidates: List[Any] = []
        if isinstance(incoming, dict):
            if isinstance(incoming.get("messages"), list):
                candidates = incoming["messages"]
            else:
                candidates = [incoming]
        elif isinstance(incoming, list):
            candidates = incoming

        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("id"):
                return str(candidate["id"])
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

        raise ValueError(
            "No draft came in from the node before. Connect a Gmail node that reads drafts, "
            "or choose another way of picking one under Which Draft."
        )

    @staticmethod
    def _require(value: str, field: str) -> str:
        """Refuse an operation that is missing something it cannot work without."""
        value = (value or "").strip()
        if not value:
            raise ValueError(f"{field} is required for this operation.")
        return value

    # ------------------------------------------------------------------
    # Input from a connection
    # ------------------------------------------------------------------

    ENVELOPE_KEYS = (
        "webhook_data", "output", "payload", "body", "json", "data", "result",
    )

    @classmethod
    def _unwrap(cls, value: Any, depth: int = 4) -> Any:
        """Reach the details inside a trigger's envelope."""
        if depth <= 0 or not isinstance(value, dict):
            return value
        for key in cls.ENVELOPE_KEYS:
            inner = value.get(key)
            if isinstance(inner, dict) and inner:
                return cls._unwrap(inner, depth - 1)
        return value

    def _message_details(
        self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Gather what a message needs, from the fields or from the connection.

        A field filled in by hand wins, so a workflow can send to a fixed
        address while taking the subject and the body from whatever came in.
        """
        incoming = self._unwrap(connected_nodes.get("input")) or {}
        if not isinstance(incoming, dict):
            incoming = {}

        def pick(name: str, *aliases: str) -> str:
            value = (inputs.get(name) or "").strip()
            if value:
                return value
            for key in (name, *aliases):
                found = incoming.get(key)
                if isinstance(found, str) and found.strip():
                    return found.strip()
            return ""

        return {
            "to": pick("to", "recipient", "email"),
            "subject": pick("subject", "title"),
            "body": pick("body", "message", "text", "content"),
            "cc": pick("cc"),
            "bcc": pick("bcc"),
            "reply_to": pick("reply_to", "replyTo"),
        }

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        """Run the chosen operation and return what it produced."""
        started_at = time.time()
        operation = (inputs.get("operation") or "get_many").strip()

        try:
            if bool(inputs.get("read_only", False)):
                self._guard_read_only(operation)

            token = self._access_token(inputs.get("credential_id"))
            timeout = int(inputs.get("request_timeout") or 30)
            simplify = bool(inputs.get("simplify", True))
            include_body = bool(inputs.get("include_body", True))
            email_type = (inputs.get("email_type") or "text").strip()

            messages: List[Dict[str, Any]] = []
            affected = 0

            # --- Reading ------------------------------------------------
            if operation == "get_many":
                query_parts = []
                search = (inputs.get("search_query") or "").strip()
                if search:
                    query_parts.append(search)

                return_all = bool(inputs.get("return_all", False))
                wanted = 0 if return_all else min(int(inputs.get("limit") or 25), 500)

                params: Dict[str, Any] = {"maxResults": 500 if return_all else wanted}
                if query_parts:
                    params["q"] = " ".join(query_parts)

                labels = self._parse_list(inputs.get("filter_labels"))
                if labels:
                    params["labelIds"] = labels
                if bool(inputs.get("include_spam_trash", False)):
                    params["includeSpamTrash"] = "true"

                # Gmail hands back a page at a time, so the pages are followed
                # until there are enough or there are no more.
                references: List[Dict[str, Any]] = []
                page_token = None
                while True:
                    if page_token:
                        params["pageToken"] = page_token
                    listing = self._call(token, "GET", "/messages", timeout, params=params)
                    references.extend(listing.get("messages", []))

                    page_token = listing.get("nextPageToken")
                    if not page_token:
                        break
                    if wanted and len(references) >= wanted:
                        break

                if wanted:
                    references = references[:wanted]

                # The list only carries identifiers, so each message is read in
                # turn. Without the body a metadata read is enough and quicker.
                detail_format = "full" if include_body else "metadata"
                for reference in references:
                    detail = self._call(
                        token,
                        "GET",
                        f"/messages/{reference['id']}",
                        timeout,
                        params={"format": detail_format},
                    )
                    messages.append(
                        self._simplify(detail, include_body) if simplify else detail
                    )

                affected = len(messages)

            elif operation == "get_many_drafts":
                return_all = bool(inputs.get("return_all", False))
                wanted = 0 if return_all else min(int(inputs.get("limit") or 25), 500)

                listing = self._call(
                    token,
                    "GET",
                    "/drafts",
                    timeout,
                    params={"maxResults": 500 if return_all else wanted},
                )
                references = listing.get("drafts", [])
                if wanted:
                    references = references[:wanted]

                for reference in references:
                    detail = self._call(
                        token, "GET", f"/drafts/{reference['id']}", timeout
                    )
                    record = {
                        "id": detail.get("id", ""),
                        "message": (
                            self._simplify(detail.get("message", {}), include_body)
                            if simplify
                            else detail.get("message", {})
                        ),
                    }
                    messages.append(record)
                affected = len(messages)

            elif operation == "get_many_labels":
                body = self._call(token, "GET", "/labels", timeout)

                # Only the names come back on a listing. Gmail keeps the counts
                # behind a separate request per label, which for a mailbox with
                # thirty labels means thirty requests, so they are left out. A
                # Get Many with label:INBOX is:unread answers the same question
                # in one call and lets the search be narrowed besides.
                for label in body.get("labels", []):
                    messages.append({
                        "id": label.get("id", ""),
                        "name": label.get("name", ""),
                        "type": label.get("type", ""),
                    })

                affected = len(messages)

            # --- Sending ------------------------------------------------
            elif operation in ("send", "create_draft"):
                details = self._message_details(inputs, connected_nodes)
                to = self._validate_addresses(
                    self._require(details["to"], "To"), "To"
                )
                cc = self._validate_addresses(details["cc"], "Cc")
                bcc = self._validate_addresses(details["bcc"], "Bcc")

                raw = self._compose(
                    to=to,
                    subject=details["subject"],
                    body=details["body"],
                    email_type=email_type,
                    cc=cc,
                    bcc=bcc,
                    reply_to=details["reply_to"],
                )

                if operation == "send":
                    result = self._call(
                        token, "POST", "/messages/send", timeout, payload={"raw": raw}
                    )
                else:
                    result = self._call(
                        token,
                        "POST",
                        "/drafts",
                        timeout,
                        payload={"message": {"raw": raw}},
                    )

                messages = [{
                    "id": result.get("id", ""),
                    "thread_id": result.get("threadId", ""),
                    "to": to,
                    "subject": details["subject"],
                }]
                affected = 1

            elif operation == "reply":
                message_id = self._resolve_message_id(
                    inputs, connected_nodes, token, timeout
                )

                # The message being answered supplies the address, the subject
                # and the identifiers that keep the reply in its conversation.
                original = self._call(
                    token,
                    "GET",
                    f"/messages/{message_id}",
                    timeout,
                    params={"format": "metadata"},
                )
                payload = original.get("payload", {})

                # A Reply-To on the original says where the sender wants
                # answers to go, and takes precedence over the From.
                sender = self._bare_address(
                    self._header(payload, "Reply-To") or self._header(payload, "From")
                )
                if not sender:
                    raise ValueError(
                        "The message being answered carries no address to reply to."
                    )

                subject = self._header(payload, "Subject")
                if subject and not subject.lower().startswith("re:"):
                    subject = f"Re: {subject}"

                details = self._message_details(inputs, connected_nodes)
                raw = self._compose(
                    to=sender,
                    subject=subject,
                    body=details["body"],
                    email_type=email_type,
                    cc=self._validate_addresses(details["cc"], "Cc"),
                    bcc=self._validate_addresses(details["bcc"], "Bcc"),
                    reply_to=details["reply_to"],
                    thread_headers={
                        "In-Reply-To": self._header(payload, "Message-ID"),
                        "References": self._header(payload, "Message-ID"),
                    },
                )

                result = self._call(
                    token,
                    "POST",
                    "/messages/send",
                    timeout,
                    payload={"raw": raw, "threadId": original.get("threadId")},
                )
                messages = [{
                    "id": result.get("id", ""),
                    "thread_id": result.get("threadId", ""),
                    "to": sender,
                    "subject": subject,
                }]
                affected = 1

            elif operation == "send_draft":
                draft_id = self._resolve_draft_id(
                    inputs, connected_nodes, token, timeout
                )
                result = self._call(
                    token, "POST", "/drafts/send", timeout, payload={"id": draft_id}
                )
                messages = [{
                    "id": result.get("id", ""),
                    "thread_id": result.get("threadId", ""),
                }]
                affected = 1

            # --- Changing a message -------------------------------------
            elif operation in ("mark_read", "mark_unread", "add_label", "remove_label"):
                message_ids = self._resolve_message_ids(
                    inputs, connected_nodes, token, timeout
                )

                if operation == "mark_read":
                    changes = {"removeLabelIds": ["UNREAD"]}
                elif operation == "mark_unread":
                    changes = {"addLabelIds": ["UNREAD"]}
                else:
                    labels = self._parse_list(inputs.get("label_ids"))
                    if not labels:
                        raise ValueError("At least one label is required.")
                    key = "addLabelIds" if operation == "add_label" else "removeLabelIds"
                    changes = {key: labels}

                for message_id in message_ids:
                    result = self._call(
                        token, "POST", f"/messages/{message_id}/modify", timeout,
                        payload=changes,
                    )
                    messages.append(
                        self._simplify(result, False) if simplify else result
                    )

                affected = len(messages)

            elif operation == "trash":
                message_ids = self._resolve_message_ids(
                    inputs, connected_nodes, token, timeout
                )
                for message_id in message_ids:
                    result = self._call(
                        token, "POST", f"/messages/{message_id}/trash", timeout
                    )
                    messages.append(
                        self._simplify(result, False) if simplify else result
                    )
                affected = len(messages)

            elif operation == "untrash":
                # Restoring stands apart from the other operations. A message in
                # the bin cannot have come from a node upstream, since a read
                # passes over the bin unless told otherwise, so the search is
                # made here and confined to the bin.
                query = self._require(inputs.get("untrash_search"), "Find in the Bin")

                listing = self._call(
                    token,
                    "GET",
                    "/messages",
                    timeout,
                    params={
                        "q": f"in:trash {query}",
                        "maxResults": min(int(inputs.get("untrash_limit") or 25), 200),
                    },
                )
                references = listing.get("messages", [])

                if not references:
                    raise ValueError(
                        f"Nothing in the bin matches '{query}'. Note that Gmail empties the "
                        "bin after thirty days."
                    )

                for reference in references:
                    result = self._call(
                        token, "POST", f"/messages/{reference['id']}/untrash", timeout
                    )
                    messages.append(
                        self._simplify(result, False) if simplify else result
                    )
                affected = len(messages)

            elif operation == "delete_draft":
                draft_id = self._resolve_draft_id(
                    inputs, connected_nodes, token, timeout
                )
                self._call(token, "DELETE", f"/drafts/{draft_id}", timeout)
                messages = [{"id": draft_id, "deleted": True}]
                affected = 1

            # --- Labels -------------------------------------------------
            elif operation == "create_label":
                name = self._require(inputs.get("label_name"), "Label Name")
                result = self._call(
                    token,
                    "POST",
                    "/labels",
                    timeout,
                    payload={
                        "name": name,
                        "labelListVisibility": "labelShow",
                        "messageListVisibility": "show",
                    },
                )
                messages = [{"id": result.get("id", ""), "name": result.get("name", "")}]
                affected = 1

            elif operation == "delete_label":
                label_id = self._require(inputs.get("label_to_delete"), "Label")
                if label_id.upper() in SYSTEM_LABELS:
                    raise ValueError(
                        f"'{label_id}' is a label Gmail maintains and cannot be deleted."
                    )
                self._call(token, "DELETE", f"/labels/{label_id}", timeout)
                messages = [{"id": label_id, "deleted": True}]
                affected = 1

            else:
                raise ValueError(f"Unknown operation: {operation}")

            duration_ms = round((time.time() - started_at) * 1000, 2)

            logger.info(
                "GmailNode %s: %s item(s) in %sms", operation, affected, duration_ms
            )

            return {
                "output": {
                    "messages": messages,
                    "message_count": affected,
                    "operation": operation,
                    "duration_ms": duration_ms,
                },
                "success": True,
                "error": None,
            }

        except Exception as exc:
            message = str(exc)
            logger.error(f"GmailNode failed operation={operation}: {message}")

            if not bool(inputs.get("continue_on_error", False)):
                raise

            return {
                "output": {
                    "messages": [],
                    "message_count": 0,
                    "operation": operation,
                    "duration_ms": round((time.time() - started_at) * 1000, 2),
                    "error": message,
                },
                "success": False,
                "error": message,
            }

    def get_required_packages(self) -> List[str]:
        """Packages this node needs."""
        return ["requests>=2.28.0"]


__all__ = ["GmailNode"]