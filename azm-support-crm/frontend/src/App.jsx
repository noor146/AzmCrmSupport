import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import LeadsPage from './pages/LeadsPage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './lib/auth';

function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
      </Route>
    </Routes>
  );
}
