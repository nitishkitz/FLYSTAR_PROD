import { trackingEvents } from '../data/siteContent';

/**
 * @typedef {Object} TrackingResult
 * @property {string} trackingId
 * @property {string} status
 * @property {Array<Object>} events
 */

/** @returns {Promise<TrackingResult>} */
export async function lookupTracking(trackingId) {
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  return {
    trackingId: trackingId.trim().toUpperCase(),
    status: 'Delivered',
    events: trackingEvents,
  };
}
