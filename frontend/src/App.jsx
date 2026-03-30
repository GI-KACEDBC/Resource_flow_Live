// ## Main Application Component
// ## Sets up routing, authentication, and error handling
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DocumentUpload from './pages/auth/DocumentUpload';

// NGO Pages
import NGODashboard from './pages/ngo/NGODashboard';
import ProjectDetailPage from './pages/ngo/ProjectDetailPage';
import OrganizationSetup from './pages/ngo/OrganizationSetup';

// Supplier Pages
import SupplierDashboard from './pages/supplier/SupplierDashboard';
import CreateDonation from './pages/supplier/CreateDonation';
import Projects from './pages/supplier/Projects';
import AvailableRequests from './pages/supplier/AvailableRequests';
import FindNGOs from './pages/supplier/FindNGOs';

// Recipient Pages
import RecipientDashboard from './pages/recipient/RecipientDashboard';
import CreateRequest from './pages/recipient/CreateRequest';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserVerification from './pages/admin/UserVerification';
import AMLReview from './pages/admin/AMLReview';
import ResourceAllocation from './pages/admin/ResourceAllocation';
import FleetManagement from './pages/admin/FleetManagement';
import FinancialReports from './pages/admin/FinancialReports';
import WarehouseManager from './pages/admin/WarehouseManager';
import Inventory from './pages/admin/Inventory';
import DeliveryTracking from './pages/admin/DeliveryTracking';
import DeliveryDashboard from './pages/admin/DeliveryDashboard';
import VerificationCenter from './pages/admin/VerificationCenter';
import TransparencyLog from './pages/admin/TransparencyLog';
import ImpactDashboard from './pages/admin/ImpactDashboard';
import WarehouseAssignment from './pages/admin/WarehouseAssignment';
import FlaggedRequests from './pages/admin/FlaggedRequests';
import AllRequests from './pages/admin/AllRequests';
import UserManagement from './pages/admin/UserManagement';
import TeamManagement from './pages/admin/TeamManagement';
import UserProfile from './pages/shared/UserProfile';

// Auditor Pages
import ValuationReview from './pages/auditor/ValuationReview';
import AuditLogs from './pages/auditor/AuditLogs';
import MonetaryTransfers from './pages/auditor/MonetaryTransfers';
import NGOVerification from './pages/auditor/NGOVerification';

// Field Agent Pages
import FieldAgentDashboard from './pages/fieldagent/FieldAgentDashboard';
import UploadProof from './pages/fieldagent/UploadProof';
import MyProofs from './pages/fieldagent/MyProofs';

// Driver / Logistics Pages
import DriverTripPage from './pages/driver/DriverTripPage';
import TripsListPage from './pages/driver/TripsListPage';

// Auth Pages
import VerificationWait from './pages/auth/VerificationWait';

/** Maps frontend role (requestor is normalized to recipient in useAuth) to the home dashboard component. */
const ROLE_DASHBOARD_MAP = {
  admin: AdminDashboard,
  ngo: NGODashboard,
  donor_institution: SupplierDashboard,
  donor_individual: SupplierDashboard,
  angel_donor: SupplierDashboard,
  auditor: ValuationReview,
  recipient: RecipientDashboard,
  field_agent: FieldAgentDashboard,
  driver: AdminDashboard,
  supervisor: AdminDashboard,
  special: AdminDashboard,
};

