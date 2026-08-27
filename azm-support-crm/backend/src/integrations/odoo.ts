// Minimal Odoo JSON-RPC client (see SDD.md §8 for the integration design).
// Talks to /jsonrpc directly instead of pulling in an XML-RPC dependency —
// Odoo has supported JSON-RPC 2.0 on the same "common"/"object" services
// since very old versions, so this needs zero extra npm packages.

const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_USERNAME = process.env.ODOO_USERNAME!;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD!;

let cachedUid: number | null = null;

async function rpcCall(service: string, method: string, args: unknown[]) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: Date.now(),
    }),
  });
  const data = await res.json();
  if (data.error) {
    const message = data.error?.data?.message || data.error?.message || 'Odoo RPC error';
    throw new Error(message);
  }
  return data.result;
}

async function getUid(): Promise<number> {
  if (cachedUid) return cachedUid;
  const uid = await rpcCall('common', 'login', [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD]);
  if (!uid) throw new Error('Odoo authentication failed');
  cachedUid = uid;
  return uid;
}

async function executeKw(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const uid = await getUid();
  return rpcCall('object', 'execute_kw', [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs]);
}

export async function checkOdooConnection(): Promise<{ connected: boolean; uid?: number; error?: string }> {
  try {
    const uid = await getUid();
    return { connected: true, uid };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

// --- res.partner (Customers) -----------------------------------------

export async function upsertPartner(customer: {
  odooPartnerId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}): Promise<number> {
  const values = {
    name: customer.name,
    email: customer.email || false,
    phone: customer.phone || false,
    comment: customer.notes || false,
  };
  if (customer.odooPartnerId) {
    await executeKw('res.partner', 'write', [[customer.odooPartnerId], values]);
    return customer.odooPartnerId;
  }
  const [id] = await executeKw('res.partner', 'create', [[values]]);
  return id;
}

// --- crm.lead (Leads) ---------------------------------------------------

const PRIORITY_TO_ODOO: Record<string, string> = {
  low: '0',
  medium: '1',
  high: '2',
  urgent: '3',
};

export async function upsertCrmLead(lead: {
  odooLeadId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  priority: string;
}): Promise<number> {
  const values = {
    name: lead.company ? `${lead.name} (${lead.company})` : lead.name,
    contact_name: lead.name,
    email_from: lead.email || false,
    phone: lead.phone || false,
    partner_name: lead.company || false,
    priority: PRIORITY_TO_ODOO[lead.priority] ?? '1',
    description: lead.source ? `Source (from AZM Support CRM): ${lead.source}` : false,
  };
  if (lead.odooLeadId) {
    await executeKw('crm.lead', 'write', [[lead.odooLeadId], values]);
    return lead.odooLeadId;
  }
  const [id] = await executeKw('crm.lead', 'create', [[values]]);
  return id;
}

// --- helpdesk.ticket (Tickets) ------------------------------------------
// The helpdesk app is now installed in the target db, so tickets sync as
// real helpdesk.ticket records (superseding the partner-chatter-note
// fallback SDD.md §8 originally described for when no helpdesk model
// existed).

const STATUS_TO_STAGE_NAME: Record<string, string> = {
  open: 'New',
  in_progress: 'In Progress',
  resolved: 'Solved',
  closed: 'Solved',
};

let cachedTeamId: number | null = null;
const stageIdByName = new Map<string, number>();

async function getDefaultTeamId(): Promise<number | false> {
  if (cachedTeamId) return cachedTeamId;
  const teams = await executeKw('helpdesk.team', 'search_read', [[]], { fields: ['id'], limit: 1 });
  cachedTeamId = teams[0]?.id ?? null;
  return cachedTeamId ?? false;
}

async function getStageId(stageName: string): Promise<number | false> {
  if (stageIdByName.has(stageName)) return stageIdByName.get(stageName)!;
  const stages = await executeKw('helpdesk.stage', 'search_read', [[['name', '=', stageName]]], { fields: ['id'], limit: 1 });
  const id = stages[0]?.id;
  if (id) stageIdByName.set(stageName, id);
  return id ?? false;
}

export async function upsertHelpdeskTicket(ticket: {
  odooTicketId: number | null;
  id: number;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  odooPartnerId: number;
}): Promise<number> {
  const stageId = await getStageId(STATUS_TO_STAGE_NAME[ticket.status] ?? 'New');

  const values: Record<string, unknown> = {
    name: ticket.subject,
    description: ticket.description || false,
    partner_id: ticket.odooPartnerId,
    priority: PRIORITY_TO_ODOO[ticket.priority] ?? '1',
    stage_id: stageId,
  };

  if (ticket.odooTicketId) {
    await executeKw('helpdesk.ticket', 'write', [[ticket.odooTicketId], values]);
    return ticket.odooTicketId;
  }

  values.team_id = await getDefaultTeamId();
  const [id] = await executeKw('helpdesk.ticket', 'create', [[values]]);
  return id;
}
