import Database from "better-sqlite3";

// In-memory SQLite database (data is reset on server restart)
let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      category TEXT,
      stock INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      shipping_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Seed products if none exist
  const productCount = database
    .prepare("SELECT COUNT(*) as count FROM products")
    .get() as { count: number };

  if (productCount.count === 0) {
    const insertProduct = database.prepare(`
      INSERT INTO products (name, description, price, image_url, category, stock)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const products = [
      [
        "Wireless Headphones",
        "Premium noise-cancelling wireless headphones with 30-hour battery life.",
        79.99,
        "https://placehold.co/400x300?text=Headphones",
        "Electronics",
        50,
      ],
      [
        "Mechanical Keyboard",
        "Compact TKL mechanical keyboard with RGB backlighting and tactile switches.",
        129.99,
        "https://placehold.co/400x300?text=Keyboard",
        "Electronics",
        30,
      ],
      [
        "Running Shoes",
        "Lightweight and breathable running shoes with cushioned sole.",
        89.99,
        "https://placehold.co/400x300?text=Shoes",
        "Footwear",
        75,
      ],
      [
        "Coffee Maker",
        "12-cup programmable coffee maker with built-in grinder.",
        59.99,
        "https://placehold.co/400x300?text=Coffee+Maker",
        "Kitchen",
        40,
      ],
      [
        "Yoga Mat",
        "Non-slip eco-friendly yoga mat, 6mm thick with carrying strap.",
        34.99,
        "https://placehold.co/400x300?text=Yoga+Mat",
        "Sports",
        100,
      ],
      [
        "Desk Lamp",
        "LED desk lamp with adjustable brightness and USB charging port.",
        44.99,
        "https://placehold.co/400x300?text=Desk+Lamp",
        "Home",
        60,
      ],
      [
        "Backpack",
        "Water-resistant 30L backpack with laptop compartment.",
        69.99,
        "https://placehold.co/400x300?text=Backpack",
        "Bags",
        45,
      ],
      [
        "Stainless Steel Water Bottle",
        "Insulated 32oz water bottle, keeps drinks cold 24h or hot 12h.",
        24.99,
        "https://placehold.co/400x300?text=Water+Bottle",
        "Kitchen",
        120,
      ],
    ];

    for (const product of products) {
      insertProduct.run(...product);
    }
  }
}
