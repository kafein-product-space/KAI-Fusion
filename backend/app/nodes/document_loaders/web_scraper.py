"""
Web Scraper Node - LangChain native web content extractor
─────────────────────────────────────────────────────────
• UI: Multi-line URLs input (one URL per line)
• Uses Tavily with search_depth='url' and include_raw_content=True
• Cleans HTML content using BeautifulSoup and regex
• Returns clean text without code blocks, quotes, and brackets
• Outputs List[Document] compatible with LangChain ecosystem
"""

import os
import re
import uuid
import logging
from typing import List, Any, Dict
from urllib.parse import urlparse

from langchain_core.documents import Document
from langchain_tavily import TavilySearch
from bs4 import BeautifulSoup

from ..base import ProviderNode, NodeInput, NodeOutput, NodeType
from app.models.node import NodeCategory

logger = logging.getLogger(__name__)

class WebScraperNode(ProviderNode):
    """Tavily-powered web scraper that outputs clean LangChain Documents."""

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "WebScraper",
            "display_name": "Web Scraper",
            "description": (
                "Fetches web pages using Tavily API and extracts clean text content. "
                "Input multiple URLs (one per line) to scrape content from web pages."
            ),
            "category": NodeCategory.DOCUMENT_LOADER,
            "node_type": NodeType.PROVIDER,
            "icon": "globe-alt",
            "color": "#0ea5e9",
            "inputs": [
                NodeInput(
                    name="urls",
                    type="textarea",
                    description="Enter URLs to scrape (one URL per line)",
                    required=True,
                ),
                NodeInput(
                    name="tavily_api_key",
                    type="str",
                    description="Tavily API Key (leave empty to use environment variable)",
                    required=False,
                    is_secret=True
                ),
                NodeInput(
                    name="remove_selectors",
                    type="str",
                    description="CSS selectors to remove (comma-separated)",
                    default="nav,footer,header,script,style,aside,noscript,form",
                    required=False,
                ),
                NodeInput(
                    name="min_content_length",
                    type="int",
                    description="Minimum content length to include",
                    default=100,
                    required=False,
                ),
            ],
            "outputs": [
                NodeOutput(
                    name="documents",
                    type="documents",
                    description="List of LangChain Documents with cleaned text content",
                )
            ],
        }

    @staticmethod
    def _clean_html_content(html: str, remove_selectors: List[str]) -> str:
        """
        Clean HTML content by removing unwanted elements and extracting readable text.
        
        Args:
            html: Raw HTML content
            remove_selectors: List of CSS selectors to remove
            
        Returns:
            Cleaned plain text
        """
        try:
            # Parse HTML with BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove unwanted elements
            for selector in remove_selectors:
                for element in soup.select(selector.strip()):
                    element.decompose()
            
            # Extract text content
            text = soup.get_text(separator=' ', strip=True)
            
            # Clean up the text
            # Remove excessive whitespace
            text = re.sub(r'\s+', ' ', text)
            
            # Remove common unwanted characters and patterns
            text = re.sub(r'[`"\'<>{}[\]]+', ' ', text)  # Remove quotes, brackets, backticks
            text = re.sub(r'\b(function|var|const|let|if|else|for|while|return)\b', ' ', text)  # Remove common code keywords
            text = re.sub(r'[{}();,]+', ' ', text)  # Remove code-like punctuation
            text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces again
            
            # Remove lines that look like code (contain multiple special characters)
            lines = text.split('\n')
            cleaned_lines = []
            for line in lines:
                line = line.strip()
                if line and not re.search(r'[{}[\]();]{2,}', line):  # Skip lines with multiple code chars
                    cleaned_lines.append(line)
            
            text = ' '.join(cleaned_lines)
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error cleaning HTML content: {e}")
            return ""

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL for metadata."""
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return "unknown"

    def execute(self, **kwargs) -> List[Document]:
        """
        Execute web scraping for provided URLs.
        
        Returns:
            List[Document]: Cleaned documents ready for LangChain processing
        """
        logger.info("🌐 Starting Web Scraper execution")
        
        # Get URLs from input
        raw_urls = kwargs.get("urls", "")
        if not raw_urls:
            raise ValueError("No URLs provided. Please enter at least one URL.")
        
        # Parse URLs (one per line)
        urls = [url.strip() for url in raw_urls.splitlines() if url.strip()]
        if not urls:
            raise ValueError("No valid URLs found. Please enter URLs separated by line breaks.")
        
        logger.info(f"📋 Found {len(urls)} URLs to scrape")
        
        # Get Tavily API key
        api_key = kwargs.get("tavily_api_key") or os.getenv("TAVILY_API_KEY")
        if not api_key:
            raise ValueError(
                "Tavily API key is required. Please provide it in the node configuration "
                "or set TAVILY_API_KEY environment variable."
            )
        
        # Get other parameters
        remove_selectors_str = kwargs.get("remove_selectors", "nav,footer,header,script,style,aside,noscript,form")
        remove_selectors = [s.strip() for s in remove_selectors_str.split(",") if s.strip()]
        min_content_length = int(kwargs.get("min_content_length", 100))
        
        # Initialize Tavily tool
        try:
            tavily_tool = TavilySearch(
                tavily_api_key=api_key,
                max_results=1,  # We only need the direct page content
                search_depth="url",  # Direct URL fetch
                include_raw_content=True,  # Get HTML content
                include_answer=False,  # We don't need Tavily's answer
            )
            logger.info("✅ Tavily tool initialized successfully")
        except Exception as e:
            raise ValueError(f"Failed to initialize Tavily Search: {e}") from e
        
        documents: List[Document] = []
        successful_scrapes = 0
        failed_scrapes = 0
        
        # Process each URL
        for i, url in enumerate(urls, 1):
            try:
                logger.info(f"🔄 [{i}/{len(urls)}] Scraping: {url}")
                
                # Use Tavily to fetch the page content
                result = tavily_tool.run(url)
                
                # Extract HTML content
                html_content = ""
                if isinstance(result, dict):
                    html_content = result.get("raw_content", "")
                elif isinstance(result, str):
                    html_content = result
                else:
                    html_content = str(result)
                
                if not html_content:
                    logger.warning(f"⚠️ No content retrieved for {url}")
                    failed_scrapes += 1
                    continue
                
                # Clean the HTML content
                clean_text = self._clean_html_content(html_content, remove_selectors)
                
                if len(clean_text) < min_content_length:
                    logger.warning(f"⚠️ Content too short for {url} ({len(clean_text)} chars)")
                    failed_scrapes += 1
                    continue
                
                # Create Document
                document = Document(
                    page_content=clean_text,
                    metadata={
                        "source": url,
                        "domain": self._extract_domain(url),
                        "doc_id": uuid.uuid4().hex[:8],
                        "content_length": len(clean_text),
                        "scrape_timestamp": str(uuid.uuid4().time_low),  # Simple timestamp
                    }
                )
                
                documents.append(document)
                successful_scrapes += 1
                logger.info(f"✅ Successfully scraped {url} ({len(clean_text)} chars)")
                
            except Exception as e:
                logger.error(f"❌ Failed to scrape {url}: {e}")
                failed_scrapes += 1
                continue
        
        # Log summary
        logger.info(f"📊 Scraping complete: {successful_scrapes} successful, {failed_scrapes} failed")
        
        if not documents:
            raise ValueError(
                f"No content could be scraped from {len(urls)} URLs. "
                "Please check the URLs and your Tavily API quota."
            )
        
        logger.info(f"🎉 Returning {len(documents)} documents for downstream processing")
        return documents


# Export for node registry
__all__ = ["WebScraperNode"]