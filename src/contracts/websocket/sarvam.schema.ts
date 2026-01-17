/**
 * Sarvam AI WebSocket Schemas
 *
 * These schemas define the contract for Sarvam AI speech-to-text-translate WebSocket messages.
 * The WebSocket connection is to api.sarvam.ai for Indian language transcription.
 */

import { z } from 'zod'

// Supported Indian language codes
export const SarvamLanguageCodeSchema = z.enum([
  'auto',
  'en-IN',
  'hi-IN',
  'bn-IN',
  'gu-IN',
  'kn-IN',
  'ml-IN',
  'mr-IN',
  'od-IN',
  'pa-IN',
  'ta-IN',
  'te-IN',
  'other',
])

// Response from /api/get-sarvam-token (or /api/transcription-token)
export const SarvamTokenResponseSchema = z.object({
  token: z.string().optional(),
  api_key: z.string().optional(),
  provider: z.literal('sarvam').optional(),
})

// ============================================
// Messages SENT TO the WebSocket
// ============================================

// Initial configuration sent on connection open
export const SarvamConfigSchema = z.object({
  config: z.object({
    sample_rate: z.number().int().default(16000),
    language_code: SarvamLanguageCodeSchema,
    api_subscription_key: z.string(),
    enable_itn: z.boolean().default(true), // Inverse Text Normalization
    enable_automatic_punctuation: z.boolean().default(true),
  }),
})

// Audio data sent continuously during recording
export const SarvamAudioSchema = z.object({
  audio: z.object({
    data: z.string(), // Base64-encoded PCM audio
    sample_rate: z.number().int().default(16000),
    encoding: z.literal('audio/wav'),
    input_audio_codec: z.literal('pcm_s16le'),
  }),
})

// Union of sent message types
export const SarvamSentMessageSchema = z.union([
  SarvamConfigSchema,
  SarvamAudioSchema,
])

// ============================================
// Messages RECEIVED FROM the WebSocket
// ============================================

// Transcript response from Sarvam
export const SarvamTranscriptSchema = z.object({
  type: z.literal('transcript'),
  transcript: z.string(),
  translated_text: z.string().optional(),
  language_code: z.string().optional(),
  is_final: z.boolean(),
})

// Error response from Sarvam
export const SarvamErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  code: z.string().optional(),
})

// Union of received message types
export const SarvamReceivedMessageSchema = z.discriminatedUnion('type', [
  SarvamTranscriptSchema,
  SarvamErrorSchema,
])

// Inferred TypeScript types
export type SarvamLanguageCode = z.infer<typeof SarvamLanguageCodeSchema>
export type SarvamTokenResponse = z.infer<typeof SarvamTokenResponseSchema>
export type SarvamConfig = z.infer<typeof SarvamConfigSchema>
export type SarvamAudio = z.infer<typeof SarvamAudioSchema>
export type SarvamSentMessage = z.infer<typeof SarvamSentMessageSchema>
export type SarvamTranscript = z.infer<typeof SarvamTranscriptSchema>
export type SarvamError = z.infer<typeof SarvamErrorSchema>
export type SarvamReceivedMessage = z.infer<typeof SarvamReceivedMessageSchema>
