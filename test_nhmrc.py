#!/usr/bin/env python
"""
Test script for NHMRC Guidelines MCP Server.
Tests the core functionality of scraping and searching NHMRC guidelines.
"""

import sys
sys.path.insert(0, 'servers')

import nhmrc_guidelines_server

# Get the actual functions from the decorated tools
list_nhmrc_guidelines = nhmrc_guidelines_server.list_nhmrc_guidelines.fn
search_nhmrc_guidelines = nhmrc_guidelines_server.search_nhmrc_guidelines.fn
get_guideline_details = nhmrc_guidelines_server.get_guideline_details.fn

def test_list_guidelines():
    """Test listing all NHMRC guidelines."""
    print("\n" + "="*80)
    print("Testing list_nhmrc_guidelines()")
    print("="*80)

    result = list_nhmrc_guidelines()

    print(f"Success: {result['success']}")
    print(f"Count: {result['count']}")
    print(f"Error: {result['error']}")

    if result['success'] and result['count'] > 0:
        print(f"\nFirst guideline:")
        print(f"  Title: {result['guidelines'][0].get('title', 'N/A')}")
        print(f"  Link: {result['guidelines'][0].get('link', 'N/A')}")
        for key, value in result['guidelines'][0].items():
            if key not in ['title', 'link']:
                print(f"  {key.capitalize()}: {value}")

        if result['count'] > 1:
            print(f"\nTotal guidelines found: {result['count']}")
            print(f"Showing first 3 titles:")
            for i, guideline in enumerate(result['guidelines'][:3], 1):
                print(f"  {i}. {guideline.get('title', 'N/A')}")

    return result

def test_search_guidelines():
    """Test searching NHMRC guidelines."""
    print("\n" + "="*80)
    print("Testing search_nhmrc_guidelines('cancer')")
    print("="*80)

    result = search_nhmrc_guidelines('cancer')

    print(f"Success: {result['success']}")
    print(f"Keyword: {result['keyword']}")
    print(f"Count: {result['count']}")
    print(f"Error: {result['error']}")

    if result['success'] and result['count'] > 0:
        print(f"\nMatching guidelines:")
        for i, guideline in enumerate(result['guidelines'][:3], 1):
            print(f"\n  {i}. {guideline.get('title', 'N/A')}")
            print(f"     Relevance: {guideline.get('relevance', 'N/A')}")
            print(f"     Link: {guideline.get('link', 'N/A')[:80]}...")

    return result

def test_get_guideline_details(url=None):
    """Test getting details of a specific guideline."""
    print("\n" + "="*80)
    print("Testing get_guideline_details()")
    print("="*80)

    # First get a guideline URL from the list
    if not url:
        list_result = list_nhmrc_guidelines()
        if list_result['success'] and list_result['count'] > 0:
            url = list_result['guidelines'][0].get('link', '')
            print(f"Using first guideline: {list_result['guidelines'][0].get('title', 'N/A')}")

    if not url:
        print("No guideline URL available for testing")
        return None

    result = get_guideline_details(url)

    print(f"\nSuccess: {result['success']}")
    print(f"Title: {result.get('title', 'N/A')}")
    print(f"URL: {result.get('url', 'N/A')}")
    print(f"Content length: {result.get('content_length', 0)} characters")
    print(f"Error: {result.get('error')}")

    if result['success']:
        print(f"\nSections found: {len(result.get('sections', []))}")
        if result.get('sections'):
            print("First 5 sections:")
            for i, section in enumerate(result['sections'][:5], 1):
                print(f"  {i}. {section}")

        if result.get('metadata'):
            print("\nMetadata:")
            for key, value in result['metadata'].items():
                print(f"  {key.capitalize()}: {value}")

        print(f"\nContent preview (first 300 chars):")
        print(f"  {result.get('content', '')[:300]}...")

    return result

if __name__ == "__main__":
    print("NHMRC Guidelines MCP Server - Test Suite")
    print("=" * 80)

    # Test 1: List all guidelines
    list_result = test_list_guidelines()

    # Test 2: Search guidelines
    search_result = test_search_guidelines()

    # Test 3: Get guideline details
    if list_result and list_result.get('success') and list_result.get('count', 0) > 0:
        test_get_guideline_details()

    print("\n" + "="*80)
    print("Test suite completed")
    print("="*80)
