"""Bounded subprocess runner for trusted security CLI adapters."""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MAX_COMMAND_OUTPUT_BYTES = 256 * 1024


class SecurityCommandError(RuntimeError):
    """Base error for a trusted external security command."""


class SecurityCommandUnavailableError(SecurityCommandError):
    """Raised when a configured scanner binary is not installed."""


class SecurityCommandTimeoutError(SecurityCommandError):
    """Raised when a scanner process exceeds its wall-clock deadline."""


@dataclass(frozen=True)
class SecurityCommandResult:
    returncode: int
    stdout: str
    stderr: str
    duration_ms: int


def resolve_security_binary(default_name: str, env_var: str) -> str:
    configured = os.getenv(env_var, "").strip() or default_name
    if os.sep in configured:
        path = Path(configured).expanduser()
        if not path.is_absolute():
            raise SecurityCommandUnavailableError(
                f"{env_var} must contain an absolute executable path."
            )
        resolved = str(path.resolve())
        if not Path(resolved).is_file() or not os.access(resolved, os.X_OK):
            raise SecurityCommandUnavailableError(
                f"Configured {default_name} binary is unavailable."
            )
        return resolved
    resolved = shutil.which(configured)
    if not resolved:
        raise SecurityCommandUnavailableError(
            f"{default_name} is not installed or is not available on PATH."
        )
    return resolved


def _read_bounded(file_object: Any) -> str:
    file_object.flush()
    file_object.seek(0)
    payload = file_object.read(MAX_COMMAND_OUTPUT_BYTES + 1)
    if isinstance(payload, str):
        text = payload
    else:
        text = bytes(payload).decode("utf-8", errors="replace")
    if len(text.encode("utf-8", errors="replace")) > MAX_COMMAND_OUTPUT_BYTES:
        text = text[:MAX_COMMAND_OUTPUT_BYTES] + " [truncated]"
    return text.replace("\x00", "")


def run_security_command(
    args: list[str],
    *,
    timeout_seconds: int,
    env: dict[str, str] | None = None,
    cwd: str | None = None,
) -> SecurityCommandResult:
    """Execute an argument vector without a shell and bound captured output."""

    if not args or not Path(args[0]).is_absolute():
        raise SecurityCommandError("Security command requires a resolved absolute binary path.")
    started = time.monotonic()
    with tempfile.TemporaryFile(mode="w+b") as stdout_file, tempfile.TemporaryFile(
        mode="w+b"
    ) as stderr_file:
        process = subprocess.Popen(  # noqa: S603 - absolute allowlisted binary, no shell
            args,
            stdin=subprocess.DEVNULL,
            stdout=stdout_file,
            stderr=stderr_file,
            cwd=cwd,
            env=env or os.environ.copy(),
            shell=False,
            close_fds=True,
            start_new_session=True,
        )
        try:
            returncode = process.wait(timeout=max(1, int(timeout_seconds)))
        except subprocess.TimeoutExpired as exc:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except (OSError, AttributeError):
                process.kill()
            process.wait(timeout=5)
            raise SecurityCommandTimeoutError("Security command timed out.") from exc

        return SecurityCommandResult(
            returncode=returncode,
            stdout=_read_bounded(stdout_file),
            stderr=_read_bounded(stderr_file),
            duration_ms=int((time.monotonic() - started) * 1000),
        )


__all__ = [
    "SecurityCommandError",
    "SecurityCommandResult",
    "SecurityCommandTimeoutError",
    "SecurityCommandUnavailableError",
    "resolve_security_binary",
    "run_security_command",
]
