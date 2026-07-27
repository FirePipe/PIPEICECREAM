import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Lock,
  RefreshCw,
  Database,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AuditLogItemRow } from "./AuditLogItemRow";

interface AdminAuditoriaTabProps {
  contrasenaAdmin: string;
  setConfirmModal: (modal: any) => void;
  setAlertModal: (modal: any) => void;
}

export const AdminAuditoriaTab: React.FC<AdminAuditoriaTabProps> = ({
  contrasenaAdmin,
  setConfirmModal,
  setAlertModal,
}) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [auditFilterResponsable, setAuditFilterResponsable] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditRowsPerPage, setAuditRowsPerPage] = useState(20);
  const [auditSortOrder, setAuditSortOrder] = useState<"reciente" | "antiguo">("reciente");
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);

  const totalAuditPages = Math.ceil(totalAuditLogs / auditRowsPerPage) || 1;

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    setAuditLogsError(null);
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: auditRowsPerPage.toString(),
        action: auditFilterAction,
        responsable: auditFilterResponsable,
        sort: auditSortOrder,
      });

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener logs de auditoría");
      }

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setTotalAuditLogs(data.total || 0);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setAuditLogsError(err.message);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 5000);
    return () => clearInterval(interval);
  }, [auditPage, auditRowsPerPage, auditFilterAction, auditFilterResponsable, auditSortOrder]);

  const handleClearAuditLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: "¿Vaciar Auditorías?",
      message: "Esta acción eliminará todos los registros históricos de auditoría de forma permanente. No se puede deshacer.",
      confirmText: "Eliminar Todo",
      confirmVariant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/admin/audit-logs/clear", {
            method: "POST",
            headers: {
              "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
            },
          });
          if (res.ok) {
            setAlertModal({
              isOpen: true,
              title: "Limpieza Completada",
              message: "Se han eliminado todos los registros de auditoría.",
              variant: "success"
            });
            fetchAuditLogs();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleOptimizeAuditLogs = (keepCount: number = 200) => {
    setConfirmModal({
      isOpen: true,
      title: "Optimizar Base de Datos",
      message: `Se conservarán únicamente los últimos ${keepCount} registros de auditoría para mejorar el rendimiento del sistema.`,
      confirmText: "Optimizar Ahora",
      confirmVariant: "warning",
      onConfirm: async () => {
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/admin/audit-logs/optimize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
            },
            body: JSON.stringify({ keepCount }),
          });
          if (res.ok) {
            setAlertModal({
              isOpen: true,
              title: "Base de Datos Optimizada",
              message: `Se han conservado los últimos ${keepCount} registros.`,
              variant: "success"
            });
            fetchAuditLogs();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteSingleAuditLog = (logId: any) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar registro?",
      message: "Se eliminará permanentemente este registro de auditoría individual.",
      confirmText: "Eliminar",
      confirmVariant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/audit-logs/${logId}`, {
            method: "DELETE",
            headers: {
              "X-Admin-Password": contrasenaAdmin || "PipeAdmin2026",
            },
          });
          if (res.ok) {
            fetchAuditLogs();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  return (
    <motion.div
      key="tab-auditoria"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6 w-full"
    >
      {/* Header of the tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h3 className="font-sans text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-500 animate-pulse" />
            Auditoría del Sistema y Seguridad
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
            Historial completo de accesos, modificaciones de inventario, stock, precios, pedidos y cambios de configuración.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAuditLogs}
            disabled={loadingAuditLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loadingAuditLogs ? "animate-spin" : ""}`} />
            <span>{loadingAuditLogs ? "Cargando..." : "Actualizar Logs"}</span>
          </button>

          <button
            onClick={() => handleOptimizeAuditLogs(100)}
            disabled={loadingAuditLogs || auditLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-900/30 text-[10px] font-bold uppercase tracking-wider border border-amber-100 dark:border-amber-900/30 transition-all cursor-pointer disabled:opacity-50"
            title="Optimiza y limpia la tabla conservando únicamente los últimos 100 registros de auditoría para evitar saturación"
          >
            <Database className="h-3 w-3" />
            <span>Optimizar BD (Últimos 100)</span>
          </button>

          <button
            onClick={handleClearAuditLogs}
            disabled={loadingAuditLogs || auditLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 text-[10px] font-bold uppercase tracking-wider border border-rose-100 dark:border-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            <span>Vaciar Auditorías</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="w-full">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">Filtrar por Acción</label>
          <select
            value={auditFilterAction}
            onChange={(e) => setAuditFilterAction(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          >
            <option value="">Todas las acciones</option>
            <option value="inicio_sesion">Inicio de Sesión Exitoso</option>
            <option value="inicio_sesion_fallido">Intento de Inicio de Sesión Fallido</option>
            <option value="cierre_sesion">Cierre de Sesión</option>
            <option value="creacion_producto">Creación de Sabor</option>
            <option value="actualizacion_producto">Modificación de Sabor</option>
            <option value="eliminacion_producto">Eliminación de Sabor</option>
            <option value="cambio_stock">Cambio de Stock</option>
            <option value="cambio_precio">Cambio de Precio</option>
            <option value="pedido_creado">Orden Creada (Checkout)</option>
            <option value="pedido_actualizado">Orden Modificada</option>
            <option value="pedido_estado_cambiado">Estado de Pedido Cambiado</option>
            <option value="pedido_eliminado">Pedido Eliminado</option>
            <option value="configuracion_actualizada">Ajustes Modificados</option>
          </select>
        </div>

        <div className="w-full">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">Filtrar por Responsable</label>
          <select
            value={auditFilterResponsable}
            onChange={(e) => setAuditFilterResponsable(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          >
            <option value="">Todos los responsables</option>
            <option value="admin">Administrador (admin)</option>
            <option value="sistema_cliente">Cliente (Autoservicio)</option>
            <option value="sistema_db">Postgres Trigger (Base de Datos)</option>
          </select>
        </div>

        <div className="w-full">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">Ordenar por Fecha</label>
          <select
            value={auditSortOrder}
            onChange={(e) => setAuditSortOrder(e.target.value as "reciente" | "antiguo")}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          >
            <option value="reciente">Más reciente primero 🗓️</option>
            <option value="antiguo">Más antiguo primero 🗓️</option>
          </select>
        </div>

        <div className="w-full">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1 text-left">Registros por Página</label>
          <select
            value={auditRowsPerPage}
            onChange={(e) => setAuditRowsPerPage(Number(e.target.value))}
            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          >
            <option value={10}>10 registros</option>
            <option value={20}>20 registros</option>
            <option value={50}>50 registros</option>
            <option value={100}>100 registros</option>
          </select>
        </div>
      </div>

      {/* Logs List/Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden w-full">
        {loadingAuditLogs ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-450 dark:text-zinc-400">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-500 mb-2" />
            <span className="text-xs">Descargando registros de auditoría desde la base de datos...</span>
          </div>
        ) : auditLogsError ? (
          <div className="p-12 text-center text-rose-500 flex flex-col items-center justify-center">
            <AlertTriangle className="h-8 w-8 mb-2 animate-bounce" />
            <span className="text-xs font-bold">Error: {auditLogsError}</span>
          </div>
        ) : totalAuditLogs === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <span className="text-xs">No se han registrado eventos de auditoría todavía.</span>
          </div>
        ) : (
          <div className="w-full">
            <div className="divide-y divide-slate-100 dark:divide-zinc-800 w-full">
              {auditLogs.map((log) => {
                // Decide badge color
                let badgeBg = "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300";
                if (log.accion === "inicio_sesion") badgeBg = "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/20";
                if (log.accion === "inicio_sesion_fallido") badgeBg = "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 font-bold border border-rose-200/50";
                if (log.accion === "pedido_creado") badgeBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/20";
                if (log.accion === "cambio_stock") badgeBg = "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/20";
                if (log.accion === "cambio_precio") badgeBg = "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-200/20";
                if (log.accion === "pedido_estado_cambiado") badgeBg = "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/20";
                if (log.accion === "configuracion_actualizada") badgeBg = "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-200/20";
                if (log.accion === "cierre_sesion") badgeBg = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/20";
                if (log.accion === "pedido_eliminado" || log.accion === "eliminacion_producto") badgeBg = "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/20";
                if (log.accion === "creacion_producto") badgeBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/20";

                return (
                  <AuditLogItemRow key={log.id} log={log} badgeBg={badgeBg} onDelete={handleDeleteSingleAuditLog} />
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800/85 text-xs text-slate-500 dark:text-zinc-400">
              <div>
                Mostrando <span className="font-bold text-slate-800 dark:text-zinc-200">{Math.min(totalAuditLogs, (auditPage - 1) * auditRowsPerPage + 1)}</span> a{" "}
                <span className="font-bold text-slate-800 dark:text-zinc-200">{Math.min(totalAuditLogs, auditPage * auditRowsPerPage)}</span> de{" "}
                <span className="font-bold text-slate-800 dark:text-zinc-200">{totalAuditLogs}</span> registros
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white shadow-sm">{auditPage}</span>
                  <span className="text-slate-300 dark:text-zinc-700">/</span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-850 text-slate-600 dark:text-zinc-350">{totalAuditPages}</span>
                </div>

                <button
                  onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                  disabled={auditPage === totalAuditPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
