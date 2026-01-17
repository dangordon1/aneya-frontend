/**
 * Page object for the Appointments page.
 */

import { Page, Locator, expect } from '@playwright/test';

export class AppointmentsPage {
  readonly page: Page;
  readonly newPatientButton: Locator;
  readonly newAppointmentButton: Locator;
  readonly appointmentCards: Locator;
  readonly pastAppointmentsTab: Locator;
  readonly todayTab: Locator;
  readonly patientsTab: Locator;
  readonly appointmentsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newPatientButton = page.getByRole('button', { name: /create new patient/i });
    this.newAppointmentButton = page.getByRole('button', { name: /create new appointment/i });
    this.appointmentCards = page.locator('[data-testid="appointment-card"]');
    this.pastAppointmentsTab = page.getByRole('tab', { name: /past|completed/i });
    this.todayTab = page.getByRole('tab', { name: /today|upcoming/i });
    this.patientsTab = page.getByRole('button', { name: /^patients$/i });
    this.appointmentsTab = page.getByRole('button', { name: /^appointments$/i });
  }

  /**
   * Navigate to the appointments page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
    // Wait for auth to complete
    await this.page.waitForTimeout(2000);
  }

  /**
   * Navigate to the Patients tab.
   */
  async goToPatients(): Promise<void> {
    await this.patientsTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to the Appointments tab.
   */
  async goToAppointments(): Promise<void> {
    await this.appointmentsTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the new patient button to open the patient form.
   * Must be on the Patients tab first.
   */
  async clickNewPatient(): Promise<void> {
    // First navigate to Patients tab
    await this.goToPatients();
    await this.page.waitForTimeout(500);

    // Then click Create New Patient button
    const button = this.page.getByRole('button', { name: /create new patient/i }).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
  }

  /**
   * Find an appointment card by patient name.
   */
  async findAppointmentByPatientName(name: string): Promise<Locator> {
    return this.page.locator(`[data-testid="appointment-card"]:has-text("${name}")`);
  }

  /**
   * Start a consultation for a patient.
   */
  async startConsultation(patientName: string): Promise<void> {
    const card = this.page.locator('div').filter({ hasText: patientName }).first();
    await card.waitFor({ state: 'visible', timeout: 10000 });

    // Look for a start button within the card or near it
    const startButton = card.locator('button').filter({ hasText: /start|begin|consult/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
    } else {
      // Click the card itself to navigate
      await card.click();
    }
  }

  /**
   * Switch to past appointments view.
   */
  async viewPastAppointments(): Promise<void> {
    if (await this.pastAppointmentsTab.isVisible()) {
      await this.pastAppointmentsTab.click();
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Open a past appointment by patient name.
   */
  async openPastAppointment(patientName: string): Promise<void> {
    await this.viewPastAppointments();

    // Find the appointment card with the patient name
    const card = this.page.locator('div').filter({ hasText: patientName }).first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.click();
  }

  /**
   * Check if a patient appears in the appointments list.
   */
  async hasPatient(patientName: string): Promise<boolean> {
    const card = this.page.locator('div').filter({ hasText: patientName }).first();
    return await card.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Refresh the appointments list.
   */
  async refresh(): Promise<void> {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }
}
