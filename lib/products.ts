import { getDb } from './db';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

export function getProductById(id: number): Product | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

export function getAllProducts(): Product[] {
  const db = getDb();
  return db.prepare('SELECT * FROM products ORDER BY category, name').all() as Product[];
}

export function getProductsByCategory(category: string): Product[] {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE category = ? ORDER BY name').all(category) as Product[];
}
