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

// Supplier Pages
import SupplierDashboard from './pages/supplier/SupplierDashboard';
import CreateDonation from './pages/supplier/CreateDonation';
import Projects from './pages/supplier/Projects';
import AvailableRequests from './pages/supplier/AvailableRequests';

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

// Auth Pages
import VerificationWait from './pages/auth/VerificationWait';

// ## Dashboard Index Component
// ## Renders the appropriate dashboard based on user role from backend
const DashboardIndex = () => {
  // ## Get current user role from auth context (already mapped from backend)
  const { role } = useAuth();
  
  // ## Return role-specific dashboard component based on backend role
  if (role === 'admin') {
    return <AdminDashboard />;
  } else if (role === 'supplier' || role === 'donor') {
    // Handle both 'supplier' and 'donor' roles (donor is mapped to supplier in useAuth)
    return <SupplierDashboard />;
  } else if (role === 'auditor') {
    return <ValuationReview />;
  } else if (role === 'recipient' || role === 'requestor') {
    // Handle both 'recipient' and 'requestor' roles (requestor is backend term)
    return <RecipientDashboard />;
  } else if (role === 'ngo') {
    return <RecipientDashboard />; // TODO: Create NGODashboard component
  } else if (role === 'corporate') {
    return <SupplierDashboard />; // TODO: Create CorporateDashboard component
  } else if (role === 'field_agent') {
    return <FieldAgentDashboard />;
  } else if (role === 'driver' || role === 'supervisor') {
    return <AdminDashboard />; // Drivers/supervisors see logistics-focused dashboard
  } else if (role === 'special') {
    return <AdminDashboard />; // Special roles get dashboard based on permissions
  } else {
    // Fallback to recipient dashboard for unknown roles
    return <RecipientDashboard />;
  }
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
            <RoleProtectedRoute allowedRoles={['supplier', 'admin', 'recipient', 'auditor', 'ngo', 'corporate', 'field_agent', 'driver', 'supervisor', 'special']}>
              <DashboardIndex />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="donate"
          element={
            <RoleProtectedRoute allowedRoles={['supplier']} requiresVerification>
              <CreateDonation />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="available-requests"
          element={
            <RoleProtectedRoute allowedRoles={['supplier', 'corporate', 'donor']}>
              <AvailableRequests />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="documents"
          element={
            <RoleProtectedRoute allowedRoles={['supplier', 'recipient', 'ngo', 'corporate', 'field_agent']}>
              <DocumentUpload />
            </RoleProtectedRoute>
          }
        />
        
        {/* Admin Routes */}
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
            <RoleProtectedRoute allowedRoles={['admin']}>
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
            <RoleProtectedRoute allowedRoles={['admin']}>
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
            <RoleProtectedRoute allowedRoles={['recipient', 'ngo']} requiresVerification>
              <CreateRequest />
            </RoleProtectedRoute>
          }
        />
        
        {/* Shared Routes */}
        <Route
          path="profile"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'supplier', 'recipient', 'auditor', 'ngo', 'corporate', 'field_agent', 'driver', 'supervisor', 'special']}>
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
        
        {/* NGO Routes */}
        <Route
          path="projects"
          element={
            <RoleProtectedRoute allowedRoles={['ngo', 'corporate', 'supplier', 'field_agent']}>
              <Projects />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="partnerships"
          element={
            <RoleProtectedRoute allowedRoles={['ngo', 'corporate']}>
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
            <RoleProtectedRoute allowedRoles={['corporate']}>
              <div className="p-6 bg-white min-h-screen">
                <h2 className="text-xl font-bold text-slate-800">Find NGOs</h2>
                <p className="text-slate-600 mt-2">Coming soon...</p>
              </div>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="upload-proof"
          element={
            <RoleProtectedRoute allowedRoles={['field_agent']}>
              <UploadProof />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="proofs"
          element={
            <RoleProtectedRoute allowedRoles={['field_agent']}>
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
