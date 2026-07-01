import { PrismaClient } from "@prisma/client";

// Builds a PrismaClient that talks to Turso/libSQL when TURSO_DATABASE_URL is
// set (production hosting), and falls back to the local SQLite file otherwise
// (local dev). Kept free of path-alias imports so the seed script (run via tsx)
// can import it directly.
//
// The libSQL packages are imported lazily so local dev never needs them loaded.
export function createPrismaClient(): PrismaClient {
  const log =
    process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("@libsql/client");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaLibSQL } = require("@prisma/adapter-libsql");
    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}
