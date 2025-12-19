import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Message, Conversation, CreateMessageInput, MessageSenderType } from '../types/database';

interface UseMessagesReturn {
  conversations: Conversation[];
  messages: Message[];
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  selectedConversation: Conversation | null;
  unreadCount: number;
  selectConversation: (conversation: Conversation) => void;
  sendMessage: (content: string, recipientId: string, recipientType: MessageSenderType) => Promise<Message | null>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export function useMessages(): UseMessagesReturn {
  const { patientProfile, doctorProfile, isPatient } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentUserId = isPatient ? patientProfile?.id : doctorProfile?.id;
  const currentUserType: MessageSenderType = isPatient ? 'patient' : 'doctor';

  // Fetch conversations (list of people user has messaged with)
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);

    try {
      // Get all messages where user is sender or recipient
      const { data: allMessages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_type.eq.${currentUserType},sender_id.eq.${currentUserId}),and(recipient_type.eq.${currentUserType},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      for (const msg of allMessages || []) {
        const isFromMe = msg.sender_type === currentUserType && msg.sender_id === currentUserId;
        const otherPartyId = isFromMe ? msg.recipient_id : msg.sender_id;
        const otherPartyType = isFromMe ? msg.recipient_type : msg.sender_type;
        const conversationKey = `${otherPartyType}-${otherPartyId}`;

        if (!conversationMap.has(conversationKey)) {
          conversationMap.set(conversationKey, {
            id: conversationKey,
            other_party_id: otherPartyId,
            other_party_name: '', // Will be filled later
            other_party_type: otherPartyType,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }

        // Count unread messages
        if (!isFromMe && !msg.read_at) {
          const conv = conversationMap.get(conversationKey)!;
          conv.unread_count++;
        }
      }

      // Fetch names for all conversation partners
      const conversations = Array.from(conversationMap.values());

      for (const conv of conversations) {
        if (conv.other_party_type === 'doctor') {
          const { data: doctor } = await supabase
            .from('doctors')
            .select('name')
            .eq('id', conv.other_party_id)
            .single();
          conv.other_party_name = doctor?.name || 'Doctor';
        } else {
          const { data: patient } = await supabase
            .from('patients')
            .select('name')
            .eq('id', conv.other_party_id)
            .single();
          conv.other_party_name = patient?.name || 'Patient';
        }
      }

      // Sort by most recent message
      conversations.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setConversations(conversations);

      // Calculate total unread
      const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
      setUnreadCount(totalUnread);

    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserType]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !selectedConversation) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);

    try {
      const otherPartyId = selectedConversation.other_party_id;
      const otherPartyType = selectedConversation.other_party_type;

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_type.eq.${currentUserType},sender_id.eq.${currentUserId},recipient_type.eq.${otherPartyType},recipient_id.eq.${otherPartyId}),` +
          `and(sender_type.eq.${otherPartyType},sender_id.eq.${otherPartyId},recipient_type.eq.${currentUserType},recipient_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);

      // Mark unread messages as read
      const unreadIds = (data || [])
        .filter(m => m.recipient_type === currentUserType && m.recipient_id === currentUserId && !m.read_at)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUserId, currentUserType, selectedConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Check if this message is relevant to us
          const isRelevant =
            (newMessage.sender_type === currentUserType && newMessage.sender_id === currentUserId) ||
            (newMessage.recipient_type === currentUserType && newMessage.recipient_id === currentUserId);

          if (isRelevant) {
            // Refresh conversations to update last message and unread count
            fetchConversations();
            // If the message is part of current conversation, add it
            if (selectedConversation) {
              const otherPartyId = selectedConversation.other_party_id;
              const otherPartyType = selectedConversation.other_party_type;
              const isPartOfConversation =
                (newMessage.sender_type === otherPartyType && newMessage.sender_id === otherPartyId) ||
                (newMessage.recipient_type === otherPartyType && newMessage.recipient_id === otherPartyId);

              if (isPartOfConversation) {
                setMessages(prev => [...prev, newMessage]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentUserType, selectedConversation, fetchConversations]);

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const sendMessage = async (
    content: string,
    recipientId: string,
    recipientType: MessageSenderType
  ): Promise<Message | null> => {
    if (!currentUserId) {
      setError('Not authenticated');
      return null;
    }

    try {
      const messageData: CreateMessageInput = {
        sender_type: currentUserType,
        sender_id: currentUserId,
        recipient_type: recipientType,
        recipient_id: recipientId,
        content,
        message_type: 'text',
      };

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local messages if in current conversation
      if (selectedConversation &&
          selectedConversation.other_party_id === recipientId &&
          selectedConversation.other_party_type === recipientType) {
        setMessages(prev => [...prev, data]);
      }

      // Refresh conversations to update last message
      await fetchConversations();

      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', messageIds);

      if (updateError) throw updateError;

      // Update local unread count
      setConversations(prev =>
        prev.map(c => {
          if (selectedConversation && c.id === selectedConversation.id) {
            return { ...c, unread_count: 0 };
          }
          return c;
        })
      );

      // Recalculate total unread
      const newTotalUnread = conversations.reduce((sum, c) => {
        if (selectedConversation && c.id === selectedConversation.id) {
          return sum;
        }
        return sum + c.unread_count;
      }, 0);
      setUnreadCount(newTotalUnread);

    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  return {
    conversations,
    messages,
    loading,
    loadingMessages,
    error,
    selectedConversation,
    unreadCount,
    selectConversation,
    sendMessage,
    markAsRead,
    refresh: fetchConversations,
    refreshMessages: fetchMessages,
  };
}
