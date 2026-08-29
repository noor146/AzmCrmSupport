import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import LeadsPage from './pages/LeadsPage';
import DashboardPage from './pages/DashboardPage';
import LiveChatPage from './pages/LiveChatPage';
import PublicSupportPage from './pages/PublicSupportPage';
import PortalLayout from './components/PortalLayout';
import PortalLoginPage from './pages/PortalLoginPage';
import PortalSignupPage from './pages/PortalSignupPage';
import PortalDashboardPage from './pages/PortalDashboardPage';
import PortalTicketDetailPage from './pages/PortalTicketDetailPage';
import { useAuth } from './lib/auth';
import { usePortalAuth } from './lib/portalAuth';

function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function RequirePortalAuth({ children }) {
  const { token } = usePortalAuth();
  return token ? children : <Navigate to="/portal/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/support" element={<PublicSupportPage />} />

      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route path="/portal/signup" element={<PortalSignupPage />} />
      <Route
        path="/portal"
        element={
          <RequirePortalAuth>
            <PortalLayout />
          </RequirePortalAuth>
        }
      >
        <Route index element={<PortalDashboardPage />} />
        <Route path="tickets/:id" element={<PortalTicketDetailPage />} />
      </Route>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="live-chat" element={<LiveChatPage />} />
      </Route>
    </Routes>
  );
}
