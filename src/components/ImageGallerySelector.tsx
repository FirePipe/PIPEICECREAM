import React, { useState } from "react";
import { Image as ImageIcon, Check, Trash2, Link2, Eye } from "lucide-react";
import { Product } from "../types";

interface ImageGallerySelectorProps {
  currentUrl: string;
  onSelectUrl: (url: string) => void;
  products: Product[];
  placeholderName?: string;
}

export const ImageGallerySelector: React.FC<ImageGallerySelectorProps> = ({
  currentUrl,
  onSelectUrl,
  placeholderName = "Nuevo Sabor"
}) => {
  const [imageError, setImageError] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const handleUrlInputChange = (val: string) => {
    setImageError(false);
    onSelectUrl(val);
  };

  const clearImage = () => {
    setImageError(false);
    onSelectUrl("");
    setPreviewKey((k) => k + 1);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="space-y-4" id="image-gallery-selector">
      {/* URL INPUT & PREVIEW HEADER */}
      <div className="space-y-3">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-brand-500" />
            Enlace de la Imagen (URL)
          </span>
          {currentUrl && (
            <button
              type="button"
              onClick={clearImage}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-0.5 uppercase tracking-wider cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> Limpiar
            </button>
          )}
        </label>

        <div className="flex gap-3 items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Pega la URL de la imagen (ej: https://unsplash.com/...)"
              value={currentUrl}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700 font-mono text-xs"
            />
            <div className="absolute right-3 top-3 text-slate-400 dark:text-zinc-500">
              <ImageIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC LIVE PREVIEW CARD */}
      <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/40">
        <div className="flex items-start gap-4">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shrink-0 bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
            {currentUrl && !imageError ? (
              <img
                key={`${currentUrl}-${previewKey}`}
                src={currentUrl}
                alt="Vista previa del sabor"
                referrerPolicy="no-referrer"
                onError={handleImageError}
                className="w-full h-full object-cover animate-fade-in"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400 dark:text-zinc-500">
                <ImageIcon className="h-7 w-7 mb-1" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-600">
                  {imageError ? "Error URL" : "Sin Imagen"}
                </span>
              </div>
            )}
            
            {/* Quick overlay status */}
            {currentUrl && !imageError && (
              <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                <Check className="h-2.5 w-2.5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
              <Eye className="h-3 w-3 text-slate-400" /> Previsualización en Vivo
            </span>
            <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">
              {placeholderName || "Nombre del Helado"}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              {currentUrl 
                ? (imageError 
                  ? "⚠️ La URL de la imagen introducida parece inválida o no permite acceso externo."
                  : "✓ Imagen cargada correctamente. Se mostrará así en la carta digital de los clientes.")
                : "Puedes pegar cualquier enlace de imagen público para personalizar el helado."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
