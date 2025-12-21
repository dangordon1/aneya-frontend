import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { PatientInvitation, PatientInvitationWithDoctor, CreateInvitationInput } from '../types/database';

interface UsePatientInvitationsReturn {
  // For doctors: sent invitations
  sentInvitations: PatientInvitation[];
  // For patients: received invitation (from URL token)
  receivedInvitation: PatientInvitationWithDoctor | null;
  loading: boolean;
  error: string | null;
  // Doctor actions
  sendInvitation: (input: CreateInvitationInput) => Promise<PatientInvitation | null>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
  resendInvitation: (invitationId: string) => Promise<boolean>;
  // Patient actions
  acceptInvitation: (token: string) => Promise<boolean>;
  declineInvitation: (token: string) => Promise<boolean>;
  // Lookup
  getInvitationByToken: (token: string) => Promise<PatientInvitationWithDoctor | null>;
  refresh: () => Promise<void>;
}

export function usePatientInvitations(): UsePatientInvitationsReturn {
  const { doctorProfile, patientProfile, isDoctor } = useAuth();
  const [sentInvitations, setSentInvitations] = useState<PatientInvitation[]>([]);
  const [receivedInvitation, setReceivedInvitation] = useState<PatientInvitationWithDoctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!isDoctor || !doctorProfile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('patient_invitations')
        .select('*')
        .eq('doctor_id', doctorProfile.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSentInvitations(data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  }, [isDoctor, doctorProfile?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = async (input: CreateInvitationInput): Promise<PatientInvitation | null> => {
    setError(null);
    if (!doctorProfile?.id) {
      setError('No doctor profile available');
      return null;
    }

    try {
      // Check if invitation already exists for this email
      const { data: existing } = await supabase
        .from('patient_invitations')
        .select('id, status')
        .eq('doctor_id', doctorProfile.id)
        .eq('email', input.email)
        .eq('status', 'pending')
        .single();

      if (existing) {
        setError('An invitation has already been sent to this email');
        return null;
      }

      const { data, error: createError } = await supabase
        .from('patient_invitations')
        .insert({
          doctor_id: doctorProfile.id,
          email: input.email,
          patient_name: input.patient_name || null,
          status: 'pending'
        })
        .select()
        .single();

      if (createError) throw createError;

      setSentInvitations(prev => [data, ...prev]);

      // TODO: Email sending disabled - requires custom domain setup with Resend
      // When ready, uncomment and configure email sending via backend API

      return data;
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
      return null;
    }
  };

  const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('patient_invitations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      setSentInvitations(prev =>
        prev.map(inv => inv.id === invitationId ? { ...inv, status: 'cancelled' as const } : inv)
      );
      return true;
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
      return false;
    }
  };

  const resendInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      // Reset the invitation with a new expiry
      const { error: updateError } = await supabase
        .from('patient_invitations')
        .update({
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      await fetchInvitations();
      return true;
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
      return false;
    }
  };

  const getInvitationByToken = async (token: string): Promise<PatientInvitationWithDoctor | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('patient_invitations')
        .select(`
          *,
          doctor:doctors(*)
        `)
        .eq('token', token)
        .single();

      if (fetchError) throw fetchError;

      setReceivedInvitation(data);
      return data;
    } catch (err) {
      console.error('Error fetching invitation by token:', err);
      return null;
    }
  };

  const acceptInvitation = async (token: string): Promise<boolean> => {
    if (!patientProfile?.id) {
      setError('No patient profile available');
      return false;
    }

    try {
      // Get the invitation
      const invitation = await getInvitationByToken(token);
      if (!invitation) {
        setError('Invitation not found');
        return false;
      }

      if (invitation.status !== 'pending') {
        setError('This invitation is no longer valid');
        return false;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired');
        return false;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('patient_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          patient_id: patientProfile.id,
          updated_at: new Date().toISOString()
        })
        .eq('token', token);

      if (updateError) throw updateError;

      // Create patient-doctor relationship
      const { error: relationError } = await supabase
        .from('patient_doctor')
        .insert({
          patient_id: patientProfile.id,
          doctor_id: invitation.doctor_id,
          initiated_by: 'doctor',
          status: 'active'
        });

      if (relationError) throw relationError;

      return true;
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      return false;
    }
  };

  const declineInvitation = async (token: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('patient_invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('token', token);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
      return false;
    }
  };

  return {
    sentInvitations,
    receivedInvitation,
    loading,
    error,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    acceptInvitation,
    declineInvitation,
    getInvitationByToken,
    refresh: fetchInvitations
  };
}
