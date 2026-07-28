import React, { useState } from "react";
import { 
  Settings, Store, Lock, Key, CreditCard, Phone, UserCheck, 
  Clock, CloudSun, ArrowUpDown, Database, RefreshCw, Trash2, 
  Sparkles, ShieldCheck, Eye, EyeOff, Save, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShopConfig } from "../types";

interface SettingsPanelProps {
  shopConfig: ShopConfig;
  contrasenaAdmin: string;
  setContrasenaAdmin: (val: string) => void;
  tiendaNombre: string;
  setTiendaNombre: (val: string) => void;
  metodoOrdenar: string;
  setMetodoOrdenar: (val: string) => void;
  cuentaNumero: string;
  setCuentaNumero: (val: string) => void;
  cuentaTitular: string;
  setCuentaTitular: (val: string) => void;
  whatsappNumero: string;
  setWhatsappNumero: (val: string) => void;
  mostrarReloj: boolean;
  setMostrarReloj: (val: boolean) => void;
  mostrarClima: boolean;
  setMostrarClima: (val: boolean) => void;
  catalogSortOrder: "manual" | "stock_desc" | "stock_asc" | "alphabetical";
  setCatalogSortOrder: (val: "manual" | "stock_desc" | "stock_asc" | "alphabetical") => void;
  catalogModeEnabled: boolean;
  setCatalogModeEnabled: (val: boolean) => void;
  catalogModeMessage: string;
  setCatalogModeMessage: (val: string) => void;
  hideOutOfStock: boolean;
  setHideOutOfStock: (val: boolean) => void;
  onSaveSettings: (e: React.FormEvent) => void;
  settingsSuccess: string;
  isSyncing: boolean;
  onForceSync: () => Promise<void>;
  onResetSales: () => void;
  onClearCache: () => void;
  onUpdateConfig: (cfg: ShopConfig) => void;
}

type SettingsCategory = "general" | "recaudo" | "apariencia" | "catalogo" | "mantenimiento";

