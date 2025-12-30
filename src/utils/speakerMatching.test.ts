/**
 * Unit tests for speaker matching across audio chunks
 *
 * Tests the multi-speaker matching algorithm that handles 3+ speakers
 */

import { describe, it, expect } from 'vitest';
import { calculateOverlapStats, matchSpeakersAcrossChunks, SpeakerStats } from './speakerMatching';

describe('calculateOverlapStats', () => {
  it('should calculate stats for 2 speakers in overlap region', () => {
    const segments = [
      { speaker_id: 'speaker_0', text: 'Hello how are you', start_time: 5.0, end_time: 7.0 },
      { speaker_id: 'speaker_1', text: 'I am doing well', start_time: 7.5, end_time: 9.0 },
      { speaker_id: 'speaker_0', text: 'That is good', start_time: 9.5, end_time: 11.0 },
    ];

    const stats = calculateOverlapStats(segments, 5.0, 12.0);

    expect(stats['speaker_0']).toBeDefined();
    expect(stats['speaker_1']).toBeDefined();
    expect(stats['speaker_0'].segment_count).toBe(2);
    expect(stats['speaker_1'].segment_count).toBe(1);
  });

  it('should filter segments outside overlap region', () => {
    const segments = [
      { speaker_id: 'speaker_0', text: 'Before overlap', start_time: 0.0, end_time: 2.0 },
      { speaker_id: 'speaker_1', text: 'In overlap', start_time: 5.0, end_time: 7.0 },
      { speaker_id: 'speaker_0', text: 'After overlap', start_time: 15.0, end_time: 17.0 },
    ];

    const stats = calculateOverlapStats(segments, 5.0, 10.0);

    // Only speaker_1 should be in the overlap
    expect(stats['speaker_1']).toBeDefined();
    expect(stats['speaker_0']).toBeUndefined();
  });

  it('should handle 3+ speakers in overlap', () => {
    const segments = [
      { speaker_id: 'speaker_0', text: 'Doctor speaking', start_time: 5.0, end_time: 7.0 },
      { speaker_id: 'speaker_1', text: 'Patient speaking', start_time: 7.5, end_time: 9.0 },
      { speaker_id: 'speaker_2', text: 'Family member speaking', start_time: 9.5, end_time: 11.0 },
      { speaker_id: 'speaker_3', text: 'Nurse speaking', start_time: 11.5, end_time: 13.0 },
    ];

    const stats = calculateOverlapStats(segments, 5.0, 14.0);

    expect(Object.keys(stats).length).toBe(4);
    expect(stats['speaker_0']).toBeDefined();
    expect(stats['speaker_1']).toBeDefined();
    expect(stats['speaker_2']).toBeDefined();
    expect(stats['speaker_3']).toBeDefined();
  });
});

