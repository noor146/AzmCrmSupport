import { createContext, useContext, useState } from 'react';
import { api } from './api';

const PortalAuthContext = createContext(null);

// Deliberately separate from lib/auth.jsx's AuthProvider (agent session):
// different localStorage keys and a customer-scoped JWT (role: 'customer'
// on the backend) so an agent and a customer session never collide in the
// same browser, and a customer token can never be reused against the
// agent-only API routes.
export function PortalAuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('portal_token'));
  const [customer, setCustomer] = useState(() => {
    const raw = localStorage.getItem('portal_customer');
    return raw ? JSON.parse(raw) : null;
  });

  function persist(data) {
    setToken(data.token);
    setCustomer(data.customer);
    localStorage.setItem('portal_token', data.token);
    localStorage.setItem('portal_customer', JSON.stringify(data.customer));
  }

  async function login(email, password) {
    persist(await api.portalLogin(email, password));
  }

  async function signup(data) {
    persist(await api.portalSignup(data));
  }

  function logout() {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_customer');
  }

  return (
    <PortalAuthContext.Provider value={{ token, customer, login, signup, logout }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  return useContext(PortalAuthContext);
}
