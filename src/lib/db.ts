import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let db: DatabaseSync;

// Keep the database file inside the workspace
const dbPath = path.join(process.cwd(), 'banksampah.db');

if (process.env.NODE_ENV === 'production') {
  db = new DatabaseSync(dbPath);
} else {
  // In development, cache the database connection globally to prevent file locks during hot-reloading
  const globalWithDb = global as typeof globalThis & {
    _sqliteDb?: DatabaseSync;
  };
  if (!globalWithDb._sqliteDb) {
    globalWithDb._sqliteDb = new DatabaseSync(dbPath);
  }
  db = globalWithDb._sqliteDb;
}

// Helper to run raw SQL statements (for creating tables, etc.)
export function runSql(sql: string) {
  try {
    db.exec(sql);
  } catch (error) {
    console.error('Error executing raw SQL:', error);
    throw error;
  }
}

// Helper for queries that return rows
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  } catch (error) {
    console.error(`Error executing queryAll (${sql}):`, error);
    throw error;
  }
}

// Helper for queries that return a single row
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  try {
    const stmt = db.prepare(sql);
    const results = stmt.all(...params);
    return results.length > 0 ? (results[0] as T) : null;
  } catch (error) {
    console.error(`Error executing queryOne (${sql}):`, error);
    throw error;
  }
}

// Helper for insert/update/delete operations
export function executeSql(sql: string, params: any[] = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (error) {
    console.error(`Error executing executeSql (${sql}):`, error);
    throw error;
  }
}

