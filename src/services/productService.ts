import { db } from './db';
import { Product } from '../types';
import { supabase } from './supabaseClient';
import { syncService } from './syncService';

class ProductService {
  /**
   * Search products by name (instant, local search)
   * Used for autocomplete feature
   */
  async searchProducts(query: string, userId: string): Promise<Product[]> {
    if (!query.trim()) {
      return db.catalog.where('userId').equals(userId).limit(50).toArray();
    }

    const results = await db.catalog
      .where('userId')
      .equals(userId)
      .toArray();

    const lowerQuery = query.toLowerCase();
    return results
      .filter(p => p.name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // Prioritize exact start matches
        const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 20);
  }

  /**
   * Get all products for a user (with pagination for large catalogs)
   */
  async getProducts(userId: string, limit = 1000, offset = 0): Promise<Product[]> {
    return db.catalog
      .where('userId')
      .equals(userId)
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<Product | undefined> {
    return db.catalog.get(id);
  }

  /**
   * Create a new product
   * Returns the product with ID
   */
  async createProduct(
    name: string,
    price: number,
    userId: string,
    category?: string
  ): Promise<Product> {
    const product: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      price,
      category: category?.trim(),
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.catalog.add(product);

    // Queue for sync via unified syncService (works offline too)
    await syncService.addToQueue('catalog', 'INSERT', product);

    return product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const existing = await db.catalog.get(id);
    if (!existing) {
      throw new Error(`Product not found: ${id}`);
    }

    const updated: Product = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID doesn't change
      userId: existing.userId, // Ensure userId doesn't change
      createdAt: existing.createdAt, // Ensure creation date doesn't change
      updatedAt: Date.now(),
    };

    await db.catalog.put(updated);
    await syncService.addToQueue('catalog', 'UPDATE', updated);

    return updated;
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    const product = await db.catalog.get(id);
    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    await db.catalog.delete(id);
    await syncService.addToQueue('catalog', 'DELETE', { id, userId: product.userId });
  }

  /**
   * Check if product name already exists (case-insensitive)
   */
  async productExists(name: string, userId: string): Promise<boolean> {
    const existing = await db.catalog
      .where('userId')
      .equals(userId)
      .toArray();

    return existing.some(p => p.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Bulk import products (useful for initial setup)
   */
  async bulkImport(products: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>, userId: string): Promise<Product[]> {
    const now = Date.now();
    const productsToAdd: Product[] = products.map(p => ({
      ...p,
      id: `prod_${now}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: now,
      updatedAt: now,
    }));

    await db.catalog.bulkAdd(productsToAdd);

    // Queue bulk sync via unified syncService
    for (const product of productsToAdd) {
      await syncService.addToQueue('catalog', 'INSERT', product);
    }

    return productsToAdd;
  }

  /**
   * Get product count for user
   */
  async getProductCount(userId: string): Promise<number> {
    return db.catalog.where('userId').equals(userId).count();
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(userId: string, category: string): Promise<Product[]> {
    return db.catalog
      .where('userId')
      .equals(userId)
      .toArray()
      .then(products => products.filter(p => p.category === category));
  }

  /**
   * Get all unique categories for a user
   */
  async getCategories(userId: string): Promise<string[]> {
    const products = await db.catalog.where('userId').equals(userId).toArray();
    const categories = new Set<string>();
    products.forEach(p => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories).sort();
  }

  /**
   * Sync products from Supabase to local Dexie
   * Call this on app startup or when user logs in
   */
  async syncFromSupabase(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching products from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const productsToSync = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          userId,
          createdAt: new Date(item.created_at).getTime(),
          updatedAt: new Date(item.updated_at).getTime(),
        }));

        // Clear existing and repopulate
        const existing = await db.catalog.where('userId').equals(userId).toArray();
        await db.catalog.bulkDelete(existing.map(p => p.id));
        await db.catalog.bulkAdd(productsToSync);
      }
    } catch (error) {
      console.error('Error syncing products from Supabase:', error);
    }
  }

  /**
   * Export products to CSV format
   */
  async exportProductsCSV(userId: string): Promise<string> {
    const products = await this.getProducts(userId);
    const headers = ['ID', 'Name', 'Price', 'Category', 'Created'];
    const rows = products.map(p => [
      p.id,
      `"${p.name}"`,
      p.price,
      p.category || '',
      new Date(p.createdAt).toISOString().split('T')[0],
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
  }
}

export const productService = new ProductService();
