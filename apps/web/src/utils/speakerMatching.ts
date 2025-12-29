/**
 * Speaker Matching Utilities
 *
 * Matches speaker IDs across audio chunks using overlap-based analysis.
 * Ensures consistent speaker labels throughout a recording by analyzing
 * the shared audio region between consecutive chunks.
 */

export interface SpeakerStats {
  speaker_id: string;
  word_count: number;
  duration: number;
  segment_count: number;
}

export interface DiarizedSegment {
  speaker_id: string;
  text: string;
  start_time: number;
  end_time: number;
}

/**
 * Calculate overlap statistics for segments in a time range
 */
export function calculateOverlapStats(
  segments: DiarizedSegment[],
  overlapStart: number,
  overlapEnd: number
): Record<string, SpeakerStats> {
  const speakerMap = new Map<string, SpeakerStats>();

  segments
    .filter(seg => seg.start_time < overlapEnd && seg.end_time > overlapStart)
    .forEach(seg => {
      const speakerId = seg.speaker_id;

      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, {
          speaker_id: speakerId,
          word_count: 0,
          duration: 0,
          segment_count: 0
        });
      }

      const stats = speakerMap.get(speakerId)!;

      // Calculate overlap duration
      const segStart = Math.max(seg.start_time, overlapStart);
      const segEnd = Math.min(seg.end_time, overlapEnd);
      const duration = segEnd - segStart;

      stats.word_count += seg.text.split(/\s+/).length;
      stats.duration += duration;
      stats.segment_count += 1;
    });

  const result: Record<string, SpeakerStats> = {};
  speakerMap.forEach((stats, id) => {
    result[id] = stats;
  });

  return result;
}

/**
 * Match speakers across chunks based on overlap statistics
 *
 * Compares speaker activity in the shared audio region between chunks.
 * Matches speakers by ranking them by activity (duration) and calculating
 * similarity scores.
 */
export function matchSpeakersAcrossChunks(
  prevOverlap: Record<string, SpeakerStats>,
  currOverlap: Record<string, SpeakerStats>
): Map<string, string> {
  const mapping = new Map<string, string>();

  // Sort by duration (most active speaker first)
  const sortedPrev = Object.values(prevOverlap).sort((a, b) => b.duration - a.duration);
  const sortedCurr = Object.values(currOverlap).sort((a, b) => b.duration - a.duration);

  // Match speakers by rank
  for (let i = 0; i < Math.min(sortedPrev.length, sortedCurr.length); i++) {
    const prevSpeaker = sortedPrev[i];
    const currSpeaker = sortedCurr[i];

    // Calculate similarity score (0-1)
    const similarity = calculateSimilarity(prevSpeaker, currSpeaker);

    if (similarity > 0.7) {
      // Map current speaker ID → previous (canonical) speaker ID
      mapping.set(currSpeaker.speaker_id, prevSpeaker.speaker_id);

      console.log(`✓ Matched ${currSpeaker.speaker_id} → ${prevSpeaker.speaker_id} (${(similarity * 100).toFixed(0)}%)`);
    } else {
      console.warn(`⚠️  Low confidence match: ${currSpeaker.speaker_id} → ${prevSpeaker.speaker_id} (${(similarity * 100).toFixed(0)}%)`);
      // Still apply mapping even with low confidence
      mapping.set(currSpeaker.speaker_id, prevSpeaker.speaker_id);
    }
  }

  return mapping;
}

/**
 * Calculate similarity between two speakers based on overlap statistics
 * Returns a score from 0 (no similarity) to 1 (identical)
 */
function calculateSimilarity(a: SpeakerStats, b: SpeakerStats): number {
  // Duration similarity (50% weight)
  const maxDuration = Math.max(a.duration, b.duration);
  const durationSim = maxDuration > 0
    ? 1 - Math.abs(a.duration - b.duration) / maxDuration
    : 0;

  // Word count similarity (30% weight)
  const maxWords = Math.max(a.word_count, b.word_count);
  const wordSim = maxWords > 0
    ? 1 - Math.abs(a.word_count - b.word_count) / maxWords
    : 0;

  // Avg segment length similarity (20% weight)
  const avgLengthA = a.duration / Math.max(a.segment_count, 1);
  const avgLengthB = b.duration / Math.max(b.segment_count, 1);
  const maxAvg = Math.max(avgLengthA, avgLengthB);
  const avgSim = maxAvg > 0
    ? 1 - Math.abs(avgLengthA - avgLengthB) / maxAvg
    : 0;

  return durationSim * 0.5 + wordSim * 0.3 + avgSim * 0.2;
}
