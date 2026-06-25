import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, ClipboardCheck, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

const blank = { name: '', phone: '', line1: '', city: '', state: '', country: '', postal_code: '' };

export default function WaybillForm() {
  const { id } = useParams();
  const { errMsg } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [sender, setSender] = useState({ ...blank });
  const [receiver, setReceiver] = useState({ ...blank });
  const [weight, setWeight] = useState('');
  const [dim, setDim] = useState({ l: '', w: '', h: '' });
  const [pieces, setPieces] = useState(1);
  const [declared, setDeclared] = useState(0);
  const [packaging, setPackaging] = useState('box');
  const [restricted, setRestricted] = useState(false);
  const [proof, setProof] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/shipments/${id}`).then(({ data }) => {
      setS(data);
      setSender(data.pickup || { ...blank });
      setReceiver(data.delivery || { ...blank });
      setWeight(String(data.approx_weight_kg || ''));
      setDim({
        l: data.approx_length_cm || '',
        w: data.approx_width_cm || '',
        h: data.approx_height_cm || '',
      });
    });
  }, [id]);

  const setAddr = (setter) => (k) => (e) => setter((prev) => ({ ...prev, [k]: e.target.value }));

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Photo too large — max 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setProof(reader.result);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const payload = {
        sender, receiver,
        actual_weight_kg: Number(weight),
        length_cm: Number(dim.l) || 1,
        width_cm: Number(dim.w) || 1,
        height_cm: Number(dim.h) || 1,
        piece_count: Number(pieces) || 1,
        declared_value_inr: Number(declared) || 0,
        packaging,
        contains_restricted: restricted,
        proof_photo_base64: proof,
        notes,
      };
      await api.post(`/shipments/${id}/waybill`, payload);
      navigate(`/portal/shipment/${id}`, { replace: true });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!s) return <p className="muted">Loading…</p>;

  const Block = ({ title, value, setter, prefix }) => (
    <>
      <h4 className="subsection-title">{title}</h4>
      <div className="field-grid-2">
        <label className="field"><span>Name (verified)</span><input required value={value.name} onChange={setAddr(setter)('name')} data-testid={`${prefix}-name`} /></label>
        <label className="field"><span>Phone</span><input required value={value.phone} onChange={setAddr(setter)('phone')} data-testid={`${prefix}-phone`} /></label>
      </div>
      <label className="field mt-12"><span>Address</span><input required value={value.line1} onChange={setAddr(setter)('line1')} data-testid={`${prefix}-line1`} /></label>
      <div className="field-grid-3 mt-12">
        <label className="field"><span>City</span><input required value={value.city} onChange={setAddr(setter)('city')} data-testid={`${prefix}-city`} /></label>
        <label className="field"><span>State</span><input value={value.state} onChange={setAddr(setter)('state')} data-testid={`${prefix}-state`} /></label>
        <label className="field"><span>Country</span><input required value={value.country} onChange={setAddr(setter)('country')} data-testid={`${prefix}-country`} /></label>
      </div>
    </>
  );

  return (
    <div data-testid="waybill-form-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Waybill — {s.awb}</h1>
          <p>Fill the verified consignment details at the customer's location.</p>
        </div>
        <Link to={`/portal/shipment/${id}`} className="btn btn-ghost"><ArrowLeft size={16} />Back</Link>
      </div>

      <form className="glass dark-form" onSubmit={onSubmit} data-testid="waybill-form">
        <Block title="Sender (verified)" value={sender} setter={setSender} prefix="sender" />
        <hr className="divider" />
        <Block title="Receiver (verified)" value={receiver} setter={setReceiver} prefix="receiver" />

        <hr className="divider" />
        <h4 className="subsection-title">Consignment</h4>
        <div className="field-grid-3">
          <label className="field"><span>Actual weight (kg)</span><input required type="number" step="0.01" min="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="actual-weight" /></label>
          <label className="field"><span>Piece count</span><input required type="number" min="1" value={pieces} onChange={(e) => setPieces(e.target.value)} data-testid="pieces" /></label>
          <label className="field"><span>Declared value (INR)</span><input type="number" min="0" value={declared} onChange={(e) => setDeclared(e.target.value)} data-testid="declared-value" /></label>
        </div>
        <div className="field-grid-3 mt-12">
          <label className="field"><span>Length (cm)</span><input required type="number" step="0.1" value={dim.l} onChange={(e) => setDim({ ...dim, l: e.target.value })} data-testid="length" /></label>
          <label className="field"><span>Width (cm)</span><input required type="number" step="0.1" value={dim.w} onChange={(e) => setDim({ ...dim, w: e.target.value })} data-testid="width" /></label>
          <label className="field"><span>Height (cm)</span><input required type="number" step="0.1" value={dim.h} onChange={(e) => setDim({ ...dim, h: e.target.value })} data-testid="height" /></label>
        </div>

        <div className="field-grid-2 mt-12">
          <label className="field"><span>Packaging</span>
            <select value={packaging} onChange={(e) => setPackaging(e.target.value)} data-testid="packaging">
              <option value="box">Box</option><option value="envelope">Envelope</option>
              <option value="tube">Tube</option><option value="pallet">Pallet</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field" style={{ alignSelf: 'end' }}>
            <span>Restricted items?</span>
            <div className="row" style={{ gap: 14, marginTop: 8 }}>
              <label className="row" style={{ gap: 6, cursor: 'pointer' }}><input type="radio" checked={!restricted} onChange={() => setRestricted(false)} data-testid="restricted-no" />No</label>
              <label className="row" style={{ gap: 6, cursor: 'pointer' }}><input type="radio" checked={restricted} onChange={() => setRestricted(true)} data-testid="restricted-yes" />Yes</label>
            </div>
          </label>
        </div>

        <label className="field mt-12"><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any handling/customs context" data-testid="wb-notes" /></label>

        <div className="mt-18">
          <span style={{ display: 'block', color: 'var(--portal-text-soft)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 650, marginBottom: 10 }}>Proof photo (optional, max 2MB)</span>
          {proof ? (
            <div style={{ position: 'relative' }}>
              <img src={proof} alt="Proof" style={{ width: 220, borderRadius: 12 }} data-testid="proof-preview" />
              <button type="button" onClick={() => setProof(null)} className="btn btn-outline btn-tiny" style={{ position: 'absolute', top: 8, left: 232 }}><X size={12} />Remove</button>
            </div>
          ) : (
            <label className="btn btn-outline" style={{ display: 'inline-flex', cursor: 'pointer' }}>
              <Upload size={16} />Upload photo
              <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} data-testid="proof-input" />
            </label>
          )}
        </div>

        {error && <p className="auth-error mt-12" data-testid="waybill-error">{error}</p>}

        <div className="row mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={busy} data-testid="waybill-submit"><ClipboardCheck size={16} />{busy ? 'Saving…' : 'Save waybill & mark picked up'}</button>
        </div>
      </form>
    </div>
  );
}
