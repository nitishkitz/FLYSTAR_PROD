import { deliveryServices, destinationZones, shipmentTypes } from '../data/siteContent';

export const formatPrice = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value);

export function calculateEstimates(destination, shipmentType, weight) {
  const sanitizedWeight = Math.max(0.5, Math.min(Number(weight) || 0.5, 100));
  const zone = destinationZones[destination];
  const type = shipmentTypes[shipmentType];
  const chargeableWeight = shipmentType === 'documents'
    ? Math.max(0.5, sanitizedWeight)
    : Math.max(1, sanitizedWeight);
  const weightCharge = chargeableWeight * 620 * zone.multiplier * type.multiplier;
  const subtotal = zone.base + weightCharge;

  return deliveryServices.map((service) => ({
    ...service,
    price: Math.round((subtotal * service.multiplier) / 50) * 50,
  }));
}

export function createWhatsAppQuoteUrl(service, destination, shipmentType, weight) {
  const sanitizedWeight = Math.max(0.5, Math.min(Number(weight) || 0.5, 100));
  const message = [
    'Hello Flystar International Courier,',
    `I need a ${service.name.toLowerCase()} shipping quote.`,
    `Destination: ${destinationZones[destination].label}`,
    `Shipment: ${shipmentTypes[shipmentType].label}`,
    `Weight: ${sanitizedWeight} kg`,
    `Online estimate: ${formatPrice(service.price)}`,
  ].join('\n');

  return `https://wa.me/918125477584?text=${encodeURIComponent(message)}`;
}
