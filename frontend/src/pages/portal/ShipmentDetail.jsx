import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, Package, Plane, FileText, AlertCircle,
  CheckCircle2, Send, Building2, Edit3, Camera, X,
  CreditCard, ClipboardList, UserCheck, Truck, PackageCheck, Warehouse, Box,
  Compass, ShieldAlert, Milestone, Copy, Check, Calendar, Info,
  Scale
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { STATUS_META, STATUS_ORDER, fmtDate, fmtINR } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';
import SignaturePad from '../../components/portal/SignaturePad';

const routeCode = (value = '') => {
  const letters = value.replace(/[^a-z]/gi, '').toUpperCase();
  return (letters || 'FLY').slice(0, 3).padEnd(3, 'X');
};

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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (s?.awb) {
      navigator.clipboard.writeText(s.awb);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const load = () => api.get(`/shipments/${id}`).then((r) => setS(r.data));
  useEffect(() => { load(); }, [id]);

  const accept = async () => {
    setBusy(true); setError('');
    try { await api.post(`/shipments/${id}/accept`); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const checkInAtCustomer = async () => {
    setBusy(true); setError('');
    try {
      await api.post(`/shipments/${id}/status`, {
        status: 'checked_in',
        location: s.pickup?.city || '',
        note: 'Employee checked in at customer location',
      });
      await load();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
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
  const canCheckIn = user.role === 'employee' && isMine && s.status === 'en_route_to_pickup';
  const needWaybill = canUpdate && !s.actual_weight_kg && s.status === 'checked_in';
  const canOpenStatusUpdate = canUpdate && !needWaybill;

  const currentIdx = STATUS_ORDER.indexOf(s.status);
  const nextStatusOption = (currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1)
    ? STATUS_ORDER[currentIdx + 1]
    : '';
  const originCity = s.pickup?.city || 'Origin';
  const originRegion = s.pickup?.state || s.pickup?.country || 'Flystar network';
  const destinationCity = s.delivery?.city || s.delivery?.country || 'Destination';
  const destinationRegion = s.delivery?.state || s.delivery?.country || 'Flystar network';
  const serviceLabel = `${s.service || 'Standard'} mode`;
  const originCode = routeCode(originCity);
  const destinationCode = routeCode(destinationCity);

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
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-wide" style={{ fontFamily: 'ui-monospace, monospace', margin: 0 }}>
              {s.awb}
            </h1>
            <button
              onClick={handleCopy}
              className={`btn btn-ghost btn-tiny flex items-center gap-1.5 transition-all duration-300 ${copied ? 'text-green-600 bg-green-50' : 'text-slate-500 hover:text-slate-800'}`}
              title="Copy AWB Tracking Number"
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--p-border)' }}
            >
              {copied ? <Check size={14} className="text-green-600 animate-bounce" /> : <Copy size={14} />}
              <span className="font-semibold text-xs">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          
          {/* Flystar premium route card */}
          <div className="flystar-pass mt-16" aria-label="Flystar shipment route">
            <div className="flystar-pass-main">
              <div className="flystar-pass-ribbon">
                <span>Flystar priority airway</span>
                <b>{serviceLabel}</b>
              </div>

              <div className="flystar-pass-route">
                <div className="flystar-pass-city">
                  <span>Origin</span>
                  <strong>{originCode}</strong>
                  <b>{originCity}</b>
                  <small>{originRegion}</small>
                </div>

                <div className="flystar-pass-flightline">
                  <div className="flystar-pass-node is-live" />
                  <div className="flystar-pass-track">
                    <Plane size={20} />
                    <span>AWB Status</span>
                  </div>
                  <div className="flystar-pass-node" />
                </div>

                <div className="flystar-pass-city is-destination">
                  <span>Destination</span>
                  <strong>{destinationCode}</strong>
                  <b>{destinationCity}</b>
                  <small>{destinationRegion}</small>
                </div>
              </div>

              <div className="flystar-pass-meta">
                <span><Calendar size={14} /> Created {fmtDate(s.created_at)}</span>
                <span><Package size={14} /> {STATUS_META[s.status]?.label || s.status}</span>
                <span><ShieldAlert size={14} /> Secure courier manifest</span>
              </div>
            </div>

            <div className="flystar-pass-stub">
              <span>Shipment card</span>
              <strong>{s.awb}</strong>
              <div className="flystar-pass-stub-route">
                <b>{originCode}</b>
                <Plane size={15} />
                <b>{destinationCode}</b>
              </div>
              <div className="flystar-pass-barcode" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, i) => (
                  <i key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="portal-topbar-actions">
          <Link to={`/portal/shipment/${id}/invoice`} className="btn btn-ghost" data-testid="open-invoice"><FileText size={16} />Invoice</Link>
          {user.role === 'customer' && s.payment_status !== 'paid' && (
            <button onClick={payInvoice} disabled={paying} className="btn btn-primary" data-testid="pay-now-btn"><CreditCard size={16} />{paying ? 'Processing…' : 'Pay now'}</button>
          )}
          {canAccept && <button onClick={accept} disabled={busy} className="btn btn-primary" data-testid="accept-btn"><CheckCircle2 size={16} />Accept order</button>}
          {canCheckIn && <button onClick={checkInAtCustomer} disabled={busy} className="btn btn-primary" data-testid="check-in-btn"><UserCheck size={16} />Check in at customer</button>}
          {needWaybill && <Link to={`/portal/employee/shipment/${id}/waybill`} className="btn btn-primary" data-testid="fill-waybill-btn"><Edit3 size={16} />Fill final pickup form</Link>}
          {needWaybill && (
            <span className="pill tone-amber" data-testid="pickup-form-required-pill">
              <b />Final pickup form required
            </span>
          )}
          {canOpenStatusUpdate && <button onClick={() => { if (nextStatusOption) setNewStatus(nextStatusOption); setShowStatus(true); }} className="btn btn-ghost" data-testid="update-status-btn"><Send size={16} />Update status</button>}
        </div>
      </div>

      {error && <p className="auth-error" data-testid="detail-error">{error}</p>}

      {/* Status timeline visual progress */}
      <div className="glass mt-12 overflow-hidden relative">
        <div className="glass-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2">
              <Compass className="text-red-500 animate-spin-slow" size={20} />
              Shipment journey
            </h3>
            <p className="text-slate-500">Live progress tracking across Flystar's delivery milestones.</p>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-1.5 text-xs text-slate-600 w-fit">
            <Info size={12} className="text-slate-400" />
            <span>Scroll horizontally to view all steps</span>
          </div>
        </div>

        {/* Horizontal scroll container for the Stepper */}
        <div className="overflow-x-auto pb-6 pt-8 px-4" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          <div className="min-w-[1000px] relative px-6">
            
            {/* Background Line Track */}
            <div className="absolute top-[22px] left-[40px] right-[40px] h-[3px] bg-slate-100 rounded-full z-0" />
            
            {/* Filled Progress Track Line */}
            <div 
              className="absolute top-[22px] left-[40px] h-[3px] bg-gradient-to-r from-red-500 to-amber-500 rounded-full z-1 transition-all duration-500"
              style={{ 
                width: `calc(${currentIdx === -1 ? 0 : (currentIdx / (STATUS_ORDER.length - 1)) * 100}% - ${currentIdx === STATUS_ORDER.length - 1 ? 0 : 20}px)`
              }}
            />

            {/* Steps Row */}
            <div className="flex justify-between items-start relative z-10">
              {STATUS_ORDER.map((st, i) => {
                const meta = STATUS_META[st];
                const done = i < currentIdx;
                const active = i === currentIdx;
                
                // Select custom icon per status
                let StepIcon = Package;
                if (st === 'requested') StepIcon = ClipboardList;
                else if (st === 'assigned') StepIcon = UserCheck;
                else if (st === 'en_route_to_pickup') StepIcon = Truck;
                else if (st === 'checked_in') StepIcon = UserCheck;
                else if (st === 'picked_up') StepIcon = PackageCheck;
                else if (st === 'at_hub') StepIcon = Warehouse;
                else if (st === 'packed') StepIcon = Box;
                else if (st === 'dispatched') StepIcon = Plane;
                else if (st === 'in_transit') StepIcon = Compass;
                else if (st === 'customs') StepIcon = ShieldAlert;
                else if (st === 'out_for_delivery') StepIcon = Milestone;
                else if (st === 'delivered') StepIcon = CheckCircle2;

                return (
                  <div key={st} className="flex flex-col items-center text-center w-20 relative group">
                    {/* Node circle */}
                    <div 
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 z-10 border-2 ${
                        active 
                          ? 'bg-white border-red-500 shadow-md ring-4 ring-red-100 scale-110' 
                          : done 
                            ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-600 text-white shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={18} className="text-white" />
                      ) : (
                        <StepIcon size={16} className={active ? 'text-red-500' : 'text-current'} />
                      )}
                    </div>

                    {/* Active pulsing tag */}
                    {active && (
                      <span className="absolute -top-6 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-bounce shadow-sm z-20">
                        Current
                      </span>
                    )}

                    {/* Step label */}
                    <div className="mt-3 flex flex-col items-center">
                      <span 
                        className={`text-[10px] tracking-tight leading-tight font-bold ${
                          active 
                            ? 'text-red-500 font-extrabold text-xs' 
                            : done 
                              ? 'text-slate-800' 
                              : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                        style={{ maxWidth: '85px' }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      <div className="two-col mt-18">
        {/* Left column - addresses & shipment info */}
        <div>
          <div className="glass">
            <div className="glass-header">
              <div>
                <h3>Addresses</h3>
                <p>Pickup & delivery details.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
              {/* Decorative vertical separator for mid-screens and larger */}
              <div className="hidden sm:block absolute left-1/2 top-4 bottom-4 w-px bg-slate-100 -translate-x-1/2 z-0" />
              
              {/* Pickup card */}
              <div className="relative z-10 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-5 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-amber-600 font-extrabold">Pickup Information</span>
                </div>
                
                <h4 className="text-base font-bold text-slate-800 mb-2">{s.pickup?.name}</h4>
                
                <div className="flex flex-col gap-2 mt-3">
                  <a 
                    href={`tel:${s.pickup?.phone}`} 
                    className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-500 w-fit transition-colors"
                  >
                    <span className="p-1 bg-white border border-slate-100 rounded-md shadow-sm">
                      <Phone size={12} className="text-slate-400" />
                    </span>
                    {s.pickup?.phone}
                  </a>
                  
                  <div className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed mt-1">
                    <span className="p-1 bg-white border border-slate-100 rounded-md shadow-sm mt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                    </span>
                    <div>
                      {s.pickup?.line1 && <div>{s.pickup?.line1}</div>}
                      <div>{s.pickup?.city}, {s.pickup?.state || s.pickup?.country} {s.pickup?.postal_code}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Delivery card */}
              <div className="relative z-10 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-5 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-blue-600 font-extrabold">Delivery Destination</span>
                </div>
                
                <h4 className="text-base font-bold text-slate-800 mb-2">{s.delivery?.name}</h4>
                
                <div className="flex flex-col gap-2 mt-3">
                  <a 
                    href={`tel:${s.delivery?.phone}`} 
                    className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-500 w-fit transition-colors"
                  >
                    <span className="p-1 bg-white border border-slate-100 rounded-md shadow-sm">
                      <Phone size={12} className="text-slate-400" />
                    </span>
                    {s.delivery?.phone}
                  </a>
                  
                  <div className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed mt-1">
                    <span className="p-1 bg-white border border-slate-100 rounded-md shadow-sm mt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                    </span>
                    <div>
                      {s.delivery?.line1 && <div>{s.delivery?.line1}</div>}
                      <div>{s.delivery?.city}, {s.delivery?.state || s.delivery?.country} {s.delivery?.postal_code}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass mt-18">
            <div className="glass-header"><div><h3>Consignment Details</h3></div></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Service */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all duration-300 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                  <Plane size={16} />
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Service</small>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{s.service || '—'}</p>
                </div>
              </div>
              
              {/* Type */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all duration-300 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                  <Package size={16} />
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Type</small>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{s.shipment_type || '—'}</p>
                </div>
              </div>
              
              {/* Weight */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all duration-300 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                  <Scale size={16} />
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Weight</small>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{s.actual_weight_kg || s.approx_weight_kg || '—'} kg</p>
                </div>
              </div>

              {/* Pieces */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all duration-300 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-500">
                  <Box size={16} />
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pieces</small>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{s.piece_count || '—'}</p>
                </div>
              </div>

              {/* Declared Value */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all duration-300 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                  <CreditCard size={16} />
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Declared value</small>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{s.declared_value_inr ? fmtINR(s.declared_value_inr) : '—'}</p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all duration-300 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                  <CreditCard size={16} />
                </div>
                <div>
                  <small className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Price</small>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtINR(s.price_inr)}</p>
                </div>
              </div>

            </div>
            {s.contents && <p className="mt-12 text-sm text-slate-500">Contents: <span className="font-bold text-slate-700">{s.contents}</span></p>}
            {s.notes && <p className="text-sm text-slate-500">Notes: <span className="font-bold text-slate-700">{s.notes}</span></p>}
            {s.contains_restricted && <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-3 font-semibold"><AlertCircle size={14} />Contains restricted items</p>}
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
            <div className="glass-header"><div><h3>Customer Detail</h3></div></div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
                {(s.customer_name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-800">{s.customer_name}</h4>
                <div className="flex flex-col gap-1.5 mt-2">
                  <a href={`mailto:${s.customer_email}`} className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-500 transition-colors w-fit">
                    <Mail size={12} className="text-slate-400" />
                    {s.customer_email}
                  </a>
                  <a href={`tel:${s.customer_phone}`} className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-500 transition-colors w-fit">
                    <Phone size={12} className="text-slate-400" />
                    {s.customer_phone}
                  </a>
                </div>
              </div>
            </div>
            
            {s.assigned_employee_name && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <small className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned courier employee</small>
                <div className="flex items-center gap-2 mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                    <Building2 size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{s.assigned_employee_name}</p>
                    <p className="text-[10px] text-slate-500">Delivery Executive</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column - timeline */}
        <div className="glass">
          <div className="glass-header"><div><h3>Activity</h3><p>Every status update with location & note.</p></div></div>
          <ul className="timeline">
            {(s.events || []).slice().reverse().map((e, i) => {
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
                {nextStatusOption ? (
                  <option value={nextStatusOption}>{STATUS_META[nextStatusOption]?.label || nextStatusOption}</option>
                ) : (
                  <option value="">No valid next status</option>
                )}
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
