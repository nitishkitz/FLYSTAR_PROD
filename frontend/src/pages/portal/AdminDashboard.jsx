import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  Package, Plane, CheckCircle2, AlertTriangle, IndianRupee, Inbox, Users, Truck,
  Activity, ArrowUpRight, BarChart3, Globe2, RadioTower, ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api';
import { fmtINR } from '../../lib/shipmentMeta';
import { STATUS_META } from '../../lib/shipmentMeta';

const COLORS = ['#d91a2a', '#d18b16', '#2f7adc', '#0f9d6c', '#7b5fdf', '#ff8157', '#38bdf8', '#f06292'];
const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(11, 37, 69, 0.14)',
  borderRadius: 12,
  boxShadow: '0 14px 36px rgba(11, 37, 69, 0.12)',
  color: 'var(--p-ink)',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/analytics/overview').then((r) => setData(r.data)); }, []);

  if (!data) {
    return (
      <div className="ops-dashboard ops-loading" data-testid="admin-dashboard">
        <div className="ops-loading-panel">
          <RadioTower size={22} />
          <span>Loading command telemetry</span>
        </div>
      </div>
    );
  }

  const { kpis, daily_shipments, status_distribution, by_country, by_employee } = data;
  const statusRows = status_distribution.map((item, index) => ({
    ...item,
    label: STATUS_META[item.status]?.label || item.status,
    color: COLORS[index % COLORS.length],
  }));
  const statusTotal = statusRows.reduce((sum, item) => sum + item.count, 0);
  const activeShipments = kpis.pending_pickup + kpis.in_transit + kpis.exceptions;
  const deliveryRate = kpis.total_shipments ? Math.round((kpis.delivered / kpis.total_shipments) * 100) : 0;
  const leadCountry = by_country[0]?.country || 'No routes';
  const leadEmployee = by_employee[0]?.name || 'No assignments';
  const kpiCards = [
    { label: 'Total shipments', value: kpis.total_shipments, meta: 'Lifetime volume', icon: Package, tone: 'red' },
    { label: 'Pending pickup', value: kpis.pending_pickup, meta: 'Awaiting dispatch', icon: Inbox, tone: 'amber' },
    { label: 'In transit', value: kpis.in_transit, meta: 'Across active routes', icon: Plane, tone: 'blue' },
    { label: 'Delivered', value: kpis.delivered, meta: `${deliveryRate}% completion`, icon: CheckCircle2, tone: 'green' },
    { label: 'Revenue', value: fmtINR(kpis.revenue_inr), meta: 'Delivered orders', icon: IndianRupee, tone: 'violet' },
    { label: 'Exceptions', value: kpis.exceptions, meta: 'Needs action', icon: AlertTriangle, tone: 'red' },
  ];

  return (
    <div className="ops-dashboard" data-testid="admin-dashboard">
      <section className="ops-hero">
        <div className="ops-hero-copy">
          <div className="ops-eyebrow"><RadioTower size={14} />Live command center</div>
          <h1>Command center</h1>
          <p>Real-time control surface for Flystar bookings, pickup pressure, route movement, and exception response.</p>
        </div>

        <div className="ops-hero-panel">
          <div className={`ops-alert ${kpis.exceptions > 0 ? 'is-hot' : ''}`}>
            <ShieldAlert size={18} />
            <div>
              <strong>{kpis.exceptions}</strong>
              <span>{kpis.exceptions === 1 ? 'Exception open' : 'Exceptions open'}</span>
            </div>
          </div>
          <div className="ops-actions">
            <Link to="/portal/admin/queue" className="btn btn-primary"><Inbox size={16} />Pickup queue</Link>
            <Link to="/portal/admin/shipments" className="btn btn-primary"><Truck size={16} />All shipments</Link>
            <Link to="/portal/admin/users" className="btn btn-ghost"><Users size={16} />Users</Link>
          </div>
        </div>
      </section>

      <section className="ops-snapshot">
        <div>
          <span>Active workload</span>
          <strong>{activeShipments}</strong>
          <small>Pending, transit, and exceptions</small>
        </div>
        <div>
          <span>Top route</span>
          <strong>{leadCountry}</strong>
          <small>Highest destination volume</small>
        </div>
        <div>
          <span>Lead operator</span>
          <strong>{leadEmployee}</strong>
          <small>Most assigned shipment load</small>
        </div>
        <div>
          <span>Delivery rate</span>
          <strong>{deliveryRate}%</strong>
          <small>Delivered against lifetime volume</small>
        </div>
      </section>

      <section className="ops-kpi-strip" aria-label="Admin KPIs">
        {kpiCards.map(({ label, value, meta, icon: Icon, tone }) => (
          <article className={`ops-kpi tone-${tone}`} key={label}>
            <div className="ops-kpi-icon"><Icon /></div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{meta}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="ops-grid">
        <article className="ops-panel ops-panel-wide">
          <div className="ops-panel-header">
            <div>
              <span><Activity size={14} />Volume trend</span>
              <h3>Shipments over the last 14 days</h3>
            </div>
            <Link to="/portal/admin/shipments" className="ops-text-link">Inspect <ArrowUpRight size={14} /></Link>
          </div>
          <div className="ops-chart ops-chart-tall">
            <ResponsiveContainer>
              <AreaChart data={daily_shipments} margin={{ top: 8, right: 14, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="shipmentArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d91a2a" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#d91a2a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 37, 69, 0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="#607087" fontSize={11} />
                <YAxis stroke="#607087" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#d91a2a" strokeWidth={3} fill="url(#shipmentArea)" dot={{ r: 3, fill: '#d91a2a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-panel-header">
            <div>
              <span><BarChart3 size={14} />Status mix</span>
              <h3>Shipment states</h3>
            </div>
          </div>
          <div className="ops-chart">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusRows.map((d) => ({ name: d.label, value: d.count }))}
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={3}
                  dataKey="value" nameKey="name"
                >
                  {statusRows.map((d) => <Cell key={d.status} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="ops-status-list">
            {statusRows.length === 0 ? <p className="muted">No shipment states yet.</p> : statusRows.map((item) => (
              <div key={item.status}>
                <span><b style={{ background: item.color }} />{item.label}</span>
                <strong>{statusTotal ? Math.round((item.count / statusTotal) * 100) : 0}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <div className="ops-panel-header">
            <div>
              <span><Globe2 size={14} />Destinations</span>
              <h3>Top countries</h3>
            </div>
          </div>
          <div className="ops-chart">
            <ResponsiveContainer>
              <BarChart data={by_country} layout="vertical" margin={{ top: 6, right: 10, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 37, 69, 0.08)" horizontal={false} />
                <XAxis type="number" stroke="#607087" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="country" type="category" stroke="#607087" fontSize={11} width={120} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#2f7adc" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ops-panel ops-panel-wide">
          <div className="ops-panel-header">
            <div>
              <span><Users size={14} />Field throughput</span>
              <h3>Employee performance</h3>
            </div>
            <Link to="/portal/admin/users" className="ops-text-link">Teams <ArrowUpRight size={14} /></Link>
          </div>
          {by_employee.length === 0 ? (
            <div className="ops-empty">No employee shipment data yet.</div>
          ) : (
            <div className="ops-chart">
              <ResponsiveContainer>
                <BarChart data={by_employee} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 37, 69, 0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#607087" fontSize={11} />
                  <YAxis stroke="#607087" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#607087' }} />
                  <Bar dataKey="total" name="Total handled" fill="#0b2545" radius={[6, 6, 0, 0]} barSize={18} />
                  <Bar dataKey="delivered" name="Delivered" fill="#0f9d6c" radius={[6, 6, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
