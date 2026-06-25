import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  Package, Plane, CheckCircle2, AlertTriangle, IndianRupee, Inbox, Users, Truck,
} from 'lucide-react';
import { api } from '../../lib/api';
import { fmtINR } from '../../lib/shipmentMeta';
import { STATUS_META } from '../../lib/shipmentMeta';

const COLORS = ['#ff4655', '#ffb547', '#5eb1ff', '#2bd897', '#b18bff', '#ff8157', '#7ee3ff', '#f06292'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/analytics/overview').then((r) => setData(r.data)); }, []);

  if (!data) return <p className="muted">Loading analytics…</p>;
  const { kpis, daily_shipments, status_distribution, by_country, by_employee } = data;

  return (
    <div data-testid="admin-dashboard">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Command center</h1>
          <p>Real-time view of every Flystar shipment, customer, and dispatch.</p>
        </div>
        <div className="portal-topbar-actions">
          <Link to="/portal/admin/shipments" className="btn btn-primary"><Truck size={16} />All shipments</Link>
          <Link to="/portal/admin/users" className="btn btn-ghost"><Users size={16} />Users</Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi kpi-red"><small>Total shipments</small><strong>{kpis.total_shipments}</strong><span className="delta">Lifetime</span><div className="kpi-icon"><Package /></div></div>
        <div className="kpi kpi-amber"><small>Pending pickup</small><strong>{kpis.pending_pickup}</strong><span className="delta">Awaiting dispatch</span><div className="kpi-icon"><Inbox /></div></div>
        <div className="kpi kpi-blue"><small>In transit</small><strong>{kpis.in_transit}</strong><span className="delta">On Flystar routes</span><div className="kpi-icon"><Plane /></div></div>
        <div className="kpi kpi-green"><small>Delivered</small><strong>{kpis.delivered}</strong><span className="delta">Completed</span><div className="kpi-icon"><CheckCircle2 /></div></div>
        <div className="kpi kpi-violet"><small>Revenue</small><strong>{fmtINR(kpis.revenue_inr)}</strong><span className="delta">Delivered orders</span><div className="kpi-icon"><IndianRupee /></div></div>
        <div className="kpi kpi-red"><small>Exceptions</small><strong>{kpis.exceptions}</strong><span className="delta">Need attention</span><div className="kpi-icon"><AlertTriangle /></div></div>
      </div>

      <div className="two-col">
        <div className="glass">
          <div className="glass-header"><div><h3>Shipments (last 14 days)</h3><p>Daily booking volume</p></div></div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={daily_shipments}>
                <defs>
                  <linearGradient id="lineRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4655" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#ffb547" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#9aa9bf" fontSize={11} />
                <YAxis stroke="#9aa9bf" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0a1c3a', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, color: 'white' }} />
                <Line type="monotone" dataKey="count" stroke="url(#lineRed)" strokeWidth={3} dot={{ r: 4, fill: '#ff4655' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass">
          <div className="glass-header"><div><h3>Status distribution</h3><p>Across all active shipments</p></div></div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={status_distribution.map((d) => ({ name: STATUS_META[d.status]?.label || d.status, value: d.count }))}
                  innerRadius={60} outerRadius={100} paddingAngle={3}
                  dataKey="value" nameKey="name"
                >
                  {status_distribution.map((d, i) => <Cell key={d.status} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a1c3a', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, color: 'white' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9aa9bf' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="glass">
          <div className="glass-header"><div><h3>Top destinations</h3><p>Country-wise shipment volume</p></div></div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={by_country} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="#9aa9bf" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="country" type="category" stroke="#9aa9bf" fontSize={11} width={120} />
                <Tooltip contentStyle={{ background: '#0a1c3a', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, color: 'white' }} />
                <Bar dataKey="count" fill="#5eb1ff" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass">
          <div className="glass-header"><div><h3>Employee performance</h3><p>Assigned vs delivered</p></div></div>
          {by_employee.length === 0 ? <p className="muted">No employee data yet.</p> : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={by_employee}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#9aa9bf" fontSize={11} />
                  <YAxis stroke="#9aa9bf" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0a1c3a', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, color: 'white' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9aa9bf' }} />
                  <Bar dataKey="total" name="Total handled" fill="#b18bff" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="delivered" name="Delivered" fill="#2bd897" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
