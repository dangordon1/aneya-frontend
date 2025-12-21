import { useState } from 'react';
import { usePatientInvitations } from '../../hooks/usePatientInvitations';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvitePatientModal({ onClose, onSuccess }: Props) {
  const { sendInvitation, sentInvitations, cancelInvitation, resendInvitation, loading, error } = usePatientInvitations();
  const [email, setEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'send' | 'pending'>('send');

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
      onSuccess?.();
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-aneya-navy text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Invite Patient</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'send'
                ? 'text-aneya-teal border-b-2 border-aneya-teal'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Send Invitation
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-aneya-teal border-b-2 border-aneya-teal'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sent Invitations ({sentInvitations.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
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

          {activeTab === 'send' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Send an invitation to a patient to connect with your practice. They will receive a link to create an account and book appointments with you.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="patient@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !email.trim()}
                className="w-full py-2.5 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {sending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal"></div>
                </div>
              ) : sentInvitations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No invitations sent yet
                </p>
              ) : (
                <>
                  {pendingInvitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Pending</h4>
                      <div className="space-y-2">
                        {pendingInvitations.map(inv => (
                          <div
                            key={inv.id}
                            className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {inv.patient_name || inv.email}
                                </p>
                                {inv.patient_name && (
                                  <p className="text-xs text-gray-500">{inv.email}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  Sent: {formatDate(inv.created_at)} | Expires: {formatDate(inv.expires_at)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleResend(inv.id)}
                                  className="text-xs text-aneya-teal hover:text-aneya-teal/80"
                                >
                                  Resend
                                </button>
                                <button
                                  onClick={() => handleCancel(inv.id)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherInvitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">History</h4>
                      <div className="space-y-2">
                        {otherInvitations.map(inv => (
                          <div
                            key={inv.id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {inv.patient_name || inv.email}
                                </p>
                                {inv.patient_name && (
                                  <p className="text-xs text-gray-500">{inv.email}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  Sent: {formatDate(inv.created_at)}
                                </p>
                              </div>
                              {getStatusBadge(inv.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
