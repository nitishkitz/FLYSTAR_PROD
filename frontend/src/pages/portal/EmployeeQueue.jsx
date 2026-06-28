import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Inbox, Truck, ArrowRight, Scale, Plane, ChevronRight, Search, X, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate } from '../../lib/shipmentMeta';
import StatusPill from '../../components/portal/StatusPill';

// Helpers for customer initials and colors
const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-red-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-fuchsia-500 to-pink-600',
  ];
  if (!name) return colors[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

export default function EmployeeQueue() {
  const { user, errMsg } = useAuth();
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState('queue');

  const load = () => api.get('/shipments?limit=100').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const accept = async (id) => {
    setBusyId(id); setErr('');
    try { await api.post(`/shipments/${id}/accept`); await load(); }
    catch (e) { setErr(errMsg(e)); }
    finally { setBusyId(null); }
  };

  const allUnassigned = (items || []).filter((s) => !s.assigned_employee_id && s.status === 'requested');
  const queue = allUnassigned.filter((s) => {
    if (!q.trim()) return true;
    const query = q.toLowerCase();
    return (
      s.awb.toLowerCase().includes(query) ||
      (s.customer_name || '').toLowerCase().includes(query) ||
      (s.pickup?.city || '').toLowerCase().includes(query) ||
      (s.delivery?.country || '').toLowerCase().includes(query) ||
      (s.service || '').toLowerCase().includes(query) ||
      (s.shipment_type || '').toLowerCase().includes(query)
    );
  });
  const mine = (items || []).filter((s) => s.assigned_employee_id === user.id);

  return (
    <div data-testid="employee-queue-page">
      {/* Top bar header */}
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div>
          <h1>Pickup queue</h1>
          <p>Unassigned cargo requests waiting for a Flystar field representative.</p>
        </div>
      </div>

      {err && <p className="auth-error mb-18">{err}</p>}

      {/* KPI Stats widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`kpi kpi-amber relative overflow-hidden bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between text-left transition-all ${activeTab === 'queue' ? 'border-amber-200 ring-4 ring-amber-100' : 'border-slate-100 hover:border-amber-200'}`}
          style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)' }}
        >
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Available Pickups</span>
            <strong className="text-3xl font-extrabold text-slate-800 block">{items ? allUnassigned.length : '…'}</strong>
            <span className="text-xs text-slate-500 mt-1 block">Unassigned shipments in queue</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 animate-pulse">
            <Inbox size={24} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          className={`kpi kpi-green relative overflow-hidden bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between text-left transition-all ${activeTab === 'assigned' ? 'border-emerald-200 ring-4 ring-emerald-100' : 'border-slate-100 hover:border-emerald-200'}`}
          style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)' }}
        >
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Assigned to Me</span>
            <strong className="text-3xl font-extrabold text-slate-800 block">{items ? mine.length : '…'}</strong>
            <span className="text-xs text-slate-500 mt-1 block">Your active delivery runs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
            <Truck size={24} />
          </div>
        </button>
      </div>

      <div className="user-directory-appbar mb-6" role="tablist" aria-label="Pickup queue views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'queue'}
          onClick={() => setActiveTab('queue')}
          className={`user-directory-tab ${activeTab === 'queue' ? 'is-active' : ''}`}
          data-testid="queue-tab"
        >
          <Inbox size={16} />
          Waiting for pickup
          <strong>{items ? queue.length : '…'}</strong>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'assigned'}
          onClick={() => setActiveTab('assigned')}
          className={`user-directory-tab ${activeTab === 'assigned' ? 'is-active' : ''}`}
          data-testid="assigned-tab"
        >
          <Truck size={16} />
          Assigned to me
          <strong>{items ? mine.length : '…'}</strong>
        </button>
      </div>

      {/* Waiting for Pickup Section */}
      {activeTab === 'queue' && <div className="glass p-6 rounded-2xl">
        <div className="glass-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="flex items-center gap-2">
              <Inbox className="text-amber-500" size={20} />
              Waiting for pickup ({items ? queue.length : 0})
            </h3>
            <p className="text-slate-500">Claim shipment requests to assign them to your run queue.</p>
          </div>
          
          {/* Local Search Input */}
          <div className="relative min-w-[280px] w-full md:w-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search by AWB, customer, route..." 
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-slate-700 text-sm font-semibold transition-all outline-none"
              style={{ minHeight: 38 }}
            />
            {q && (
              <button 
                onClick={() => setQ('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {!items ? (
          <p className="muted">Loading queue requests…</p>
        ) : allUnassigned.length === 0 ? (
          <div className="empty-card flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)' }}>
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 mb-4 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Queue is empty</h3>
            <p className="text-slate-500 mt-1 max-w-sm">Great work — every cargo request has been accepted or assigned.</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="empty-card flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)' }}>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No results found</h3>
            <p className="text-slate-500 mt-1 max-w-sm">We couldn't find any pickup requests matching "{q}".</p>
            <button onClick={() => setQ('')} className="btn btn-outline btn-tiny mt-4">Clear Search</button>
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
                  <th>Weight</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((s) => {
                  const avatarColor = getAvatarColor(s.customer_name);
                  const initials = getInitials(s.customer_name);
                  const isExpress = s.service === 'express' || s.service === 'priority';
                  
                  return (
                    <tr key={s.id} data-testid={`queue-row-${s.awb}`}>
                      <td>
                        <Link to={`/portal/shipment/${s.id}`} className="font-mono text-xs font-extrabold text-slate-700 hover:text-red-500 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-md transition-all">
                          {s.awb}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                            {initials}
                          </div>
                          <span className="font-semibold text-slate-800">{s.customer_name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 w-fit">
                          <span className="font-bold text-slate-800">{s.pickup?.city}</span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-800">{s.delivery?.country}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={`pill text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${isExpress ? 'tone-green' : 'tone-blue'}`}>
                            {isExpress ? <Plane size={11} /> : <Truck size={11} />}
                            <span className="capitalize">{s.service}</span>
                          </span>
                          <span className="capitalize text-xs font-medium text-slate-500">{s.shipment_type}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pill tone-slate text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit">
                          <Scale size={11} />
                          {s.approx_weight_kg} kg
                        </span>
                      </td>
                      <td className="text-slate-400 font-medium text-xs">
                        {fmtDate(s.created_at)}
                      </td>
                      <td className="text-right">
                        <button 
                          className="btn btn-primary btn-tiny flex items-center gap-1.5 ml-auto" 
                          style={{ padding: '6px 12px', borderRadius: '8px' }}
                          disabled={busyId === s.id} 
                          onClick={() => accept(s.id)} 
                          data-testid={`accept-${s.awb}`}
                        >
                          {busyId === s.id ? (
                            <>
                              <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                              Accepting…
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              Accept
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* Active Assignments Section */}
      {activeTab === 'assigned' && <div className="glass p-6 rounded-2xl">
        <div className="glass-header mb-6">
          <div>
            <h3 className="flex items-center gap-2">
              <Truck className="text-emerald-500" size={20} />
              Assigned to me ({items ? mine.length : 0})
            </h3>
            <p className="text-slate-500">Active pickup runs allocated to your representative profile.</p>
          </div>
        </div>

        {!items || mine.length === 0 ? (
          <div className="empty-card flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
            <p className="text-slate-500 font-medium">No shipments assigned to you yet.</p>
            <p className="text-slate-400 text-xs mt-1">Accept a request from the queue above to begin your active delivery run.</p>
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
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mine.map((s) => {
                  const avatarColor = getAvatarColor(s.customer_name);
                  const initials = getInitials(s.customer_name);
                  const isExpress = s.service === 'express' || s.service === 'priority';
                  
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/portal/shipment/${s.id}`} className="font-mono text-xs font-extrabold text-slate-700 hover:text-red-500 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-md transition-all">
                          {s.awb}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                            {initials}
                          </div>
                          <span className="font-semibold text-slate-800">{s.customer_name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 w-fit">
                          <span className="font-bold text-slate-800">{s.pickup?.city}</span>
                          <ArrowRight size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-800">{s.delivery?.country}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`pill text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit ${isExpress ? 'tone-green' : 'tone-blue'}`}>
                          {isExpress ? <Plane size={11} /> : <Truck size={11} />}
                          <span className="capitalize">{s.service}</span>
                        </span>
                      </td>
                      <td>
                        <StatusPill status={s.status} />
                      </td>
                      <td className="text-right">
                        <Link to={`/portal/shipment/${s.id}`} className="btn btn-outline btn-tiny flex items-center gap-1 ml-auto w-fit" style={{ padding: '6px 12px', borderRadius: '8px' }}>
                          Manage <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>}
    </div>
  );
}
