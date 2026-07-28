import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  History,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertCircle
} from "lucide-react";
import { Product } from "../types";

interface ProductStockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  contrasenaAdmin: string;
}

export const ProductStockHistoryModal: React.FC<ProductStockHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
  contrasenaAdmin,
}) => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"todos" | "entradas" | "salidas" | "ventas" | "ajustes">("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProductMovements = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: "200",
        sort: "reciente",
      });

      const res = await fetch(`/api/admin/inventory-movements?${params.toString()}`, {
        headers: {
          "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
        },
      });

      if (!res.ok) {
        throw new Error("Error al obtener movimientos de inventario");
      }

      const data = await res.json();
      const allMovs: any[] = data.movements || [];
      // Filter specifically for this product ID or name
      const productMovs = allMovs.filter(
        (m) =>
          String(m.product_id) === String(product.id) ||
          m.product_nombre?.toLowerCase() === product.nombre.toLowerCase()
      );
      setMovements(productMovs);
    } catch (err: any) {
      console.error("Error fetching product stock history:", err);
      setError(err.message || "Error al cargar historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      fetchProductMovements();
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  // Filtered movements
  const filteredMovements = movements.filter((m) => {
    const isEntry = m.cantidad_cambio > 0;
    const isExit = m.cantidad_cambio < 0;

    if (filterType === "entradas" && !isEntry) return false;
    if (filterType === "salidas" && !isExit) return false;
    if (filterType === "ventas" && m.tipo_movimiento !== "venta") return false;
    if (
      filterType === "ajustes" &&
      m.tipo_movimiento !== "ajuste_manual" &&
      m.tipo_movimiento !== "reposicion"
    )
      return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMotivo = m.motivo?.toLowerCase().includes(term);
      const matchTipo = m.tipo_movimiento?.toLowerCase().includes(term);
      const matchResp = m.responsable?.toLowerCase().includes(term);
      return matchMotivo || matchTipo || matchResp;
    }

    return true;
  });

  // Calculate stats
  const totalEntradas = movements
    .filter((m) => m.cantidad_cambio > 0)
    .reduce((sum, m) => sum + m.cantidad_cambio, 0);

  const totalSalidas = Math.abs(
    movements
      .filter((m) => m.cantidad_cambio < 0)
      .reduce((sum, m) => sum + m.cantidad_cambio, 0)
  );

  const formatTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "venta":
        return "Venta Realizada";
      case "reversion_cancelacion":
        return "Reversión (Cancelación)";
      case "ajuste_manual":
        return "Ajuste Manual";
      case "reposicion":
        return "Reposición de Stock";
      case "creacion_producto":
      case "creacion":
        return "Sabor Creado";
      default:
        return tipo;
    }
  };

  const getBadgeStyle = (tipo: string) => {
    switch (tipo) {
      case "venta":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50";
      case "reversion_cancelacion":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50";
      case "ajuste_manual":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50";
      case "reposicion":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50">
            <div className="flex items-center gap-3">
              {product.imagen ? (
                <img
                  src={product.imagen}
                  alt={product.nombre}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-zinc-700 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
                  🍧
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {product.nombre}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                    ID: {product.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mt-0.5">
                  <History className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Historial de entradas y salidas de stock</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Key Metrics Header Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
            <div className="bg-slate-50 dark:bg-zinc-950/80 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                <Package className="h-3 w-3 text-indigo-500" /> Stock Actual
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-slate-800 dark:text-white mt-0.5">
                {product.stock} <span className="text-xs font-normal text-slate-400">unid.</span>
              </span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Total Entradas
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                +{totalEntradas} <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-400/70">unid.</span>
              </span>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Total Salidas
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-rose-700 dark:text-rose-300 mt-0.5">
                -{totalSalidas} <span className="text-xs font-normal text-rose-600/70 dark:text-rose-400/70">unid.</span>
              </span>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="p-3 sm:p-4 bg-slate-50/30 dark:bg-zinc-950/30 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(
                [
                  { id: "todos", label: "Todos", count: movements.length },
                  { id: "entradas", label: "Entradas (+)", count: movements.filter((m) => m.cantidad_cambio > 0).length },
                  { id: "salidas", label: "Salidas (-)", count: movements.filter((m) => m.cantidad_cambio < 0).length },
                  { id: "ventas", label: "Ventas", count: movements.filter((m) => m.tipo_movimiento === "venta").length },
                  { id: "ajustes", label: "Ajustes", count: movements.filter((m) => m.tipo_movimiento === "ajuste_manual" || m.tipo_movimiento === "reposicion").length },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterType === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      filterType === tab.id
                        ? "bg-indigo-700 text-white"
                        : "bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar motivo u orden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <button
                onClick={fetchProductMovements}
                disabled={loading}
                className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                title="Actualizar historial"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {error ? (
              <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                <p className="text-xs text-rose-700 dark:text-rose-300 font-bold">{error}</p>
                <button
                  onClick={fetchProductMovements}
                  className="mt-3 px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-rose-700"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="py-12 text-center">
                <Layers className="h-10 w-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No hay registros de movimientos
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto mt-1">
                  Las ventas, reposiciones y ajustes manuales correspondientes a{" "}
                  <strong>{product.nombre}</strong> se guardarán automáticamente en este registro.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-950/60">
                      <th className="py-2.5 px-3 font-bold">Fecha / Hora</th>
                      <th className="py-2.5 px-3 font-bold">Tipo</th>
                      <th className="py-2.5 px-3 font-bold text-center">Movimiento</th>
                      <th className="py-2.5 px-3 font-bold text-center">Stock (Ant. ➔ Nuevo)</th>
                      <th className="py-2.5 px-3 font-bold">Motivo / Detalle</th>
                      <th className="py-2.5 px-3 font-bold">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
                    {filteredMovements.map((mov, idx) => {
                      const isPositive = mov.cantidad_cambio > 0;
                      return (
                        <tr
                          key={mov.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{mov.fecha}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{mov.hora}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle(
                                mov.tipo_movimiento
                              )}`}
                            >
                              {formatTipoLabel(mov.tipo_movimiento)}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs ${
                                isPositive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowDownLeft className="h-3 w-3" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3" />
                              )}
                              {isPositive ? `+${mov.cantidad_cambio}` : mov.cantidad_cambio}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono">
                            <span className="text-slate-400 dark:text-zinc-500">
                              {mov.stock_anterior}
                            </span>
                            <span className="mx-1 text-slate-300 dark:text-zinc-600">➔</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {mov.stock_nuevo}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <p
                              className="text-slate-600 dark:text-zinc-300 text-[11px] leading-snug max-w-xs truncate"
                              title={mov.motivo}
                            >
                              {mov.motivo || "Sin motivo registrado"}
                            </p>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">
                              {mov.responsable || "sistema"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-slate-50/50 dark:bg-zinc-950/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Mostrando {filteredMovements.length} de {movements.length} movimientos
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-white transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
