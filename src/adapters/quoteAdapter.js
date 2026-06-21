const EMPTY_QUOTE = {
  fullName: '',
  mobileNumber: '',
  fromCity: 'Tirupati',
  destinationCountry: '',
  shipmentType: '',
  approxWeight: '',
  message: '',
};

export const createEmptyQuote = () => ({ ...EMPTY_QUOTE });

/**
 * @typedef {Object} QuoteRequest
 * @property {string} fullName
 * @property {string} mobileNumber
 * @property {string} fromCity
 * @property {string} destinationCountry
 * @property {string} shipmentType
 * @property {string} approxWeight
 * @property {string} message
 */

/**
 * @typedef {Object} QuoteSubmissionResult
 * @property {boolean} ok
 * @property {string} reference
 */

export function validateQuoteRequest(request) {
  const errors = {};
  const mobileRegex = /^[6-9]\d{9}$/;

  if (!request.fullName.trim()) errors.fullName = 'Name is required';
  if (!request.mobileNumber.trim()) {
    errors.mobileNumber = 'Mobile number is required';
  } else if (!mobileRegex.test(request.mobileNumber.trim())) {
    errors.mobileNumber = 'Enter a valid 10-digit mobile number';
  }
  if (!request.fromCity.trim()) errors.fromCity = 'Origin is required';
  if (!request.destinationCountry.trim()) errors.destinationCountry = 'Destination is required';
  if (!request.shipmentType) errors.shipmentType = 'Select a shipment type';

  return errors;
}

/** @param {QuoteRequest} request */
export async function submitQuoteRequest(request) {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  return {
    ok: true,
    reference: `FSQ-${request.mobileNumber.slice(-4)}`,
  };
}
