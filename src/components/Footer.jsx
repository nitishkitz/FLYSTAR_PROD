import { Mail, MapPin, Phone } from 'lucide-react';
import { footerLinks } from '../config/navigation';
import { contactDetails, services } from '../data/siteContent';
import { useSectionNavigation } from '../hooks/useSectionNavigation';

export default function Footer() {
  const navigate = useSectionNavigation();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/Assets/flystar-wordmark.png" alt="Flystar International Courier" />
          <p>Reliable international courier support connecting Tirupati with destinations worldwide.</p>
        </div>

        <div>
          <h2>Navigate</h2>
          <ul>
            {footerLinks.map((link) => (
              <li key={link.id}>
                <button type="button" onClick={() => navigate(link.id)}>{link.label}</button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Services</h2>
          <ul>
            {services.map((service) => <li key={service.title}>{service.title}</li>)}
          </ul>
        </div>

        <div>
          <h2>Flystar Tirupati</h2>
          <address>
            <a href={contactDetails.maps} target="_blank" rel="noreferrer"><MapPin />{contactDetails.address}</a>
            <a href={`tel:${contactDetails.phonePrimary}`}><Phone />{contactDetails.phonePrimary}<br />{contactDetails.phoneSecondary}</a>
            <a href={`mailto:${contactDetails.email}`}><Mail />{contactDetails.email}</a>
          </address>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Flystar International Courier.</span>
        <span>Tirupati to worldwide destinations.</span>
      </div>
    </footer>
  );
}
