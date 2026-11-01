import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __folioPool: mysql.Pool | undefined;
}

function createPool() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = new URL(raw);
  // TiDB's "Prisma" connection string adds sslaccept=strict, which mysql2 doesn't understand.
  url.searchParams.delete("sslaccept");
  const host = url.hostname;
  return mysql.createPool({
    uri: url.toString(),
    connectionLimit: 4,
    // TiDB Cloud Serverless only accepts TLS connections.
    ssl: host.endsWith("tidbcloud.com") ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    multipleStatements: false,
  });
}

export function db() {
  // Reuse one pool across hot reloads and warm serverless invocations.
  globalThis.__folioPool ??= createPool();
  return globalThis.__folioPool;
}
