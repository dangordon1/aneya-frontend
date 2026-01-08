import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { AllergyManager } from './AllergyManager'

// Mock the hook
const mockGetAllergies = vi.fn()
const mockCreateAllergy = vi.fn()
const mockUpdateAllergy = vi.fn()

vi.mock('../hooks/usePatientAllergies', () => ({
  usePatientAllergies: () => ({
    allergies: [],
    loading: false,
    error: null,
    getAllergies: mockGetAllergies,
    createAllergy: mockCreateAllergy,
    updateAllergy: mockUpdateAllergy,
  }),
}))

describe('AllergyManager', () => {
  const defaultProps = {
    patientId: 'patient-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateAllergy.mockResolvedValue({ id: 'allergy-123' })
  })

  describe('rendering', () => {
    it('renders Allergies heading', () => {
      render(<AllergyManager {...defaultProps} />)
      expect(screen.getByText('Allergies')).toBeInTheDocument()
    })

    it('renders Add Allergy button when not readOnly', () => {
      render(<AllergyManager {...defaultProps} />)
      expect(screen.getByRole('button', { name: /Add Allergy/i })).toBeInTheDocument()
    })

    it('does not render Add Allergy button when readOnly', () => {
      render(<AllergyManager {...defaultProps} readOnly />)
      expect(screen.queryByRole('button', { name: /Add Allergy/i })).not.toBeInTheDocument()
    })

    it('shows No Known Allergies when list is empty', () => {
      render(<AllergyManager {...defaultProps} />)
      expect(screen.getByText('No Known Allergies')).toBeInTheDocument()
    })

    it('calls getAllergies on mount', () => {
      render(<AllergyManager {...defaultProps} />)
      expect(mockGetAllergies).toHaveBeenCalledWith('patient-123', 'active')
    })
  })

  describe('add allergy form', () => {
    it('shows form when Add Allergy clicked', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      expect(screen.getByText('Add New Allergy')).toBeInTheDocument()
    })

    it('shows allergen input field', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      expect(screen.getByPlaceholderText(/Penicillin/i)).toBeInTheDocument()
    })

    it('shows category dropdown', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      expect(screen.getByText('Category')).toBeInTheDocument()
      const comboboxes = screen.getAllByRole('combobox')
      expect(comboboxes.length).toBeGreaterThanOrEqual(2) // Category and Severity dropdowns
    })

    it('shows severity dropdown', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      expect(screen.getByText('Severity')).toBeInTheDocument()
    })

    it('shows reaction input', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      expect(screen.getByPlaceholderText(/Rash, difficulty breathing/i)).toBeInTheDocument()
    })

    it('toggles form visibility', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))
      expect(screen.getByText('Add New Allergy')).toBeInTheDocument()

      // Button text changes to Cancel when form is open (header button)
      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i })
      await user.click(cancelButtons[0]) // Click the header toggle button
      expect(screen.queryByText('Add New Allergy')).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls createAllergy with form data', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      await user.type(screen.getByPlaceholderText(/Penicillin/i), 'Penicillin')

      // Select category
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'medication')
      await user.selectOptions(selects[1], 'severe')

      await user.type(screen.getByPlaceholderText(/Rash, difficulty breathing/i), 'Anaphylaxis')

      // Click the submit button (not the Cancel button)
      const addButtons = screen.getAllByRole('button', { name: /Add Allergy/i })
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit')
      await user.click(submitButton!)

      await waitFor(() => {
        expect(mockCreateAllergy).toHaveBeenCalledWith(
          expect.objectContaining({
            patient_id: 'patient-123',
            allergen: 'Penicillin',
            allergen_category: 'medication',
            severity: 'severe',
            reaction: 'Anaphylaxis',
            status: 'active',
          })
        )
      })
    })

    it('clears form and hides it after successful submission', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))
      await user.type(screen.getByPlaceholderText(/Penicillin/i), 'Penicillin')

      const addButtons = screen.getAllByRole('button', { name: /Add Allergy/i })
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit')
      await user.click(submitButton!)

      await waitFor(() => {
        expect(screen.queryByText('Add New Allergy')).not.toBeInTheDocument()
      })
    })

    it('does not submit without allergen', async () => {
      const { user } = render(<AllergyManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Allergy/i }))

      const addButtons = screen.getAllByRole('button', { name: /Add Allergy/i })
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit')
      await user.click(submitButton!)

      expect(mockCreateAllergy).not.toHaveBeenCalled()
    })
  })

  describe('styling', () => {
    it('renders with space-y-4 class', () => {
      const { container } = render(<AllergyManager {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('space-y-4')
    })
  })
})
