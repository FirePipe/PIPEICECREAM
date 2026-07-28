import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Activity,
  RefreshCw,
  Filter,
  Calendar,
  Package,
  Clock,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
} from "lucide-react";

interface AdminInventoryMovementsTabProps {
  contrasenaAdmin: string;
  setConfirmModal: (modal: any) => void;
  setAlertModal: (modal: any) => void;
}

export const AdminInventoryMovementsTab: React.FC<AdminInventoryMovementsTabProps> = ({
  contrasenaAdmin,
  setConfirmModal,
  setAlertModal,
}) => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterTipo, setFilterTipo] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortOrder, setSortOrder] = useState<"reciente" | "antiguo">("reciente");
  const [totalMovements, setTotalMovements] = useState(0);

  const totalPages = Math.ceil(totalMovements / rowsPerPage) || 1;

  const fetchMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        tipo: filterTipo,
        sort: sortOrder,
      });

      const res = await fetch(`/api/admin/inventory-movements?${params.toString()}`, {
        headers: {
          "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
        },
      });

      if (!res.ok) {
        throw new Error("Error al obtener el historial de movimientos de inventario");
      }

      const data = await res.json();
      setMovements(data.movements || []);
      setTotalMovements(data.total || 0);
    } catch (err: any) {
      console.error("Error fetching inventory movements:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
    const interval = setInterval(fetchMovements, 6000);
    return () => clearInterval(interval);
  }, [page, rowsPerPage, filterTipo, sortOrder]);

  // Client-side filtering for product search
  const filteredMovements = movements.filter((m) => {
    if (!searchProduct) return true;
    const term = searchProduct.toLowerCase();
    return (
      m.product_nombre?.toLowerCase().includes(term) ||
      m.product_id?.toLowerCase().includes(term) ||
      m.motivo?.toLowerCase().includes(term)
    );
  });

  const handleClearMovements = () => {
    setConfirmModal({
      isOpen: true,
      title: "¿Vaciar Historial de Movimientos?",
      message: "Esta acción eliminará permanentemente todos los registros históricos de movimientos de stock. ¿Está seguro de vaciar el historial?",
      confirmText: "Vaciar Historial",
      confirmVariant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/admin/inventory-movements/clear", {
            method: "POST",
            headers: {
              "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
            },
          });
          if (res.ok) {
            setAlertModal({
              isOpen: true,
              title: "Historial Vaciado",
              message: "Se ha limpiado el registro de movimientos de inventario.",
              variant: "success",
            });
            fetchMovements();
          } else {
            const errData = await res.json().catch(() => ({}));
            setAlertModal({
              isOpen: true,
              title: "Error al Vaciar",
              message: errData.message || "No se pudo limpiar el historial de movimientos de inventario.",
              variant: "warning",
            });
          }
        } catch (err: any) {
          console.error(err);
          setAlertModal({
            isOpen: true,
            title: "Error de Conexión",
            message: err.message || "No se pudo completar la solicitud de vaciado de historial.",
            variant: "warning",
          });
        }
      },
    });
  };

  const getBadgeStyle = (tipo: string) => {
    switch (tipo) {
      case "venta":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40";
      case "reversion_cancelacion":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40";
      case "ajuste_manual":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
      case "reposicion":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40";
      case "creacion_producto":
      case "creacion":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const formatTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "venta": return "Venta de Producto";
      case "reversion_cancelacion": return "Reversión por Cancelación";
      case "ajuste_manual": return "Ajuste Manual";
      case "reposicion": return "Reposición de Stock";
      case "creacion_producto": return "Creación de Sabor";
      case "eliminacion_producto": return "Eliminación de Sabor";
      default: return tipo;
    }
  };

  return (
    <motion.div
      key="tab-movimientos"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6 w-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h3 className="font-sans text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Historial de Movimientos de Inventario
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
            Trazabilidad completa de cada entrada, salida, venta, ajuste manual y reversión de stock por cancelación de órdenes en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMovements}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Actualizando..." : "Actualizar"}</span>
          </button>

          <button
            onClick={handleClearMovements}
            disabled={loading || (movements.length === 0 && totalMovements === 0)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 text-[10px] font-bold uppercase tracking-wider border border-rose-100 dark:border-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            <span>Vaciar Historial</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">
            Buscar Producto / Motivo
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ej. Queso, Orden, Ajuste..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">
            Filtrar por Tipo de Movimiento
          </label>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          >
            <option value="">Todos los movimientos</option>
            <option value="venta">Venta de Producto</option>
            <option value="reversion_cancelacion">Reversión por Cancelación</option>
            <option value="ajuste_manual">Ajuste Manual</option>
            <option value="reposicion">Reposición de Stock</option>
            <option value="creacion_producto">Creación de Sabor</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">
            Orden Cronológico
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          >
            <option value="reciente">Más recientes primero</option>
            <option value="antiguo">Más antiguos primero</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-xs text-rose-500 font-medium">{error}</p>
            <button
              onClick={fetchMovements}
              className="mt-3 px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs rounded-xl hover:bg-slate-200"
            >
              Reintentar
            </button>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-10 w-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3 animate-bounce" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No se encontraron movimientos de inventario</p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              Las ventas, cancelaciones con devolución de stock y ajustes manuales se registrarán automáticamente aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-950/50">
                  <th className="py-3 px-4 font-bold">Fecha / Hora</th>
                  <th className="py-3 px-4 font-bold">Producto</th>
                  <th className="py-3 px-4 font-bold">Tipo</th>
                  <th className="py-3 px-4 font-bold text-center">Cambio</th>
                  <th className="py-3 px-4 font-bold text-center">Stock (Ant. ➔ Nuevo)</th>
                  <th className="py-3 px-4 font-bold">Motivo / Detalle</th>
                  <th className="py-3 px-4 font-bold">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
                {filteredMovements.map((mov) => {
                  const isPositive = mov.cantidad_cambio > 0;
                  return (
                    <tr
                      key={mov.id || Math.random()}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{mov.fecha}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{mov.hora}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {mov.product_nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                          ID: {mov.product_id}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getBadgeStyle(mov.tipo_movimiento)}`}>
                          {formatTipoLabel(mov.tipo_movimiento)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs ${
                          isPositive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                        }`}>
                          {isPositive ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {isPositive ? `+${mov.cantidad_cambio}` : mov.cantidad_cambio}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                        <span className="text-slate-500 dark:text-zinc-400">{mov.stock_anterior}</span>
                        <span className="mx-1.5 text-slate-300 dark:text-zinc-600">➔</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{mov.stock_nuevo}</span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-slate-600 dark:text-zinc-300 text-[11px] leading-snug max-w-xs truncate" title={mov.motivo}>
                          {mov.motivo || "Sin motivo especificado"}
                        </p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">
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

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 text-xs">
            <span className="text-slate-500 dark:text-zinc-400">
              Mostrando página <strong className="text-slate-800 dark:text-slate-200">{page}</strong> de <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalMovements} registros en total)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
