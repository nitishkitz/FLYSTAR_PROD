import { describe, expect, it } from 'vitest';
import { calculateEstimates, createWhatsAppQuoteUrl } from './pricing';

describe('shipping calculator', () => {
  it('preserves the three service estimates', () => {
    const estimates = calculateEstimates('europe', 'parcel', 2);
    expect(estimates).toHaveLength(3);
    expect(estimates.map((estimate) => estimate.price)).toEqual([2800, 3400, 4750]);
  });

  it('creates a WhatsApp confirmation message', () => {
    const service = calculateEstimates('gulf', 'documents', 0.5)[0];
    const url = createWhatsAppQuoteUrl(service, 'gulf', 'documents', 0.5);
    expect(url).toContain('https://wa.me/918125477584');
    expect(decodeURIComponent(url)).toContain('Destination: UAE / Gulf Countries');
  });
});
