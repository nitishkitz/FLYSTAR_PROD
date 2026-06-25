import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, ShieldCheck, Truck, Globe } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { login, errMsg } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fillDemo = (role) => {
    const map = {
      admin: { email: 'admin@flystar.in', password: 'Admin@123' },
      employee: { email: 'employee@flystar.in', password: 'Employee@123' },
      customer: { email: 'customer@flystar.in', password: 'Customer@123' },
    };
    setEmail(map[role].email);
    setPassword(map[role].password);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const user = await login(email, password);
      const target = location.state?.from || `/portal/${user.role}`;
      navigate(target, { replace: true });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell" data-testid="login-page">
      <aside className="auth-aside">
        <div className="auth-brand">
          <img src="/Assets/flystar-wordmark.png" alt="Flystar" />
        </div>
        <div>
          <div className="auth-eyebrow"><b />Operations Portal</div>
          <h1 className="auth-headline">Coordinate every shipment from <em>booking to delivery.</em></h1>
          <p className="auth-sub">One workspace for customers, field employees, and the admin desk — built on the same Flystar dispatch network.</p>
          <ul className="auth-hilights">
            <li><Truck aria-hidden /> Live pickup queue & status feed</li>
            <li><Globe aria-hidden /> Cross-border tracking with AWB lookup</li>
            <li><ShieldCheck aria-hidden /> Role-based access for staff & customers</li>
          </ul>
        </div>
        <div className="auth-stats">
          <div><span>6</span><small>Stage journey</small></div>
          <div><span>24/7</span><small>Dispatch desk</small></div>
          <div><span>180+</span><small>Countries served</small></div>
        </div>
      </aside>

      <div className="auth-form-wrap">
        <Link to="/" className="auth-back" data-testid="back-home-link"><ArrowLeft size={14} /> Back to site</Link>
        <form className="auth-form" onSubmit={onSubmit} data-testid="login-form">
          <h2>Welcome back</h2>
          <p>Sign in to access your Flystar workspace.</p>

          <div className="role-quick" aria-label="Demo accounts">
            <button type="button" onClick={() => fillDemo('admin')} data-testid="demo-admin-btn">Admin</button>
            <button type="button" onClick={() => fillDemo('employee')} data-testid="demo-employee-btn">Employee</button>
            <button type="button" onClick={() => fillDemo('customer')} data-testid="demo-customer-btn">Customer</button>
          </div>

          <label className="field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="login-email" />
          </label>
          <label className="field mt-12">
            <span>Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" data-testid="login-password" />
          </label>

          {error && <p className="auth-error" data-testid="login-error">{error}</p>}

          <button type="submit" className="auth-submit mt-18" disabled={busy} data-testid="login-submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth-meta">
            <span>New customer?</span>
            <Link to="/signup" data-testid="goto-signup">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
