import { Menu, MessageCircle, Phone, X, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { navigationLinks, SECTION_IDS } from '../config/navigation';
import { contactDetails } from '../data/siteContent';
import { useSectionNavigation } from '../hooks/useSectionNavigation';
import { useAuth } from '../lib/AuthContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useSectionNavigation();
  const { user } = useAuth();
  const portalHref = user ? `/portal/${user.role}` : '/login';
  const portalLabel = user ? 'Open portal' : 'Sign in';

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const goTo = (id) => {
    setMenuOpen(false);
    navigate(id);
  };

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="header-inner">
        <button className="brand-button" type="button" onClick={() => goTo(SECTION_IDS.story)} aria-label="Flystar home">
          <img src="/Assets/flystar-wordmark.png" alt="Flystar International Courier" />
        </button>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigationLinks.map((link) => (
            <button key={link.id} type="button" onClick={() => goTo(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <a href={`tel:${contactDetails.phonePrimary}`} className="header-phone">
            <Phone aria-hidden="true" />
            <span>{contactDetails.phonePrimary}</span>
          </a>
          <Link to={portalHref} className="button button-secondary header-cta" data-testid="navbar-portal-link">
            <LogIn aria-hidden="true" />{portalLabel}
          </Link>
          <a href={contactDetails.whatsapp} target="_blank" rel="noreferrer" className="button button-primary header-cta">
            <MessageCircle aria-hidden="true" />Enquire
          </a>
          <button
            type="button"
            className="menu-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}>
        <nav aria-label="Mobile navigation">
          {navigationLinks.map((link, index) => (
            <button key={link.id} type="button" onClick={() => goTo(link.id)}>
              <span>{String(index + 1).padStart(2, '0')}</span>{link.label}
            </button>
          ))}
        </nav>
        <div className="mobile-menu-contact">
          <Link to={portalHref} data-testid="mobile-portal-link">{portalLabel}</Link>
          <a href={`tel:${contactDetails.phonePrimary}`}>Call {contactDetails.phonePrimary}</a>
          <a href={contactDetails.whatsapp} target="_blank" rel="noreferrer">WhatsApp enquiry</a>
        </div>
      </div>
    </header>
  );
}
