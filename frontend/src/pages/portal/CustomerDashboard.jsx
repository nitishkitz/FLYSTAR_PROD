import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus, Plane, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate, fmtINR } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState(null);

  useEffect(() => {
    api.get('/shipments?limit=5').then((r) => setShipments(r.data)).catch(() => setShipments([]));
  }, []);

  const counts = (shipments || []).reduce((acc, s) => {
    if (s.status === 'delivered') acc.delivered += 1;
    else if (['requested', 'assigned', 'en_route_to_pickup', 'checked_in'].includes(s.status)) acc.pending += 1;
    else acc.transit += 1;
    return acc;
  }, { pending: 0, transit: 0, delivered: 0 });

  return (
    <div data-testid="customer-dashboard">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Hello, {user.name?.split(' ')[0] || 'friend'}.</h1>
          <p>Track active shipments and raise a fresh pickup from your dashboard.</p>
        </div>
        <div className="portal-topbar-actions">
          <Link to="/portal/customer/new" className="btn btn-primary" data-testid="new-pickup-cta">
            <PackagePlus size={16} />Raise pickup
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi kpi-amber" data-testid="kpi-pending">
          <small>Awaiting pickup</small>
          <strong>{counts.pending}</strong>
          <span className="delta"><Clock size={14} /> Requests in queue</span>
          <div className="kpi-icon"><Clock /></div>
        </div>
        <div className="kpi kpi-blue" data-testid="kpi-transit">
          <small>In transit</small>
          <strong>{counts.transit}</strong>
          <span className="delta"><Plane size={14} /> Across global routes</span>
          <div className="kpi-icon"><Plane /></div>
        </div>
        <div className="kpi kpi-green" data-testid="kpi-delivered">
          <small>Delivered</small>
          <strong>{counts.delivered}</strong>
          <span className="delta"><CheckCircle2 size={14} /> Lifetime completions</span>
          <div className="kpi-icon"><CheckCircle2 /></div>
        </div>
      </div>

      <div className="glass">
        <div className="glass-header">
          <div>
            <h3>Recent shipments</h3>
            <p>Last five pickups from your account.</p>
          </div>
          <Link to="/portal/customer/shipments" className="btn btn-ghost btn-tiny">View all</Link>
        </div>
        {shipments === null ? (
          <p className="muted">Loading…</p>
        ) : shipments.length === 0 ? (
          <div className="empty-card">
            <h3>No shipments yet</h3>
            <p>Raise your first pickup — our team will collect it from your doorstep in Tirupati.</p>
            <Link to="/portal/customer/new" className="btn btn-primary"><PackagePlus size={16} />Raise pickup</Link>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>AWB</th><th>Route</th><th>Service</th><th>Status</th><th>Price</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} data-testid={`row-${s.awb}`}>
                    <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <MapPin size={13} /> {s.pickup?.city} → {s.delivery?.country}
                      </div>
                    </td>
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
