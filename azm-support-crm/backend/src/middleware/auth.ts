import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  user?: { id: number; email: string; isAdmin: boolean; role: 'agent' };
  customer?: { id: number; email: string; role: 'customer' };
}

function verify(req: Request, res: Response): any | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' });
    return null;
  }
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET!);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

// Agent/admin auth (internal app). Rejects a customer-portal token even
// though both are signed with the same secret - the `role` claim keeps the
// two sessions from ever giving one type of user the other's access.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const payload = verify(req, res);
  if (!payload) return;
  if (payload.role !== 'agent') {
    return res.status(403).json({ error: 'Agent access required' });
  }
  req.user = payload;
  next();
}

// Customer-portal auth (external, self-service). Symmetric guard against
// an agent token reaching portal routes.
export function requireCustomerAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const payload = verify(req, res);
  if (!payload) return;
  if (payload.role !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  req.customer = payload;
  next();
}
