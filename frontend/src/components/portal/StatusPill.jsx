import { STATUS_META } from '../../lib/shipmentMeta';

export default function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status, tone: 'blue' };
  return (
    <span className={`pill tone-${meta.tone}`} data-testid={`status-pill-${status}`}>
      <b />{meta.label}
    </span>
  );
}
