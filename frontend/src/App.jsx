import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import LandingPage from './pages/LandingPage';
import './portal.css';
import './public-track.css';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const PublicTrack = lazy(() => import('./pages/PublicTrack'));
const PortalLayout = lazy(() => import('./pages/portal/PortalLayout'));
const CustomerDashboard = lazy(() => import('./pages/portal/CustomerDashboard'));
const NewPickup = lazy(() => import('./pages/portal/NewPickup'));
const MyShipments = lazy(() => import('./pages/portal/MyShipments'));
const ShipmentDetail = lazy(() => import('./pages/portal/ShipmentDetail'));
const EmployeeDashboard = lazy(() => import('./pages/portal/EmployeeDashboard'));
const EmployeeQueue = lazy(() => import('./pages/portal/EmployeeQueue'));
const WaybillForm = lazy(() => import('./pages/portal/WaybillForm'));
const AdminDashboard = lazy(() => import('./pages/portal/AdminDashboard'));
const AdminShipments = lazy(() => import('./pages/portal/AdminShipments'));
const AdminUsers = lazy(() => import('./pages/portal/AdminUsers'));
const Invoice = lazy(() => import('./pages/portal/Invoice'));

const fallback = (
  <div className="portal-loading" role="status" data-testid="portal-loading">
    <div className="portal-loading-dot" />
    <span>Loading…</span>
  </div>
);

function Protected({ children, roles }) {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping || user === null) return fallback;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/portal/${user.role}`} replace />;
  }
  return children;
}

function PortalRouter() {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return fallback;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/portal/${user.role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={fallback}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/track" element={<PublicTrack />} />
            <Route path="/track/:awb" element={<PublicTrack />} />
            <Route path="/portal" element={<PortalRouter />} />
            <Route element={<Protected><PortalLayout /></Protected>}>
              {/* Customer */}
              <Route path="/portal/customer" element={<Protected roles={['customer']}><CustomerDashboard /></Protected>} />
              <Route path="/portal/customer/new" element={<Protected roles={['customer']}><NewPickup /></Protected>} />
              <Route path="/portal/customer/shipments" element={<Protected roles={['customer']}><MyShipments /></Protected>} />
              {/* Employee */}
              <Route path="/portal/employee" element={<Protected roles={['employee']}><EmployeeDashboard /></Protected>} />
              <Route path="/portal/employee/queue" element={<Protected roles={['employee']}><EmployeeQueue /></Protected>} />
              <Route path="/portal/employee/shipment/:id/waybill" element={<Protected roles={['employee', 'admin']}><WaybillForm /></Protected>} />
              {/* Admin */}
              <Route path="/portal/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
              <Route path="/portal/admin/shipments" element={<Protected roles={['admin']}><AdminShipments /></Protected>} />
              <Route path="/portal/admin/users" element={<Protected roles={['admin']}><AdminUsers /></Protected>} />
              {/* Shared */}
              <Route path="/portal/shipment/:id" element={<Protected><ShipmentDetail /></Protected>} />
              <Route path="/portal/shipment/:id/invoice" element={<Protected><Invoice /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
