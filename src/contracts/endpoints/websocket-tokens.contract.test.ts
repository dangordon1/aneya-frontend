/**
 * Contract Tests for WebSocket Token Endpoints
 *
 * Validates the token endpoints and WebSocket message schemas.
 */

import { describe, it, expect } from 'vitest'

import {
  ElevenLabsTokenResponseSchema,
  ElevenLabsAudioChunkSchema,
  ElevenLabsSessionStartedSchema,
  ElevenLabsPartialTranscriptSchema,
  ElevenLabsCommittedTranscriptSchema,
  ElevenLabsInputErrorSchema,
  ElevenLabsReceivedMessageSchema,
} from '../websocket/elevenlabs.schema'

import {
  SarvamTokenResponseSchema,
  SarvamConfigSchema,
  SarvamAudioSchema,
  SarvamTranscriptSchema,
  SarvamErrorSchema,
  SarvamLanguageCodeSchema,
} from '../websocket/sarvam.schema'

describe('ElevenLabs WebSocket Contract', () => {
  describe('GET /api/get-transcription-token response', () => {
    it('should validate token response', () => {
      const mockResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        model: 'scribe_v2_realtime',
        provider: 'elevenlabs',
      }

      const result = ElevenLabsTokenResponseSchema.safeParse(mockResponse)
      expect(result.success).toBe(true)
    })

    it('should accept minimal token response', () => {
      const minimalResponse = {
        token: 'abc123',
      }

      const result = ElevenLabsTokenResponseSchema.safeParse(minimalResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('WebSocket messages sent', () => {
    it('should validate audio chunk message', () => {
      const audioChunk = {
        message_type: 'input_audio_chunk',
        audio_base_64: 'SGVsbG8gV29ybGQ=',
        commit: false,
        sample_rate: 16000,
      }

      const result = ElevenLabsAudioChunkSchema.safeParse(audioChunk)
      expect(result.success).toBe(true)
    })

    it('should validate commit audio chunk', () => {
      const commitChunk = {
        message_type: 'input_audio_chunk',
        audio_base_64: 'SGVsbG8gV29ybGQ=',
        commit: true,
        sample_rate: 16000,
      }

      const result = ElevenLabsAudioChunkSchema.safeParse(commitChunk)
      expect(result.success).toBe(true)
    })
  })

  describe('WebSocket messages received', () => {
    it('should validate session_started message', () => {
      const message = {
        message_type: 'session_started',
        language_code: 'en',
      }

      const result = ElevenLabsSessionStartedSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should validate partial_transcript message', () => {
      const message = {
        message_type: 'partial_transcript',
        text: 'The patient presents with...',
      }

      const result = ElevenLabsPartialTranscriptSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should validate committed_transcript message', () => {
      const message = {
        message_type: 'committed_transcript',
        text: 'The patient presents with chest pain.',
        language_code: 'en',
      }

      const result = ElevenLabsCommittedTranscriptSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should validate input_error message', () => {
      const message = {
        message_type: 'input_error',
        message: 'Invalid audio format',
      }

      const result = ElevenLabsInputErrorSchema.safeParse(message)
      expect(result.success).toBe(true)
    })

    it('should parse discriminated union of received messages', () => {
      const messages = [
        { message_type: 'session_started' },
        { message_type: 'partial_transcript', text: 'Hello' },
        { message_type: 'committed_transcript', text: 'Hello world' },
        { message_type: 'input_error' },
      ]

      for (const msg of messages) {
        const result = ElevenLabsReceivedMessageSchema.safeParse(msg)
        expect(result.success).toBe(true)
      }
    })
  })
})

describe('Sarvam WebSocket Contract', () => {
  describe('GET /api/get-sarvam-token response', () => {
    it('should validate token response with api_key', () => {
      const mockResponse = {
        api_key: 'sk_test_12345',
        provider: 'sarvam',
      }

      const result = SarvamTokenResponseSchema.safeParse(mockResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('supported language codes', () => {
    it('should validate all Indian language codes', () => {
      const languageCodes = [
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
      ]

      for (const code of languageCodes) {
        const result = SarvamLanguageCodeSchema.safeParse(code)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid language codes', () => {
      const invalidCodes = ['en-US', 'fr-FR', 'de-DE', 'invalid']

      for (const code of invalidCodes) {
        const result = SarvamLanguageCodeSchema.safeParse(code)
        expect(result.success).toBe(false)
      }
    })
  })

  describe('WebSocket config message', () => {
    it('should validate initial config', () => {
      const config = {
        config: {
          sample_rate: 16000,
          language_code: 'hi-IN',
          api_subscription_key: 'sk_test_12345',
          enable_itn: true,
          enable_automatic_punctuation: true,
        },
      }

      const result = SarvamConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should validate auto language detection config', () => {
      const config = {
        config: {
          sample_rate: 16000,
          language_code: 'auto',
          api_subscription_key: 'sk_test_12345',
          enable_itn: true,
          enable_automatic_punctuation: true,
        },
      }

      const result = SarvamConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })

  describe('WebSocket audio message', () => {
    it('should validate audio data message', () => {
      const audioMsg = {
        audio: {
          data: 'SGVsbG8gV29ybGQ=',
          sample_rate: 16000,
          encoding: 'audio/wav',
          input_audio_codec: 'pcm_s16le',
        },
      }

      const result = SarvamAudioSchema.safeParse(audioMsg)
      expect(result.success).toBe(true)
    })
  })

  describe('WebSocket transcript response', () => {
    it('should validate transcript with translation', () => {
      const transcript = {
        type: 'transcript',
        transcript: 'मरीज को सिरदर्द है',
        translated_text: 'The patient has a headache',
        language_code: 'hi-IN',
        is_final: true,
      }

      const result = SarvamTranscriptSchema.safeParse(transcript)
      expect(result.success).toBe(true)
    })

    it('should validate interim transcript', () => {
      const transcript = {
        type: 'transcript',
        transcript: 'मरीज को',
        is_final: false,
      }

      const result = SarvamTranscriptSchema.safeParse(transcript)
      expect(result.success).toBe(true)
    })

    it('should validate error response', () => {
      const error = {
        type: 'error',
        message: 'Audio quality too low',
        code: 'AUDIO_QUALITY_ERROR',
      }

      const result = SarvamErrorSchema.safeParse(error)
      expect(result.success).toBe(true)
    })
  })
})
