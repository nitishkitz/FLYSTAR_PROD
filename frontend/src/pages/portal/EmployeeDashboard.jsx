import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Truck, Plane, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate, fmtINR } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => { api.get('/shipments?limit=100').then((r) => setItems(r.data)); }, []);

  const stats = (items || []).reduce((a, s) => {
    if (!s.assigned_employee_id) a.queue += 1;
    else if (s.status === 'delivered') a.done += 1;
    else if (s.assigned_employee_id === user.id) a.active += 1;
    return a;
  }, { queue: 0, active: 0, done: 0 });

  const myActive = (items || []).filter((s) => s.assigned_employee_id === user.id && s.status !== 'delivered').slice(0, 8);

  return (
    <div data-testid="employee-dashboard">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Hello, {user.name?.split(' ')[0] || 'team'}.</h1>
          <p>Your live pickup queue and shipments in motion.</p>
        </div>
        <Link to="/portal/employee/queue" className="btn btn-primary"><Inbox size={16} />Open queue</Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi kpi-amber"><small>Pickup queue</small><strong>{stats.queue}</strong><span className="delta"><Inbox size={14} />Unassigned</span><div className="kpi-icon"><Inbox /></div></div>
        <div className="kpi kpi-blue"><small>Active with me</small><strong>{stats.active}</strong><span className="delta"><Truck size={14} />In motion</span><div className="kpi-icon"><Truck /></div></div>
        <div className="kpi kpi-green"><small>Delivered (total)</small><strong>{stats.done}</strong><span className="delta"><CheckCircle2 size={14} />Lifetime</span><div className="kpi-icon"><CheckCircle2 /></div></div>
      </div>

      <div className="glass">
        <div className="glass-header"><div><h3>My active shipments</h3><p>Update statuses as you progress in the field.</p></div></div>
        {!items ? <p className="muted">Loading…</p> : myActive.length === 0 ? (
          <div className="empty-card"><h3>No active assignments</h3><p>Accept a new request from the queue to begin.</p><Link to="/portal/employee/queue" className="btn btn-primary"><Inbox size={16} />Open queue</Link></div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>AWB</th><th>Route</th><th>Customer</th><th>Status</th><th>Price</th><th>Updated</th></tr></thead>
              <tbody>
                {myActive.map((s) => (
                  <tr key={s.id} data-testid={`row-${s.awb}`}>
                    <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                    <td>{s.pickup?.city} → {s.delivery?.country}</td>
                    <td>{s.customer_name}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td>{fmtINR(s.price_inr)}</td>
                    <td className="muted">{fmtDate(s.updated_at)}</td>
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
