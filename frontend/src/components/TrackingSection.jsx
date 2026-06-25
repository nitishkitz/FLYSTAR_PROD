import TrackingPanel from './TrackingPanel';

export default function TrackingSection() {
  return (
    <section className="section section-neutral">
      <div className="container tracking-layout">
        <header className="section-heading">
          <p className="eyebrow"><span>Tracking</span>Shipment visibility</p>
          <h2>One waybill. A clear delivery record.</h2>
          <p>Follow each checkpoint from booking through proof of delivery.</p>
        </header>
        <div className="tool-card">
          <TrackingPanel />
        </div>
      </div>
    </section>
  );
}
