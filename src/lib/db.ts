import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';

// ── MySQL connection pool ──

let pool: Pool | null = null;

/** Get (or create) the MySQL connection pool */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      database: process.env.MYSQL_DATABASE || 'contract_finder',
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

/** Run a SELECT query and return typed rows */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: (string | number | boolean | null | Date | Buffer)[]
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, params);
  return rows;
}

/** Run an INSERT / UPDATE / DELETE and return the result header */
export async function execute(
  sql: string,
  params?: (string | number | boolean | null | Date | Buffer)[]
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params);
  return result;
}

/** Close the pool (useful for graceful shutdown in scripts) */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
