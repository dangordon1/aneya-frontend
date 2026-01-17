/**
 * Firebase authentication bypass for E2E tests.
 * Injects mock auth state to skip real Firebase authentication.
 */

import { Page } from '@playwright/test';

/**
 * Mock user interface matching the app's User type.
 */
export interface MockUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Test doctor user for E2E tests.
 * This user must exist in the Supabase doctors table with matching user_id.
 */
export const TEST_DOCTOR: MockUser = {
  id: 'e2e-test-doctor-uid',
  email: 'e2e-test-doctor@aneya.health',
  displayName: 'E2E Test Doctor',
};

/**
 * Test patient user for E2E tests.
 */
export const TEST_PATIENT: MockUser = {
  id: 'e2e-test-patient-uid',
  email: 'e2e-test-patient@aneya.health',
  displayName: 'E2E Test Patient',
};

/**
 * Inject mock Firebase auth state before page loads.
 * This sets up window variables that AuthContext checks for E2E mode.
 */
export async function mockFirebaseAuth(page: Page, user: MockUser = TEST_DOCTOR): Promise<void> {
  await page.addInitScript((mockUser) => {
    // Set E2E auth bypass flag
    (window as any).__E2E_AUTH_BYPASS__ = true;

    // Set mock user data
    (window as any).__E2E_MOCK_USER__ = {
      id: mockUser.id,
      email: mockUser.email,
      displayName: mockUser.displayName,
      emailVerified: true,
    };

    // Mock Firebase auth methods to prevent real Firebase calls
    (window as any).__E2E_MOCK_AUTH__ = {
      currentUser: {
        uid: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        emailVerified: true,
        getIdToken: () => Promise.resolve('e2e-mock-token'),
      },
      onAuthStateChanged: (callback: (user: any) => void) => {
        // Immediately call with mock user
        setTimeout(() => {
          callback({
            uid: mockUser.id,
            email: mockUser.email,
            displayName: mockUser.displayName,
            emailVerified: true,
            getIdToken: () => Promise.resolve('e2e-mock-token'),
          });
        }, 0);
        // Return unsubscribe function
        return () => {};
      },
    };
  }, user);
}

/**
 * Clear mock auth state.
 */
export async function clearMockAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (window as any).__E2E_AUTH_BYPASS__;
    delete (window as any).__E2E_MOCK_USER__;
    delete (window as any).__E2E_MOCK_AUTH__;
  });
}

/**
 * Wait for auth to be ready after page load.
 */
export async function waitForAuth(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      // Check if auth context is ready (loading is false)
      const authReady = document.querySelector('[data-auth-ready="true"]');
      // Or check if we're past the login page
      const notOnLogin = !window.location.pathname.includes('/login');
      return authReady || notOnLogin;
    },
    { timeout }
  );
}
