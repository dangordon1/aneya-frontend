/**
 * API interceptor for E2E tests.
 * Uses Playwright's page.route() to intercept and mock LLM/Sarvam API calls
 * while allowing Supabase calls to pass through.
 */

import { Page, Route } from '@playwright/test';
import { CACHED_RESPONSES } from '../fixtures/cached-responses';

const API_URL = 'http://localhost:8000';

/**
 * Set up API mocks for LLM and Sarvam endpoints.
 * Supabase calls are NOT intercepted - they go to the real database.
 */
export async function setupApiMocks(page: Page): Promise<void> {
  // Mock transcription endpoint
  await page.route(`${API_URL}/api/transcribe`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.transcribe),
    });
  });

  // Mock ElevenLabs diarization
  await page.route(`${API_URL}/api/diarize`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.diarize),
    });
  });

  // Mock diarized transcription
  await page.route(`${API_URL}/api/transcribe-diarized`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        segments: CACHED_RESPONSES.diarize.segments,
        language: 'en-IN',
      }),
    });
  });

  // Mock Sarvam diarization
  await page.route(`${API_URL}/api/diarize-sarvam`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.diarizeSarvam),
    });
  });

  // Mock speaker role identification
  await page.route(`${API_URL}/api/identify-speaker-roles`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.speakerRoles),
    });
  });

  // Mock consultation type detection
  await page.route(`${API_URL}/api/determine-consultation-type`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.consultationType),
    });
  });

  // Mock summarization
  await page.route(`${API_URL}/api/summarize`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.summarize),
    });
  });

  // Mock analyze-stream (SSE endpoint)
  await page.route(`${API_URL}/api/analyze-stream`, async (route) => {
    await mockSSEResponse(route, CACHED_RESPONSES.analyzeStream);
  });

  // Mock legacy analyze endpoint
  await page.route(`${API_URL}/api/analyze`, async (route) => {
    const diagnosesEvent = CACHED_RESPONSES.analyzeStream.find((e) => e.type === 'diagnoses');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        diagnoses: diagnosesEvent?.data.diagnoses || [],
        location: { country: 'India', detected: true },
        success: true,
      }),
    });
  });

  // Mock auto-fill form
  await page.route(`${API_URL}/api/auto-fill-consultation-form`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CACHED_RESPONSES.autoFillForm),
    });
  });

  // Mock form extraction
  await page.route(`${API_URL}/api/extract-form-fields`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        fields: CACHED_RESPONSES.autoFillForm.field_updates,
      }),
    });
  });

  // Health check - allow through or mock
  await page.route(`${API_URL}/health`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy' }),
    });
  });

  await page.route(`${API_URL}/api/health`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy' }),
    });
  });

  // Geolocation - mock to return India
  await page.route(`${API_URL}/api/geolocation`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ country: 'India', country_code: 'IN' }),
    });
  });
}

/**
 * Helper to create an SSE (Server-Sent Events) response.
 */
async function mockSSEResponse(
  route: Route,
  events: Array<{ type: string; data: unknown }>
): Promise<void> {
  const sseBody = events
    .map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
    .join('');

  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    headers: {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
    body: sseBody,
  });
}

/**
 * Add a custom mock for a specific endpoint.
 * Useful for testing error scenarios.
 */
export async function mockEndpoint(
  page: Page,
  path: string,
  response: unknown,
  status = 200
): Promise<void> {
  const fullPath = path.startsWith('http') ? path : `${API_URL}${path}`;

  await page.route(fullPath, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mock an endpoint to return an error.
 */
export async function mockEndpointError(
  page: Page,
  path: string,
  errorMessage: string,
  status = 500
): Promise<void> {
  await mockEndpoint(page, path, { error: errorMessage }, status);
}
