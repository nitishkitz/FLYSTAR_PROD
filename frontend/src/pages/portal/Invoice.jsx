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
    if (!confirm(`Mark invoice ${s.invoice_number} as PAID? (Pay Now placeholder)`)) return;
    setPaying(true); setError('');
    try { await api.post(`/shipments/${id}/pay`, { method: 'card', note: 'Demo' }); await load(); }
    catch (e) { setError(errMsg(e)); } finally { setPaying(false); }
  };

  if (!s) return <p className="muted">Loading…</p>;
  const lineWeight = s.actual_weight_kg || s.approx_weight_kg;
  const paid = s.payment_status === 'paid';
  const canPay = !paid && (user?.role === 'customer' || user?.role === 'admin');

  return (
    <div data-testid="invoice-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Invoice</h1>
          <p>Placeholder invoice for shipment {s.awb}.</p>
        </div>
        <div className="portal-topbar-actions">
          <Link to={`/portal/shipment/${id}`} className="btn btn-ghost"><ArrowLeft size={16} />Back</Link>
          {canPay && <button onClick={pay} disabled={paying} className="btn btn-primary" data-testid="invoice-pay-btn"><CreditCard size={16} />{paying ? 'Processing…' : 'Pay now'}</button>}
          <button onClick={() => window.print()} className="btn btn-primary" data-testid="print-invoice"><Printer size={16} />Print</button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="invoice-paper" data-testid="invoice-paper" style={{ position: 'relative' }}>
        {paid && (
          <div data-testid="paid-stamp" style={{
            position: 'absolute', top: 130, right: 56,
            transform: 'rotate(-12deg)', padding: '10px 22px',
            border: '3px solid #10b981', color: '#10b981',
            fontFamily: "'Outfit Variable', sans-serif", fontWeight: 800, fontSize: 28,
            letterSpacing: '0.18em', borderRadius: 8, opacity: 0.85,
          }}>PAID</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <img src="/Assets/flystar-wordmark.png" alt="Flystar" style={{ height: 60 }} />
            <p style={{ margin: '12px 0 0', color: '#607087', fontSize: 13 }}>
              #19-10-24/P, Opp: Passport Office,<br />AIR Bypass Road, Tirupati.<br />
              flystarintl1@gmail.com · +91 8125477584
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2>INVOICE</h2>
            <p style={{ margin: '4px 0', fontFamily: 'ui-monospace, monospace', color: '#12263e' }}>{s.invoice_number}</p>
            <p style={{ margin: 0, color: '#607087', fontSize: 13 }}>Issue date: {fmtDate(s.created_at)}</p>
            <p style={{ margin: '4px 0 0', color: '#607087', fontSize: 13 }}>AWB: <b style={{ color: '#12263e', fontFamily: 'ui-monospace, monospace' }}>{s.awb}</b></p>
          </div>
        </div>

        <div className="invoice-grid">
          <div>
            <small style={{ color: '#607087', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bill to</small>
            <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{s.customer_name}</p>
            <p style={{ margin: '4px 0', color: '#607087', fontSize: 14 }}>{s.customer_email}</p>
            <p style={{ margin: 0, color: '#607087', fontSize: 14 }}>{s.customer_phone}</p>
          </div>
          <div>
            <small style={{ color: '#607087', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ship to</small>
            <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{s.delivery?.name}</p>
            <p style={{ margin: '4px 0', color: '#607087', fontSize: 14 }}>{s.delivery?.line1}, {s.delivery?.city}</p>
            <p style={{ margin: 0, color: '#607087', fontSize: 14 }}>{s.delivery?.state}, {s.delivery?.country} {s.delivery?.postal_code}</p>
          </div>
        </div>

        <table className="invoice-items">
          <thead>
            <tr><th>Description</th><th>Service</th><th>Weight</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong style={{ textTransform: 'capitalize' }}>{s.shipment_type}</strong> · {s.pickup?.city} → {s.delivery?.country}
                {s.contents && <div style={{ color: '#607087', fontSize: 13, marginTop: 4 }}>{s.contents}</div>}
              </td>
              <td style={{ textTransform: 'capitalize' }}>{s.service}</td>
              <td>{lineWeight} kg</td>
              <td style={{ textAlign: 'right' }}>{fmtINR(s.price_inr)}</td>
            </tr>
          </tbody>
        </table>

        <div className="invoice-total">
          <small style={{ color: '#607087', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total payable</small><br />
          <span style={{ color: paid ? '#10b981' : '#d91a2a' }}>{fmtINR(s.price_inr)}</span>
          {paid && (
            <div style={{ marginTop: 8, fontSize: 14, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', fontFamily: 'Inter, sans-serif' }}>
              <CheckCircle2 size={16} />Paid via {s.payment_method || 'card'} · Receipt {s.payment_receipt}
              {s.paid_at && <span style={{ color: '#607087', fontWeight: 500 }}>· {fmtDate(s.paid_at)}</span>}
            </div>
          )}
        </div>

        <p style={{ marginTop: 32, fontSize: 12, color: '#607087', lineHeight: 1.6 }}>
          This is a placeholder invoice generated by the Flystar Operations Portal.
          Rates are indicative and exclude duties, taxes, insurance, restricted-item handling and remote-area surcharges where applicable.
          Settlement instructions and GST details will be added in the formal invoice.
        </p>
      </div>
    </div>
  );
}