describe('matchSpeakersAcrossChunks', () => {
  it('should match 2 speakers correctly (backward compatibility)', () => {
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 10, duration: 5.0, segment_count: 2 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 8, duration: 4.0, segment_count: 2 },
    };

    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 11, duration: 5.2, segment_count: 2 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 7, duration: 3.8, segment_count: 2 },
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    // Should match based on similarity
    expect(mapping.get('speaker_0')).toBe('speaker_0');
    expect(mapping.get('speaker_1')).toBe('speaker_1');
  });

  it('should match 3 speakers with high similarity', () => {
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 20, duration: 8.0, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 15, duration: 6.0, segment_count: 2 },
      'speaker_2': { speaker_id: 'speaker_2', word_count: 10, duration: 4.0, segment_count: 2 },
    };

    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 22, duration: 8.5, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 16, duration: 6.2, segment_count: 2 },
      'speaker_2': { speaker_id: 'speaker_2', word_count: 9, duration: 3.8, segment_count: 2 },
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    expect(mapping.size).toBe(3);
    expect(mapping.get('speaker_0')).toBe('speaker_0');
    expect(mapping.get('speaker_1')).toBe('speaker_1');
    expect(mapping.get('speaker_2')).toBe('speaker_2');
  });

  it('should handle new speaker joining conversation', () => {
    // Previous chunk: 2 speakers
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 20, duration: 8.0, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 15, duration: 6.0, segment_count: 2 },
    };

    // Current chunk: 3 speakers (new speaker joined)
    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 22, duration: 8.5, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 16, duration: 6.2, segment_count: 2 },
      'speaker_2': { speaker_id: 'speaker_2', word_count: 5, duration: 2.0, segment_count: 1 },  // NEW
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    expect(mapping.size).toBe(3);
    // Original speakers matched
    expect(mapping.get('speaker_0')).toBe('speaker_0');
    expect(mapping.get('speaker_1')).toBe('speaker_1');
    // New speaker keeps its ID (no previous match)
    expect(mapping.get('speaker_2')).toBe('speaker_2');
  });

  it('should handle speaker leaving conversation', () => {
    // Previous chunk: 3 speakers
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 20, duration: 8.0, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 15, duration: 6.0, segment_count: 2 },
      'speaker_2': { speaker_id: 'speaker_2', word_count: 10, duration: 4.0, segment_count: 2 },
    };

    // Current chunk: 2 speakers (one left)
    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 22, duration: 8.5, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 16, duration: 6.2, segment_count: 2 },
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    expect(mapping.size).toBe(2);
    expect(mapping.get('speaker_0')).toBe('speaker_0');
    expect(mapping.get('speaker_1')).toBe('speaker_1');
    // speaker_2 not in current chunk, so not in mapping
  });

  it('should match speakers even with ID changes', () => {
    // Sarvam might assign different IDs in each chunk
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 20, duration: 8.0, segment_count: 3 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 15, duration: 6.0, segment_count: 2 },
    };

    // Same speakers but IDs swapped
    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 16, duration: 6.2, segment_count: 2 },  // Was speaker_1
      'speaker_1': { speaker_id: 'speaker_1', word_count: 22, duration: 8.5, segment_count: 3 },  // Was speaker_0
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    // Should match based on similarity, not ID
    // speaker_1 in current (most active) should map to speaker_0 in prev (most active)
    expect(mapping.get('speaker_1')).toBe('speaker_0');
    // speaker_0 in current should map to speaker_1 in prev
    expect(mapping.get('speaker_0')).toBe('speaker_1');
  });

  it('should handle 4+ speakers correctly', () => {
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 25, duration: 10.0, segment_count: 4 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 20, duration: 8.0, segment_count: 3 },
      'speaker_2': { speaker_id: 'speaker_2', word_count: 15, duration: 6.0, segment_count: 2 },
      'speaker_3': { speaker_id: 'speaker_3', word_count: 10, duration: 4.0, segment_count: 2 },
    };

    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 26, duration: 10.5, segment_count: 4 },
      'speaker_1': { speaker_id: 'speaker_1', word_count: 21, duration: 8.3, segment_count: 3 },
      'speaker_2': { speaker_id: 'speaker_2', word_count: 14, duration: 5.8, segment_count: 2 },
      'speaker_3': { speaker_id: 'speaker_3', word_count: 11, duration: 4.2, segment_count: 2 },
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    expect(mapping.size).toBe(4);
    // All should match with high confidence
    expect(mapping.get('speaker_0')).toBe('speaker_0');
    expect(mapping.get('speaker_1')).toBe('speaker_1');
    expect(mapping.get('speaker_2')).toBe('speaker_2');
    expect(mapping.get('speaker_3')).toBe('speaker_3');
  });

  it('should handle low similarity gracefully', () => {
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 20, duration: 8.0, segment_count: 3 },
    };

    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 2, duration: 1.0, segment_count: 1 },  // Very different
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    // With threshold 0.5, might still match if similarity > 0.5
    // Otherwise treats as new speaker
    expect(mapping.size).toBe(1);
  });

  it('should handle empty overlap regions', () => {
    const prevOverlap: Record<string, SpeakerStats> = {};
    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 10, duration: 5.0, segment_count: 2 },
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    // No previous speakers to match against - treats as new
    expect(mapping.get('speaker_0')).toBe('speaker_0');
  });
});

describe('Edge Cases', () => {
  it('should handle single speaker in overlap', () => {
    const prevOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 20, duration: 8.0, segment_count: 3 },
    };

    const currOverlap: Record<string, SpeakerStats> = {
      'speaker_0': { speaker_id: 'speaker_0', word_count: 22, duration: 8.5, segment_count: 3 },
    };

    const mapping = matchSpeakersAcrossChunks(prevOverlap, currOverlap);

    expect(mapping.size).toBe(1);
    expect(mapping.get('speaker_0')).toBe('speaker_0');
  });

  it('should handle very short segments', () => {
    const segments = [
      { speaker_id: 'speaker_0', text: 'Hi', start_time: 5.0, end_time: 5.5 },
      { speaker_id: 'speaker_1', text: 'Hello', start_time: 5.6, end_time: 6.0 },
    ];

    const stats = calculateOverlapStats(segments, 5.0, 6.5);

    expect(stats['speaker_0']).toBeDefined();
    expect(stats['speaker_1']).toBeDefined();
    expect(stats['speaker_0'].duration).toBeCloseTo(0.5, 1);
    expect(stats['speaker_1'].duration).toBeCloseTo(0.4, 1);
  });
});
