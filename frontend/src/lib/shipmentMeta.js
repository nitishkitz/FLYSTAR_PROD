export const STATUS_META = {
  requested: { label: "Requested", tone: "amber" },
  assigned: { label: "Assigned", tone: "amber" },
  en_route_to_pickup: { label: "En route to pickup", tone: "amber" },
  picked_up: { label: "Picked up", tone: "blue" },
  at_hub: { label: "At hub", tone: "blue" },
  packed: { label: "Packed", tone: "blue" },
  dispatched: { label: "Dispatched", tone: "blue" },
  in_transit: { label: "In transit", tone: "blue" },
  customs: { label: "Customs", tone: "blue" },
  out_for_delivery: { label: "Out for delivery", tone: "blue" },
  delivered: { label: "Delivered", tone: "green" },
  exception: { label: "Exception", tone: "red" },
  cancelled: { label: "Cancelled", tone: "red" },
  edited: { label: "Updated", tone: "blue" },
};

export const STATUS_ORDER = [
  "requested", "assigned", "en_route_to_pickup", "picked_up", "at_hub",
  "packed", "dispatched", "in_transit", "customs", "out_for_delivery",
  "delivered",
];

export const SHIPMENT_TYPES = [
  { id: "documents", label: "Documents" },
  { id: "medicines", label: "Medicines" },
  { id: "parcel", label: "Parcel" },
  { id: "commercial", label: "Commercial" },
];

export const SERVICES = [
  { id: "economy", label: "Economy", transit: "8–12 days" },
  { id: "priority", label: "Priority", transit: "5–7 days" },
  { id: "express", label: "Express", transit: "3–5 days" },
];

export function fmtINR(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
