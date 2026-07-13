import React from "react";
import { X, Plus } from "lucide-react";
import { Product } from "../types";
import { ImageGallerySelector } from "./ImageGallerySelector";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newNombre: string;
  setNewNombre: (val: string) => void;
  newPrecio: string;
  setNewPrecio: (val: string) => void;
  newCosto: string;
  setNewCosto: (val: string) => void;
  newStock: string;
  setNewStock: (val: string) => void;
  newImagen: string;
  setNewImagen: (val: string) => void;
  formError: string | null;
  products: Product[];
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen, onClose, onSubmit, newNombre, setNewNombre, newPrecio, setNewPrecio,
  newCosto, setNewCosto, newStock, setNewStock, newImagen, setNewImagen, formError,
  products
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xl dark:bg-zinc-900 dark:border-zinc-800 w-full max-w-md my-auto animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 className="font-sans text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
            <Plus className="h-4 w-4 text-emerald-500" />
            Agregar Sabor
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">Nombre del Sabor *</label>
            <input type="text" required placeholder="Ej. Coco Loco, Mango Biche..." value={newNombre} onChange={(e) => setNewNombre(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700 font-sans" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">Precio Venta *</label>
              <input type="number" required placeholder="2200" value={newPrecio} onChange={(e) => setNewPrecio(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">Costo Compra *</label>
              <input type="number" required placeholder="1140" value={newCosto} onChange={(e) => setNewCosto(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">Stock Inicial *</label>
              <input type="number" required placeholder="20" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700 font-mono" />
            </div>
          </div>
          
          <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4">
            <ImageGallerySelector
              currentUrl={newImagen}
              onSelectUrl={setNewImagen}
              products={products}
              placeholderName={newNombre}
            />
          </div>

          {formError && <p className="text-xs text-rose-500">{formError}</p>}
          <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 active:scale-95 transition-all duration-200 cursor-pointer">
            Agregar Sabor
          </button>
        </form>
      </div>
    </div>
  );
};