// Initialize database schema and seed data if needed
export function initDb() {
  console.log('Initializing SQLite database at:', dbPath);

  // Enable Write-Ahead Logging (WAL) mode for concurrent access
  try {
    runSql('PRAGMA journal_mode=WAL;');
  } catch (err) {
    console.warn('Failed to enable WAL mode, continuing in rollback mode:', err);
  }

  // Check if we need to migrate/recreate SQLite table due to schema change (missing email column)
  let tableNeedsRecreation = false;
  try {
    runSql('SELECT email FROM members LIMIT 1;');
  } catch (err) {
    console.log('Database schema upgrade detected. Recreating members table...');
    tableNeedsRecreation = true;
  }

  if (tableNeedsRecreation) {
    try {
      runSql('DROP TABLE IF EXISTS order_items;');
      runSql('DROP TABLE IF EXISTS orders;');
      runSql('DROP TABLE IF EXISTS shopee_sync_logs;');
      runSql('DROP TABLE IF EXISTS product_variants;');
      runSql('DROP TABLE IF EXISTS products;');
      runSql('DROP TABLE IF EXISTS raw_materials;');
      runSql('DROP TABLE IF EXISTS waste_deposits;');
      runSql('DROP TABLE IF EXISTS members;');
      console.log('Old tables dropped successfully.');
    } catch (dropErr) {
      console.warn('Failed to drop old tables:', dropErr);
    }
  }

  // 1. Members Table
  runSql(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      address TEXT,
      password TEXT,
      role TEXT DEFAULT 'USER',
      balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Waste Deposits Table
  runSql(`
    CREATE TABLE IF NOT EXISTS waste_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      waste_type TEXT NOT NULL,
      weight REAL NOT NULL,
      points INTEGER NOT NULL,
      deposit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  // 3. Raw Materials Table
  runSql(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waste_type TEXT NOT NULL UNIQUE,
      stock_kg REAL DEFAULT 0.0
    );
  `);

  // 4. Products Table
  runSql(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      shopee_item_id TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Product Variants Table
  runSql(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL, -- e.g. "Merah", "S (1kg)", etc.
      sku TEXT UNIQUE,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      shopee_model_id TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // 6. Shopee Settings Table
  runSql(`
    CREATE TABLE IF NOT EXISTS shopee_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id TEXT,
      partner_key TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at INTEGER DEFAULT 0,
      shop_id TEXT,
      is_sandbox INTEGER DEFAULT 1,
      is_simulated INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 0
    );
  `);

  // 7. Shopee Sync Logs Table
  runSql(`
    CREATE TABLE IF NOT EXISTS shopee_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      action TEXT NOT NULL, -- "CREATE", "UPDATE", "DELETE", "STOCK_SYNC"
      status TEXT NOT NULL, -- "SUCCESS", "FAILED"
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Orders Table
  runSql(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      total_price INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. Order Items Table
  runSql(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // 10. Seed Initial Raw Materials if empty
  const rawMaterialsCount = queryOne('SELECT COUNT(*) as count FROM raw_materials');
  if (rawMaterialsCount?.count === 0) {
    console.log('Seeding initial raw materials...');
    const materials = ['Plastik', 'Kertas', 'Logam', 'Kaca', 'Organik'];
    for (const material of materials) {
      executeSql('INSERT INTO raw_materials (waste_type, stock_kg) VALUES (?, 0.0)', [material]);
    }
  }

  // 11. Seed Initial Members if empty
  const membersCount = queryOne('SELECT COUNT(*) as count FROM members');
  if (membersCount?.count === 0) {
    console.log('Seeding initial members...');
    const hash = (pass: string) => crypto.createHash('sha256').update(pass).digest('hex');

    // Seed Admin
    executeSql('INSERT INTO members (name, email, phone, address, password, role, balance) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Administrator',
      'admin@banksampaheco.org',
      '000000000000',
      'Kantor Pusat Bank Sampah',
      hash('admin123'),
      'ADMIN',
      0
    ]);

    // Seed Users
    executeSql('INSERT INTO members (name, email, phone, address, password, role, balance) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Budi Santoso',
      'budi@gmail.com',
      '081234567890',
      'Kelurahan Lestari Indah RT 02/05',
      hash('budi123'),
      'USER',
      120000,
    ]);
    executeSql('INSERT INTO members (name, email, phone, address, password, role, balance) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Siti Aminah',
      'siti@gmail.com',
      '089876543210',
      'Perumahan Asri Blok C-14',
      hash('siti123'),
      'USER',
      75000,
    ]);
  }

  // 12. Seed Initial Products & Variants if empty
  const productsCount = queryOne('SELECT COUNT(*) as count FROM products');
  if (productsCount?.count === 0) {
    console.log('Seeding initial products...');
    
    // Product 1: Tas Belanja Daur Ulang (Has variants)
    executeSql(`
      INSERT INTO products (name, description, category, price, stock, image_url) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'Tas Belanja Premium Upcycle',
      'Tas belanja ramah lingkungan yang dibuat dari daur ulang sampah plastik kemasan deterjen/kopi. Kuat, tahan air, dan fashionable.',
      'Kerajinan Plastik',
      35000,
      30,
      'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'
    ]);
    
    const lastProduct1 = queryOne('SELECT last_insert_rowid() as id');
    if (lastProduct1) {
      executeSql(`
        INSERT INTO product_variants (product_id, name, sku, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `, [lastProduct1.id, 'Ukuran Sedang (M)', 'TAS-UP-M', 35000, 15]);
      executeSql(`
        INSERT INTO product_variants (product_id, name, sku, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `, [lastProduct1.id, 'Ukuran Besar (L)', 'TAS-UP-L', 45000, 15]);
    }

    // Product 2: Pupuk Kompos Organik (No variants)
    executeSql(`
      INSERT INTO products (name, description, category, price, stock, image_url) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'Pupuk Kompos Super Organik',
      'Pupuk kompos hasil pengolahan sampah organik warga. Menyuburkan tanah, ramah lingkungan, dan bebas bahan kimia berbahaya.',
      'Kompos',
      15000,
      50,
      'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=600&auto=format&fit=crop'
    ]);
    
    const lastProduct2 = queryOne('SELECT last_insert_rowid() as id');
    if (lastProduct2) {
      executeSql(`
        INSERT INTO product_variants (product_id, name, sku, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `, [lastProduct2.id, 'Kemasan 1kg', 'PUPUK-ORG-1K', 15000, 50]);
    }
  }

  // 13. Seed default Shopee settings if empty
  const shopeeSettingsCount = queryOne('SELECT COUNT(*) as count FROM shopee_settings');
  if (shopeeSettingsCount?.count === 0) {
    executeSql(`
      INSERT INTO shopee_settings (partner_id, partner_key, access_token, refresh_token, token_expires_at, shop_id, is_sandbox, is_simulated, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'MOCK_PARTNER_ID',
      'MOCK_PARTNER_KEY',
      'MOCK_ACCESS_TOKEN',
      'MOCK_REFRESH_TOKEN',
      Math.floor(Date.now() / 1000) + 14400, // 4 hours from now
      'MOCK_SHOP_ID',
      1, // is_sandbox = true
      1, // is_simulated = true
      1  // is_active = true
    ]);
  }
}

// Automatically initialize database when database helper is imported
try {
  initDb();
} catch (e) {
  console.error('Failed to auto-initialize SQLite database', e);
}

export default db;
