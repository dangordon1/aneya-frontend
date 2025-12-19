import { useState, useRef, useEffect, useMemo } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { usePatientDoctors } from '../../hooks/usePatientDoctors';
import { usePatients } from '../../hooks/usePatients';
import type { Conversation, MessageSenderType } from '../../types/database';

export function DoctorMessages() {
  const {
    conversations,
    messages,
    loading,
    loadingMessages,
    selectedConversation,
    selectConversation,
    sendMessage,
  } = useMessages();

  const { myPatients, acceptPatientRequest, rejectPatientRequest, refresh: refreshPatients } = usePatientDoctors();
  const { patients: allPatients } = usePatients();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get active patients from patient-doctor relationships
  const relationshipPatients = myPatients.filter(rel => rel.status === 'active');
  // Get pending care requests
  const pendingRequests = myPatients.filter(rel => rel.status === 'pending' && rel.initiated_by === 'patient');

  // Combine all patients: those from relationships + those created by doctor
  // Deduplicate by patient ID
  const allMessagablePatients = useMemo(() => {
    const patientMap = new Map<string, { id: string; name: string; email: string | null }>();

    // Add patients from relationships
    relationshipPatients.forEach(rel => {
      patientMap.set(rel.patient.id, {
        id: rel.patient.id,
        name: rel.patient.name,
        email: rel.patient.email
      });
    });

    // Add patients from the patients table (created by this doctor)
    allPatients.forEach(patient => {
      if (!patientMap.has(patient.id)) {
        patientMap.set(patient.id, {
          id: patient.id,
          name: patient.name,
          email: patient.email
        });
      }
    });

    return Array.from(patientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [relationshipPatients, allPatients]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      await sendMessage(
        newMessage.trim(),
        selectedConversation.other_party_id,
        selectedConversation.other_party_type
      );
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = (patientId: string, patientName: string) => {
    const newConv: Conversation = {
      id: `patient-${patientId}`,
      other_party_id: patientId,
      other_party_name: patientName,
      other_party_type: 'patient' as MessageSenderType,
      last_message: '',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    selectConversation(newConv);
    setShowNewChat(false);
  };

  const handleAcceptRequest = async (relationshipId: string) => {
    setProcessingRequest(relationshipId);
    try {
      await acceptPatientRequest(relationshipId);
      await refreshPatients();
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (relationshipId: string) => {
    setProcessingRequest(relationshipId);
    try {
      await rejectPatientRequest(relationshipId);
      await refreshPatients();
    } catch (err) {
      console.error('Failed to reject request:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-GB', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
  };

  // Show conversation view
  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => selectConversation(null as any)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 bg-aneya-teal/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="font-medium text-aneya-navy">{selectedConversation.other_party_name}</h3>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-aneya-cream">
          {loadingMessages ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isFromMe = msg.sender_type === 'doctor';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isFromMe
                        ? 'bg-aneya-teal text-white rounded-br-md'
                        : 'bg-white text-aneya-navy rounded-bl-md shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isFromMe ? 'text-white/70' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-aneya-teal"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 bg-aneya-teal text-white rounded-full flex items-center justify-center hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main messages view
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Care Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-yellow-200">
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Pending Care Requests ({pendingRequests.length})
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                These patients have requested to be under your care
              </p>
            </div>
            <div className="divide-y divide-yellow-200">
              {pendingRequests.map((rel) => (
                <div key={rel.id} className="p-4 flex items-center gap-4 bg-white">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-aneya-navy">{rel.patient.name}</h4>
                    <p className="text-sm text-gray-500">{rel.patient.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(rel.id)}
                      disabled={processingRequest === rel.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processingRequest === rel.id ? 'Processing...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(rel.id)}
                      disabled={processingRequest === rel.id}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-aneya-navy">Messages</h2>
        <button
          onClick={() => setShowNewChat(true)}
          className="px-4 py-2 bg-aneya-teal text-white text-sm font-medium rounded-lg hover:bg-aneya-teal/90 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Message
        </button>
      </div>

      {showNewChat ? (
        /* New Chat - Select Patient */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-aneya-navy">Start a Conversation</h3>
              <p className="text-sm text-gray-500">Select a patient to message</p>
            </div>
            <button
              onClick={() => setShowNewChat(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {allMessagablePatients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No patients yet. Create patients in the Patients tab first.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {allMessagablePatients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => handleStartNewChat(patient.id, patient.name)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 text-left"
                >
                  <div className="w-10 h-10 bg-aneya-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-aneya-navy">{patient.name}</h4>
                    <p className="text-sm text-gray-500">{patient.email || 'No email'}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-semibold text-aneya-navy mb-2">No Messages Yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Start a conversation with one of your patients.
          </p>
          <button
            onClick={() => setShowNewChat(true)}
            className="bg-aneya-teal text-white px-6 py-2 rounded-lg hover:bg-aneya-teal/90"
          >
            New Message
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 text-left"
              >
                <div className="w-12 h-12 bg-aneya-teal/10 rounded-full flex items-center justify-center flex-shrink-0 relative">
                  <svg className="w-6 h-6 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className={`font-medium ${conv.unread_count > 0 ? 'text-aneya-navy' : 'text-gray-700'}`}>
                      {conv.other_party_name}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {conv.last_message || 'No messages yet'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
