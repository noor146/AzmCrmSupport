import path from 'path';
import dotenv from 'dotenv';

// Runs before any test file (or app.ts/lib/prisma.ts) is imported, so
// Prisma picks up the isolated test database instead of dev/.env.
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
