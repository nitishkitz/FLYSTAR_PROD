import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Inbox, Plane, Search, Truck, UserCheck, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate } from '../../lib/shipmentMeta';

export default function AdminQueue() {
  const { errMsg } = useAuth();
  const [items, setItems] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const applyLoad = async () => {
    const [shipmentsRes, employeesRes] = await Promise.all([
      api.get('/shipments?status=requested&limit=100'),
      api.get('/users?role=employee'),
    ]);
    setItems(shipmentsRes.data);
    setEmployees(employeesRes.data.filter((u) => u.active !== false));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/shipments?status=requested&limit=100'),
      api.get('/users?role=employee'),
    ]).then(([shipmentsRes, employeesRes]) => {
      if (cancelled) return;
      setItems(shipmentsRes.data);
      setEmployees(employeesRes.data.filter((u) => u.active !== false));
    }).catch((e) => {
      if (!cancelled) setError(errMsg(e));
    });
    return () => { cancelled = true; };
  }, [errMsg]);

  const queue = (items || [])
    .filter((s) => !s.assigned_employee_id && s.status === 'requested')
    .filter((s) => {
      if (!q.trim()) return true;
      const query = q.toLowerCase();
      return (
        s.awb.toLowerCase().includes(query) ||
        (s.customer_name || '').toLowerCase().includes(query) ||
        (s.pickup?.city || '').toLowerCase().includes(query) ||
        (s.delivery?.city || '').toLowerCase().includes(query) ||
        (s.delivery?.country || '').toLowerCase().includes(query)
      );
    });

  const assign = async (shipmentId) => {
    const employeeId = selected[shipmentId];
    if (!employeeId) {
      setError('Select an employee before assigning the pickup.');
      return;
    }
    setBusyId(shipmentId);
      setError('');
    try {
      await api.post(`/shipments/${shipmentId}/assign`, { employee_id: employeeId });
      await applyLoad();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div data-testid="admin-queue-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Pickup queue</h1>
          <p>Assign unallocated pickup requests to any active Flystar employee.</p>
        </div>
      </div>

      {error && <p className="auth-error mb-18">{error}</p>}

      <div className="kpi-grid">
        <div className="kpi kpi-amber">
          <small>Waiting assignment</small>
          <strong>{items ? queue.length : '…'}</strong>
          <span className="delta"><Inbox size={14} />Unassigned requests</span>
          <div className="kpi-icon"><Inbox /></div>
        </div>
        <div className="kpi kpi-blue">
          <small>Available employees</small>
          <strong>{employees.length}</strong>
          <span className="delta"><UserCheck size={14} />Active field team</span>
          <div className="kpi-icon"><UserCheck /></div>
        </div>
      </div>

      <div className="glass p-6 rounded-2xl">
        <div className="glass-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="flex items-center gap-2">
              <Truck className="text-red-500" size={20} />
              Admin pickup assignment
            </h3>
            <p className="text-slate-500">Marketing and customer pickup requests land here until assigned.</p>
          </div>
          <div className="relative min-w-[280px] w-full md:w-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search AWB, customer, route..."
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-slate-700 text-sm font-semibold transition-all outline-none"
              style={{ minHeight: 38 }}
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {!items ? (
          <p className="muted">Loading pickup queue…</p>
        ) : queue.length === 0 ? (
          <div className="empty-card">
            <h3>No unassigned pickups</h3>
            <p>New marketing and customer requests will appear here.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>AWB</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Service</th>
                  <th>Created</th>
                  <th>Assign to</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((s) => {
                  const isExpress = s.service === 'express' || s.service === 'priority';
                  return (
                    <tr key={s.id} data-testid={`admin-queue-row-${s.awb}`}>
                      <td><Link to={`/portal/shipment/${s.id}`} className="awb">{s.awb}</Link></td>
                      <td>
                        <span className="font-semibold text-slate-800 block text-xs">{s.customer_name}</span>
                        <small className="text-slate-400 block text-[10px]">{s.customer_email}</small>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <span>{s.pickup?.city}</span>
                          <ArrowRight size={12} className="text-slate-400 shrink-0" />
                          <span>{s.delivery?.city || s.delivery?.country}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`pill text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit ${isExpress ? 'tone-green' : 'tone-blue'}`}>
                          {isExpress ? <Plane size={11} /> : <Truck size={11} />}
                          <span className="capitalize">{s.service}</span>
                        </span>
                      </td>
                      <td className="text-slate-400 text-[11px] font-medium">{fmtDate(s.created_at)}</td>
                      <td>
                        <select
                          value={selected[s.id] || ''}
                          onChange={(e) => setSelected((current) => ({ ...current, [s.id]: e.target.value }))}
                          className="px-3 py-2 bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 rounded-xl text-slate-700 text-xs font-semibold transition-all outline-none"
                          data-testid={`assign-select-${s.awb}`}
                        >
                          <option value="">Select employee</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>{employee.name || employee.email}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-primary btn-tiny"
                          style={{ padding: '6px 12px', borderRadius: '8px' }}
                          disabled={busyId === s.id || employees.length === 0}
                          onClick={() => assign(s.id)}
                          data-testid={`assign-${s.awb}`}
                        >
                          {busyId === s.id ? 'Assigning…' : <><CheckCircle2 size={13} />Assign</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
