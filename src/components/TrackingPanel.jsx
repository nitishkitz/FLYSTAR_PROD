import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import { lookupTracking } from '../adapters/trackingAdapter';

export default function TrackingPanel({ lookupAdapter = lookupTracking }) {
  const [trackingId, setTrackingId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!trackingId.trim()) {
      setError('Enter a waybill number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      setResult(await lookupAdapter(trackingId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tracking-panel">
      <form onSubmit={submit} noValidate>
        <label htmlFor="tracking-id">Waybill number</label>
        <div className="tracking-search">
          <Search aria-hidden="true" />
          <input
            id="tracking-id"
            value={trackingId}
            onChange={(event) => {
              setTrackingId(event.target.value);
              setError('');
            }}
            placeholder="e.g. FS-998822"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'tracking-error' : undefined}
          />
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </div>
        {error && <small id="tracking-error" className="field-error">{error}</small>}
      </form>

      <div className="tracking-result" aria-live="polite">
        {result ? (
          <>
            <div className="tracking-summary">
              <div>
                <span>Waybill</span>
                <strong>{result.trackingId}</strong>
              </div>
              <span className="status-badge"><Check aria-hidden="true" />{result.status}</span>
            </div>
            <ol className="tracking-timeline">
              {result.events.map((event) => (
                <li key={`${event.title}-${event.time}`}>
                  <span aria-hidden="true"><Check /></span>
                  <div>
                    <div><strong>{event.title}</strong><time>{event.time}</time></div>
                    <p>{event.location}</p>
                    <small>{event.description}</small>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="tracking-empty">
            <span>Tracking demo</span>
            <h3>Enter any waybill number to view the preserved delivery timeline.</h3>
            <p>The current adapter returns demonstration data and can be replaced by a live carrier API.</p>
          </div>
        )}
      </div>
    </div>
  );
}
