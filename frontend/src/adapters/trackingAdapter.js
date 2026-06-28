import axios from 'axios';
import { trackingEvents } from '../data/siteContent';
import { BACKEND_BASE } from '../lib/backendBase';

const STATUS_LABELS = {
  requested: 'Pickup requested',
  assigned: 'Field employee assigned',
  en_route_to_pickup: 'En route to pickup',
  picked_up: 'Picked up',
  at_hub: 'At hub',
  packed: 'Packed',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  customs: 'Clearing customs',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  exception: 'Exception',
  cancelled: 'Cancelled',
};

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

/** @returns {Promise<{trackingId:string, status:string, events:Array}>} */
export async function lookupTracking(trackingId) {
  const id = trackingId.trim().toUpperCase();
  try {
    const { data } = await axios.get(`${BACKEND_BASE}/api/shipments/track/${encodeURIComponent(id)}`);
    return {
      trackingId: data.awb,
      status: STATUS_LABELS[data.status] || data.status,
      events: (data.events || []).slice().reverse().map((e) => ({
        title: STATUS_LABELS[e.status] || e.status,
        time: fmt(e.at),
        location: e.location || (data.destination_city || data.destination_country || ''),
        description: e.note || '',
      })),
    };
  } catch (err) {
    // graceful fallback to demo timeline if AWB not found, so the landing demo still works
    if (err?.response?.status === 404) {
      return {
        trackingId: id,
        status: 'Demo timeline',
        events: trackingEvents,
      };
    }
    throw err;
  }
}
