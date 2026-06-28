import { api } from '../lib/api';

const EMPTY_QUOTE = {
  fullName: '',
  email: '',
  mobileNumber: '',
  fromCity: 'Tirupati',
  pickupState: 'Andhra Pradesh',
  pickupCountry: 'India',
  pickupAddress: '',
  pickupPostal: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  destinationCity: '',
  destinationState: '',
  destinationPostal: '',
  destinationCountry: '',
  shipmentType: '',
  service: 'priority',
  approxWeight: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  message: '',
};

export const createEmptyQuote = () => ({ ...EMPTY_QUOTE });

/**
 * @typedef {Object} QuoteRequest
 * @property {string} fullName
 * @property {string} email
 * @property {string} mobileNumber
 * @property {string} fromCity
 * @property {string} pickupState
 * @property {string} pickupCountry
 * @property {string} pickupAddress
 * @property {string} pickupPostal
 * @property {string} receiverName
 * @property {string} receiverPhone
 * @property {string} receiverAddress
 * @property {string} destinationCity
 * @property {string} destinationState
 * @property {string} destinationPostal
 * @property {string} destinationCountry
 * @property {string} shipmentType
 * @property {string} service
 * @property {string} approxWeight
 * @property {string} lengthCm
 * @property {string} widthCm
 * @property {string} heightCm
 * @property {string} message
 */

/**
 * @typedef {Object} QuoteSubmissionResult
 * @property {boolean} ok
 * @property {string} reference
 */

export function validateQuoteRequest(request) {
  const errors = {};
  const mobileRegex = /^\+?[0-9\s-]{6,18}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!request.fullName.trim()) errors.fullName = 'Name is required';
  if (!request.email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(request.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!request.mobileNumber.trim()) {
    errors.mobileNumber = 'Phone number is required';
  } else if (!mobileRegex.test(request.mobileNumber.trim())) {
    errors.mobileNumber = 'Enter a valid phone number';
  }
  if (!request.fromCity.trim()) errors.fromCity = 'Origin is required';
  if (!request.pickupAddress.trim()) errors.pickupAddress = 'Pickup address is required';
  if (!request.pickupCountry.trim()) errors.pickupCountry = 'Pickup country is required';
  if (!request.receiverName.trim()) errors.receiverName = 'Receiver name is required';
  if (!request.receiverPhone.trim()) {
    errors.receiverPhone = 'Receiver phone is required';
  } else if (!mobileRegex.test(request.receiverPhone.trim())) {
    errors.receiverPhone = 'Enter a valid receiver phone';
  }
  if (!request.receiverAddress.trim()) errors.receiverAddress = 'Receiver address is required';
  if (!request.destinationCity.trim()) errors.destinationCity = 'Destination city is required';
  if (!request.destinationCountry.trim()) errors.destinationCountry = 'Destination is required';
  if (!request.shipmentType) errors.shipmentType = 'Select a shipment type';
  if (!request.message.trim()) errors.message = 'Contents description is required';

  return errors;
}

const TYPE_MAP = {
  Documents: 'documents',
  Medicines: 'medicines',
  Parcel: 'parcel',
  'Export / Import': 'commercial',
  Other: 'parcel',
};

/** @param {QuoteRequest} request */
export async function submitQuoteRequest(request) {
  const payload = {
    customer_email: request.email.trim(),
    pickup: {
      name: request.fullName.trim(),
      phone: request.mobileNumber.trim(),
      line1: request.pickupAddress.trim(),
      city: request.fromCity.trim(),
      state: request.pickupState.trim(),
      country: request.pickupCountry.trim(),
      postal_code: request.pickupPostal.trim(),
    },
    delivery: {
      name: request.receiverName.trim(),
      phone: request.receiverPhone.trim(),
      line1: request.receiverAddress.trim(),
      city: request.destinationCity.trim(),
      state: request.destinationState.trim(),
      country: request.destinationCountry.trim(),
      postal_code: request.destinationPostal.trim(),
    },
    shipment_type: TYPE_MAP[request.shipmentType] || 'parcel',
    service: request.service || 'priority',
    approx_weight_kg: Number(request.approxWeight) || 0.5,
    approx_length_cm: request.lengthCm ? Number(request.lengthCm) : null,
    approx_width_cm: request.widthCm ? Number(request.widthCm) : null,
    approx_height_cm: request.heightCm ? Number(request.heightCm) : null,
    contents: request.message.trim(),
    notes: 'Raised from marketing site',
  };
  const { data } = await api.post('/public/pickups', payload);
  return {
    ok: true,
    reference: data.awb,
    shipment: data,
  };
}
