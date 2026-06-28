import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Plane, MapPin, Search, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { STATUS_META, STATUS_ORDER, fmtDate } from '../lib/shipmentMeta';
import StatusPill from '../components/portal/StatusPill';
import { BACKEND_BASE } from '../lib/backendBase';

export default function PublicTrack() {
  const { awb: awbParam } = useParams();
  const navigate = useNavigate();
  const [awb, setAwb] = useState(awbParam || '');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async (id) => {
    if (!id) return;
    setBusy(true); setError(''); setData(null);
    try {
      const { data } = await axios.get(`${BACKEND_BASE}/api/shipments/track/${id.trim().toUpperCase()}`);
      setData(data);
    } catch (e) {
      setError(e?.response?.data?.detail === 'Shipment not found' ? 'Could not find that AWB. Please check and try again.' : (e?.response?.data?.detail || 'Could not find that AWB. Please check and try again.'));
    } finally { setBusy(false); }
  };

  useEffect(() => { if (awbParam) search(awbParam); }, [awbParam]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!awb.trim()) return;
    navigate(`/track/${awb.trim().toUpperCase()}`);
    search(awb);
  };

  const currentIdx = data ? STATUS_ORDER.indexOf(data.status) : -1;

  return (
    <div className="public-track" data-testid="public-track-page">
      <header className="track-hero">
        <Link to="/" className="track-back"><ArrowLeft size={14} />Back to Flystar</Link>
        <div className="track-hero-inner">
          <span className="track-eyebrow"><b />Live tracking</span>
          <h1>Track your <em>Flystar shipment</em></h1>
          <p>Enter your air waybill number to see the latest status, location, and timeline — no login required.</p>
          <form onSubmit={onSubmit} className="track-form" data-testid="public-track-form">
            <Package size={18} className="track-form-icon" />
            <input
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="e.g. FLY1234ABCD"
              data-testid="public-track-input"
              aria-label="AWB number"
              autoFocus
            />
            <button type="submit" disabled={busy} className="track-search-btn" data-testid="public-track-submit">
              <Search size={16} />{busy ? 'Searching…' : 'Track'}
            </button>
          </form>
          {error && <p className="track-error" data-testid="public-track-error">{error}</p>}
        </div>
      </header>

      {data && (
        <section className="track-results" data-testid="public-track-results">
          <div className="track-summary">
            <div>
              <small>Air waybill</small>
              <h2>{data.awb}</h2>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <StatusPill status={data.status} />
                <span className="track-route">
                  <MapPin size={13} />{data.origin_city || data.origin_country} → {data.destination_city || data.destination_country}
                </span>
              </div>
            </div>
            <div className="track-meta">
              <div><small>Service</small><strong style={{ textTransform: 'capitalize' }}>{data.service || '—'}</strong></div>
              <div><small>Type</small><strong style={{ textTransform: 'capitalize' }}>{data.shipment_type || '—'}</strong></div>
              <div><small>Booked</small><strong>{fmtDate(data.created_at)}</strong></div>
            </div>
          </div>

          <div className="track-progress" role="list">
            {STATUS_ORDER.map((st, i) => {
              const meta = STATUS_META[st];
              const done = i <= currentIdx;
              return (
                <div key={st} className="track-progress-step" role="listitem">
                  <span className={`track-progress-bar ${done ? 'is-done' : ''}`} />
                  <small className={done ? 'is-done' : ''}>{meta.label}</small>
                </div>
              );
            })}
          </div>

          <div className="track-timeline">
            <h3>Activity</h3>
            <ul>
              {(data.events || []).slice().reverse().map((e, i) => {
                const meta = STATUS_META[e.status] || { label: e.status };
                return (
                  <li key={i} className={i === 0 ? 'is-now' : 'is-done'} data-testid="public-track-event">
                    <span className="dot"><CheckCircle2 size={14} /></span>
                    <div>
                      <div className="head"><strong>{meta.label}</strong><time>{fmtDate(e.at)}</time></div>
                      {e.location && <div className="meta"><MapPin size={11} /> {e.location}</div>}
                      {e.note && <p>{e.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <footer className="track-footer">
        <Plane size={14} /> Flystar International Courier · Tirupati · For booking call +91 8125477584
      </footer>
    </div>
  );
}
