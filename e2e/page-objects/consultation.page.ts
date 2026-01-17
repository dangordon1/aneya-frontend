/**
 * Page object for the Consultation page (input and analysis).
 */

import { Page, Locator, expect } from '@playwright/test';
import { PREGNANCY_CONSULTATION } from '../fixtures/english-transcript';

export class ConsultationPage {
  readonly page: Page;
  readonly transcriptArea: Locator;
  readonly recordButton: Locator;
  readonly stopButton: Locator;
  readonly analyzeButton: Locator;
  readonly saveButton: Locator;
  readonly saveAndCloseButton: Locator;
  readonly reportSection: Locator;
  readonly diagnosisCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transcriptArea = page.locator('textarea').first();
    this.recordButton = page.getByRole('button', { name: /record|start recording/i });
    this.stopButton = page.getByRole('button', { name: /stop|stop recording/i });
    this.analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    this.saveButton = page.getByRole('button', { name: /^save$/i });
    this.saveAndCloseButton = page.getByRole('button', { name: /save.*close|finish|complete/i });
    this.reportSection = page.locator('[data-testid="report-section"], .report, [class*="diagnosis"]').first();
    this.diagnosisCards = page.locator('[data-testid="diagnosis-card"], .diagnosis-card, [class*="DiagnosisCard"]');
  }

  /**
   * Wait for the consultation page to load.
   */
  async waitForPage(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Inject a transcript directly into the textarea.
   * This bypasses audio recording for E2E tests.
   */
  async injectTranscript(transcript: string = PREGNANCY_CONSULTATION): Promise<void> {
    await this.waitForPage();

    // Find and fill the transcript textarea
    const textarea = this.page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill(transcript);

    // Trigger any input events
    await textarea.dispatchEvent('input');
    await textarea.dispatchEvent('change');

    // Wait a moment for state to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Start the analysis with the current transcript.
   */
  async startAnalysis(): Promise<void> {
    // Find the AI Diagnosis and Treatment button
    const button = this.page.locator('button').filter({ hasText: /ai diagnosis|diagnosis.*treatment|analyze|submit/i }).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();

    // Wait for analysis to complete (mocked responses should be fast)
    await this.page.waitForTimeout(2000);
  }

  /**
   * Wait for the analysis results to appear.
   */
  async waitForResults(timeout: number = 30000): Promise<void> {
    // Wait for any indication of results
    await this.page.waitForSelector(
      '[data-testid="diagnosis-card"], .diagnosis, [class*="Diagnosis"], [class*="result"], [class*="report"]',
      { timeout }
    );
  }

  /**
   * Check if diagnoses are visible.
   */
  async hasDiagnoses(): Promise<boolean> {
    const diagnosis = this.page.locator('text=/diagnosis|viral|respiratory|infection/i').first();
    return await diagnosis.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Get the number of diagnosis cards displayed.
   */
  async getDiagnosisCount(): Promise<number> {
    const cards = this.page.locator('[data-testid="diagnosis-card"], .diagnosis-card');
    return await cards.count();
  }

  /**
   * Save and close the consultation.
   */
  async saveAndClose(): Promise<void> {
    // Try different button patterns
    const buttons = [
      this.page.getByRole('button', { name: /save.*close/i }),
      this.page.getByRole('button', { name: /finish/i }),
      this.page.getByRole('button', { name: /complete/i }),
      this.page.getByRole('button', { name: /done/i }),
    ];

    for (const button of buttons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await button.click();
        break;
      }
    }

    // Wait for navigation
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if we're on the results/report page.
   */
  async isOnResultsPage(): Promise<boolean> {
    const indicators = [
      this.page.locator('text=/diagnosis|report|summary|results/i').first(),
      this.reportSection,
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }
}
