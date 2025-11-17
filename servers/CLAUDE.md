# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heidi is a healthcare assistant project consisting of multiple MCP (Model Context Protocol) servers that provide access to UK healthcare information resources. The project includes three main servers:

1. **NICE Guidelines Server** - Access to UK NICE clinical guidelines
2. **BNF Server** - British National Formulary drug information
3. **Geolocation Server** - IP-based geolocation service

## Development Setup

### Dependencies

Install dependencies using uv:
```bash
uv sync
```

The project requires Python 3.12+ and uses:
- `fastmcp>=2.13.0.2` (for BNF and Geolocation servers)
- `mcp>=1.0.0` (for NICE Guidelines server)
- `httpx>=0.27.0` (async HTTP client)
- `beautifulsoup4>=4.14.2` and `lxml>=6.0.2` (HTML parsing)
- `requests>=2.32.5` (synchronous HTTP)

### Running MCP Servers

Each server can be run directly as a standalone Python script:

```bash
# NICE Guidelines Server
python nice_guidelines_server.py

# BNF Server
python bnf_server.py

# Geolocation Server
python geolocation_server.py
```

### Testing

Test the NICE Guidelines server functionality:
```bash
python test_nice_guidelines.py
```

## Architecture

### MCP Server Implementations

**Two Different MCP Frameworks:**
- **FastMCP Protocol**: Used by BNF and Geolocation servers (`bnf_server.py`, `geolocation_server.py`)
  - Simpler decorator-based API using `@mcp.tool()`
  - Run with `mcp.run()`

- **Standard MCP Protocol**: Used by NICE Guidelines server (`nice_guidelines_server.py`)
  - Uses async handlers: `@server.list_tools()` and `@server.call_tool()`
  - Runs with `mcp.server.stdio.stdio_server()` and async event loop

**Important**: When creating new MCP servers, always use the FastMCP protocol as specified in global instructions.

### Web Scraping Strategy

All servers use web scraping to access healthcare data sources:
- **NICE Guidelines**: Scrapes `www.nice.org.uk` for clinical guidelines
  - Parses JSON-LD structured data from search results
  - Falls back to HTML parsing if JSON approach fails
  - 30-second timeout with proper User-Agent headers

- **BNF**: Scrapes `bnf.nice.org.uk` for drug information
  - Uses session management for cookie persistence
  - 0.5-second delay between requests for rate limiting
  - Browser-like headers to avoid 403 errors

- **Geolocation**: Uses external APIs (ipapi.co, ipify.org)
  - Auto-detection of public IP addresses
  - Returns country, city, region, timezone data

### Data Extraction Patterns

Common patterns across scraping implementations:
1. **Async/Sync HTTP**: NICE Guidelines uses `httpx` (async), BNF uses `requests` (sync)
2. **BeautifulSoup**: All servers use BeautifulSoup4 with `lxml` parser
3. **Error Handling**: Comprehensive try-except blocks with structured error responses
4. **Result Formatting**: All tools return dictionaries with `success`, `error`, and relevant data fields
5. **URL Construction**: Proper URL joining and encoding for search queries

## MCP Server Configuration

When configuring these servers in Claude Desktop or other MCP clients, use the following structure:

```json
{
  "mcpServers": {
    "nice-guidelines": {
      "command": "python",
      "args": ["/Users/dgordon/python/hackathons/heidi/servers/nice_guidelines_server.py"],
      "cwd": "/Users/dgordon/python/hackathons/heidi/servers"
    },
    "bnf": {
      "command": "python",
      "args": ["/Users/dgordon/python/hackathons/heidi/servers/bnf_server.py"],
      "cwd": "/Users/dgordon/python/hackathons/heidi/servers"
    },
    "geolocation": {
      "command": "python",
      "args": ["/Users/dgordon/python/hackathons/heidi/servers/geolocation_server.py"],
      "cwd": "/Users/dgordon/python/hackathons/heidi/servers"
    }
  }
}
```

Note: Use `python` (not `python3`) as specified in global configuration.

## Key Implementation Details

### NICE Guidelines Server
- **Search Implementation**: Searches via `/guidance/published?q={keyword}&ps={page_size}`
- **Guideline References**: Uses prefixes like NG (guidelines), TA (technology appraisals), IPG (procedures), etc.
- **Date Parsing**: Converts ISO dates to readable format (e.g., "January 2024")
- **Section Extraction**: Looks for navigation elements or falls back to heading tags

### BNF Server
- **Session Management**: Maintains persistent session with cookies for better scraping
- **Rate Limiting**: 0.5-second delay via `time.sleep()` between requests
- **Multiple Search Paths**: Tries treatment summaries, then falls back to general search
- **Section Parsing**: Helper function `extract_section()` finds content by heading names

### Geolocation Server
- **API Hierarchy**: Uses ipapi.co for geolocation, ipify.org for IP detection
- **Auto-Detection**: All tools have optional IP parameter; if None, auto-detects
- **Comprehensive Data**: Returns country, country_code, city, region, lat/long, timezone

## Adding New Servers

When adding new MCP servers to this project:
1. Use the FastMCP framework for consistency
2. Follow the existing naming pattern: `{service}_server.py`
3. Include comprehensive docstrings for all tools
4. Return structured dictionaries with `success` and `error` fields
5. Implement proper error handling with fallback strategies
6. Add rate limiting if scraping external websites
7. Update this CLAUDE.md with architectural information
