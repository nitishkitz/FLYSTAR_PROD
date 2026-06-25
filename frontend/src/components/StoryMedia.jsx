import { useState } from 'react';

export default function StoryMedia({
  chapter,
  index,
  prepared,
  mobile,
  setMediaRef,
  layerRef,
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      ref={layerRef}
      className="story-media-layer"
      data-chapter-media={chapter.id}
      aria-hidden="true"
    >
      <img
        src={chapter.poster}
        alt=""
        className="story-poster"
        style={{ objectPosition: chapter.focalPoint }}
      />
      {prepared && !failed && (
        <video
          ref={(node) => setMediaRef(index, node)}
          className="story-video"
          muted
          playsInline
          preload={index === 0 ? 'auto' : 'metadata'}
          poster={chapter.poster}
          tabIndex="-1"
          onError={() => setFailed(true)}
          onSeeked={(event) => {
            event.currentTarget.dataset.ready = 'true';
          }}
          style={{ objectPosition: chapter.focalPoint }}
        >
          <source
            src={mobile ? chapter.mobileSource : chapter.desktopSource}
            type="video/mp4"
          />
        </video>
      )}
    </div>
  );
}
