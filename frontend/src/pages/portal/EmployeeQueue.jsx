import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';

export default function EmployeeQueue() {
  const { user, errMsg } = useAuth();
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/shipments?limit=100').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const accept = async (id) => {
    setBusyId(id); setErr('');
    try { await api.post(`/shipments/${id}/accept`); await load(); }
    catch (e) { setErr(errMsg(e)); }
    finally { setBusyId(null); }
  };

  const queue = (items || []).filter((s) => !s.assigned_employee_id && s.status === 'requested');
  const mine = (items || []).filter((s) => s.assigned_employee_id === user.id);

  return (
    <div data-testid="employee-queue-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Pickup queue</h1>
          <p>Unassigned pickup requests waiting for a Flystar field employee.</p>
        </div>
      </div>

      {err && <p className="auth-error">{err}</p>}

      <div className="glass">
        <div className="glass-header"><div><h3>Waiting for pickup ({queue.length})</h3><p>Accept to assign yourself.</p></div></div>
        {!items ? <p className="muted">Loading…</p> : queue.length === 0 ? (
          <div className="empty-card"><h3>Queue is empty</h3><p>Great work — every request has been picked up.</p></div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>AWB</th><th>Customer</th><th>Route</th><th>Type</th><th>Weight</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {queue.map((s) => (
                  <tr key={s.id} data-testid={`queue-row-${s.awb}`}>
                    <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                    <td>{s.customer_name}</td>
                    <td>{s.pickup?.city} → {s.delivery?.country}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.shipment_type}</td>
                    <td>{s.approx_weight_kg} kg</td>
                    <td className="muted">{fmtDate(s.created_at)}</td>
                    <td><button className="btn btn-primary btn-tiny" disabled={busyId === s.id} onClick={() => accept(s.id)} data-testid={`accept-${s.awb}`}><CheckCircle2 size={13} />{busyId === s.id ? 'Accepting…' : 'Accept'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass mt-18">
        <div className="glass-header"><div><h3>Assigned to me ({mine.length})</h3></div></div>
        {!items || mine.length === 0 ? (
          <p className="muted">Nothing assigned yet.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>AWB</th><th>Customer</th><th>Route</th><th>Status</th></tr></thead>
              <tbody>
                {mine.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                    <td>{s.customer_name}</td>
                    <td>{s.pickup?.city} → {s.delivery?.country}</td>
                    <td><StatusPill status={s.status} /></td>
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
