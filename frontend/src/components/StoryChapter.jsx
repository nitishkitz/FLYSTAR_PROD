import { Check, CheckCircle2 } from 'lucide-react';
import { SECTION_IDS } from '../config/navigation';
import { shipmentSteps } from '../data/siteContent';

export default function StoryChapter({
  chapter,
  index,
  contentRef,
  activeStage,
  navigate,
  mobile = false,
}) {
  const Heading = index === 0 ? 'h1' : 'h2';

  return (
    <article
      ref={contentRef}
      className={`story-chapter story-chapter-${index + 1} ${mobile ? 'story-chapter-mobile' : ''}`}
      id={mobile ? chapter.id : undefined}
      aria-hidden={!mobile ? undefined : false}
    >
      {index === 3 && (
        <div className="story-delivered-mark" aria-hidden="true">
          <CheckCircle2 />
        </div>
      )}

      <p className="eyebrow">
        <span>{chapter.number}</span>
        {chapter.eyebrow}
      </p>
      <Heading>{chapter.title}</Heading>
      <p className="story-copy">{chapter.body}</p>

      {index === 0 && (
        <div className="story-actions">
          <button type="button" className="button button-primary" onClick={() => navigate(SECTION_IDS.quote)}>
            Get a courier quote
          </button>
          <button type="button" className="button button-secondary story-secondary" onClick={() => navigate(SECTION_IDS.tracking)}>
            Track a shipment
          </button>
        </div>
      )}

      {index === 1 && chapter.highlights && (
        <ul className="story-highlights">
          {chapter.highlights.map((highlight) => (
            <li key={highlight}><Check aria-hidden="true" />{highlight}</li>
          ))}
        </ul>
      )}

      {index === 2 && (
        <div className="story-stage">
          <div>
            <span>{String(activeStage + 1).padStart(2, '0')} / 06</span>
            <strong>{shipmentSteps[activeStage].title}</strong>
          </div>
          <p>{shipmentSteps[activeStage].description}</p>
          <div className="story-stage-track" aria-hidden="true">
            {shipmentSteps.map((step, stepIndex) => (
              <span key={step.id} className={stepIndex <= activeStage ? 'is-active' : ''} />
            ))}
          </div>
        </div>
      )}

      {index === 3 && (
        <div className="story-actions">
          <button type="button" className="button button-primary" onClick={() => navigate(SECTION_IDS.quote)}>
            Start a shipment
          </button>
          <button type="button" className="button button-secondary story-secondary" onClick={() => navigate(SECTION_IDS.contact)}>
            Contact Flystar
          </button>
        </div>
      )}
    </article>
  );
}
