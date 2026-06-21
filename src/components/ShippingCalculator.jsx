import { useMemo, useState } from 'react';
import {
  Box,
  Check,
  Clock3,
  MessageCircle,
  PlaneTakeoff,
  ShieldCheck,
} from 'lucide-react';
import {
  destinationZones,
  shipmentTypes,
} from '../data/siteContent';
import {
  calculateEstimates,
  createWhatsAppQuoteUrl,
  formatPrice,
} from '../utils/pricing';

const icons = {
  parcel: Box,
  plane: PlaneTakeoff,
  shield: ShieldCheck,
};

export default function ShippingCalculator() {
  const [destination, setDestination] = useState('europe');
  const [shipmentType, setShipmentType] = useState('parcel');
  const [weight, setWeight] = useState(2);

  const estimates = useMemo(
    () => calculateEstimates(destination, shipmentType, weight),
    [destination, shipmentType, weight],
  );

  return (
    <section className="section section-light calculator-section">
      <div className="container">
        <header className="section-heading">
          <p className="eyebrow"><span>Rates</span>Indicative price calculator</p>
          <h2>Compare three delivery speeds.</h2>
          <p>Use the estimate as a starting point, then confirm the final rate with Flystar.</p>
        </header>

        <div className="calculator-controls">
          <label className="field" htmlFor="rate-destination">
            <span>Destination zone</span>
            <select id="rate-destination" value={destination} onChange={(event) => setDestination(event.target.value)}>
              {Object.entries(destinationZones).map(([value, zone]) => (
                <option key={value} value={value}>{zone.label}</option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="rate-type">
            <span>Shipment type</span>
            <select id="rate-type" value={shipmentType} onChange={(event) => setShipmentType(event.target.value)}>
              {Object.entries(shipmentTypes).map(([value, type]) => (
                <option key={value} value={value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="rate-weight">
            <span>Approximate weight</span>
            <div className="field-with-suffix">
              <input
                id="rate-weight"
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
              <b aria-hidden="true">kg</b>
            </div>
          </label>
        </div>

        <div className="rate-grid">
          {estimates.map((service) => {
            const Icon = icons[service.icon];
            return (
              <article key={service.id} className={`rate-card ${service.isPopular ? 'is-featured' : ''}`}>
                {service.isPopular && <span className="rate-popular">Most requested</span>}
                <div className="rate-card-heading">
                  <div>
                    <span>{service.name}</span>
                    <h3>{formatPrice(service.price)}</h3>
                  </div>
                  <Icon aria-hidden="true" />
                </div>
                <p>{service.description}</p>
                <div className="rate-transit"><Clock3 aria-hidden="true" />{service.transit}</div>
                <ul>
                  {service.features.map((feature) => (
                    <li key={feature}><Check aria-hidden="true" />{feature}</li>
                  ))}
                </ul>
                <a
                  className="button button-secondary"
                  href={createWhatsAppQuoteUrl(service, destination, shipmentType, weight)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle aria-hidden="true" />Confirm on WhatsApp
                </a>
              </article>
            );
          })}
        </div>

        <p className="calculator-note">
          Estimates use chargeable weight and may exclude duties, taxes, insurance, restricted-item
          handling, and remote-area surcharges.
        </p>
      </div>
    </section>
  );
}
