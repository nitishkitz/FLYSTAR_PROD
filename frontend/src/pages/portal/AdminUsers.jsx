import { useEffect, useState } from 'react';
import { UserPlus, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { fmtDate } from '../../lib/shipmentMeta';

export default function AdminUsers() {
  const { errMsg } = useAuth();
  const [users, setUsers] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'employee' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/users').then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/users', form);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', password: '', role: 'employee' });
      await load();
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/users/${u.id}`, { active: !u.active }); await load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const del = async (u) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    try { await api.delete(`/users/${u.id}`); await load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div data-testid="admin-users-page">
      <div className="portal-topbar" style={{ marginTop: -16 }}>
        <div><h1>Users & staff</h1><p>Create employees & admins, manage customer access.</p></div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary" data-testid="add-user-btn"><UserPlus size={16} />Add staff</button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="glass">
        <div className="glass-header"><div><h3>All users ({users?.length || 0})</h3></div></div>
        {!users ? <p className="muted">Loading…</p> : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.email}`}>
                    <td style={{ color: 'white', fontWeight: 650 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td><span className="pill tone-blue"><b />{u.role}</span></td>
                    <td>{u.active ? <span className="pill tone-green"><b />Active</span> : <span className="pill tone-red"><b />Inactive</span>}</td>
                    <td className="muted">{fmtDate(u.created_at)}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button onClick={() => toggleActive(u)} className="btn btn-outline btn-tiny" data-testid={`toggle-${u.email}`}>
                          {u.active ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}{u.active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => del(u)} className="btn btn-outline btn-tiny" data-testid={`delete-user-${u.email}`}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal dark-form" onClick={(e) => e.stopPropagation()} data-testid="add-user-modal">
            <h3>Add staff member</h3>
            <form onSubmit={add}>
              <div className="field-grid-2">
                <label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="new-user-name" /></label>
                <label className="field"><span>Role</span>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="new-user-role">
                    <option value="employee">Employee</option><option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <label className="field mt-12"><span>Email</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="new-user-email" /></label>
              <label className="field mt-12"><span>Phone</span><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="new-user-phone" /></label>
              <label className="field mt-12"><span>Password</span><input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="new-user-password" /></label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy} data-testid="new-user-submit">{busy ? 'Adding…' : 'Add staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
