import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate, fmtINR, STATUS_META } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';

export default function AdminShipments() {
  const { errMsg } = useAuth();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = (search = q, st = status) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (st) params.set('status', st);
    api.get(`/shipments?${params.toString()}`).then((r) => setList(r.data));
  };
  useEffect(() => { load('', ''); }, []);

  const del = async (id, awb) => {
    if (!confirm(`Delete ${awb}? This cannot be undone.`)) return;
    try { await api.delete(`/shipments/${id}`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const exportCsv = () => {
    if (!list?.length) return;
    const headers = ['awb', 'customer_name', 'customer_email', 'origin_city', 'destination_country', 'service', 'shipment_type', 'status', 'price_inr', 'created_at'];
    const rows = list.map((s) => [
      s.awb, s.customer_name, s.customer_email, s.pickup?.city, s.delivery?.country,
      s.service, s.shipment_type, s.status, s.price_inr, s.created_at,
    ].map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `flystar-shipments-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="admin-shipments-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>All shipments</h1>
          <p>Search, filter, monitor, and edit every shipment in the system.</p>
        </div>
        <button onClick={exportCsv} className="btn btn-ghost" data-testid="export-csv"><Download size={16} />Export CSV</button>
      </div>

      <div className="glass">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="row" style={{ gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AWB, customer, city, country…" data-testid="admin-search" style={{ width: '100%', background: 'var(--p-surface-soft)', border: '1px solid var(--p-border)', borderRadius: 12, color: 'var(--p-ink)', padding: '12px 14px', minHeight: 48 }} />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); load(q, e.target.value); }} data-testid="admin-status-filter" style={{ background: 'var(--p-surface-soft)', border: '1px solid var(--p-border)', borderRadius: 12, color: 'var(--p-ink)', padding: '12px 14px', minHeight: 48 }}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="submit" className="btn btn-ghost"><Search size={16} />Search</button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        {!list ? <p className="muted">Loading…</p> : list.length === 0 ? (
          <div className="empty-card"><h3>No shipments match</h3><p>Try a different search.</p></div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>AWB</th><th>Customer</th><th>Route</th><th>Service</th><th>Status</th><th>Assigned</th><th>Price</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} data-testid={`admin-row-${s.awb}`}>
                    <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                    <td>{s.customer_name}<br /><small className="muted">{s.customer_email}</small></td>
                    <td>{s.pickup?.city} → {s.delivery?.country}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.service}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td>{s.assigned_employee_name || <span className="muted">Unassigned</span>}</td>
                    <td>{fmtINR(s.price_inr)}</td>
                    <td className="muted">{fmtDate(s.created_at)}</td>
                    <td><button onClick={() => del(s.id, s.awb)} className="btn btn-outline btn-tiny" data-testid={`delete-${s.awb}`}><Trash2 size={13} /></button></td>
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
