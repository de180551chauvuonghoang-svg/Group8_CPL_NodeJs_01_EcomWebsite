import sql from 'mssql';
import dotenv from 'dotenv';

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

    // 3. Initialize tables and seed mock data
    await initTables();

  } catch (err) {
    console.error(`[✗] SQL Server Connection / Initialization Failed!`);
    console.error(err);
    process.exit(1);
  }
};

const initTables = async () => {
  try {
    // Create Users table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
      BEGIN
        CREATE TABLE Users (
          id VARCHAR(50) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'customer',
          createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Table Users created';
      END
    `);

    // Create Products table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
      BEGIN
        CREATE TABLE Products (
          id VARCHAR(50) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          description NVARCHAR(MAX),
          category NVARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
          image VARCHAR(2083) NOT NULL,
          stock INT NOT NULL DEFAULT 0,
          rating DECIMAL(3, 2) NOT NULL DEFAULT 5.0,
          reviewsCount INT NOT NULL DEFAULT 0,
          createdAt DATETIME2 NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Table Products created';
      END
    `);

    // Seed users if empty
    const usersCount = await pool.request().query(`SELECT COUNT(*) as count FROM Users`);
    if (usersCount.recordset[0].count === 0) {
      console.log('[Seed] Seeding initial users...');
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('password123', 10);

      await pool.request()
        .input('adminId', sql.VarChar, 'usr_admin123')
        .input('adminName', sql.NVarChar, 'Admin Manager')
        .input('adminEmail', sql.VarChar, 'admin@ecom.com')
        .input('adminPassword', sql.VarChar, hashedPassword)
        .input('adminRole', sql.VarChar, 'admin')
        .query(`
          INSERT INTO Users (id, name, email, password, role)
          VALUES (@adminId, @adminName, @adminEmail, @adminPassword, @adminRole)
        `);

      await pool.request()
        .input('custId', sql.VarChar, 'usr_cust123')
        .input('custName', sql.NVarChar, 'Nguyen Van A')
        .input('custEmail', sql.VarChar, 'customer@ecom.com')
        .input('custPassword', sql.VarChar, hashedPassword)
        .input('custRole', sql.VarChar, 'customer')
        .query(`
          INSERT INTO Users (id, name, email, password, role)
          VALUES (@custId, @custName, @custEmail, @custPassword, @custRole)
        `);
      console.log('[Seed] Users seeded successfully.');
    }

    // Seed products if empty
    const productsCount = await pool.request().query(`SELECT COUNT(*) as count FROM Products`);
    if (productsCount.recordset[0].count === 0) {
      console.log('[Seed] Seeding initial products...');
      const initialProducts = [
        {
          id: 'prod_1',
          name: 'Wireless Noise-Canceling Headphones',
          price: 199.99,
          description: 'Experience premium sound quality with active noise cancellation, 40-hour battery life, and comfortable memory foam ear cups.',
          category: 'Audio',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
          stock: 15,
          rating: 4.8,
          reviewsCount: 124
        },
        {
          id: 'prod_2',
          name: 'Mechanical Gaming Keyboard',
          price: 89.99,
          description: 'Tactile mechanical blue switches, customizable RGB backlighting, durable aluminum chassis, and dedicated media keys.',
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80',
          stock: 25,
          rating: 4.6,
          reviewsCount: 89
        },
        {
          id: 'prod_3',
          name: 'Ergonomic Wireless Mouse',
          price: 49.99,
          description: 'Precision wireless mouse with adjustable DPI settings, side-scrolling wheel, and ergonomic shape designed for all-day comfort.',
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
          stock: 40,
          rating: 4.5,
          reviewsCount: 215
        },
        {
          id: 'prod_4',
          name: 'Smart fitness Watch Pro',
          price: 149.99,
          description: 'Track your daily fitness activity, heart rate, sleep quality, and receive calls/notifications on a sleek AMOLED display.',
          category: 'Wearables',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
          stock: 12,
          rating: 4.7,
          reviewsCount: 64
        },
        {
          id: 'prod_5',
          name: 'Cold-Brew Coffee Maker',
          price: 34.99,
          description: 'Brew delicious and rich iced coffee at home. Airtight silicone lid keeps coffee fresh for up to 2 weeks, premium glass carafe.',
          category: 'Home & Kitchen',
          image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
          stock: 8,
          rating: 4.4,
          reviewsCount: 156
        },
        {
          id: 'prod_6',
          name: 'Ultra-Wide Curved Monitor 34"',
          price: 449.99,
          description: 'Immersive gaming and productivity experience with 144Hz refresh rate, HDR 10 support, 21:9 ratio, and rich dual speakers.',
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
          stock: 5,
          rating: 4.9,
          reviewsCount: 42
        }
      ];

      for (const p of initialProducts) {
        await pool.request()
          .input('id', sql.VarChar, p.id)
          .input('name', sql.NVarChar, p.name)
          .input('price', sql.Decimal(10, 2), p.price)
          .input('description', sql.NVarChar, p.description)
          .input('category', sql.NVarChar, p.category)
          .input('image', sql.VarChar, p.image)
          .input('stock', sql.Int, p.stock)
          .input('rating', sql.Decimal(3, 2), p.rating)
          .input('reviewsCount', sql.Int, p.reviewsCount)
          .query(`
            INSERT INTO Products (id, name, price, description, category, image, stock, rating, reviewsCount)
            VALUES (@id, @name, @price, @description, @category, @image, @stock, @rating, @reviewsCount)
          `);
      }
      console.log('[Seed] Products seeded successfully.');
    }

    console.log('[✓] Database tables & seed validation finished.');

  } catch (err) {
    console.error('[🚨 DATABASE INIT ERROR]', err.message);
    throw err;
  }
};

export { sql, pool };
