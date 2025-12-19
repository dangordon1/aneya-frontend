import { useState } from 'react';
import { usePatientInvitations } from '../../hooks/usePatientInvitations';

export function InvitePatientsTab() {
  const { sendInvitation, sentInvitations, cancelInvitation, resendInvitation, loading, error } = usePatientInvitations();
  const [email, setEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;

    setSending(true);
    setSuccessMessage(null);
    const result = await sendInvitation({
      email: email.trim(),
      patient_name: patientName.trim() || null
    });
    setSending(false);

    if (result) {
      setSuccessMessage(`Invitation sent to ${email}`);
      setEmail('');
      setPatientName('');
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      await cancelInvitation(id);
    }
  };

  const handleResend = async (id: string) => {
    await resendInvitation(id);
    setSuccessMessage('Invitation resent successfully');
  };

  const pendingInvitations = sentInvitations.filter(inv => inv.status === 'pending');
  const otherInvitations = sentInvitations.filter(inv => inv.status !== 'pending');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Send Invitation Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-aneya-navy mb-4">Invite a Patient</h2>
        <p className="text-sm text-gray-600 mb-6">
          Send an invitation to a patient to connect with your practice. They will receive a link to create an account and book appointments with you.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="patient@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Name (optional)
            </label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="John Smith"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {sending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-aneya-navy mb-4">Pending Invitations</h3>
          <div className="space-y-3">
            {pendingInvitations.map(inv => (
              <div
                key={inv.id}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex justify-between items-start"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {inv.patient_name || inv.email}
                  </p>
                  {inv.patient_name && (
                    <p className="text-sm text-gray-500">{inv.email}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Sent: {formatDate(inv.created_at)} | Expires: {formatDate(inv.expires_at)}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleResend(inv.id)}
                    className="text-sm text-aneya-teal hover:text-aneya-teal/80 font-medium"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancel(inv.id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitation History */}
      {otherInvitations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-aneya-navy mb-4">Invitation History</h3>
          <div className="space-y-3">
            {otherInvitations.map(inv => (
              <div
                key={inv.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-start"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {inv.patient_name || inv.email}
                  </p>
                  {inv.patient_name && (
                    <p className="text-sm text-gray-500">{inv.email}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Sent: {formatDate(inv.created_at)}
                  </p>
                </div>
                {getStatusBadge(inv.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading invitations...</p>
        </div>
      ) : sentInvitations.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-aneya-navy mb-2">No Invitations Sent</h3>
          <p className="text-gray-500">
            Use the form above to invite patients to connect with your practice.
          </p>
        </div>
      )}
    </div>
  );
}
