#!/usr/bin/env python
"""
FOGSI Guidelines MCP Server

Provides access to clinical guidelines from the Federation of Obstetric
and Gynaecological Societies of India (FOGSI) at https://www.fogsi.org

This server is specifically for Indian healthcare providers and users.
"""

from fastmcp import FastMCP
import httpx
from bs4 import BeautifulSoup
from typing import Optional
import re

# Create MCP server instance
mcp = FastMCP(
    "FOGSI Guidelines",
    dependencies=["httpx", "beautifulsoup4", "lxml"]
)

# Base URL for FOGSI
FOGSI_BASE_URL = "https://www.fogsi.org"

async def fetch_page(url: str, timeout: int = 30) -> Optional[str]:
    """
    Fetch a webpage with proper headers and error handling.

    Args:
        url: The URL to fetch
        timeout: Request timeout in seconds

    Returns:
        HTML content or None if failed
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.text
    except Exception as e:
        print(f"Error fetching {url}: {str(e)}")
        return None


@mcp.tool()
async def search_fogsi_guidelines(keyword: str, max_results: int = 10) -> dict:
    """
    Search for FOGSI clinical guidelines by keyword.

    FOGSI (Federation of Obstetric and Gynaecological Societies of India)
    provides evidence-based guidelines for obstetric and gynecological care
    in India.

    Args:
        keyword: Search term (e.g., "pregnancy", "diabetes", "hypertension")
        max_results: Maximum number of results to return (default: 10)

    Returns:
        Dictionary with success status and list of guidelines with:
        - title: Guideline title
        - url: Full URL to the guideline
        - description: Brief description or excerpt
        - category: Category/section (if available)
    """
    try:
        # Try searching the FOGSI website
        # Note: This is a placeholder implementation. The actual search mechanism
        # may need to be adjusted based on FOGSI's website structure
        search_url = f"{FOGSI_BASE_URL}/?s={keyword}"

        html = await fetch_page(search_url)
        if not html:
            return {
                "success": False,
                "error": "Failed to fetch search results from FOGSI website",
                "results": []
            }

        soup = BeautifulSoup(html, 'lxml')
        results = []

        # Look for articles/posts in search results
        # This selector may need adjustment based on actual FOGSI HTML structure
        articles = soup.find_all(['article', 'div'], class_=re.compile(r'post|article|result'), limit=max_results)

        for article in articles:
            # Extract title
            title_elem = article.find(['h1', 'h2', 'h3', 'h4'], class_=re.compile(r'title|heading'))
            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)

            # Extract URL
            link_elem = title_elem.find('a') or article.find('a')
            if not link_elem:
                continue

            url = link_elem.get('href', '')
            if url and not url.startswith('http'):
                url = FOGSI_BASE_URL + url

            # Extract description/excerpt
            desc_elem = article.find(['p', 'div'], class_=re.compile(r'excerpt|summary|description'))
            description = desc_elem.get_text(strip=True) if desc_elem else ""

            # Extract category if available
            category_elem = article.find(['span', 'a'], class_=re.compile(r'category|tag'))
            category = category_elem.get_text(strip=True) if category_elem else "General"

            if title and url:
                results.append({
                    "title": title,
                    "url": url,
                    "description": description[:200] if description else "",
                    "category": category
                })

        return {
            "success": True,
            "results": results,
            "total_found": len(results)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Search failed: {str(e)}",
            "results": []
        }


@mcp.tool()
async def get_fogsi_guideline_content(guideline_url: str) -> dict:
    """
    Get the full content of a specific FOGSI guideline.

    Args:
        guideline_url: Full URL to the FOGSI guideline page

    Returns:
        Dictionary with success status and guideline content:
        - title: Guideline title
        - content: Full text content of the guideline
        - sections: List of sections with headings and content
        - url: Original URL
    """
    try:
        html = await fetch_page(guideline_url)
        if not html:
            return {
                "success": False,
                "error": "Failed to fetch guideline content"
            }

        soup = BeautifulSoup(html, 'lxml')

        # Extract title
        title_elem = soup.find(['h1', 'h2'], class_=re.compile(r'title|heading'))
        title = title_elem.get_text(strip=True) if title_elem else "Unknown"

        # Extract main content area
        content_elem = soup.find(['article', 'div', 'main'], class_=re.compile(r'content|post|article|entry'))
        if not content_elem:
            content_elem = soup.find('body')

        # Extract sections
        sections = []
        if content_elem:
            # Find all headings and their content
            headings = content_elem.find_all(['h1', 'h2', 'h3', 'h4', 'h5'])

            for heading in headings:
                section_title = heading.get_text(strip=True)

                # Get content until next heading
                section_content = []
                for sibling in heading.find_next_siblings():
                    if sibling.name in ['h1', 'h2', 'h3', 'h4', 'h5']:
                        break
                    if sibling.name in ['p', 'ul', 'ol', 'div']:
                        section_content.append(sibling.get_text(strip=True))

                if section_title:
                    sections.append({
                        "heading": section_title,
                        "content": "\n".join(section_content)
                    })

        # Get full text content
        full_content = content_elem.get_text(separator="\n", strip=True) if content_elem else ""

        return {
            "success": True,
            "title": title,
            "content": full_content,
            "sections": sections,
            "url": guideline_url
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to retrieve guideline content: {str(e)}"
        }


@mcp.tool()
async def list_fogsi_categories() -> dict:
    """
    List available guideline categories from FOGSI.

    Returns:
        Dictionary with success status and list of categories:
        - name: Category name
        - url: URL to category page
        - description: Brief description (if available)
    """
    try:
        html = await fetch_page(FOGSI_BASE_URL)
        if not html:
            return {
                "success": False,
                "error": "Failed to fetch FOGSI homepage",
                "categories": []
            }

        soup = BeautifulSoup(html, 'lxml')
        categories = []

        # Look for navigation menu or category links
        nav_elem = soup.find(['nav', 'ul'], class_=re.compile(r'menu|nav|categories'))
        if nav_elem:
            links = nav_elem.find_all('a')

            for link in links:
                category_name = link.get_text(strip=True)
                category_url = link.get('href', '')

                if category_url and not category_url.startswith('http'):
                    category_url = FOGSI_BASE_URL + category_url

                if category_name and category_url:
                    categories.append({
                        "name": category_name,
                        "url": category_url,
                        "description": ""
                    })

        # Fallback: Common FOGSI categories
        if not categories:
            categories = [
                {
                    "name": "Clinical Guidelines",
                    "url": f"{FOGSI_BASE_URL}/clinical-guidelines/",
                    "description": "Evidence-based clinical practice guidelines"
                },
                {
                    "name": "Good Clinical Practice",
                    "url": f"{FOGSI_BASE_URL}/good-clinical-practice/",
                    "description": "Best practices and recommendations"
                },
                {
                    "name": "Publications",
                    "url": f"{FOGSI_BASE_URL}/publications/",
                    "description": "Research and academic publications"
                }
            ]

        return {
            "success": True,
            "categories": categories,
            "total": len(categories)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to list categories: {str(e)}",
            "categories": []
        }


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
