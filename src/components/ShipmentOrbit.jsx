import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  Box,
  Building2,
  CheckCircle2,
  FileText,
  PlaneTakeoff,
  Truck,
} from 'lucide-react';
import { shipmentSteps } from '../data/siteContent';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

const icons = {
  file: FileText,
  parcel: Box,
  truck: Truck,
  plane: PlaneTakeoff,
  building: Building2,
  check: CheckCircle2,
};

const statusLabels = {
  complete: 'Complete',
  'in-progress': 'In transit',
  pending: 'Upcoming',
};

export default function ShipmentOrbit() {
  const sectionRef = useRef(null);
  const progressRef = useRef(null);
  const travellerRef = useRef(null);
  const [activeId, setActiveId] = useState(1);
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const reducedMotion = useReducedMotion();
  const scrollDriven = isDesktop && !reducedMotion;
  const activeStep = shipmentSteps.find((step) => step.id === activeId);

  useEffect(() => {
    if (!scrollDriven || !sectionRef.current) return undefined;

    const state = { progress: 0 };
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
      onUpdate: () => {
        const progress = Math.min(Math.max(state.progress, 0), 1);
        const nextId = Math.min(Math.floor(progress * shipmentSteps.length) + 1, shipmentSteps.length);
        setActiveId((current) => (current === nextId ? current : nextId));

        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${progress})`;
        }
        if (travellerRef.current) {
          const track = travellerRef.current.parentElement;
          const checkpoints = track?.querySelectorAll('button');
          const first = checkpoints?.[0];
          const last = checkpoints?.[checkpoints.length - 1];

          if (first && last) {
            const start = first.offsetLeft + (first.offsetWidth / 2);
            const end = last.offsetLeft + (last.offsetWidth / 2);
            const x = start + ((end - start) * progress) - (travellerRef.current.offsetWidth / 2);
            travellerRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
          }
        }
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [scrollDriven]);

  const selectStep = (id) => {
    setActiveId(id);
    if (!scrollDriven || !sectionRef.current) return;

    const sectionTop = sectionRef.current.getBoundingClientRect().top + window.scrollY;
    const scrollRange = sectionRef.current.offsetHeight - window.innerHeight;
    const targetProgress = (id - 1) / (shipmentSteps.length - 1);
    window.scrollTo({
      top: sectionTop + (scrollRange * targetProgress),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      ref={sectionRef}
      className={`journey-scroll-section section-ink ${scrollDriven ? 'is-scroll-driven' : ''}`}
    >
      <div className="journey-sticky">
        <div className="journey-aircraft-background" aria-hidden="true" />
        <div className="journey-aircraft-scrim" aria-hidden="true" />
        <div className="container journey-content">
          <header className="section-heading section-heading-split section-heading-on-dark">
            <div>
              <p className="eyebrow eyebrow-on-dark"><span>Journey</span>Six accountable checkpoints</p>
              <h2>Book. Pack. Fly. Deliver.</h2>
            </div>
            <p>
              Follow the route as the waybill moves from the Tirupati desk to recorded proof of delivery.
            </p>
          </header>

          <div className="journey-track-shell">
            <div className="journey-track">
              <div className="journey-track-base" aria-hidden="true">
                <span ref={progressRef} />
              </div>

              {shipmentSteps.map((step) => {
                const Icon = icons[step.icon];
                const selected = activeId === step.id;
                const complete = step.id <= activeId;
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-current={selected ? 'step' : undefined}
                    className={`${selected ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                    onClick={() => selectStep(step.id)}
                  >
                    <span><Icon aria-hidden="true" /></span>
                    <small>{String(step.id).padStart(2, '0')}</small>
                    <strong>{step.title}</strong>
                    <em>{step.label}</em>
                  </button>
                );
              })}

              <div ref={travellerRef} className="journey-traveller" aria-hidden="true">
                <div className="journey-waybill-head">
                  <span>Flystar</span>
                  <strong>Waybill {activeStep.code}</strong>
                </div>
                <div className="journey-waybill-route">
                  <div>
                    <small>From</small>
                    <strong>TIRUPATI</strong>
                  </div>
                  <PlaneTakeoff />
                  <div>
                    <small>Stage</small>
                    <strong>{String(activeStep.id).padStart(2, '0')}</strong>
                  </div>
                </div>
                <div className="journey-waybill-status">
                  <span>{activeStep.title}</span>
                  <i />
                  <small>{activeStep.label}</small>
                </div>
              </div>
            </div>
          </div>

          <article key={activeStep.id} className="journey-stage-card" aria-live="polite">
            <div className="journey-stage-number">
              <span>{String(activeStep.id).padStart(2, '0')}</span>
              <small>of 06</small>
            </div>
            <div className="journey-stage-copy">
              <span className={`status status-${activeStep.status}`}>
                {statusLabels[activeStep.status]}
              </span>
              <h3>{activeStep.title}</h3>
              <p>{activeStep.description}</p>
            </div>
            <div className="journey-stage-meta">
              <span>{activeStep.label}</span>
              <code>{activeStep.code}</code>
              <div>
                <small>Route progress</small>
                <strong>{activeStep.progress}%</strong>
              </div>
            </div>
          </article>

          {!scrollDriven && (
            <div className="journey-related">
              <span>Connected stages</span>
              <div>
                {activeStep.relatedIds.map((relatedId) => {
                  const related = shipmentSteps.find((step) => step.id === relatedId);
                  return (
                    <button key={related.id} type="button" onClick={() => selectStep(related.id)}>
                      {related.title}<ArrowRight aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
