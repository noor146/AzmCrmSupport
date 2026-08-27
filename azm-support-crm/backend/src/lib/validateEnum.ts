import { Response } from 'express';

export const INVALID = Symbol('invalid-enum-query-param');

// Validates an untrusted query-param string against an allowed value list
// before it reaches a Prisma `where` clause. Without this, an unknown value
// throws a PrismaClientValidationError that bubbles up as an unhandled 500
// with a full stack trace in the response body.
export function parseEnumQueryParam<T extends string>(
  res: Response,
  paramName: string,
  rawValue: unknown,
  allowed: readonly T[]
): T | undefined | typeof INVALID {
  if (rawValue === undefined) return undefined;
  const value = String(rawValue);
  if (!(allowed as readonly string[]).includes(value)) {
    res.status(400).json({ error: `Invalid ${paramName}. Expected one of: ${allowed.join(', ')}` });
    return INVALID;
  }
  return value as T;
}
