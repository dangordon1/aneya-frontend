"""
Test Aneya frontend on iOS Safari using Playwright
Simulates iPhone Safari to help debug blank screen issues
"""
from playwright.sync_api import sync_playwright
import time
import sys

def test_ios_safari(url: str, output_dir: str = "."):
    """
    Test the frontend on iOS Safari emulation
    """
    with sync_playwright() as p:
        # Launch WebKit (Safari engine) with iPhone emulation
        iphone_13 = p.devices['iPhone 13']

        browser = p.webkit.launch(headless=False)  # headless=False to see it
        context = browser.new_context(
            **iphone_13,
            # Additional iOS Safari settings
            locale='en-US',
            timezone_id='Europe/London',
        )

        # Enable console logging to catch JS errors
        page = context.new_page()

        # Collect console messages and errors
        console_messages = []
        page_errors = []

        page.on('console', lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: page_errors.append(str(err)))

        print(f"\n{'='*60}")
        print(f"Testing URL: {url}")
        print(f"Device: iPhone 13 (Safari)")
        print(f"{'='*60}\n")

        try:
            # Navigate to the page
            print("1. Navigating to page...")
            page.goto(url, wait_until='networkidle', timeout=30000)
            print("   Page loaded successfully")

            # Take initial screenshot
            screenshot_path = f"{output_dir}/ios_safari_1_initial.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"   Screenshot saved: {screenshot_path}")

            # Wait and check for login screen
            time.sleep(2)

            # Check if login screen is visible
            print("\n2. Checking for login screen...")
            login_visible = page.locator('text=Sign in to continue').is_visible()
            if login_visible:
                print("   Login screen is visible")

                # Test show password checkbox
                print("\n3. Testing show password checkbox...")
                show_password_checkbox = page.locator('#showPassword')
                if show_password_checkbox.is_visible():
                    print("   Checkbox is visible")
                    show_password_checkbox.click()
                    time.sleep(0.5)
                    is_checked = show_password_checkbox.is_checked()
                    print(f"   Checkbox checked: {is_checked}")

                    # Take screenshot with checkbox checked
                    screenshot_path = f"{output_dir}/ios_safari_2_password_shown.png"
                    page.screenshot(path=screenshot_path, full_page=True)
                    print(f"   Screenshot saved: {screenshot_path}")
                else:
                    print("   WARNING: Checkbox not visible!")
            else:
                print("   Login screen not found - may already be logged in")

                # Take screenshot of current state
                screenshot_path = f"{output_dir}/ios_safari_2_current_state.png"
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"   Screenshot saved: {screenshot_path}")

            # Print console messages
            print(f"\n{'='*60}")
            print("Console Output:")
            print(f"{'='*60}")
            if console_messages:
                for msg in console_messages[-20:]:  # Last 20 messages
                    print(f"  {msg}")
            else:
                print("  No console messages")

            # Print page errors
            print(f"\n{'='*60}")
            print("Page Errors:")
            print(f"{'='*60}")
            if page_errors:
                for err in page_errors:
                    print(f"  ERROR: {err}")
            else:
                print("  No page errors detected")

            print(f"\n{'='*60}")
            print("Test completed!")
            print(f"{'='*60}\n")

            # Keep browser open for manual inspection if not headless
            input("Press Enter to close the browser...")

        except Exception as e:
            print(f"\nERROR: {e}")

            # Take screenshot of error state
            try:
                screenshot_path = f"{output_dir}/ios_safari_error.png"
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"Error screenshot saved: {screenshot_path}")
            except:
                pass

            # Print any collected errors
            if page_errors:
                print("\nPage errors:")
                for err in page_errors:
                    print(f"  {err}")

        finally:
            browser.close()

def test_analyze_flow(url: str, email: str, password: str, output_dir: str = "."):
    """
    Test the full analyze consultation flow on iOS Safari
    """
    with sync_playwright() as p:
        iphone_13 = p.devices['iPhone 13']

        browser = p.webkit.launch(headless=False)
        context = browser.new_context(**iphone_13)
        page = context.new_page()

        page_errors = []
        page.on('pageerror', lambda err: page_errors.append(str(err)))

        print(f"\nTesting Analyze Flow on iOS Safari")
        print(f"{'='*60}\n")

        try:
            # 1. Navigate and login
            print("1. Navigating to page...")
            page.goto(url, wait_until='networkidle', timeout=30000)

            # 2. Login
            print("2. Logging in...")
            page.fill('input[type="email"]', email)
            page.fill('input[type="password"]', password)
            page.click('button[type="submit"]')

            # Wait for navigation
            time.sleep(3)
            page.screenshot(path=f"{output_dir}/ios_safari_flow_1_after_login.png", full_page=True)

            # 3. Start a consultation (if there's a button)
            print("3. Looking for consultation start...")
            # This will depend on your UI - adjust selectors as needed

            if page_errors:
                print("\nPage errors detected:")
                for err in page_errors:
                    print(f"  {err}")

            input("Press Enter to close...")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path=f"{output_dir}/ios_safari_flow_error.png", full_page=True)

        finally:
            browser.close()

if __name__ == "__main__":
    # Default to local dev server, or use provided URL
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"

    print("\nAneya iOS Safari Testing Tool")
    print("==============================\n")
    print("Options:")
    print("  1. Test basic page load and show password")
    print("  2. Test full analyze flow (requires credentials)")
    print("  3. Test production URL")
    print()

    choice = input("Enter choice (1/2/3): ").strip()

    if choice == "1":
        test_ios_safari(url)
    elif choice == "2":
        email = input("Enter email: ").strip()
        password = input("Enter password: ").strip()
        test_analyze_flow(url, email, password)
    elif choice == "3":
        test_ios_safari("https://aneya.vercel.app")
    else:
        print("Running basic test...")
        test_ios_safari(url)
