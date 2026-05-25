import sql from 'mssql';
import dotenv from 'dotenv';
import { initDb } from './initDb.js';

dotenv.config();

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE
  }
};

let pool;

export const connectDB = async () => {
  try {
    const dbName = process.env.DB_DATABASE || 'ecomfpt';
    
    // Sanitize database name to prevent SQL injection and invalid identifiers
    const dbNameRegex = /^[A-Za-z0-9_-]{1,128}$/;
    if (!dbNameRegex.test(dbName)) {
      throw new Error(`Invalid database name: "${dbName}". Database names must be 1-128 characters and can only contain alphanumeric characters, underscores, and hyphens.`);
    }
    
    // 1. First connect to master to check and create the database if it doesn't exist
    const masterConfig = { ...baseConfig, database: 'master' };
    console.log(`[⏳ DB CONNECT] Checking/Creating database: '${dbName}'...`);
    
    const tempPool = await sql.connect(masterConfig);
    const dbCheckResult = await tempPool.request()
      .input('dbName', sql.NVarChar, dbName)
      .query('SELECT name FROM sys.databases WHERE name = @dbName');
    
    if (dbCheckResult.recordset.length === 0) {
      console.log(`[📦 DATABASE] Database '${dbName}' does not exist. Creating database...`);
      // Safely quote the database identifier in brackets
      await tempPool.request().query(`CREATE DATABASE [${dbName}]`);
      console.log(`[📦 DATABASE] Database '${dbName}' created successfully!`);
    } else {
      console.log(`[📦 DATABASE] Database '${dbName}' already exists.`);
    }
    
    await tempPool.close(); // Close temp connection to master

    // 2. Now connect to the newly created / existing ecomfpt database
    const fullConfig = { ...baseConfig, database: dbName };
    pool = await sql.connect(fullConfig);
    console.log(`[✓] SQL Server Connected Successfully to database: ${dbName}`);

    // 3. Initialize all 24 tables and seed data
    await initDb();

  } catch (err) {
    console.error(`[✗] SQL Server Connection / Initialization Failed!`);
    console.error(err);
    process.exit(1);
  }
};



export { sql, pool };