const DashboardIndex = () => {
  const { role } = useAuth();
  const DashboardComponent = ROLE_DASHBOARD_MAP[role] ?? RecipientDashboard;
  return <DashboardComponent />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes - Home is the default landing page */}
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/verification-wait"
        element={
          <ProtectedRoute>
            <VerificationWait />
          </ProtectedRoute>
        }
      />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard Routes - Role-based */}
        <Route
          index
          element={
            <RoleProtectedRoute allowedRoles={['ngo', 'donor_institution', 'donor_individual', 'angel_donor', 'admin', 'recipient', 'auditor', 'field_agent', 'driver', 'supervisor', 'special']}>
              <DashboardIndex />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="donate"
          element={
            <RoleProtectedRoute allowedRoles={['donor_institution', 'donor_individual', 'angel_donor']} requiresVerification>
              <CreateDonation />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="available-requests"
          element={
            <RoleProtectedRoute allowedRoles={['donor_institution', 'donor_individual', 'angel_donor']}>
              <AvailableRequests />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="documents"
          element={
            <RoleProtectedRoute allowedRoles={['ngo', 'donor_institution', 'donor_individual', 'recipient', 'field_agent']}>
              <DocumentUpload />
            </RoleProtectedRoute>
          }
        />
        
        {/* Admin Routes */}
        <Route
          path="all-requests"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AllRequests />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="verify-users"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <UserVerification />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="verification-center"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'auditor']}>
              <VerificationCenter />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="flagged-requests"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <FlaggedRequests />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="user-management"
          element={
            <RoleProtectedRoute allowedRoles={['admin']} requiresSuperAdmin>
              <UserManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="aml-review"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AMLReview />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="allocate"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <ResourceAllocation />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="logistics"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'driver', 'supervisor']}>
              <FleetManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="delivery-tracking"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <DeliveryTracking />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="delivery-dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'driver', 'supervisor']}>
              <DeliveryDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="transparency-log"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <TransparencyLog />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="impact"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'donor_institution', 'donor_individual', 'angel_donor']}>
              <ImpactDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <FinancialReports />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="warehouses"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <WarehouseManager />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="warehouse-assignment"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <WarehouseAssignment />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Inventory />
            </RoleProtectedRoute>
          }
        />
        
        {/* Recipient & NGO Routes */}
        <Route
          path="request"
          element={
            <RoleProtectedRoute allowedRoles={['recipient']} requiresVerification>
              <CreateRequest />
            </RoleProtectedRoute>
          }
        />
        
        {/* Shared Routes */}
        <Route
          path="profile"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'ngo', 'donor_institution', 'donor_individual', 'angel_donor', 'recipient', 'auditor', 'field_agent', 'driver', 'supervisor', 'special']}>
              <UserProfile />
            </RoleProtectedRoute>
          }
        />
        
        {/* Auditor Routes */}
        <Route
          path="valuation"
          element={
            <RoleProtectedRoute allowedRoles={['auditor']}>
              <ValuationReview />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="transfers"
          element={
            <RoleProtectedRoute allowedRoles={['auditor']}>
              <MonetaryTransfers />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <RoleProtectedRoute allowedRoles={['auditor']}>
              <AuditLogs />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="ngo-verification"
          element={
            <RoleProtectedRoute allowedRoles={['auditor']}>
              <NGOVerification />
            </RoleProtectedRoute>
          }
        />
        
        {/* NGO Routes - Organization, Projects (create/view) */}
        <Route
          path="projects"
          element={
            <RoleProtectedRoute allowedRoles={['donor_institution', 'donor_individual', 'angel_donor', 'field_agent']}>
              <Projects />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="organization"
          element={
            <RoleProtectedRoute allowedRoles={['ngo']}>
              <OrganizationSetup />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="projects/:id"
          element={
            <RoleProtectedRoute allowedRoles={['ngo', 'donor_institution', 'donor_individual', 'angel_donor', 'admin']}>
              <ProjectDetailPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="partnerships"
          element={
            <RoleProtectedRoute allowedRoles={['donor_institution']}>
              <div className="p-6 bg-white min-h-screen">
                <h2 className="text-xl font-bold text-slate-800">Partnerships</h2>
                <p className="text-slate-600 mt-2">Coming soon...</p>
              </div>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="matchmaking"
          element={
            <RoleProtectedRoute allowedRoles={['donor_institution', 'donor_individual', 'angel_donor']}>
              <FindNGOs />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="upload-proof"
          element={
            <RoleProtectedRoute allowedRoles={['field_agent', 'ngo']}>
              <UploadProof />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="proofs"
          element={
            <RoleProtectedRoute allowedRoles={['field_agent', 'ngo']}>
              <MyProofs />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="team"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'supervisor']}>
              <TeamManagement />
            </RoleProtectedRoute>
          }
        />
        {/* Driver / Logistics - Trips */}
        <Route
          path="trips"
          element={
            <RoleProtectedRoute allowedRoles={['driver', 'admin', 'supervisor']}>
              <TripsListPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="trips/:tripId"
          element={
            <RoleProtectedRoute allowedRoles={['driver', 'admin', 'supervisor']}>
              <DriverTripPage />
            </RoleProtectedRoute>
          }
        />
      </Route>
      
      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ## Root App Component
// ## Wraps application with error boundary, auth provider, and router
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
