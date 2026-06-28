import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, Download, Plane, Truck, User, UserX, UserCheck, ArrowRight, RefreshCw, X, Eye, AlertCircle, Check } from 'lucide-react';
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

  const handleReset = () => {
    setQ('');
    setStatus('');
    load('', '');
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
        <button onClick={exportCsv} className="btn btn-ghost flex items-center gap-1.5" data-testid="export-csv"><Download size={16} />Export CSV</button>
      </div>

      <div className="glass">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-col md:flex-row items-center gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search size={18} />
            </span>
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search AWB, customer, city, country…" 
              data-testid="admin-search" 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 rounded-xl text-slate-700 text-sm font-medium transition-all outline-none"
              style={{ minHeight: 46 }}
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-3 items-center">
            <select 
              value={status} 
              onChange={(e) => { setStatus(e.target.value); load(q, e.target.value); }} 
              data-testid="admin-status-filter" 
              className="flex-1 md:flex-none px-3 py-2 bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 rounded-xl text-slate-700 text-sm font-semibold transition-all outline-none"
              style={{ minHeight: 46, minWidth: 150 }}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            
            {(q || status) && (
              <button 
                type="button" 
                onClick={handleReset} 
                className="btn btn-ghost btn-tiny text-slate-500 hover:text-slate-800 flex items-center gap-1"
                style={{ padding: '10px 14px', borderRadius: '10px', height: 46 }}
              >
                <X size={14} /> Clear
              </button>
            )}

            <button 
              type="submit" 
              className="btn btn-primary flex items-center justify-center gap-1.5 font-bold shadow-sm"
              style={{ minHeight: 46, padding: '10px 20px', borderRadius: '12px' }}
            >
              <Search size={16} /> Search
            </button>
          </div>
        </form>

        {error && <p className="auth-error">{error}</p>}

        {!list ? <p className="muted">Loading…</p> : list.length === 0 ? (
          <div className="empty-card"><h3>No shipments match</h3><p>Try a different search.</p></div>
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
                  <th>Assigned</th>
                  <th>Price</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} data-testid={`admin-row-${s.awb}`}>
                    <td>
                      <Link 
                        to={`/portal/shipment/${s.id}`} 
                        className="awb inline-block font-mono bg-slate-50 hover:bg-red-50 text-slate-800 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-red-100 shadow-sm transition-all text-xs font-semibold"
                      >
                        {s.awb}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                          {(s.customer_name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 block text-xs">{s.customer_name}</span>
                          <small className="text-slate-400 block text-[10px]">{s.customer_email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <span>{s.pickup?.city}</span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span>{s.delivery?.city || s.delivery?.country}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md capitalize ${
                        s.service === 'express' 
                          ? 'bg-red-50 text-red-600 border border-red-100' 
                          : s.service === 'priority' 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                            : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {s.service === 'express' || s.service === 'priority' ? <Plane size={11} /> : <Truck size={11} />}
                        {s.service}
                      </span>
                    </td>
                    <td><StatusPill status={s.status} /></td>
                    <td>
                      {s.assigned_employee_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {s.assigned_employee_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                          <AlertCircle size={11} className="text-amber-500" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="font-bold text-slate-800 text-xs">{fmtINR(s.price_inr)}</td>
                    <td className="text-slate-400 text-[11px] font-medium">{fmtDate(s.created_at)}</td>
                    <td>
                      <button 
                        onClick={() => del(s.id, s.awb)} 
                        className="p-2 text-slate-400 hover:text-red-600 bg-transparent hover:bg-red-50 border border-slate-100 hover:border-red-100 rounded-lg shadow-sm transition-all duration-300" 
                        data-testid={`delete-${s.awb}`}
                        title="Delete Shipment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
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
