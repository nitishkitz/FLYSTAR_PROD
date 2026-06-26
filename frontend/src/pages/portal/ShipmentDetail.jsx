import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, Package, Plane, FileText, AlertCircle,
  CheckCircle2, Send, Building2, User as UserIcon, Edit3, Camera, X, Upload,
  CreditCard,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { STATUS_META, STATUS_ORDER, fmtDate, fmtINR } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';
import SignaturePad from '../../components/portal/SignaturePad';

const NEXT_STATUS = ['en_route_to_pickup', 'picked_up', 'at_hub', 'packed', 'dispatched', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception'];

export default function ShipmentDetail() {
  const { id } = useParams();
  const { user, errMsg } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [showStatus, setShowStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('en_route_to_pickup');
  const [note, setNote] = useState('');
  const [loc, setLoc] = useState('');
  // POD
  const [receiverName, setReceiverName] = useState('');
  const [signature, setSignature] = useState(null);
  const [podPhoto, setPodPhoto] = useState(null);
  // Pay
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get(`/shipments/${id}`).then((r) => setS(r.data));
  useEffect(() => { load(); }, [id]);

  const accept = async () => {
    setBusy(true); setError('');
    try { await api.post(`/shipments/${id}/accept`); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const submitStatus = async (e) => {
    e.preventDefault();
    if (newStatus === 'delivered') {
      if (!receiverName.trim()) { setError('Receiver name is required for delivery.'); return; }
      if (!signature) { setError('Signature is required to mark as delivered.'); return; }
    }
    setBusy(true); setError('');
    try {
      const body = { status: newStatus, note, location: loc };
      if (newStatus === 'delivered') {
        body.receiver_name = receiverName;
        body.signature_base64 = signature;
        body.pod_photo_base64 = podPhoto;
      }
      await api.post(`/shipments/${id}/status`, body);
      setShowStatus(false); setNote(''); setLoc('');
      setReceiverName(''); setSignature(null); setPodPhoto(null);
      await load();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const onPodPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Photo too large — max 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPodPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const payInvoice = async () => {
    setPaying(true); setError('');
    try {
      await api.post(`/shipments/${id}/pay`, { method: 'card', note: 'Demo payment' });
      await load();
    } catch (e) { setError(errMsg(e)); } finally { setPaying(false); }
  };

  if (!s) return <p className="muted">Loading…</p>;

  const isMine = user.role === 'employee' && s.assigned_employee_id === user.id;
  const canAccept = user.role === 'employee' && (!s.assigned_employee_id) && s.status === 'requested';
  const canUpdate = (user.role === 'admin') || (user.role === 'employee' && isMine);
  const needWaybill = canUpdate && !s.actual_weight_kg && (s.status === 'assigned' || s.status === 'en_route_to_pickup');

  const currentIdx = STATUS_ORDER.indexOf(s.status);

  return (
    <div data-testid="shipment-detail-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <div className="row" style={{ gap: 10 }}>
            <Link to=".." className="btn btn-ghost btn-tiny" onClick={(e) => { e.preventDefault(); navigate(-1); }}><ArrowLeft size={14} />Back</Link>
            <StatusPill status={s.status} />
            {s.payment_status === 'paid' && <span className="pill tone-green" data-testid="payment-paid-pill"><b />Paid</span>}
            {s.payment_status === 'unpaid' && <span className="pill tone-amber"><b />Unpaid</span>}
          </div>
          <h1 className="mt-12" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>{s.awb}</h1>
          <p>{s.pickup?.city} → {s.delivery?.city || s.delivery?.country} · {fmtDate(s.created_at)}</p>
        </div>
        <div className="portal-topbar-actions">
          <Link to={`/portal/shipment/${id}/invoice`} className="btn btn-ghost" data-testid="open-invoice"><FileText size={16} />Invoice</Link>
          {user.role === 'customer' && s.payment_status !== 'paid' && (
            <button onClick={payInvoice} disabled={paying} className="btn btn-primary" data-testid="pay-now-btn"><CreditCard size={16} />{paying ? 'Processing…' : 'Pay now'}</button>
          )}
          {canAccept && <button onClick={accept} disabled={busy} className="btn btn-primary" data-testid="accept-btn"><CheckCircle2 size={16} />Accept order</button>}
          {needWaybill && <Link to={`/portal/employee/shipment/${id}/waybill`} className="btn btn-primary" data-testid="fill-waybill-btn"><Edit3 size={16} />Fill waybill</Link>}
          {canUpdate && <button onClick={() => setShowStatus(true)} className="btn btn-ghost" data-testid="update-status-btn"><Send size={16} />Update status</button>}
        </div>
      </div>

      {error && <p className="auth-error" data-testid="detail-error">{error}</p>}

      {/* Status timeline visual progress */}
      <div className="glass mt-12">
        <div className="glass-header">
          <div><h3>Shipment journey</h3><p>Progress through Flystar's six-stage route.</p></div>
        </div>
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          {STATUS_ORDER.map((st, i) => {
            const meta = STATUS_META[st];
            const done = i <= currentIdx;
            return (
              <div key={st} style={{ flex: '1 1 80px', minWidth: 80 }}>
                <div style={{ height: 4, borderRadius: 2, background: done ? 'linear-gradient(90deg, #ff4655, #ff8157)' : 'var(--p-border)' }} />
                <small style={{ display: 'block', marginTop: 8, color: done ? 'var(--p-ink)' : 'var(--p-muted-soft)', fontSize: 11, letterSpacing: '0.04em' }}>{meta.label}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="two-col mt-18">
        {/* Left column - addresses & shipment info */}
        <div>
          <div className="glass">
            <div className="glass-header"><div><h3>Addresses</h3><p>Pickup & delivery details.</p></div></div>
            <div className="field-grid-2">
              <div>
                <small style={{ color: 'var(--p-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PICKUP</small>
                <p style={{ margin: '8px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}>{s.pickup?.name}</p>
                <p className="muted" style={{ margin: '4px 0' }}><Phone size={12} style={{ display: 'inline', marginRight: 6 }} />{s.pickup?.phone}</p>
                <p className="muted" style={{ margin: 0 }}><MapPin size={12} style={{ display: 'inline', marginRight: 6 }} />{s.pickup?.line1}, {s.pickup?.city}, {s.pickup?.state}, {s.pickup?.country} {s.pickup?.postal_code}</p>
              </div>
              <div>
                <small style={{ color: 'var(--p-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>DELIVERY</small>
                <p style={{ margin: '8px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}>{s.delivery?.name}</p>
                <p className="muted" style={{ margin: '4px 0' }}><Phone size={12} style={{ display: 'inline', marginRight: 6 }} />{s.delivery?.phone}</p>
                <p className="muted" style={{ margin: 0 }}><MapPin size={12} style={{ display: 'inline', marginRight: 6 }} />{s.delivery?.line1}, {s.delivery?.city}, {s.delivery?.state}, {s.delivery?.country} {s.delivery?.postal_code}</p>
              </div>
            </div>
          </div>

          <div className="glass mt-18">
            <div className="glass-header"><div><h3>Consignment</h3></div></div>
            <div className="field-grid-3">
              <div><small className="muted">Service</small><p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650, textTransform: 'capitalize' }}><Plane size={14} style={{ display: 'inline', marginRight: 6 }} />{s.service}</p></div>
              <div><small className="muted">Type</small><p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650, textTransform: 'capitalize' }}><Package size={14} style={{ display: 'inline', marginRight: 6 }} />{s.shipment_type}</p></div>
              <div><small className="muted">Weight</small><p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}>{s.actual_weight_kg || s.approx_weight_kg} kg</p></div>
              <div><small className="muted">Pieces</small><p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}>{s.piece_count || '—'}</p></div>
              <div><small className="muted">Declared value</small><p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}>{s.declared_value_inr ? fmtINR(s.declared_value_inr) : '—'}</p></div>
              <div><small className="muted">Price</small><p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}>{fmtINR(s.price_inr)}</p></div>
            </div>
            {s.contents && <p className="mt-12 muted">Contents: <span style={{ color: 'var(--p-ink)' }}>{s.contents}</span></p>}
            {s.notes && <p className="muted">Notes: <span style={{ color: 'var(--p-ink)' }}>{s.notes}</span></p>}
            {s.contains_restricted && <p style={{ color: 'var(--portal-amber)', marginTop: 8 }}><AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />Contains restricted items</p>}
            {s.proof_photo_base64 && (
              <div className="mt-18">
                <small className="muted" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pickup proof photo</small>
                <img src={s.proof_photo_base64} alt="Proof" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, marginTop: 8 }} data-testid="proof-photo" />
              </div>
            )}
          </div>

          {s.pod && (
            <div className="glass mt-18" data-testid="pod-card">
              <div className="glass-header"><div><h3>Proof of delivery</h3><p>Captured at delivery.</p></div></div>
              {s.pod.receiver_name && <p style={{ margin: 0 }}><small className="muted" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Received by</small><br /><span style={{ color: 'var(--p-ink)', fontWeight: 650 }}>{s.pod.receiver_name}</span></p>}
              {s.pod.signature_base64 && (
                <div className="mt-12">
                  <small className="muted" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Signature</small>
                  <div style={{ background: 'white', borderRadius: 12, padding: 8, marginTop: 6 }}>
                    <img src={s.pod.signature_base64} alt="Signature" style={{ width: '100%', maxHeight: 160, objectFit: 'contain' }} data-testid="pod-signature-img" />
                  </div>
                </div>
              )}
              {s.pod.pod_photo_base64 && (
                <div className="mt-12">
                  <small className="muted" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delivery photo</small>
                  <img src={s.pod.pod_photo_base64} alt="POD" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, marginTop: 6 }} data-testid="pod-photo-img" />
                </div>
              )}
              {s.pod.delivered_at && <p className="muted mt-12" style={{ margin: 0 }}>{fmtDate(s.pod.delivered_at)}</p>}
            </div>
          )}

          <div className="glass mt-18">
            <div className="glass-header"><div><h3>Customer</h3></div></div>
            <p style={{ margin: '0', color: 'var(--p-ink)', fontWeight: 650 }}><UserIcon size={14} style={{ display: 'inline', marginRight: 6 }} />{s.customer_name}</p>
            <p className="muted" style={{ margin: '6px 0 0' }}><Mail size={12} style={{ display: 'inline', marginRight: 6 }} />{s.customer_email}</p>
            <p className="muted" style={{ margin: '6px 0 0' }}><Phone size={12} style={{ display: 'inline', marginRight: 6 }} />{s.customer_phone}</p>
            {s.assigned_employee_name && (
              <>
                <hr className="divider" />
                <small className="muted" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Assigned employee</small>
                <p style={{ margin: '6px 0 0', color: 'var(--p-ink)', fontWeight: 650 }}><Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />{s.assigned_employee_name}</p>
              </>
            )}
          </div>
        </div>

        {/* Right column - timeline */}
        <div className="glass">
          <div className="glass-header"><div><h3>Activity</h3><p>Every status update with location & note.</p></div></div>
          <ul className="timeline">
            {(s.events || []).slice().reverse().map((e, i, arr) => {
              const meta = STATUS_META[e.status] || { label: e.status };
              const isNow = i === 0;
              const isDone = !isNow;
              return (
                <li key={i} className={isNow ? 'is-now' : (isDone ? 'is-done' : '')} data-testid="timeline-event">
                  <span className="timeline-dot"><CheckCircle2 /></span>
                  <div>
                    <div className="timeline-head">
                      <strong>{meta.label}</strong>
                      <time>{fmtDate(e.at)}</time>
                    </div>
                    {(e.location || e.by) && <div className="timeline-meta">{e.location && `${e.location} · `}{e.by?.name && `by ${e.by.name}`}</div>}
                    {e.note && <div className="timeline-note">{e.note}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {showStatus && (
        <div className="modal-backdrop" onClick={() => setShowStatus(false)}>
          <div className="modal dark-form" onClick={(e) => e.stopPropagation()} data-testid="status-modal" style={{ maxWidth: 620 }}>
            <h3>Update shipment status</h3>
            <label className="field"><span>New status</span>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} data-testid="status-select">
                {NEXT_STATUS.map((st) => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
              </select>
            </label>
            <label className="field mt-12"><span>Location</span><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Mumbai Cargo (BOM)" data-testid="status-location" /></label>
            <label className="field mt-12"><span>Note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any context about this update" data-testid="status-note" /></label>

            {newStatus === 'delivered' && (
              <div className="mt-18" data-testid="pod-block">
                <hr className="divider" />
                <h4 className="subsection-title"><CheckCircle2 />Proof of delivery</h4>
                <label className="field"><span>Receiver name *</span><input required value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Person who received the parcel" data-testid="receiver-name" /></label>

                <div className="mt-12">
                  <span style={{ display: 'block', color: 'var(--p-muted)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 650, marginBottom: 8 }}>Signature *</span>
                  <SignaturePad onChange={setSignature} />
                </div>

                <div className="mt-18">
                  <span style={{ display: 'block', color: 'var(--p-muted)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 650, marginBottom: 8 }}>Delivery photo (optional, max 2MB)</span>
                  {podPhoto ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={podPhoto} alt="Delivery proof" style={{ width: 200, borderRadius: 12 }} data-testid="pod-preview" />
                      <button type="button" onClick={() => setPodPhoto(null)} className="btn btn-outline btn-tiny" style={{ marginLeft: 10 }}><X size={12} />Remove</button>
                    </div>
                  ) : (
                    <label className="btn btn-outline" style={{ display: 'inline-flex', cursor: 'pointer' }} data-testid="pod-photo-label">
                      <Camera size={16} />Capture photo
                      <input type="file" accept="image/*" capture="environment" onChange={onPodPhoto} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} data-testid="pod-photo-input" />
                    </label>
                  )}
                </div>
              </div>
            )}

            {error && <p className="auth-error mt-12">{error}</p>}

            <div className="modal-actions">
              <button onClick={() => setShowStatus(false)} className="btn btn-outline">Cancel</button>
              <button onClick={submitStatus} className="btn btn-primary" disabled={busy} data-testid="status-submit"><Send size={14} />Push update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
