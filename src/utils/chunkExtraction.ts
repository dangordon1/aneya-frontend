/**
 * Audio Chunk Extraction Utilities
 *
 * Extracts overlapping audio chunks from recorded blobs for real-time diarization.
 * Chunks include 10-second overlap to enable speaker ID matching across segments.
 */

const CHUNK_DURATION = 60; // seconds (matches MediaRecorder timeslice)
const OVERLAP_DURATION = 15; // seconds (increased for 60s chunks)

// Store the WebM initialization segment (first blob with codec headers)
// This needs to be prepended to all chunks after chunk 0 so FFmpeg can decode them
let webmInitSegment: Blob | null = null;

export interface ChunkInfo {
  index: number;
  startTime: number;
  endTime: number;
  overlapStartTime: number; // Start of overlap region with previous chunk
  overlapEndTime: number;   // End of overlap region
  audioBlob: Blob;
}

/**
 * Reset the stored WebM initialization segment (call when starting new recording)
 */
export function resetWebMInitSegment() {
  webmInitSegment = null;
}

/**
 * Extract audio chunk with overlap from MediaRecorder blobs
 *
 * For chunk N:
 * - Audio: (N*60 - 10) to (N*60 + 60) seconds
 * - Overlap: First 10 seconds are shared with previous chunk
 *
 * Example:
 * - Chunk 0: 0-60s (no overlap)
 * - Chunk 1: 50-120s (50-60s overlaps with Chunk 0)
 * - Chunk 2: 110-180s (110-120s overlaps with Chunk 1)
 */
export function extractAudioChunk(
  allBlobs: Blob[],
  chunkIndex: number,
  totalRecordingTime: number
): ChunkInfo | null {
  // Calculate chunk boundaries
  const chunkStart = Math.max(0, chunkIndex * CHUNK_DURATION - OVERLAP_DURATION);
  const chunkEnd = Math.min((chunkIndex + 1) * CHUNK_DURATION, totalRecordingTime);

  // Don't create chunk if we don't have enough audio yet
  if (chunkEnd <= chunkStart || totalRecordingTime < (chunkIndex + 1) * CHUNK_DURATION) {
    return null;
  }

  console.log(`📦 Extracting chunk ${chunkIndex}: ${chunkStart}s - ${chunkEnd}s (${allBlobs.length} blobs available)`);

  // MediaRecorder creates 1-second blobs
  // Extract blobs from chunkStart to chunkEnd
  const startIndex = Math.floor(chunkStart);
  const endIndex = Math.min(Math.ceil(chunkEnd), allBlobs.length);

  if (startIndex >= allBlobs.length) {
    console.warn(`⚠️  Start index ${startIndex} beyond available blobs (${allBlobs.length})`);
    return null;
  }

  const chunkBlobs = allBlobs.slice(startIndex, endIndex);

  if (chunkBlobs.length === 0) {
    console.warn(`⚠️  No blobs extracted for chunk ${chunkIndex}`);
    return null;
  }

  console.log(`  ✓ Extracted ${chunkBlobs.length} blobs (${startIndex}-${endIndex})`);

  // Store the first blob as WebM initialization segment (contains codec headers)
  if (webmInitSegment === null && allBlobs.length > 0) {
    webmInitSegment = allBlobs[0];
    console.log(`  🎬 Stored WebM initialization segment (${webmInitSegment.size} bytes)`);
  }

  // For chunks after the first, prepend the initialization segment
  // This makes each chunk self-contained so FFmpeg can decode it
  let finalBlobs: Blob[];
  if (chunkIndex > 0 && webmInitSegment !== null) {
    finalBlobs = [webmInitSegment, ...chunkBlobs];
    console.log(`  ✓ Prepended init segment for chunk ${chunkIndex} (${finalBlobs.length} total blobs)`);
  } else {
    finalBlobs = chunkBlobs;
  }

  // Combine blobs into single audio chunk
  const audioBlob = new Blob(finalBlobs, { type: 'audio/webm;codecs=opus' });

  // Calculate overlap region
  // For chunk N (N > 0), the first OVERLAP_DURATION seconds overlap with previous chunk
  const overlapStartTime = chunkIndex > 0 ? chunkStart : 0;
  const overlapEndTime = chunkIndex > 0 ? chunkStart + OVERLAP_DURATION : 0;

  return {
    index: chunkIndex,
    startTime: chunkStart,
    endTime: chunkEnd,
    overlapStartTime,
    overlapEndTime,
    audioBlob
  };
}

