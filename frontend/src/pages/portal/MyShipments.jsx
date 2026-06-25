import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { fmtDate, fmtINR } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';

export default function MyShipments() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { load(); }, []);
  const load = (search = '') => {
    api.get(`/shipments${search ? `?q=${encodeURIComponent(search)}` : ''}`).then((r) => setList(r.data));
  };

  return (
    <div data-testid="my-shipments-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>My shipments</h1>
          <p>Every pickup, packed, transit, and delivered consignment in one place.</p>
        </div>
      </div>

      <div className="glass">
        <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="row mt-12" style={{ marginBottom: 18 }}>
          <div className="field" style={{ flex: 1 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by AWB, city, country…" data-testid="my-shipments-search" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--portal-border-light)', borderRadius: 12, color: 'white', padding: '12px 14px', minHeight: 48, width: '100%' }} />
          </div>
          <button type="submit" className="btn btn-ghost"><Search size={16} />Search</button>
        </form>

        {!list ? <p className="muted">Loading…</p> : list.length === 0 ? (
          <div className="empty-card"><h3>No shipments yet</h3><p>Once you raise a pickup, it'll show up here with live status.</p></div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>AWB</th><th>Route</th><th>Type</th><th>Service</th><th>Status</th><th>Price</th><th>Created</th></tr></thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} data-testid={`row-${s.awb}`}>
                    <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                    <td>{s.pickup?.city} → {s.delivery?.country}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.shipment_type}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.service}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td>{fmtINR(s.price_inr)}</td>
                    <td className="muted">{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
