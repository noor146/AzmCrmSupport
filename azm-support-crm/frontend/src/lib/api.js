const BASE = '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),

  listCustomers: (token, search) => request(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token }),
  createCustomer: (token, data) => request('/customers', { method: 'POST', body: data, token }),
  getCustomer: (token, id) => request(`/customers/${id}`, { token }),
  updateCustomer: (token, id, data) => request(`/customers/${id}`, { method: 'PUT', body: data, token }),
  deleteCustomer: (token, id) => request(`/customers/${id}`, { method: 'DELETE', token }),

  listTickets: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tickets${qs ? `?${qs}` : ''}`, { token });
  },
  createTicket: (token, data) => request('/tickets', { method: 'POST', body: data, token }),
  getTicket: (token, id) => request(`/tickets/${id}`, { token }),
  updateTicket: (token, id, data) => request(`/tickets/${id}`, { method: 'PUT', body: data, token }),
  deleteTicket: (token, id) => request(`/tickets/${id}`, { method: 'DELETE', token }),

  listArticles: (q) => request(`/knowledge-base${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createArticle: (token, data) => request('/knowledge-base', { method: 'POST', body: data, token }),
  updateArticle: (token, id, data) => request(`/knowledge-base/${id}`, { method: 'PUT', body: data, token }),
  deleteArticle: (token, id) => request(`/knowledge-base/${id}`, { method: 'DELETE', token }),

  getDashboard: (token) => request('/dashboard', { token }),

  getOdooStatus: (token) => request('/odoo/status', { token }),
  syncCustomerToOdoo: (token, id) => request(`/odoo/customers/${id}`, { method: 'POST', token }),
  syncLeadToOdoo: (token, id) => request(`/odoo/leads/${id}`, { method: 'POST', token }),
  syncTicketToOdoo: (token, id) => request(`/odoo/tickets/${id}`, { method: 'POST', token }),

  startConversation: (data) => request('/chat/conversations', { method: 'POST', body: data }),
  sendVisitorMessage: (conversationId, body) =>
    request(`/chat/conversations/${conversationId}/messages`, { method: 'POST', body: { body } }),
  pollVisitorMessages: (conversationId, afterId) =>
    request(`/chat/conversations/${conversationId}/messages${afterId ? `?after=${afterId}` : ''}`),

  listConversations: (token, status) =>
    request(`/chat/agent/conversations${status ? `?status=${status}` : ''}`, { token }),
  getConversation: (token, id) => request(`/chat/agent/conversations/${id}`, { token }),
  sendAgentMessage: (token, id, body) =>
    request(`/chat/agent/conversations/${id}/messages`, { method: 'POST', body: { body }, token }),
  updateConversation: (token, id, data) =>
    request(`/chat/agent/conversations/${id}`, { method: 'PUT', body: data, token }),

  listLeads: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/leads${qs ? `?${qs}` : ''}`, { token });
  },
  createLead: (token, data) => request('/leads', { method: 'POST', body: data, token }),
  updateLead: (token, id, data) => request(`/leads/${id}`, { method: 'PUT', body: data, token }),
  deleteLead: (token, id) => request(`/leads/${id}`, { method: 'DELETE', token }),
};
