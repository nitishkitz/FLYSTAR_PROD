import { MessageCircle } from 'lucide-react';
import { contactDetails } from '../data/siteContent';

export default function FloatingWhatsApp() {
  const message = encodeURIComponent(
    'Hello Flystar International Courier, I would like to enquire about a shipment from Tirupati.',
  );

  return (
    <a
      href={`${contactDetails.whatsapp}?text=${message}`}
      target="_blank"
      rel="noreferrer"
      className="floating-whatsapp"
      aria-label="Chat with Flystar on WhatsApp"
    >
      <MessageCircle aria-hidden="true" />
      <span>WhatsApp</span>
    </a>
  );
}
