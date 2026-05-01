import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { productService } from '../services/productService';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  onNewProduct?: (name: string, price: number) => void;
  userId: string;
  placeholder?: string;
  icon?: string;
  currency?: string;
  allowCreate?: boolean;
  showNewProductModal?: (name: string) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  value,
  onChange,
  onSelect,
  onNewProduct,
  userId,
  placeholder = 'Digite o nome do produto...',
  icon = 'fa-search',
  currency = 'MZN',
  allowCreate = true,
  showNewProductModal,
}: ProductSearchProps) => {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search products as user types
  useEffect(() => {
    const performSearch = async () => {
      if (!value.trim()) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await productService.searchProducts(value, userId);
        setSuggestions(results);
        setShowDropdown(true);
        setActiveIndex(-1);
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(performSearch, 300); // Debounce
    return () => clearTimeout(timeout);
  }, [value, userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev: number) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev: number) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelectProduct(suggestions[activeIndex]);
        } else if (allowCreate && value.trim() && activeIndex === -1) {
          // User pressed Enter without selecting - trigger new product creation
          showNewProductModal?.(value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  const handleSelectProduct = (product: Product) => {
    onChange(product.name);
    onSelect(product);
    setShowDropdown(false);
  };

  const handleCreateNew = () => {
    showNewProductModal?.(value);
    setShowDropdown(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="relative w-full">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value && setShowDropdown(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 pl-9 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          <i className={`fa-solid ${icon}`}></i>
        </div>
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500">
            <i className="fa-solid fa-spinner animate-spin"></i>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && value.trim() && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto mt-1"
        >
          {suggestions.length > 0 ? (
            <>
              {/* Existing Products */}
              {suggestions.map((product: Product, index: number) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full text-left px-3 py-2.5 transition-colors flex justify-between items-center border-b border-slate-100 dark:border-slate-600 last:border-b-0 ${
                    index === activeIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {product.name}
                    </div>
                    {product.category && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {product.category}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
                    {formatPrice(product.price)}
                  </div>
                </button>
              ))}

              {/* New Product Option */}
              {allowCreate && !suggestions.some((p: Product) => p.name.toLowerCase() === value.toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  onMouseEnter={() => setActiveIndex(suggestions.length)}
                  className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2 border-t border-slate-200 dark:border-slate-600 ${
                    activeIndex === suggestions.length
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  <span className="text-sm font-medium">
                    Novo: <span className="font-bold">{value}</span>
                  </span>
                </button>
              )}
            </>
          ) : (
            <div className="px-3 py-4 text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                <i className="fa-solid fa-inbox text-lg mb-2 block"></i>
                Nenhum produto encontrado
              </div>
              {allowCreate && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-2"
                >
                  Criar novo: <span className="font-bold">{value}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
