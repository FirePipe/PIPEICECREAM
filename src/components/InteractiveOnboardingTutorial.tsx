import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Search, 
  IceCream, 
  ShoppingCart, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Smartphone, 
  Calculator, 
  Plus, 
  Minus,
  Check
} from "lucide-react";

interface InteractiveOnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  whatsappNumber?: string;
}

export const InteractiveOnboardingTutorial: React.FC<InteractiveOnboardingTutorialProps> = React.memo(({
  isOpen,
  onClose,
  shopName = "PIPE ICE CREAM",
  whatsappNumber = "3184754263"
}) => {
  const [step, setStep] = useState(0);
  
  // Interactive State for Step 1
  const [sampleCartCount, setSampleCartCount] = useState(1);
  const [sampleAdded, setSampleAdded] = useState(false);

  // Interactive State for Step 2
  const [sampleFilter, setSampleFilter] = useState<"todos" | "disponibles" | "agotados">("todos");

  // Interactive State for Step 3
  const [cashBill, setCashBill] = useState(20000);
  const sampleOrderTotal = 12000;

  if (!isOpen) return null;

  const stepsCount = 5;

  const sampleFlavors = [
    { id: "1", name: "Arequipe Cremosito", price: 4000, stock: 12, tag: "Popular" },
    { id: "2", name: "Maracuyá Artesanal", price: 4500, stock: 5, tag: "Cítrico" },
    { id: "3", name: "Vainilla Clásica", price: 3800, stock: 0, tag: "Agotado" }
  ];

  const filteredFlavors = sampleFlavors.filter((f) => {
    if (sampleFilter === "disponibles") return f.stock > 0;
    if (sampleFilter === "agotados") return f.stock === 0;
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 max-w-lg w-full shadow-2xl p-5 sm:p-7 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-wider">
                Guía Rápida • Paso {step + 1} de {stepsCount}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Omitir e ir a la tienda"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step Content Wrapper with AnimatePresence */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 0: BIENVENIDA E INTERACCIÓN CON PRODUCTO */}
              {step === 0 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-inner">
                    <Sparkles className="h-8 w-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      👋 ¡Bienvenido a {shopName}!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Descubre lo fácil e interactivo que es seleccionar tus helados favoritos y armar tu pedido en segundos.
                    </p>
                  </div>

                  {/* Dynamic Micro-Task Demo */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Probar Interacción:
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-full">
                        <ShoppingCart className="h-3 w-3" />
                        <span>Carrito: {sampleCartCount}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
                          🍧
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">Helado de Mantecado</h4>
                          <p className="text-[10px] text-slate-400 font-mono">$4.000 / copa</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSampleCartCount((prev) => prev + 1);
                          setSampleAdded(true);
                          setTimeout(() => setSampleAdded(false), 1200);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                      >
                        {sampleAdded ? <Check className="h-3 w-3 text-white" /> : <Plus className="h-3 w-3" />}
                        <span>{sampleAdded ? "¡Añadido!" : "Agregar"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: BÚSQUEDA Y FILTRADO */}
              {step === 1 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20 shadow-inner">
                    <Search className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      🔍 Filtra y Busca en Tiempo Real
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Prueba pulsar los filtros interactivos a continuación para ver cómo se actualiza el menú al instante.
                    </p>
                  </div>

                  {/* Interactive Filter Demo */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                    <div className="flex gap-1.5 justify-center">
                      {(["todos", "disponibles", "agotados"] as const).map((filterKey) => (
                        <button
                          key={filterKey}
                          onClick={() => setSampleFilter(filterKey)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            sampleFilter === filterKey
                              ? "bg-brand-600 text-white shadow-sm"
                              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800"
                          }`}
                        >
                          {filterKey}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5 text-left">
                      {filteredFlavors.map((f) => (
                        <div 
                          key={f.id} 
                          className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200">{f.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            f.stock > 0 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}>
                            {f.stock > 0 ? `${f.stock} disp.` : "Agotado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CÁLCULO DE PAGO Y VUELTOS */}
              {step === 2 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <Calculator className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      💳 Pagos Flexibles y Vueltos exactos
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Aceptamos transferencias Nequi/BRE-B y pago en efectivo. Si pagas con billete, el sistema calcula tu devuelto automáticamente.
                    </p>
                  </div>

                  {/* Interactive Cash Change Calculator Demo */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 text-left space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Total Pedido Ejemplo:</span>
                      <span className="font-bold font-mono text-slate-800 dark:text-white">$12.000</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Seleccionar Billetes en Efectivo:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[15000, 20000, 50000].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setCashBill(amount)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                              cashBill === amount 
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                                : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800"
                            }`}
                          >
                            ${amount.toLocaleString("es-CO")}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="font-bold">⚡ Vueltos a entregar:</span>
                      <span className="font-mono font-black text-sm">
                        ${Math.max(0, cashBill - sampleOrderTotal).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ENVÍO DIRECTO A WHATSAPP */}
              {step === 3 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      📲 Confirmación Instantánea por WhatsApp
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Al confirmar tu pedido, se genera un comprobante con número de orden que se envía directamente a nuestro WhatsApp oficial.
                    </p>
                  </div>

                  {/* Sample Ticket Preview */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-left font-mono text-[11px] space-y-2 border border-slate-800 shadow-inner">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-emerald-400 font-bold">📋 ORDEN #1024</span>
                      <span className="text-slate-400">{shopName}</span>
                    </div>
                    <div className="text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span>• 2x Helado Mantecado</span>
                        <span>$8.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• 1x Maracuyá Cítrico</span>
                        <span>$4.500</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-xs">
                      <span>TOTAL ESTIMADO:</span>
                      <span className="text-brand-400">$12.500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: RESUMEN Y FINALIZACIÓN */}
              {step === 4 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      🚀 ¡Todo Listo para Pedir!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Ya conoces el funcionamiento completo de la plataforma. Guarda tus sabores favoritos y realiza tus compras en cualquier momento.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-left space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Sincronizado y respaldado en la nube</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Cálculo automático de vueltos y stock en tiempo real</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="mt-6 flex gap-1.5 justify-center">
            {Array.from({ length: stepsCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === step 
                    ? "w-6 bg-brand-600 dark:bg-brand-500" 
                    : "w-1.5 bg-slate-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
            >
              Omitir
            </button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev - 1)}
                  className="px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Atrás</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (step < stepsCount - 1) {
                    setStep((prev) => prev + 1);
                  } else {
                    onClose();
                  }
                }}
                className="px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all flex items-center gap-1 active:scale-95"
              >
                <span>{step === stepsCount - 1 ? "¡Empezar a Explorar!" : "Siguiente"}</span>
                {step < stepsCount - 1 && <ArrowRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

InteractiveOnboardingTutorial.displayName = "InteractiveOnboardingTutorial";
