/**
 * Page object for the Patient Form (create/edit patient).
 */

import { Page, Locator, expect } from '@playwright/test';

export class PatientFormPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly sexSelect: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly dobInput: Locator;
  readonly ageInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use locators within the modal dialog specifically
    const modal = page.locator('[role="dialog"], .fixed.inset-0 > div > div, form');
    this.nameInput = modal.locator('input#name');
    this.sexSelect = modal.locator('select#sex');
    this.phoneInput = modal.locator('input#phone');
    this.emailInput = modal.locator('input#email, input[type="email"]').first();
    this.dobInput = modal.locator('input[type="date"]').first();
    this.ageInput = modal.locator('input#age_years, input[placeholder*="age" i]').first();
    this.saveButton = page.locator('form button[type="submit"], form').getByRole('button', { name: /^save$/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
  }

  /**
   * Wait for the form to be visible.
   */
  async waitForForm(): Promise<void> {
    // Wait for the form or modal to appear
    await this.page.waitForSelector('form, [role="dialog"], .modal', { timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill in patient details.
   */
  async fillPatientDetails(patient: {
    name: string;
    sex: 'Male' | 'Female' | 'Other';
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    age?: number;
  }): Promise<void> {
    await this.waitForForm();

    // Fill name
    await this.nameInput.fill(patient.name);

    // Select sex
    if (await this.sexSelect.isVisible()) {
      await this.sexSelect.selectOption(patient.sex);
    } else {
      // Try radio buttons or other sex selection methods
      const sexOption = this.page.locator(`input[value="${patient.sex}"], label:has-text("${patient.sex}")`).first();
      if (await sexOption.isVisible()) {
        await sexOption.click();
      }
    }

    // Fill phone if provided
    if (patient.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.fill(patient.phone);
    }

    // Fill email if provided
    if (patient.email && await this.emailInput.isVisible()) {
      await this.emailInput.fill(patient.email);
    }

    // Fill date of birth or age
    if (patient.dateOfBirth && await this.dobInput.isVisible()) {
      await this.dobInput.fill(patient.dateOfBirth);
    } else if (patient.age && await this.ageInput.isVisible()) {
      await this.ageInput.fill(patient.age.toString());
    }
  }

  /**
   * Save the patient form.
   */
  async save(): Promise<void> {
    await this.saveButton.click();

    // Wait for the form/modal to close
    await this.page.waitForTimeout(1000);

    // Wait for any loading states to complete
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Cancel and close the form.
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if there are validation errors.
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorMessage = this.page.locator('[class*="error"], [role="alert"], .text-red-500').first();
    return await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
  }
}
