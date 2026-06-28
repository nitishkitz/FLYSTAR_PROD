import { describe, expect, it } from 'vitest';
import { createEmptyQuote, validateQuoteRequest } from './quoteAdapter';

describe('quote validation', () => {
  it('reports all required fields', () => {
    expect(validateQuoteRequest(createEmptyQuote())).toEqual({
      fullName: 'Name is required',
      email: 'Email is required',
      mobileNumber: 'Phone number is required',
      pickupAddress: 'Pickup address is required',
      receiverName: 'Receiver name is required',
      receiverPhone: 'Receiver phone is required',
      receiverAddress: 'Receiver address is required',
      destinationCity: 'Destination city is required',
      destinationCountry: 'Destination is required',
      shipmentType: 'Select a shipment type',
      message: 'Contents description is required',
    });
  });

  it('accepts a complete quote request', () => {
    expect(validateQuoteRequest({
      ...createEmptyQuote(),
      fullName: 'Naina Reddy',
      email: 'naina@example.com',
      mobileNumber: '9876543210',
      pickupAddress: '18 Temple Road',
      receiverName: 'Aisha Khan',
      receiverPhone: '+97455123456',
      receiverAddress: 'Al Sadd Street',
      destinationCity: 'Doha',
      destinationCountry: 'United Kingdom',
      shipmentType: 'Parcel',
      message: 'Documents',
    })).toEqual({});
  });
});
