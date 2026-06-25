import { useEffect, useRef, useState } from 'react';

export default function DeferredSection({ id, minHeight = 480, children, className = '' }) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!rootRef.current || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '700px 0px' },
    );

    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      id={id}
      className={`scroll-mt-20 ${className}`}
      style={!visible ? { minHeight } : undefined}
    >
      {visible ? children : <div className="section-placeholder" aria-hidden="true" />}
    </div>
  );
}
