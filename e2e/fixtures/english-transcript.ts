/**
 * English consultation transcript fixtures for E2E tests.
 * Copied from aneya-backend/tests/fixtures/transcripts/english.py
 */

// Pregnancy consultation transcript
export const PREGNANCY_CONSULTATION = `1. [2.00s - 4.56s] speaker_0:
     Okay. Come. What's your name?

  2. [4.56s - 7.20s] speaker_1:
     My name is Selene.

  3. [7.20s - 9.70s] speaker_0:
     Okay. From which place?

  4. [9.70s - 12.50s] speaker_1:
     I'm from London, but I'm in Bangalore for two months.

  5. [14.48s - 17.98s] speaker_0:
     Two months? Okay. Any problem? What's your problem?

  6. [17.98s - 25.90s] speaker_1:
     So, I'm six weeks pregnant, but I've been getting flu, lots of coughs, lots of cold.

  7. [25.90s - 26.26s] speaker_0:
     Mm-hmm.

  8. [26.26s - 39.40s] speaker_1:
     I'm coughing so much I can't sleep all night. I've had fever, vomiting, very sore throat, runny nose.

  9. [39.40s - 39.68s] speaker_0:
     Okay. Since when?

  10. [39.68s - 45.02s] speaker_1:
     Since Wednesday and it's now Sunday, so five days.

  11. [45.02s - 47.66s] speaker_0:
     Okay. Since five days, you have all these symptoms? Have you taken anything for that?

  12. [92.04s - 93.78s] speaker_1:
     Only paracetamol.

  13. [93.78s - 97.10s] speaker_0:
     Only paracetamol? Okay. How much was the dosage?

  14. [97.10s - 103.66s] speaker_1:
     One gram in the morning, one gram in the afternoon.`;

// Pre-diarized segments for the pregnancy consultation
export const PREGNANCY_SEGMENTS = [
  { speaker_id: 'speaker_0', text: "What's your name?", start_time: 2.0, end_time: 4.56 },
  { speaker_id: 'speaker_1', text: 'My name is Selene.', start_time: 4.56, end_time: 7.2 },
  { speaker_id: 'speaker_0', text: "Any problem? What's your problem?", start_time: 14.48, end_time: 17.98 },
  { speaker_id: 'speaker_1', text: "I'm six weeks pregnant, but I've been getting flu, lots of coughs, lots of cold.", start_time: 17.98, end_time: 25.9 },
  { speaker_id: 'speaker_1', text: "I'm coughing so much I can't sleep all night. I've had fever, vomiting, very sore throat, runny nose.", start_time: 26.26, end_time: 39.4 },
  { speaker_id: 'speaker_0', text: 'Have you taken anything for that?', start_time: 45.02, end_time: 47.66 },
  { speaker_id: 'speaker_1', text: 'Only paracetamol.', start_time: 92.04, end_time: 93.78 },
  { speaker_id: 'speaker_1', text: 'One gram in the morning, one gram in the afternoon.', start_time: 97.1, end_time: 103.66 },
];

// Test marker to identify E2E test data
export const E2E_TEST_MARKER = '[E2E-TEST]';
