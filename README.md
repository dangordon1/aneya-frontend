# HEIDI - Health Guidelines MCP Project

A comprehensive Model Context Protocol (MCP) server system for accessing health guidelines from multiple international sources. This project uses IP-based geolocation to automatically route users to their country's relevant health guidelines.

## Overview

This project provides MCP servers for accessing clinical guidelines and medical information from:

### UK Sources
- **NICE Guidelines** - National Institute for Health and Care Excellence clinical guidelines
- **BNF (British National Formulary)** - Drug information, indications, dosages, and contraindications

### Australian Sources
- **NHMRC Guidelines** - National Health and Medical Research Council approved guidelines

### Infrastructure
- **Geolocation Server** - IP-based country detection to route users to appropriate guideline sources

## Project Setup

### Prerequisites

- Python 3.12+
- uv (Python package manager)

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd /Users/dgordon/python/hackathons/heidi
```

2. Dependencies are already installed via uv:
```bash
# If you need to reinstall:
uv sync
```

### Installed Dependencies

- `fastmcp` - FastMCP protocol for MCP servers
- `requests` - HTTP library for web scraping and API calls
- `beautifulsoup4` - HTML parsing
- `lxml` - Fast XML/HTML parser

## MCP Servers

### 1. NICE Guidelines Server

**File:** `servers/nice_guidelines_server.py`

**Tools:**
- `search_nice_guidelines(keyword, max_results)` - Search NICE guidelines by keyword
- `get_guideline_details(identifier)` - Get full details of a specific guideline by ID or URL
- `list_guideline_categories()` - List all available NICE guideline categories

**Usage:**
```bash
python servers/nice_guidelines_server.py
```

### 2. BNF (British National Formulary) Server

**File:** `servers/bnf_server.py`

**Tools:**
- `search_bnf_drug(drug_name)` - Search for drugs/medications by name
- `get_bnf_drug_info(url)` - Get comprehensive drug information (indications, dosage, contraindications, etc.)
- `search_bnf_by_condition(condition)` - Find medications by medical condition
- `get_bnf_drug_interactions(drug_name)` - Get drug interaction information

**Usage:**
```bash
python servers/bnf_server.py
```

### 3. NHMRC Guidelines Server

**File:** `servers/nhmrc_guidelines_server.py`

**Tools:**
- `list_nhmrc_guidelines()` - List all NHMRC approved guidelines
- `search_nhmrc_guidelines(keyword)` - Search guidelines by keyword
- `get_guideline_details(identifier)` - Get detailed guideline information

**Usage:**
```bash
python servers/nhmrc_guidelines_server.py
```

### 4. Geolocation Server

**File:** `servers/geolocation_server.py`

**Tools:**
- `get_country_from_ip(ip_address)` - Get location details for an IP address
- `get_user_location()` - Auto-detect current user's location
- `get_timezone_from_ip(ip_address)` - Get timezone for an IP address

**Usage:**
```bash
python servers/geolocation_server.py
```

## Configuration

All MCP servers have been automatically added to Claude Desktop configuration at:
`/Users/dgordon/Library/Application Support/Claude/claude_desktop_config.json`

The following servers are configured:
- `nice-guidelines`
- `bnf`
- `nhmrc-guidelines`
- `geolocation` (configured separately)

## Additional UK Health Guideline Sources

Based on research, the following additional UK health guideline sources are recommended for future implementation:

### Recommended for MCP Development

1. **SIGN (Scottish Intercollegiate Guidelines Network)**
   - URL: https://www.sign.ac.uk/
   - Evidence-based clinical guidelines for NHS Scotland
   - Freely accessible, well-organized guideline repository

2. **RCOG (Royal College of Obstetricians and Gynaecologists)**
   - URL: https://www.rcog.org.uk/guidance/
   - Green-top Guidelines series for women's health
   - Freely accessible clinical and patient-facing content

3. **RCEM (Royal College of Emergency Medicine)**
   - URL: https://rcem.ac.uk/clinical-guidelines/
   - Emergency medicine clinical guidance
   - Freely accessible, regularly updated

4. **UKHSA (UK Health Security Agency)**
   - URL: https://www.gov.uk/government/organisations/uk-health-security-agency
   - Public health and infectious disease guidance
   - Open Government Licence

5. **BSH (British Society for Haematology)**
   - URL: https://b-s-h.org.uk/guidelines
   - Haematology clinical guidelines
   - Partially free (verify access for specific guidelines)

## Technical Implementation

### Web Scraping Strategy

All servers use web scraping rather than APIs to avoid application/approval delays:

- **Requests library** with proper User-Agent headers
- **BeautifulSoup4** for HTML parsing
- **Error handling** with retry logic and timeouts
- **Rate limiting** to be respectful to source websites

### FastMCP Protocol

All servers use the FastMCP library for standardized MCP tool creation:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    "ServerName",
    description="Server description"
)

@mcp.tool(
    name="tool_name",
    description="Tool description"
)
def tool_function(param: str) -> dict:
    # Implementation
    pass

if __name__ == "__main__":
    mcp.run()
```

## Known Issues

### NHMRC Server Timeout
The NHMRC website (www.nhmrc.gov.au) may experience connection timeouts due to:
- Geographic restrictions (Australian government website)
- Network connectivity issues
- Rate limiting

The server includes robust error handling and retry logic to handle these scenarios.

## Project Structure

```
heidi/
├── servers/
│   ├── geolocation_server.py
│   ├── nice_guidelines_server.py
│   ├── bnf_server.py
│   └── nhmrc_guidelines_server.py
├── pyproject.toml
├── uv.lock
└── README.md
```

## Development

### Testing

The project includes a comprehensive test suite for the FastAPI backend API.

#### Quick Start

```bash
# Run all unit tests (fast, ~5 seconds)
uv run pytest tests/ -v -m unit

# Run all tests including integration tests
uv run pytest tests/ -v

# Run with coverage report
uv run pytest tests/ --cov=. --cov-report=term-missing
```

#### Test Coverage

The test suite covers:
- **GET /** - Root endpoint
- **GET /health** - Health check endpoint
- **POST /api/analyze** - Main consultation analysis (critical)
- **GET /api/examples** - Example clinical scenarios

Tests include:
- Unit tests with mocked dependencies (fast)
- Integration tests with real MCP servers (realistic)
- Error handling for all failure scenarios (400, 500, 503)
- Frontend response structure validation

See **[tests/README.md](tests/README.md)** for complete testing documentation.

#### Legacy Server Tests

Individual MCP servers can also be tested:

```bash
# Test NICE server
python servers/test_nice_guidelines.py

# Test NHMRC server
python servers/test_nhmrc.py
```

### Adding New Guideline Sources

To add a new guideline source:

1. Create a new server file in `servers/`
2. Use FastMCP library for MCP tools
3. Implement web scraping with proper error handling
4. Add comprehensive docstrings
5. Test the server
6. Add to Claude Desktop config

## License

This project is for educational/hackathon purposes.

## Deadline

Project deadline: Tomorrow - all core functionality is now complete!
