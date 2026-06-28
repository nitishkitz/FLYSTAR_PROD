import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, CreditCard, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate, fmtINR } from '../../lib/shipmentMeta';

export default function Invoice() {
  const { id } = useParams();
  const { user, errMsg } = useAuth();
  const [s, setS] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get(`/shipments/${id}`).then((r) => setS(r.data));
  useEffect(() => { load(); }, [id]);

  const pay = async () => {
    setPaying(true); setError('');
    try { await api.post(`/shipments/${id}/pay`, { method: 'card', note: 'Demo' }); await load(); }
    catch (e) { setError(errMsg(e)); } finally { setPaying(false); }
  };

  if (!s) return <p className="muted">Loading…</p>;
  const lineWeight = s.actual_weight_kg || s.approx_weight_kg;
  const paid = s.payment_status === 'paid';
  const canPay = !paid && (user?.role === 'customer' || user?.role === 'admin');
  const subtotal = s.price_inr || 0;
  const total = subtotal;

  return (
    <div data-testid="invoice-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Invoice</h1>
          <p>Commercial shipment invoice for {s.awb}.</p>
        </div>
        <div className="portal-topbar-actions">
          <Link to={`/portal/shipment/${id}`} className="btn btn-ghost"><ArrowLeft size={16} />Back</Link>
          {canPay && <button onClick={pay} disabled={paying} className="btn btn-primary" data-testid="invoice-pay-btn"><CreditCard size={16} />{paying ? 'Processing…' : 'Pay now'}</button>}
          <button onClick={() => window.print()} className="btn btn-primary" data-testid="print-invoice"><Printer size={16} />Print</button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="invoice-paper" data-testid="invoice-paper">
        {paid && <div className="invoice-paid-stamp" data-testid="paid-stamp">PAID</div>}

        <header className="invoice-head">
          <div>
            <img src="/Assets/flystar-wordmark.png" alt="Flystar" />
            <p>
              #19-10-24/P, Opp: Passport Office, AIR Bypass Road, Tirupati<br />
              flystarintl1@gmail.com · +91 8125477584
            </p>
          </div>

          <div className="invoice-title-block">
            <span>Tax invoice</span>
            <h2>INVOICE</h2>
            <b>{s.invoice_number}</b>
          </div>
        </header>

        <section className="invoice-status-line">
          <div>
            <span>AWB</span>
            <strong>{s.awb}</strong>
          </div>
          <div>
            <span>Issued</span>
            <strong>{fmtDate(s.created_at)}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong className={paid ? 'is-paid' : 'is-due'}>{paid ? 'Paid' : 'Due'}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{fmtINR(total)}</strong>
          </div>
        </section>

        <section className="invoice-address-grid">
          <article>
            <span>Bill to</span>
            <strong>{s.customer_name}</strong>
            <p>{s.customer_email}</p>
            <p>{s.customer_phone}</p>
          </article>
          <article>
            <span>Pickup from</span>
            <strong>{s.pickup?.name || s.customer_name}</strong>
            <p>{s.pickup?.line1}, {s.pickup?.city}</p>
            <p>{s.pickup?.state}, {s.pickup?.country} {s.pickup?.postal_code}</p>
          </article>
          <article>
            <span>Deliver to</span>
            <strong>{s.delivery?.name}</strong>
            <p>{s.delivery?.line1}, {s.delivery?.city}</p>
            <p>{s.delivery?.state}, {s.delivery?.country} {s.delivery?.postal_code}</p>
          </article>
        </section>

        <section className="invoice-route-row">
          <div>
            <span>Route</span>
            <strong>{s.pickup?.city || 'Origin'} → {s.delivery?.city || s.delivery?.country}</strong>
          </div>
          <div>
            <span>Service</span>
            <strong className="capitalize">{s.service}</strong>
          </div>
          <div>
            <span>Weight</span>
            <strong>{lineWeight} kg</strong>
          </div>
        </section>

        <table className="invoice-items">
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{s.shipment_type}</strong>
                <span>{s.contents || 'International courier shipment'}</span>
              </td>
              <td>1</td>
              <td>{fmtINR(subtotal)}</td>
              <td>{fmtINR(subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <section className="invoice-bottom">
          <div className="invoice-notes">
            <span>Notes</span>
            <p>
              Rates exclude duties, taxes, insurance, restricted-item handling, and remote-area
              surcharges where applicable. This invoice was generated from the Flystar Operations Portal.
            </p>
            {paid && (
              <div className="invoice-paid-note">
                <CheckCircle2 size={16} />
                <span>Paid via {s.payment_method || 'card'} · Receipt {s.payment_receipt}</span>
                {s.paid_at && <small>{fmtDate(s.paid_at)}</small>}
              </div>
            )}
          </div>

          <div className="invoice-total-card">
            <div><span>Subtotal</span><strong>{fmtINR(subtotal)}</strong></div>
            <div><span>Adjustments</span><strong>{fmtINR(0)}</strong></div>
            <div className="is-total">
              <span>Total payable</span>
              <strong className={paid ? 'is-paid' : ''}>{fmtINR(total)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