export const SettingsPanel: React.FC<SettingsPanelProps> = React.memo(({
  shopConfig,
  contrasenaAdmin,
  setContrasenaAdmin,
  tiendaNombre,
  setTiendaNombre,
  metodoOrdenar,
  setMetodoOrdenar,
  cuentaNumero,
  setCuentaNumero,
  cuentaTitular,
  setCuentaTitular,
  whatsappNumero,
  setWhatsappNumero,
  mostrarReloj,
  setMostrarReloj,
  mostrarClima,
  setMostrarClima,
  catalogSortOrder,
  setCatalogSortOrder,
  catalogModeEnabled,
  setCatalogModeEnabled,
  catalogModeMessage,
  setCatalogModeMessage,
  hideOutOfStock,
  setHideOutOfStock,
  onSaveSettings,
  settingsSuccess,
  isSyncing,
  onForceSync,
  onResetSales,
  onClearCache,
  onUpdateConfig
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");
  const [showPassword, setShowPassword] = useState(false);

  const categories = [
    { id: "general", label: "General & Marca", icon: Store, desc: "Nombre de tienda y clave de acceso" },
    { id: "recaudo", label: "Recaudo & Contacto", icon: CreditCard, desc: "Nequi, titular y WhatsApp" },
    { id: "apariencia", label: "Apariencia & Widgets", icon: CloudSun, desc: "Reloj, clima y personalización" },
    { id: "catalogo", label: "Catálogo & Filtros", icon: ArrowUpDown, desc: "Orden de productos y existencias" },
    { id: "mantenimiento", label: "Cloud & Mantenimiento", icon: Database, desc: "Sincronización y modo catálogo" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="w-full bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm"
    >
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-sans text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500 animate-spin" style={{ animationDuration: "14s" }} />
            Centro de Configuración y Ajustes
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
            Personaliza la marca, canales de cobro, apariencia pública y opciones de sincronización.
          </p>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-zinc-800">
          <span className={`h-2 w-2 rounded-full ${shopConfig?.syncEnabled !== false ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-zinc-300">
            {shopConfig?.syncEnabled !== false ? "Nube Activa" : "Modo Offline"}
          </span>
        </div>
      </div>

      <form onSubmit={onSaveSettings} className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Left Category Selector */}
        <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as SettingsCategory)}
                className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/20 font-bold"
                    : "bg-slate-50/80 dark:bg-zinc-950/40 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 border border-slate-100 dark:border-zinc-800/60"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="hidden lg:block min-w-0">
                  <span className="text-xs font-bold block truncate">{cat.label}</span>
                  <span className={`text-[10px] block truncate ${isActive ? "text-white/80" : "text-slate-400 dark:text-zinc-500"}`}>
                    {cat.desc}
                  </span>
                </div>
                <span className="block lg:hidden text-xs font-bold truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {/* CATEGORY 1: GENERAL & MARCA */}
            {activeCategory === "general" && (
              <motion.div
                key="cat-general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <Store className="h-4 w-4 text-brand-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Identidad de la Tienda
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Nombre Comercial
                      </label>
                      <input
                        type="text"
                        required
                        value={tiendaNombre || ""}
                        onChange={(e) => setTiendaNombre(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all font-semibold"
                        placeholder="Ej: PIPE ICE CREAM"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Slogan / Texto Cabecera
                      </label>
                      <input
                        type="text"
                        required
                        value={metodoOrdenar || ""}
                        onChange={(e) => setMetodoOrdenar(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all"
                        placeholder="Ej: SABOR QUE REFRESCA TU DIA"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <Lock className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Seguridad & Acceso Administrador
                    </h4>
                  </div>

                  <div className="max-w-md">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                      Contraseña de Administración
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={contrasenaAdmin || ""}
                        onChange={(e) => setContrasenaAdmin(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                      Protege el panel de ventas, inventario y configuración.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CATEGORY 2: RECAUDO & CONTACTO */}
            {activeCategory === "recaudo" && (
              <motion.div
                key="cat-recaudo"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Datos de Transferencia (BRE-B / Nequi)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Número de Cuenta / Nequi
                      </label>
                      <input
                        type="text"
                        required
                        value={cuentaNumero || ""}
                        onChange={(e) => setCuentaNumero(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Titular de la Cuenta
                      </label>
                      <input
                        type="text"
                        required
                        value={cuentaTitular || ""}
                        onChange={(e) => setCuentaTitular(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <Phone className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Canal Directo de Pedidos
                    </h4>
                  </div>

                  <div className="max-w-md">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                      Número WhatsApp para Pedidos
                    </label>
                    <input
                      type="text"
                      required
                      value={whatsappNumero || ""}
                      onChange={(e) => setWhatsappNumero(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                      Los clientes redirigirán su comprobante de pedido a este número.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CATEGORY 3: APARIENCIA & WIDGETS */}
            {activeCategory === "apariencia" && (
              <motion.div
                key="cat-apariencia"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <CloudSun className="h-4 w-4 text-sky-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Widgets de la Barra Superior
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setMostrarReloj(!mostrarReloj)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        mostrarReloj 
                          ? "bg-brand-500/10 border-brand-500/30 text-brand-900 dark:text-brand-300" 
                          : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${mostrarReloj ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"}`}>
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block">Reloj Digital</strong>
                          <span className="text-[10px] opacity-75">Hora exacta en vivo</span>
                        </div>
                      </div>
                      <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-all ${mostrarReloj ? "bg-brand-600 justify-end" : "bg-slate-300 dark:bg-zinc-700 justify-start"}`}>
                        <div className="bg-white w-3.5 h-3.5 rounded-full shadow-xs" />
                      </div>
                    </div>

                    <div
                      onClick={() => setMostrarClima(!mostrarClima)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        mostrarClima 
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-300" 
                          : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${mostrarClima ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"}`}>
                          <CloudSun className="h-4 w-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block">Clima Local</strong>
                          <span className="text-[10px] opacity-75">Pronóstico en Cali, CO</span>
                        </div>
                      </div>
                      <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-all ${mostrarClima ? "bg-sky-500 justify-end" : "bg-slate-300 dark:bg-zinc-700 justify-start"}`}>
                        <div className="bg-white w-3.5 h-3.5 rounded-full shadow-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CATEGORY 4: CATÁLOGO & FILTROS */}
            {activeCategory === "catalogo" && (
              <motion.div
                key="cat-catalogo"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <ArrowUpDown className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ordenamiento del Menú Público
                    </h4>
                  </div>

                  <div className="max-w-md">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                      Criterio de Exposición
                    </label>
                    <select
                      value={catalogSortOrder}
                      onChange={(e) => setCatalogSortOrder(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-semibold"
                    >
                      <option value="manual">Manual (Personalizado en Admin)</option>
                      <option value="stock_desc">Mayor Stock (Existencias altas primero)</option>
                      <option value="stock_asc">Menor Stock (Por agotarse primero)</option>
                      <option value="alphabetical">Por Sabor (A-Z alfabético)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <strong className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                        Ocultar Productos Agotados
                      </strong>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        Oculta de forma limpia los helados sin stock para mantener un menú enfocado en lo disponible.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={hideOutOfStock}
                        onChange={(e) => setHideOutOfStock(e.target.checked)}
                      />
                      <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CATEGORY 5: CLOUD & MANTENIMIENTO */}
            {activeCategory === "mantenimiento" && (
              <motion.div
                key="cat-mantenimiento"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                {/* Cloud Sync State */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className={`text-xs font-extrabold block ${shopConfig?.syncEnabled !== false ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {shopConfig?.syncEnabled !== false ? "SISTEMA EN LÍNEA (Sincronizado)" : "SISTEMA EN MODO OFFLINE"}
                      </span>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        Permite o suspende la sincronización automática de pedidos y productos en tiempo real.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={shopConfig?.syncEnabled !== false}
                        onChange={(e) => onUpdateConfig({ ...(shopConfig || {} as any), syncEnabled: e.target.checked })}
                      />
                      <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <strong className={`text-xs font-extrabold block ${catalogModeEnabled ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"}`}>
                        MODO SÓLO CATÁLOGO (Mantenimiento)
                      </strong>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        Desactiva temporalmente la opción de agregar productos al carrito.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={catalogModeEnabled}
                        onChange={(e) => setCatalogModeEnabled(e.target.checked)}
                      />
                      <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {catalogModeEnabled && (
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                        Mensaje Público de Mantenimiento
                      </label>
                      <textarea
                        rows={2}
                        value={catalogModeMessage}
                        onChange={(e) => setCatalogModeMessage(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        placeholder="Ej: Mantenimiento programado..."
                      />
                    </div>
                  )}
                </div>

                {/* System Maintenance Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={onForceSync}
                    disabled={isSyncing}
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Forzar Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetSales}
                    className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border border-amber-200 dark:border-amber-900/40"
                  >
                    <RotateCcwIcon className="h-3.5 w-3.5" />
                    <span>Resetear Ventas</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClearCache}
                    className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border border-rose-200 dark:border-rose-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Limpiar Caché</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Save Row */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="min-h-[20px]">
              {settingsSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                  <CheckCircle2 className="h-4 w-4" />
                  {settingsSuccess}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
});

const RotateCcwIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

SettingsPanel.displayName = "SettingsPanel";
