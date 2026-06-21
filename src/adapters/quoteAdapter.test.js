import { describe, expect, it } from 'vitest';
import { createEmptyQuote, validateQuoteRequest } from './quoteAdapter';

describe('quote validation', () => {
  it('reports all required fields', () => {
    expect(validateQuoteRequest(createEmptyQuote())).toEqual({
      fullName: 'Name is required',
      mobileNumber: 'Mobile number is required',
      destinationCountry: 'Destination is required',
      shipmentType: 'Select a shipment type',
    });
  });

  it('accepts a complete quote request', () => {
    expect(validateQuoteRequest({
      ...createEmptyQuote(),
      fullName: 'Naina Reddy',
      mobileNumber: '9876543210',
      destinationCountry: 'United Kingdom',
      shipmentType: 'Parcel',
    })).toEqual({});
  });
});
