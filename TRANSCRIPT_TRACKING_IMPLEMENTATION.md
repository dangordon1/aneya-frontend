# Transcript Tracking Implementation

## Overview

This implementation adds the ability to:
1. Track both original language and translated (English) transcripts during voice recording
2. Summarize consultations using a backend API endpoint
3. Save both transcripts to the database when saving consultations

## Changes Made

### 1. Database Schema Updates

**File: `supabase_migration.sql`**
- Added `original_transcript TEXT` field to consultations table
- Added comments documenting the purpose of each transcript field

**File: `supabase_add_original_transcript.sql`** (NEW)
- Migration script to add the new field to existing databases
- Run this in Supabase SQL Editor to update production database

### 2. TypeScript Type Updates

**File: `src/types/database.ts`**
- Updated `Consultation` interface to include `original_transcript` field
- Updated `CreateConsultationInput` interface to include `original_transcript` field
- Added documentation comments explaining the purpose of each field

### 3. InputScreen Component Updates

**File: `src/components/InputScreen.tsx`**

#### State Management
- Added `originalTranscript` state to track original language text
- Added `isSummarizing` state for summarization loading state
- Updated `onAnalyze` callback signature to accept optional parameters:
  - `originalTranscript?: string`
  - `detectedLanguage?: string`

#### Transcript Tracking
- Added refs to track original language segments:
  - `originalCompletedTurnsRef` - completed original segments
  - `currentOriginalTurnRef` - current turn in original language
- Updated WebSocket message handlers to store both original and translated text:
  - `partial_transcript` handler stores both versions
  - `committed_transcript` handler commits both versions
  - `onclose` handler saves any remaining text for both versions

#### Summarization Feature
- Added `handleSummarize` function that calls `/api/summarize` endpoint
- Sends current consultation text to backend for summarization
- Replaces consultation text with summarized version
- Shows loading state while summarizing

#### UI Updates
- Added "Summarise Consultation" button above "Analyse Consultation"
- Button is disabled when:
  - Recording is in progress
  - Already summarizing
  - Consultation text is empty
- Shows loading spinner during summarization

### 4. App.tsx Updates

**File: `src/App.tsx`**

#### State Management
- Added state to track consultation data:
  - `consultationText` - final/translated consultation text
  - `originalTranscript` - original language transcript
  - `transcriptionLanguage` - detected language code

#### handleAnalyze Function
- Updated signature to accept optional transcript parameters
- Stores consultation text and transcripts for later save

#### handleSaveConsultation Function
- Updated to include all transcript fields when saving:
  - `consultation_text` - translated/final text (English)
  - `original_transcript` - original language if translation occurred
  - `transcription_language` - detected language code (e.g., "hi", "es")

#### handleStartNew Function
- Clears transcript state when starting new consultation

## Backend API Requirements

The frontend now expects a new backend endpoint:

### POST /api/summarize

**Request:**
```json
{
  "text": "Long consultation text to be summarized..."
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Concise summarized consultation text"
}
```

**Purpose:**
- Takes verbose consultation text (e.g., from voice transcription)
- Returns a concise, structured clinical summary
- Should preserve key clinical information while removing redundancy

## Database Migration Steps

1. **For new installations:**
   - Use the updated `supabase_migration.sql` which already includes the `original_transcript` field

2. **For existing databases:**
   - Run `supabase_add_original_transcript.sql` in Supabase SQL Editor
   - This will add the new column without affecting existing data

## Usage Flow

### Recording with Translation

1. User clicks "Record Consultation"
2. Speaks in any language (e.g., Hindi, Spanish)
3. ElevenLabs transcribes in original language
4. Backend translates to English (if translation is enabled)
5. Both versions are stored:
   - `consultation` (state) = translated English text
   - `originalTranscript` (state) = original language text
   - `detectedLanguage` = language code

### Summarization

1. User records or types a verbose consultation
2. Clicks "Summarise Consultation"
3. Frontend sends text to `/api/summarize`
4. Backend returns concise summary
5. Consultation text is replaced with summary
6. User can edit further if needed

### Saving

1. User completes analysis
2. Clicks "Save Consultation"
3. Both transcripts are saved to database:
   - `consultation_text` = final English text (may be summarized)
   - `original_transcript` = original language (if translation occurred)
   - `transcription_language` = detected language code

## Testing Checklist

- [ ] Run Supabase migration to add `original_transcript` field
- [ ] Implement `/api/summarize` endpoint in backend
- [ ] Test voice recording in English (no translation)
- [ ] Test voice recording in another language (e.g., Hindi) with translation
- [ ] Test summarization button with long consultation text
- [ ] Test saving consultation and verify both transcripts in database
- [ ] Verify language code is correctly stored

## Notes

- Original transcript is only stored when translation occurs
- If user records in English with translation disabled, `original_transcript` will be null
- If user types consultation manually, `original_transcript` will be null
- The summarization endpoint should be implemented to use Claude or similar LLM for intelligent summarization
