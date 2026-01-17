/**
 * Page object for viewing consultation forms and exporting PDFs.
 */

import { Page, Locator, Download, expect } from '@playwright/test';

export class FormsPage {
  readonly page: Page;
  readonly viewFormsButton: Locator;
  readonly exportPdfButton: Locator;
  readonly downloadPdfButton: Locator;
  readonly formContainer: Locator;
  readonly formFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.viewFormsButton = page.getByRole('button', { name: /view form|forms|clinical form/i });
    this.exportPdfButton = page.getByRole('button', { name: /export.*pdf|download.*pdf|pdf/i });
    this.downloadPdfButton = page.getByRole('button', { name: /download|export/i });
    this.formContainer = page.locator('[data-testid="form-container"], .form-container, form').first();
    this.formFields = page.locator('input, select, textarea');
  }

  /**
   * Click to view forms for the current consultation.
   */
  async viewForms(): Promise<void> {
    // Try different button patterns
    const buttons = [
      this.page.getByRole('button', { name: /view form/i }),
      this.page.getByRole('button', { name: /clinical form/i }),
      this.page.getByRole('button', { name: /forms/i }),
      this.page.locator('button').filter({ hasText: /form/i }).first(),
    ];

    for (const button of buttons) {
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click();
        break;
      }
    }

    // Wait for form to load
    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for the form to be visible.
   */
  async waitForForm(timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector('form, [data-testid="form-container"], .form', { timeout });
  }

  /**
   * Check if the form has been auto-filled with data.
   */
  async hasAutoFilledData(): Promise<boolean> {
    // Look for any input with a value
    const inputs = this.page.locator('input[value]:not([value=""])');
    const textareas = this.page.locator('textarea:not(:empty)');

    const inputCount = await inputs.count();
    const textareaCount = await textareas.count();

    return inputCount > 0 || textareaCount > 0;
  }

  /**
   * Check if specific text appears in the form.
   */
  async formContainsText(text: string): Promise<boolean> {
    const element = this.page.locator(`text=${text}`).first();
    return await element.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Export the form as PDF and return the download.
   */
  async exportToPdf(): Promise<Download> {
    // Set up download listener before clicking
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });

    // Try different button patterns for PDF export
    const buttons = [
      this.page.getByRole('button', { name: /export.*pdf/i }),
      this.page.getByRole('button', { name: /download.*pdf/i }),
      this.page.getByRole('button', { name: /pdf/i }),
      this.page.getByRole('link', { name: /pdf/i }),
      this.page.locator('button, a').filter({ hasText: /pdf/i }).first(),
    ];

    for (const button of buttons) {
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click();
        break;
      }
    }

    // Wait for download to start
    const download = await downloadPromise;
    return download;
  }

  /**
   * Verify that a PDF was downloaded successfully.
   */
  async verifyPdfDownload(download: Download): Promise<boolean> {
    const filename = download.suggestedFilename();
    const path = await download.path();

    // Check filename contains PDF
    const isPdf = filename.toLowerCase().includes('.pdf') || filename.toLowerCase().includes('pdf');

    // Check file exists
    const fileExists = path !== null;

    return isPdf && fileExists;
  }

  /**
   * Get the form type displayed on the page.
   */
  async getFormType(): Promise<string | null> {
    // Look for form type indicators
    const formTypeIndicators = [
      this.page.locator('[data-testid="form-type"]').first(),
      this.page.locator('h1, h2, h3').filter({ hasText: /antenatal|obgyn|general|infertility/i }).first(),
    ];

    for (const indicator of formTypeIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return await indicator.textContent();
      }
    }

    return null;
  }

  /**
   * Save the form.
   */
  async saveForm(): Promise<void> {
    const saveButton = this.page.getByRole('button', { name: /save/i }).first();
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click();
      await this.page.waitForTimeout(1000);
    }
  }
}
