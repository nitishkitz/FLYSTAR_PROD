import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PackagePlus, MapPin, Send, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { SHIPMENT_TYPES, SERVICES } from '../../lib/shipmentMeta';

const blank = { name: '', phone: '', line1: '', city: '', state: '', country: '', postal_code: '' };

export default function NewPickup() {
  const { user, errMsg } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState({ ...blank, name: user.name || '', phone: user.phone || '', city: 'Tirupati', state: 'Andhra Pradesh', country: 'India' });
  const [delivery, setDelivery] = useState({ ...blank });
  const [shipmentType, setShipmentType] = useState('parcel');
  const [service, setService] = useState('priority');
  const [weight, setWeight] = useState('1');
  const [dim, setDim] = useState({ l: '', w: '', h: '' });
  const [contents, setContents] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateAddress = (setter) => (k) => (e) => setter((prev) => ({ ...prev, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const payload = {
        pickup, delivery,
        shipment_type: shipmentType,
        service,
        approx_weight_kg: Number(weight) || 0.5,
        approx_length_cm: dim.l ? Number(dim.l) : null,
        approx_width_cm: dim.w ? Number(dim.w) : null,
        approx_height_cm: dim.h ? Number(dim.h) : null,
        contents,
        notes,
      };
      const { data } = await api.post('/shipments', payload);
      navigate(`/portal/shipment/${data.id}`, { replace: true });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const AddressBlock = ({ title, value, setter, prefix }) => (
    <>
      <h4 className="subsection-title"><MapPin />{title}</h4>
      <div className="field-grid-2">
        <label className="field"><span>Full name</span><input required value={value.name} onChange={updateAddress(setter)('name')} data-testid={`${prefix}-name`} /></label>
        <label className="field"><span>Phone</span><input required value={value.phone} onChange={updateAddress(setter)('phone')} data-testid={`${prefix}-phone`} /></label>
      </div>
      <label className="field mt-12"><span>Address line</span><input required value={value.line1} onChange={updateAddress(setter)('line1')} data-testid={`${prefix}-line1`} /></label>
      <div className="field-grid-3 mt-12">
        <label className="field"><span>City</span><input required value={value.city} onChange={updateAddress(setter)('city')} data-testid={`${prefix}-city`} /></label>
        <label className="field"><span>State / Region</span><input value={value.state} onChange={updateAddress(setter)('state')} data-testid={`${prefix}-state`} /></label>
        <label className="field"><span>Country</span><input required value={value.country} onChange={updateAddress(setter)('country')} data-testid={`${prefix}-country`} /></label>
      </div>
      <label className="field mt-12"><span>Postal / Zip</span><input value={value.postal_code} onChange={updateAddress(setter)('postal_code')} data-testid={`${prefix}-postal`} /></label>
    </>
  );

  return (
    <div data-testid="new-pickup-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Raise a new pickup</h1>
          <p>Fill in pickup, delivery, and shipment details — we'll generate a waybill at collection.</p>
        </div>
        <Link to="/portal/customer" className="btn btn-ghost"><ArrowLeft size={16} />Cancel</Link>
      </div>

      <form className="glass dark-form" onSubmit={onSubmit} data-testid="new-pickup-form">
        <AddressBlock title="Pickup from" value={pickup} setter={setPickup} prefix="pickup" />
        <hr className="divider" />
        <AddressBlock title="Deliver to" value={delivery} setter={setDelivery} prefix="delivery" />

        <hr className="divider" />
        <h4 className="subsection-title"><PackagePlus />Shipment details</h4>

        <div className="field-grid-2">
          <label className="field">
            <span>Shipment type</span>
            <select value={shipmentType} onChange={(e) => setShipmentType(e.target.value)} data-testid="ship-type">
              {SHIPMENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Approximate weight (kg)</span>
            <input required type="number" step="0.5" min="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="weight" />
          </label>
        </div>

        <div className="field-grid-3 mt-12">
          <label className="field"><span>Length (cm)</span><input type="number" value={dim.l} onChange={(e) => setDim({ ...dim, l: e.target.value })} data-testid="dim-l" /></label>
          <label className="field"><span>Width (cm)</span><input type="number" value={dim.w} onChange={(e) => setDim({ ...dim, w: e.target.value })} data-testid="dim-w" /></label>
          <label className="field"><span>Height (cm)</span><input type="number" value={dim.h} onChange={(e) => setDim({ ...dim, h: e.target.value })} data-testid="dim-h" /></label>
        </div>

        <div className="mt-18">
          <span style={{ display: 'block', color: 'var(--p-muted)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 650, marginBottom: 10 }}>Service</span>
          <div className="service-pick">
            {SERVICES.map((s) => (
              <label key={s.id} className={service === s.id ? 'is-active' : ''} data-testid={`service-${s.id}`}>
                <input type="radio" name="service" value={s.id} checked={service === s.id} onChange={() => setService(s.id)} />
                <strong>{s.label}</strong>
                <small>{s.transit}</small>
              </label>
            ))}
          </div>
        </div>

        <label className="field mt-18"><span>Contents description</span><input required value={contents} onChange={(e) => setContents(e.target.value)} placeholder="e.g. Educational documents, set of clothes…" data-testid="contents" /></label>
        <label className="field mt-12"><span>Notes (optional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything our dispatcher should know" data-testid="notes" /></label>

        {error && <p className="auth-error mt-12" data-testid="new-pickup-error">{error}</p>}

        <div className="row mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={busy} data-testid="submit-pickup"><Send size={16} />{busy ? 'Submitting…' : 'Submit pickup request'}</button>
        </div>
      </form>
    </div>
  );
}
