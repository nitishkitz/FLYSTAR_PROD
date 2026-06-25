import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { contactDetails } from '../data/siteContent';

export default function ContactSection() {
  return (
    <section id="contact" className="section section-contact scroll-mt-20">
      <div className="container contact-layout">
        <div>
          <p className="eyebrow"><span>Contact</span>Flystar Tirupati</p>
          <h2>Direct support from the dispatch team.</h2>
        </div>
        <div className="contact-grid">
          <a href={`tel:${contactDetails.phonePrimary}`}>
            <Phone aria-hidden="true" />
            <span>Call</span>
            <strong>{contactDetails.phonePrimary}<br />{contactDetails.phoneSecondary}</strong>
          </a>
          <a href={`mailto:${contactDetails.email}`}>
            <Mail aria-hidden="true" />
            <span>Email</span>
            <strong>{contactDetails.email}</strong>
          </a>
          <a href={contactDetails.maps} target="_blank" rel="noreferrer">
            <MapPin aria-hidden="true" />
            <span>Visit</span>
            <strong>{contactDetails.address}</strong>
          </a>
          <a href={contactDetails.whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" />
            <span>WhatsApp</span>
            <strong>Start an enquiry</strong>
          </a>
        </div>
      </div>
    </section>
  );
}