/**
 * Check if it's time to process the next chunk
 */
export function shouldProcessNextChunk(
  recordingTime: number,
  lastProcessedChunkIndex: number
): boolean {
  const nextChunkIndex = lastProcessedChunkIndex + 1;
  const nextChunkTime = (nextChunkIndex + 1) * CHUNK_DURATION;

  // Process chunk when we have enough audio
  return recordingTime >= nextChunkTime;
}

/**
 * Extract the final partial chunk when recording stops
 * This handles remaining audio that's less than CHUNK_DURATION
 */
export function extractFinalChunk(
  allBlobs: Blob[],
  lastProcessedChunkIndex: number,
  totalRecordingTime: number
): ChunkInfo | null {
  const nextChunkIndex = lastProcessedChunkIndex + 1;
  const chunkStart = Math.max(0, nextChunkIndex * CHUNK_DURATION - OVERLAP_DURATION);

  // Only extract if we have remaining audio after the last processed chunk
  if (totalRecordingTime <= chunkStart) {
    console.log(`ℹ️  No remaining audio for final chunk (total: ${totalRecordingTime}s, chunk starts at: ${chunkStart}s)`);
    return null;
  }

  const chunkEnd = totalRecordingTime;

  // Minimum chunk length: 5 seconds (otherwise not enough for meaningful diarization)
  if (chunkEnd - chunkStart < 5) {
    console.log(`ℹ️  Final chunk too short (${chunkEnd - chunkStart}s), skipping`);
    return null;
  }

  console.log(`📦 Extracting FINAL chunk ${nextChunkIndex}: ${chunkStart}s - ${chunkEnd}s`);

  // MediaRecorder creates 1-second blobs
  const startIndex = Math.floor(chunkStart);
  const endIndex = Math.min(Math.ceil(chunkEnd), allBlobs.length);

  if (startIndex >= allBlobs.length) {
    console.warn(`⚠️  Start index ${startIndex} beyond available blobs (${allBlobs.length})`);
    return null;
  }

  const chunkBlobs = allBlobs.slice(startIndex, endIndex);

  if (chunkBlobs.length === 0) {
    console.warn(`⚠️  No blobs extracted for final chunk`);
    return null;
  }

  console.log(`  ✓ Extracted ${chunkBlobs.length} blobs (${startIndex}-${endIndex})`);

  // For final chunk, also prepend initialization segment if needed
  let finalBlobs: Blob[];
  if (nextChunkIndex > 0 && webmInitSegment !== null) {
    finalBlobs = [webmInitSegment, ...chunkBlobs];
    console.log(`  ✓ Prepended init segment for final chunk ${nextChunkIndex} (${finalBlobs.length} total blobs)`);
  } else {
    finalBlobs = chunkBlobs;
  }

  const audioBlob = new Blob(finalBlobs, { type: 'audio/webm;codecs=opus' });

  // Calculate overlap region
  const overlapStartTime = nextChunkIndex > 0 ? chunkStart : 0;
  const overlapEndTime = nextChunkIndex > 0 ? chunkStart + OVERLAP_DURATION : 0;

  return {
    index: nextChunkIndex,
    startTime: chunkStart,
    endTime: chunkEnd,
    overlapStartTime,
    overlapEndTime,
    audioBlob
  };
}

/**
 * Get chunk configuration constants
 */
export function getChunkConfig() {
  return {
    chunkDuration: CHUNK_DURATION,
    overlapDuration: OVERLAP_DURATION
  };
}
