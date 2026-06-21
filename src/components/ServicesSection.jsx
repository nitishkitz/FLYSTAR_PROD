import {
  BadgeIndianRupee,
  Box,
  FileCheck2,
  Pill,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import { services } from '../data/siteContent';

const icons = {
  file: FileCheck2,
  medicine: Pill,
  parcel: Box,
  plane: Plane,
  price: BadgeIndianRupee,
  shield: ShieldCheck,
};

export default function ServicesSection() {
  return (
    <section id="services" className="section section-light scroll-mt-20">
      <div className="container">
        <header className="section-heading section-heading-split">
          <div>
            <p className="eyebrow"><span>Services</span>Built around real shipment needs</p>
            <h2>International courier support, without a maze of options.</h2>
          </div>
          <p>
            One Tirupati team coordinates the practical details, from documents and medicines
            to personal parcels and commercial cargo.
          </p>
        </header>

        <div className="service-grid">
          {services.map((service, index) => {
            const Icon = icons[service.icon];
            return (
              <article className="service-card" key={service.title}>
                <div className="service-card-top">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Icon aria-hidden="true" />
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
