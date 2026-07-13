import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Frown } from "lucide-react";
import { Product, ShopConfig } from "../types";
import { ProductCard } from "./ProductCard";

export const CatalogPreviewContent: React.FC<{ products: Product[]; shopConfig: ShopConfig }> = ({ products, shopConfig }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"todos" | "disponibles" | "agotados">("todos");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const filteredPreviewProducts = useMemo(() => {
    const getNumericId = (id: string): number => {
      const matched = id.match(/\d+/);
      return matched ? parseInt(matched[0], 10) : 0;
    };

    const sortMode = shopConfig.catalogSortOrder || "manual";
    const sorted = [...products].sort((a, b) => {
      // 1. Primary Sort
      if (sortMode === "stock_desc") {
        const aAgotado = a.stock === 0;
        const bAgotado = b.stock === 0;
        if (aAgotado !== bAgotado) return aAgotado ? 1 : -1;
        if (b.stock !== a.stock) return b.stock - a.stock;
      } else if (sortMode === "stock_asc") {
        const aAgotado = a.stock === 0;
        const bAgotado = b.stock === 0;
        if (aAgotado !== bAgotado) return aAgotado ? 1 : -1;
        if (a.stock !== b.stock) return a.stock - b.stock;
      } else if (sortMode === "alphabetical") {
        const nameComp = a.nombre.localeCompare(b.nombre);
        if (nameComp !== 0) return nameComp;
      }

      // 2. Secondary Sort / Tie-breaker
      if (a.orden_manual !== undefined && b.orden_manual !== undefined) {
        return a.orden_manual - b.orden_manual;
      }
      if (a.orden_manual !== undefined) return -1;
      if (b.orden_manual !== undefined) return 1;
      return getNumericId(a.id) - getNumericId(b.id);
    });

    let result = sorted;
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }

    if (filterType === "disponibles") {
      result = result.filter(p => p.stock > 0);
    } else if (filterType === "agotados") {
      result = result.filter(p => p.stock === 0);
    }

    return result;
  }, [products, shopConfig.catalogSortOrder, searchTerm, filterType]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${previewTheme === 'dark' ? 'dark bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Simulation Banner Controls */}
      <div className="p-4 bg-slate-100/80 dark:bg-zinc-900 border-b border-slate-200/60 dark:border-zinc-800/80 flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Ver como cliente en:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800">
            <button
              onClick={() => setPreviewTheme("light")}
              className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-md transition cursor-pointer ${previewTheme === "light" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-zinc-400"}`}
            >
              ☀️ Claro
            </button>
            <button
              onClick={() => setPreviewTheme("dark")}
              className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-md transition cursor-pointer ${previewTheme === "dark" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-zinc-400"}`}
            >
              🌙 Oscuro
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 p-0.5 text-[10px] font-bold">
            {(["todos", "disponibles", "agotados"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 uppercase rounded-md transition cursor-pointer ${filterType === type ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-zinc-400"}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog Search */}
      <div className="p-4 pb-2 space-y-4 shrink-0">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar sabor artesanal..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 dark:focus:ring-brand-500 outline-none text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredPreviewProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Frown className="h-10 w-10 text-slate-400 dark:text-zinc-650 mx-auto" />
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              No se encontraron sabores en la simulación.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPreviewProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQty={0}
                catalogModeEnabled={shopConfig.catalogModeEnabled}
                showOrderBadge={shopConfig.catalogSortOrder === "manual" || !shopConfig.catalogSortOrder}
                onAddToCart={(prod, qty) => {
                  triggerToast(`Simulación: Agregados ${qty} unidad(es) de "${prod.nombre}" al carrito virtual.`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast notification inside preview */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-white text-white dark:text-zinc-950 font-sans font-bold text-xs px-5 py-3 rounded-xl border border-slate-800 dark:border-slate-200 shadow-2xl z-[110] text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
