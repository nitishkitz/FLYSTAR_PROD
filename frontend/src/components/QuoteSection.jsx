import { Clock3, PhoneCall, ShieldCheck } from 'lucide-react';
import QuoteForm from './QuoteForm';

export default function QuoteSection() {
  return (
    <section id="quote" className="section section-ink scroll-mt-20">
      <div className="container quote-layout">
        <div className="quote-intro">
          <p className="eyebrow eyebrow-on-dark"><span>Pickup</span>Raise a shipment</p>
          <h2>Book a Flystar pickup from the site.</h2>
          <p>
            Share sender, receiver, and shipment details. The request goes directly into the
            employee pickup queue for assignment.
          </p>
          <ul className="quote-promises">
            <li><Clock3 aria-hidden="true" /><span><strong>Fast response</strong>Direct follow-up from the Tirupati team.</span></li>
            <li><ShieldCheck aria-hidden="true" /><span><strong>Practical guidance</strong>Clear advice on packaging and documents.</span></li>
            <li><PhoneCall aria-hidden="true" /><span><strong>Human support</strong>No anonymous ticket queue.</span></li>
          </ul>
        </div>
        <div className="tool-card tool-card-light">
          <QuoteForm />
        </div>
      </div>
    </section>
  );
}
