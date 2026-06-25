import { useCallback, useMemo, useRef, useState } from 'react';
import StoryChapter from './StoryChapter';
import StoryMedia from './StoryMedia';
import { storyChapters } from '../data/siteContent';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSectionNavigation } from '../hooks/useSectionNavigation';
import { useStoryMedia } from '../hooks/useStoryMedia';
import { useStoryProgress } from '../hooks/useStoryProgress';

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function chapterOpacity(progress, [start, end]) {
  const fade = 0.018;
  if (progress < start - fade || progress > end + fade) return 0;
  if (progress < start) return clamp((progress - (start - fade)) / fade);
  if (progress <= end) return 1;
  return clamp(1 - ((progress - end) / fade));
}

function activeChapterForProgress(progress) {
  const centers = storyChapters.map(({ progressRange }) => (
    (progressRange[0] + progressRange[1]) / 2
  ));
  return centers.reduce((closest, center, index) => (
    Math.abs(progress - center) < Math.abs(progress - centers[closest]) ? index : closest
  ), 0);
}

export default function StoryExperience() {
  const containerRef = useRef(null);
  const shellRef = useRef(null);
  const progressRef = useRef(null);
  const mediaLayerRefs = useRef([]);
  const contentRefs = useRef([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [preparedThrough, setPreparedThrough] = useState(1);
  const navigate = useSectionNavigation();
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const useCinematicMode = isDesktop && !reducedMotion;
  const { setMediaRef, seek } = useStoryMedia(storyChapters.length);

  const mobileStory = useMemo(() => (
    <div className="story-mobile">
      {storyChapters.map((chapter, index) => (
        <section
          className="story-mobile-panel"
          key={chapter.id}
          style={{ backgroundImage: `linear-gradient(90deg, rgba(5, 19, 41, .92), rgba(5, 19, 41, .34)), url(${chapter.poster})` }}
        >
          <StoryChapter
            chapter={chapter}
            index={index}
            activeStage={Math.min(index + 1, shipmentStepsLength - 1)}
            navigate={navigate}
            mobile
          />
        </section>
      ))}
    </div>
  ), [navigate]);

  const handleProgress = useCallback((progress) => {
    const chapterIndex = activeChapterForProgress(progress);
    const chapter = storyChapters[chapterIndex];
    const [start, end] = chapter.progressRange;
    const localProgress = clamp((progress - start) / (end - start));

    setActiveChapter((current) => (current === chapterIndex ? current : chapterIndex));
    setPreparedThrough((current) => Math.max(current, Math.min(chapterIndex + 1, storyChapters.length - 1)));

    if (chapterIndex === 2) {
      const nextStage = Math.min(Math.floor(localProgress * 6), 5);
      setActiveStage((current) => (current === nextStage ? current : nextStage));
    }

    storyChapters.forEach((item, index) => {
      const opacity = chapterOpacity(progress, item.progressRange);
      const mediaLayer = mediaLayerRefs.current[index];
      const content = contentRefs.current[index];
      if (mediaLayer) {
        mediaLayer.style.opacity = String(opacity);
        mediaLayer.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
      }
      if (content) {
        content.style.opacity = String(opacity);
        content.style.transform = `translate3d(0, calc(-50% + ${(1 - opacity) * 22}px), 0)`;
        content.style.pointerEvents = opacity > 0.75 ? 'auto' : 'none';
      }
    });

    seek(chapterIndex, localProgress);

    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${progress})`;
    }
    if (shellRef.current) {
      shellRef.current.style.opacity = String(progress > 0.91 ? clamp(1 - ((progress - 0.91) / 0.09)) : 1);
    }
  }, [seek]);

  useStoryProgress(containerRef, useCinematicMode, handleProgress);

  if (!useCinematicMode) return mobileStory;

  return (
    <section ref={containerRef} id="story" className="story-experience scroll-mt-20">
      <div ref={shellRef} className="story-sticky">
        <div className="story-media-stack">
          {storyChapters.map((chapter, index) => (
            <StoryMedia
              key={chapter.id}
              chapter={chapter}
              index={index}
              prepared={index <= preparedThrough}
              mobile={false}
              setMediaRef={setMediaRef}
              layerRef={(node) => { mediaLayerRefs.current[index] = node; }}
            />
          ))}
        </div>

        <div className="story-scrim" aria-hidden="true" />

        <div className="story-content-shell">
          {storyChapters.map((chapter, index) => (
            <StoryChapter
              key={chapter.id}
              chapter={chapter}
              index={index}
              activeStage={activeStage}
              navigate={navigate}
              contentRef={(node) => { contentRefs.current[index] = node; }}
            />
          ))}
        </div>

        <aside className="story-rail" aria-label="Story chapters">
          <div className="story-rail-line" aria-hidden="true">
            <span ref={progressRef} />
          </div>
          <ol>
            {storyChapters.map((chapter, index) => (
              <li key={chapter.id} className={index === activeChapter ? 'is-active' : ''}>
                <span>{chapter.number}</span>
                <strong>{chapter.navLabel}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

const shipmentStepsLength = 6;
