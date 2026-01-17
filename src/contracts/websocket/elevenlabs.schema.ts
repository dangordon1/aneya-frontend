/**
 * ElevenLabs WebSocket Schemas
 *
 * These schemas define the contract for ElevenLabs Scribe v2 Realtime WebSocket messages.
 * The WebSocket connection is to api.elevenlabs.io, but the token comes from our backend.
 */

import { z } from 'zod'

// Response from /api/get-transcription-token
export const ElevenLabsTokenResponseSchema = z.object({
  token: z.string(),
  model: z.literal('scribe_v2_realtime').optional(),
  provider: z.literal('elevenlabs').optional(),
})

// ============================================
// Messages SENT TO the WebSocket
// ============================================

// Audio chunk sent to ElevenLabs
export const ElevenLabsAudioChunkSchema = z.object({
  message_type: z.literal('input_audio_chunk'),
  audio_base_64: z.string(),
  commit: z.boolean(),
  sample_rate: z.number().int().default(16000),
})

// ============================================
// Messages RECEIVED FROM the WebSocket
// ============================================

// Session started confirmation
export const ElevenLabsSessionStartedSchema = z.object({
  message_type: z.literal('session_started'),
  language_code: z.string().optional(),
})

// Partial (interim) transcript
export const ElevenLabsPartialTranscriptSchema = z.object({
  message_type: z.literal('partial_transcript'),
  text: z.string(),
})

// Committed (final) transcript
export const ElevenLabsCommittedTranscriptSchema = z.object({
  message_type: z.literal('committed_transcript'),
  text: z.string(),
  language_code: z.string().optional(),
})

// Committed transcript with timestamps
export const ElevenLabsCommittedTranscriptWithTimestampsSchema = z.object({
  message_type: z.literal('committed_transcript_with_timestamps'),
  text: z.string(),
  language_code: z.string().optional(),
})

// Error from ElevenLabs
export const ElevenLabsInputErrorSchema = z.object({
  message_type: z.literal('input_error'),
  message: z.string().optional(),
})

// Union of all received message types
export const ElevenLabsReceivedMessageSchema = z.discriminatedUnion('message_type', [
  ElevenLabsSessionStartedSchema,
  ElevenLabsPartialTranscriptSchema,
  ElevenLabsCommittedTranscriptSchema,
  ElevenLabsCommittedTranscriptWithTimestampsSchema,
  ElevenLabsInputErrorSchema,
])

// Inferred TypeScript types
export type ElevenLabsTokenResponse = z.infer<typeof ElevenLabsTokenResponseSchema>
export type ElevenLabsAudioChunk = z.infer<typeof ElevenLabsAudioChunkSchema>
export type ElevenLabsSessionStarted = z.infer<typeof ElevenLabsSessionStartedSchema>
export type ElevenLabsPartialTranscript = z.infer<typeof ElevenLabsPartialTranscriptSchema>
export type ElevenLabsCommittedTranscript = z.infer<typeof ElevenLabsCommittedTranscriptSchema>
export type ElevenLabsCommittedTranscriptWithTimestamps = z.infer<typeof ElevenLabsCommittedTranscriptWithTimestampsSchema>
export type ElevenLabsInputError = z.infer<typeof ElevenLabsInputErrorSchema>
export type ElevenLabsReceivedMessage = z.infer<typeof ElevenLabsReceivedMessageSchema>
