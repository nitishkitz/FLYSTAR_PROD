import { useCallback, useEffect, useRef } from 'react';

export function useStoryMedia(chapterCount) {
  const mediaRefs = useRef(Array(chapterCount).fill(null));
  const desiredTimes = useRef(Array(chapterCount).fill(0));
  const frameRequests = useRef(Array(chapterCount).fill(null));

  const setMediaRef = useCallback((index, node) => {
    mediaRefs.current[index] = node;
  }, []);

  const flushSeek = useCallback((index) => {
    const media = mediaRefs.current[index];
    frameRequests.current[index] = null;
    if (!media || !Number.isFinite(media.duration) || media.duration <= 0 || media.seeking) return;

    const nextTime = Math.min(
      Math.max(desiredTimes.current[index], 0),
      Math.max(media.duration - 0.04, 0),
    );

    if (Math.abs(media.currentTime - nextTime) >= 0.025) {
      media.currentTime = nextTime;
    }
  }, []);

  const seek = useCallback((index, localProgress) => {
    const media = mediaRefs.current[index];
    if (!media || !Number.isFinite(media.duration) || media.duration <= 0) return;

    desiredTimes.current[index] = localProgress * media.duration;
    if (frameRequests.current[index] === null) {
      frameRequests.current[index] = window.requestAnimationFrame(() => flushSeek(index));
    }
  }, [flushSeek]);

  useEffect(() => () => {
    frameRequests.current.forEach((requestId) => {
      if (requestId !== null) window.cancelAnimationFrame(requestId);
    });
  }, []);

  return { mediaRefs, setMediaRef, seek };
}
