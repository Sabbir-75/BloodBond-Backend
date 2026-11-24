// BloodBond Backend - database connection
// This file only connects to SQL Server. All SQL work is done by the
// stored procedures / views / functions from Step 1 (database files 01-03).
// No table is created here.

const sql = require('mssql');

// Read settings from .env file (PORT, DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD)
require('dotenv').config();

// SQL Server connection settings.
// encrypt: false + trustServerCertificate: true = local SQL Server on your own PC.
// (On a real hosted server you would use encrypt: true.)
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'BloodBond',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// One shared connection pool for the whole server.
// Pool = a small set of ready connections, reused by every request.
let pool = null;

// Connect once, reuse the same pool. Returns the pool.
async function getPool() {
  if (pool) return pool;
  pool = await new sql.ConnectionPool(config).connect();
  console.log('Database connected: BloodBond on', config.server);
  return pool;
}

// Exported for routes to use: getPool() and the sql types (sql.NVarChar, sql.Int...)
module.exports = { getPool, sql };
