import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, ShieldCheck, Truck, Globe } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Signup() {
  const { register, errMsg } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await register({ name, email, phone, password });
      navigate('/portal/customer', { replace: true });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell" data-testid="signup-page">
      <aside className="auth-aside">
        <div className="auth-brand">
          <img src="/Assets/flystar-wordmark.png" alt="Flystar" />
        </div>
        <div>
          <div className="auth-eyebrow"><b />Become a Flystar customer</div>
          <h1 className="auth-headline">Ship documents, medicines & parcels <em>without the paperwork loop.</em></h1>
          <p className="auth-sub">Create your account in seconds and raise pickup requests directly to the Flystar Tirupati dispatch desk.</p>
          <ul className="auth-hilights">
            <li><Truck aria-hidden /> Doorstep pickup across Tirupati</li>
            <li><Globe aria-hidden /> Delivery to 180+ destinations</li>
            <li><ShieldCheck aria-hidden /> Live waybill + proof of delivery</li>
          </ul>
        </div>
        <div className="auth-stats">
          <div><span>~5min</span><small>Quote to pickup</small></div>
          <div><span>0₹</span><small>Account setup</small></div>
          <div><span>POD</span><small>Confirmation</small></div>
        </div>
      </aside>

      <div className="auth-form-wrap">
        <Link to="/" className="auth-back" data-testid="back-home-link"><ArrowLeft size={14} /> Back to site</Link>
        <form className="auth-form" onSubmit={onSubmit} data-testid="signup-form">
          <h2>Create account</h2>
          <p>Customer access. Staff accounts are created by admin.</p>

          <label className="field">
            <span>Full name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="As per ID" data-testid="signup-name" />
          </label>
          <label className="field mt-12">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="signup-email" />
          </label>
          <label className="field mt-12">
            <span>Phone</span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9xxxxxxxxx" data-testid="signup-phone" />
          </label>
          <label className="field mt-12">
            <span>Password</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" data-testid="signup-password" />
          </label>

          {error && <p className="auth-error" data-testid="signup-error">{error}</p>}

          <button type="submit" className="auth-submit mt-18" disabled={busy} data-testid="signup-submit">
            {busy ? 'Creating…' : 'Create account'}
          </button>

          <div className="auth-meta">
            <span>Already have one?</span>
            <Link to="/login" data-testid="goto-login">Sign in instead</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
