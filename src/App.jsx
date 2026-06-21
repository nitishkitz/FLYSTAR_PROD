import { lazy, Suspense } from 'react';
import ContactSection from './components/ContactSection';
import DeferredSection from './components/DeferredSection';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import QuoteSection from './components/QuoteSection';
import ServicesSection from './components/ServicesSection';
import StoryExperience from './components/StoryExperience';
import { SECTION_IDS } from './config/navigation';

const ShipmentJourney = lazy(() => import('./components/ShipmentOrbit'));
const ShippingCalculator = lazy(() => import('./components/ShippingCalculator'));
const TrackingSection = lazy(() => import('./components/TrackingSection'));

const loadingSection = (
  <div className="section-loading" role="status">
    <span>Preparing section</span>
  </div>
);

export default function App() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />

      <main id="main-content">
        <StoryExperience />
        <ServicesSection />

        <DeferredSection id={SECTION_IDS.journey} minHeight={760}>
          <Suspense fallback={loadingSection}>
            <ShipmentJourney />
          </Suspense>
        </DeferredSection>

        <QuoteSection />

        <DeferredSection id={SECTION_IDS.tracking} minHeight={720}>
          <Suspense fallback={loadingSection}>
            <TrackingSection />
          </Suspense>
        </DeferredSection>

        <DeferredSection id={SECTION_IDS.rates} minHeight={900}>
          <Suspense fallback={loadingSection}>
            <ShippingCalculator />
          </Suspense>
        </DeferredSection>

        <ContactSection />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
