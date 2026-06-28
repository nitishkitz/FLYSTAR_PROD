import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, Package, Truck, Inbox, Users,
  BarChart3, LogOut, Menu, X, ExternalLink, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

const NAV = {
  customer: [
    { to: '/portal/customer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/portal/customer/new', label: 'New pickup', icon: PackagePlus },
    { to: '/portal/customer/shipments', label: 'My shipments', icon: Package },
  ],
  employee: [
    { to: '/portal/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/portal/employee/queue', label: 'Pickup queue', icon: Inbox },
  ],
  admin: [
    { to: '/portal/admin', label: 'Overview', icon: BarChart3, end: true },
    { to: '/portal/admin/queue', label: 'Pickup queue', icon: Inbox },
    { to: '/portal/admin/shipments', label: 'All shipments', icon: Truck },
    { to: '/portal/admin/users', label: 'Staff & customers', icon: Users },
  ],
};

const TITLE = {
  admin: 'Admin Command',
  employee: 'Field Ops',
  customer: 'Customer Portal',
};

const ROLE_COPY = {
  admin: 'Control tower',
  employee: 'Pickup desk',
  customer: 'Shipping desk',
};

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const items = NAV[user.role] || [];
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={`portal-shell ${open ? 'is-mobile-open' : ''}`} data-testid="portal-shell">
      <aside className="portal-sidebar" data-testid="portal-sidebar">
        <Link to="/" className="portal-brand">
          <span className="portal-brand-mark">
            <img src="/Assets/flystar-wordmark.png" alt="Flystar" />
          </span>
          <div className="portal-brand-copy">
            <small>Flystar</small>
            <strong>{TITLE[user.role]}</strong>
          </div>
        </Link>

        <div className="portal-role-panel">
          <span><Sparkles size={13} />{ROLE_COPY[user.role]}</span>
          <strong>{user.role}</strong>
        </div>

        <div className="portal-section-label">Workspace</div>
        <nav className="portal-nav">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              <span className="portal-nav-icon"><Icon aria-hidden /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <Link to="/" className="portal-nav-aux" data-testid="back-to-site">
            <span className="portal-nav-icon"><ExternalLink size={18} /></span>
            <span>Marketing site</span>
          </Link>

          <div className="portal-user-card">
            <div className="portal-avatar">{initial}</div>
            <div>
              <strong>{user.name || user.email}</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <button className="portal-logout" onClick={async () => { await logout(); navigate('/login', { replace: true }); }} data-testid="logout-btn">
            <LogOut size={14} />Sign out
          </button>
        </div>
      </aside>

      <main className="portal-main">
        <div className="portal-topbar">
          <button className="portal-menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" data-testid="mobile-menu-toggle">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
