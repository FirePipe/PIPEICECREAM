import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { ShoppingCart, Popsicle, AlertTriangle, Minus, Plus, Check, Frown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedCounter } from "./AnimatedCounter";

interface ProductCardProps {
  product?: Product; // Make optional for Skeleton loading
  loading?: boolean;
  onAddToCart?: (product: Product, cantidad: number) => void;
  cartQty?: number;
  catalogModeEnabled?: boolean;
  showOrderBadge?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  loading = false,
  onAddToCart,
  cartQty = 0,
  catalogModeEnabled = false,
  showOrderBadge = false,
}) => {
  // 1. Render Skeleton Loader if loading is true
  if (loading || !product) {
    return (
      <div className="flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 p-4 shadow-sm border border-gray-100 dark:border-zinc-900 animate-pulse">
        <div>
          {/* Skeleton Image */}
          <div className="relative mb-3 aspect-square w-full rounded-xl bg-gray-100 dark:bg-zinc-900"></div>
          {/* Skeleton Badge */}
          <div className="h-4 w-16 rounded bg-gray-100 dark:bg-zinc-900 mb-3"></div>
          {/* Skeleton Title */}
          <div className="h-6 w-3/4 rounded bg-gray-100 dark:bg-zinc-900 mb-2"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-50 dark:border-zinc-900/50 flex justify-between items-center">
          <div className="h-5 w-20 rounded bg-gray-100 dark:bg-zinc-900"></div>
          <div className="h-9 w-24 rounded-lg bg-gray-100 dark:bg-zinc-900"></div>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;
  const remainingStock = Math.max(0, product.stock - cartQty);
  const isCartLimitReached = product.stock > 0 && remainingStock === 0;

  const [selectedQty, setSelectedQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "120px", // Preload slightly before appearing
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const [sprinkles, setSprinkles] = useState<{
    id: number;
    left: number;
    top: number;
    color: string;
    tx: number;
    ty: number;
    scale: number;
    rotate: number;
    width: number;
    height: number;
    borderRadius: string;
  }[]>([]);

  const [isShaking, setIsShaking] = useState(false);
  const [iceParticles, setIceParticles] = useState<{
    id: number;
    type: "crystal" | "thread" | "vapor";
    width: number;
    height: number;
    tx: number;
    ty: number;
    rotation: number;
    opacity: number;
    borderRadius: string;
    background: string;
    boxShadow: string;
    filter: string;
    scale: number;
  }[]>([]);

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showNoStockMessage, setShowNoStockMessage] = useState(false);

  const triggerSprinkles = () => {
    const colors = [
      "#f43f5e", // Rose
      "#10b981", // Emerald
      "#0ea5e9", // Sky
      "#eab308", // Yellow
      "#a855f7", // Purple
      "#f97316", // Orange
      "#ec4899", // Pink
    ];

    const newSprinkles = Array.from({ length: 8 }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = 45 + Math.random() * 75;
      const rad = (angle * Math.PI) / 180;
      const tx = Math.cos(rad) * distance;
      const ty = Math.sin(rad) * distance;
      const scale = 0.5 + Math.random() * 0.8;
      const rotate = Math.random() * 360;

      const isDot = Math.random() > 0.5;
      const width = isDot ? 6 : 4;
      const height = isDot ? 6 : 12;
      const borderRadius = isDot ? "50%" : "2px";

      return {
        id: Math.random() + i,
        left: 45 + Math.random() * 10,
        top: 45 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx,
        ty,
        scale,
        rotate,
        width,
        height,
        borderRadius,
      };
    });

    setSprinkles(newSprinkles);

    setTimeout(() => {
      setSprinkles([]);
    }, 1000);
  };

  const triggerIceParticles = () => {
    // Generate ice gems, frost threads (hilitos), and cold vapor puffs!
    const newParticles = Array.from({ length: 8 }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = 40 + Math.random() * 95; // larger explosion radius!
      const rad = (angle * Math.PI) / 180;
      const tx = Math.cos(rad) * distance;
      const ty = Math.sin(rad) * distance;
      const scale = 0.5 + Math.random() * 1.0;
      const rotate = Math.random() * 720; // fast spin
      
      // Determine type of particle: thread (hilito), vapor, or crystal
      const typeRand = Math.random();
      let type: "crystal" | "thread" | "vapor" = "crystal";
      let width = 6;
      let height = 6;
      let borderRadius = "50%";
      let background = "radial-gradient(circle, #ffffff 0%, #e0f2fe 50%, #38bdf8 100%)";
      let boxShadow = "0 0 6px rgba(186, 230, 253, 0.9), 0 0 12px rgba(56, 189, 248, 0.5)";
      let filter = "none";

      if (typeRand < 0.35) {
        // Frost Thread ("hilito de escarcha")
        type = "thread";
        width = 1.5;
        height = 15 + Math.random() * 15; // thin elegant needle/thread
        borderRadius = "99px";
        background = "linear-gradient(to bottom, #ffffff, #7dd3fc)";
        boxShadow = "0 0 8px rgba(125, 211, 252, 0.9)";
      } else if (typeRand < 0.65) {
        // Cold Vapor Puff ("vapor de frio")
        type = "vapor";
        width = 12;
        height = 12;
        borderRadius = "50%";
        background = "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(186,230,253,0.3) 70%, transparent 100%)";
        boxShadow = "none";
        filter = "blur(4px)";
      } else {
        // Ice Crystal Gem
        type = "crystal";
        const size = 5 + Math.random() * 6;
        width = size;
        height = size;
        borderRadius = Math.random() > 0.5 ? "2px" : "35%"; // diamond or jagged ice flake
        background = "radial-gradient(circle, #f0f9ff 0%, #bae6fd 60%, #0ea5e9 100%)";
        boxShadow = "0 0 5px rgba(255, 255, 255, 0.8), 0 0 8px rgba(14, 165, 233, 0.6)";
      }

      return {
        id: Math.random() + i,
        type,
        width,
        height,
        tx,
        ty,
        rotation: rotate,
        opacity: 0.85 + Math.random() * 0.15,
        borderRadius,
        background,
        boxShadow,
        filter,
        scale,
      };
    });

    setIceParticles(newParticles);

    setTimeout(() => {
      setIceParticles([]);
    }, 950);
  };

  // Reset selected qty if product stock or remaining stock changes
  useEffect(() => {
    if (isOutOfStock || isCartLimitReached) {
      setSelectedQty(0);
    } else {
      setSelectedQty(1);
    }
  }, [product.stock, isOutOfStock, isCartLimitReached]);

  // Determine dynamic stock badge content and styles
  let badgeText = "";
  let badgeClass = "";

  if (isOutOfStock) {
    badgeText = "Agotado";
    badgeClass = "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20";
  } else if (isCartLimitReached) {
    badgeText = "Límite en Carrito";
    badgeClass = "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20";
  } else if (remainingStock === 1) {
    badgeText = "¡Última unidad disponible!";
    badgeClass = "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-100 dark:border-orange-900/20 animate-pulse";
  } else {
    badgeText = `${remainingStock} Unidades disponibles`;
    badgeClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20";
  }

  // Format price to COP
  const formattedPrice = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(product.precio);

  const handleIncrement = () => {
    if (selectedQty < remainingStock) {
      setSelectedQty((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (selectedQty > 1) {
      setSelectedQty((prev) => prev - 1);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || isCartLimitReached || !onAddToCart) return;
    onAddToCart(product, selectedQty);
    setIsAdded(true);
    setIsShaking(true);
    triggerSprinkles(); // Trigger colorful sprinkles animation
    triggerIceParticles(); // Trigger ice particles effect

    // Trigger vibration/shake on shopping cart icon
    window.dispatchEvent(new CustomEvent("cart-shake"));

    setTimeout(() => {
      setIsAdded(false);
    }, 1500);

    setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  return (
    <motion.div
      ref={cardRef}
      id={`product-card-${product.id}`}
      onClick={handleAddClick}
      animate={isShaking ? {
        scale: [1, 0.96, 1.02, 1],
        rotate: [0, -0.5, 0.5, 0],
      } : {}}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-300 group ${
        isOutOfStock
          ? "border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#121212] shadow-sm"
          : isCartLimitReached
          ? "border border-amber-200/50 dark:border-amber-950/40 bg-[#ffffff] dark:bg-[#121212] shadow-sm"
          : "border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#121212] shadow-md hover:-translate-y-1 hover:scale-[1.005] hover:border-brand-500/50 dark:hover:border-brand-500/40 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] cursor-pointer"
      }`}
    >
      {/* Spotlight Image Container */}
      <div className="relative mb-3 flex aspect-square w-full items-center justify-center overflow-visible bg-transparent transition-all duration-300">
        
        {/* Ice, Cold Frost and Threads ("hilitos") animation layer */}
        <div className="absolute inset-0 pointer-events-none overflow-visible z-30 flex items-center justify-center">
          <AnimatePresence>
            {iceParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute pointer-events-none"
                style={{
                  width: p.width,
                  height: p.height,
                  background: p.background,
                  boxShadow: p.boxShadow,
                  borderRadius: p.borderRadius,
                  filter: p.filter,
                }}
                initial={{ opacity: p.opacity, scale: 0, x: 0, y: 0, rotate: 0 }}
                animate={{
                  opacity: p.type === "vapor" ? [0.1, p.opacity, p.opacity * 0.6, 0] : [p.opacity, 1, 0.4, 0],
                  scale: p.type === "vapor" ? [0.2, p.scale * 2.8, p.scale * 3.5, 0] : [0, p.scale * 1.4, p.scale, 0],
                  x: p.tx,
                  y: p.ty,
                  rotate: p.rotation,
                }}
                transition={{
                  duration: p.type === "vapor" ? 0.95 : 0.8,
                  ease: "easeOut",
                }}
              />
            ))}
          </AnimatePresence>
        </div>
        
        {/* Soft Colorful Spotlight Accent behind image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 dark:opacity-20 group-hover:scale-110 transition-transform duration-700 ease-out">
          <div className="w-2/3 h-2/3 rounded-full bg-radial from-brand-300/60 via-brand-100/10 to-transparent blur-xl" />
        </div>

        {product.imagen && !imageError ? (
          <>
            {/* Real Image */}
            {isIntersecting && (
              <img
                src={product.imagen}
                alt={product.nombre}
                loading="lazy"
                referrerPolicy="no-referrer"
                className={`h-4/5 w-4/5 sm:h-[90%] sm:w-[90%] object-contain transition-all duration-500 ease-out group-hover:scale-108 z-10 ${
                  imageLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-md"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
            {/* Low-res Blur-up Placeholder / Skeleton when image is loading or before intersecting */}
            {(!isIntersecting || !imageLoaded) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
                <div className="w-4/5 h-4/5 sm:h-[90%] sm:w-[90%] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-900/40 dark:to-zinc-800/20 blur-md opacity-70 animate-pulse flex items-center justify-center">
                  <Popsicle className="h-8 w-8 text-slate-300 dark:text-zinc-700 animate-bounce" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-brand-600 dark:text-brand-400 z-10">
            <Popsicle className="h-12 w-12 stroke-[1.25] group-hover:scale-110 transition-transform duration-500" />
            <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold opacity-60">Sabor Artesanal</span>
          </div>
        )}

        {/* Small Elegant Translucent "Agotado" Badge in top-right corner of image */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 z-20 bg-rose-500/90 backdrop-blur-[6px] text-white rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border border-white/20 shadow-md">
            Agotado
          </div>
        )}

        {/* Small Elegant Translucent "Orden" Badge in top-left corner of image */}
        {showOrderBadge && product.orden_manual !== undefined && (
          <div className="absolute top-2 left-2 z-20 bg-indigo-600/90 dark:bg-brand-600/90 backdrop-blur-[6px] text-white rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border border-white/20 shadow-md">
            Orden #{product.orden_manual}
          </div>
        )}

        {/* Floating Sprinkle Particles on add to cart */}
        <AnimatePresence>
          {sprinkles.map((sprinkle) => (
            <motion.div
              key={sprinkle.id}
              className="absolute pointer-events-none z-30"
              style={{
                left: `${sprinkle.left}%`,
                top: `${sprinkle.top}%`,
                width: sprinkle.width,
                height: sprinkle.height,
                backgroundColor: sprinkle.color,
                borderRadius: sprinkle.borderRadius,
              }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, sprinkle.scale, sprinkle.scale, 0],
                x: sprinkle.tx,
                y: sprinkle.ty,
                rotate: sprinkle.rotate,
              }}
              transition={{
                duration: 0.85,
                ease: "easeOut",
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-start gap-2">
        <div>
          {/* Availability tags */}
          {(badgeText || product.reserved || (cartQty > 0 && !isCartLimitReached)) && (
            <div className="mb-2 flex flex-wrap gap-1.5 items-center">
              {badgeText && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                  {!isOutOfStock && !isCartLimitReached && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}
                  <span>{badgeText}</span>
                </span>
              )}

              {product.reserved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider border border-amber-100/50">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                  <span>Reservado</span>
                </span>
              )}

              {cartQty > 0 && !isCartLimitReached && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider border border-indigo-100/55">
                  <span className="flex items-center gap-1">
                    Llevas: <AnimatedCounter value={cartQty} className="font-extrabold font-mono text-indigo-700 dark:text-indigo-400" />
                  </span>
                </span>
              )}
            </div>
          )}

          <h3 className="font-sans text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug line-clamp-2 min-h-[2.5rem] flex items-center">
            {product.nombre}
          </h3>
        </div>

        {/* Interactive Quantity Selector with springy animation feedback */}
        {!isOutOfStock && !isCartLimitReached && !catalogModeEnabled && (
          <div className="flex items-center justify-between border border-slate-100 dark:border-zinc-800 rounded-lg p-0.5 md:p-1 bg-slate-50/50 dark:bg-zinc-950/20 text-[10px]">
            <span className="font-black uppercase tracking-wider text-slate-400 dark:text-zinc-550 pl-1.5 truncate">Uds</span>
            <div className="flex items-center gap-0.5 md:gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDecrement(); }}
                disabled={selectedQty <= 1}
                className="h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-md border border-slate-100 dark:border-zinc-800/80 text-gray-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 cursor-pointer"
              >
                <Minus className="h-2.5 w-2.5 md:h-3 md:w-3" />
              </button>
              <span className="w-5 md:w-6 text-center font-black font-mono text-gray-800 dark:text-white flex justify-center items-center">
                <AnimatedCounter value={selectedQty} className="font-black font-mono text-gray-800 dark:text-white" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleIncrement(); }}
                disabled={selectedQty >= remainingStock}
                className="h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-md border border-slate-100 dark:border-zinc-800/80 text-gray-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5 md:h-3 md:w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Action Row - Pricing & Add to Cart (PC-friendly compact buttons) */}
        <div className={`flex items-center justify-between pt-3 mt-auto border-t border-slate-100/80 dark:border-zinc-800/50 gap-2 ${!isOutOfStock && !isCartLimitReached && !catalogModeEnabled ? "" : "mt-0"}`}>
          <div className="flex flex-col">
            <span className="font-black text-base sm:text-lg text-gray-900 dark:text-white tracking-tight leading-none">
              {formattedPrice}
              <span className="text-[9px] text-brand-600 dark:text-brand-400 font-black ml-1 uppercase font-mono">COP</span>
            </span>
          </div>
          
          {/* State-based UI instead of one big nested button */}
          {catalogModeEnabled ? (
            <div className="flex items-center justify-center gap-1 md:gap-1.5 transition-all duration-300 font-extrabold uppercase tracking-wider text-[9px] md:text-[10px] shrink-0 w-8 h-8 rounded-lg md:h-9 md:w-auto md:px-3 md:rounded-lg bg-slate-50 text-slate-400 border border-slate-150 dark:bg-zinc-900/50 dark:text-zinc-650 dark:border-zinc-800/30">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="hidden md:inline">Catálogo</span>
            </div>
          ) : isOutOfStock ? (
            <div className="relative">
              <button
                id={`btn-add-cart-${product.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoStockMessage(true);
                  setTimeout(() => setShowNoStockMessage(false), 2000);
                }}
                className="flex items-center justify-center gap-1 md:gap-1.5 transition-all duration-300 font-extrabold uppercase tracking-wider text-[9px] md:text-[10px] cursor-pointer shrink-0 
                  w-8 h-8 rounded-lg md:h-9 md:w-auto md:px-3 md:rounded-lg bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30"
                title="Agotado"
              >
                <motion.div 
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <Frown className="h-3.5 w-3.5 shrink-0 text-rose-500 dark:text-rose-400 stroke-[2]" />
                </motion.div>
                <span className="hidden md:inline">Agotado</span>
              </button>
              {showNoStockMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-rose-500/90 backdrop-blur-sm text-white text-[9px] rounded-md shadow-lg whitespace-nowrap z-50"
                >
                  ¡Estamos reabasteciendo!
                </motion.div>
              )}
            </div>
          ) : isCartLimitReached ? (
            <div className="flex items-center justify-center gap-1 md:gap-1.5 transition-all duration-300 font-extrabold uppercase tracking-wider text-[9px] md:text-[10px] shrink-0 w-8 h-8 rounded-lg md:h-9 md:w-auto md:px-3 md:rounded-lg bg-slate-50 text-slate-400 border border-slate-150 dark:bg-zinc-900/50 dark:text-zinc-650 dark:border-zinc-800/30">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="hidden md:inline">Límite</span>
            </div>
          ) : (
            <motion.button
              id={`btn-add-cart-${product.id}`}
              onClick={handleAddClick}
              animate={isShaking ? {
                x: [0, -3, 3, -3, 3, -1.5, 1.5, 0],
                y: [0, -1.5, 1.5, -1.5, 1.5, -1, 1, 0],
                rotate: [0, -1, 1, -1, 1, -0.5, 0.5, 0]
              } : {}}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className={`relative overflow-visible flex items-center justify-center gap-1 md:gap-1.5 transition-all duration-300 font-extrabold uppercase tracking-wider text-[9px] md:text-[10px] cursor-pointer shrink-0 
                w-8 h-8 rounded-lg md:h-9 md:w-auto md:px-3 md:rounded-lg ${
                  isAdded
                    ? "bg-emerald-600 text-white shadow-sm scale-95"
                    : "bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-sm dark:bg-brand-600 dark:hover:bg-brand-500 hover:shadow-md"
                }`}
              title="Agregar pedido"
            >
              {isAdded ? (
                <>
                  <Check className="h-3.5 w-3.5 shrink-0 text-white animate-bounce" />
                  <span className="hidden md:inline">Listo</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-white" />
                  <span className="hidden md:inline">Llevar</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
