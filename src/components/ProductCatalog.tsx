import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { useToast } from './ToastContext';

interface ProductCatalogProps {
  userId: string;
  t: (key: any) => string;
  fMoney: (val: number) => string;
  onClose: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  userId, t, fMoney, onClose
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const { notify } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: ''
  });

  // Load products and categories
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [userId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const loadedProducts = await productService.getProducts(userId);
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      notify('Erro ao carregar produtos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await productService.getCategories(userId);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify('Nome do produto é obrigatório', 'error');
      return;
    }
    if (formData.price < 0) {
      notify('Preço deve ser um valor positivo', 'error');
      return;
    }

    setIsCreating(true);
    try {
      if (editingProduct) {
        // Update existing product
        const updated = await productService.updateProduct(editingProduct.id, {
          name: formData.name,
          price: formData.price,
          category: formData.category,
        });
        setProducts(products.map(p => (p.id === updated.id ? updated : p)));
        notify(`Produto "${updated.name}" atualizado com sucesso`, 'success');
      } else {
        // Create new product
        const newProduct = await productService.createProduct(
          formData.name,
          formData.price,
          userId,
          formData.category
        );
        setProducts([...products, newProduct]);
        notify(`Produto "${newProduct.name}" criado com sucesso`, 'success');
      }

      // Reset form and reload categories
      setFormData({ name: '', price: 0, category: '' });
      setShowAddForm(false);
      setEditingProduct(null);
      await loadCategories();
    } catch (error) {
      console.error('Error saving product:', error);
      notify('Erro ao salvar produto', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Tem certeza que deseja eliminar este produto?')) return;

    try {
      await productService.deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      notify('Produto eliminado com sucesso', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      notify('Erro ao eliminar produto', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', price: 0, category: '' });
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleExport = async () => {
    try {
      const csv = await productService.exportProductsCSV(userId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Produtos exportados com sucesso', 'success');
    } catch (error) {
      console.error('Error exporting products:', error);
      notify('Erro ao exportar produtos', 'error');
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Carregando produtos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Catálogo de Produtos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
            <i className="fa-solid fa-times text-slate-500"></i>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors min-w-[150px] w-full sm:w-auto"
            >
              <option value="">Todas as categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <i className="fa-solid fa-plus"></i>
                Novo
              </button>
              <button
                onClick={handleExport}
                className="flex-1 sm:flex-none bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <i className="fa-solid fa-download"></i>
                CSV
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando {filteredProducts.length} de {products.length} produto(s)
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold mb-4 dark:text-white">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="Ex: Cimento 50kg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Preço Unitário *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Categoria (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ex: Materiais de Construção"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingProduct ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-box-open text-slate-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                {products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                {products.length === 0
                  ? 'Comece adicionando seu primeiro produto ao catálogo.'
                  : 'Tente ajustar os filtros de busca.'
                }
              </p>
              {products.length === 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Adicionar Primeiro Produto
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2">
                        {product.name}
                      </h4>
                      {product.category && (
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        title="Editar"
                      >
                        <i className="fa-solid fa-edit text-xs"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                        title="Excluir"
                      >
                        <i className="fa-solid fa-trash text-xs text-red-600 dark:text-red-400"></i>
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {fMoney(product.price)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Atualizado em {new Date(product.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};