import React, { useState } from "react";
import { motion } from "motion/react";
import { Trash2 } from "lucide-react";

export const AuditLogItemRow: React.FC<{ log: any; badgeBg: string; onDelete?: (id: any) => void }> = ({ log, badgeBg, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  // Helper to format values elegantly
  const renderValueDetail = (val: any) => {
    if (!val) return <span className="text-slate-400 italic">Ninguno</span>;
    if (typeof val === "object") {
      return (
        <pre className="text-[10px] bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800 text-slate-650 dark:text-zinc-300 overflow-x-auto font-mono max-w-full text-left">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="font-mono text-xs text-slate-700 dark:text-zinc-200">{String(val)}</span>;
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      inicio_sesion: "Inicio de Sesión",
      inicio_sesion_fallido: "Acceso Fallido",
      cierre_sesion: "Cierre de Sesión",
      creacion_producto: "Sabor Creado",
      actualizacion_producto: "Sabor Modificado",
      eliminacion_producto: "Sabor Eliminado",
      cambio_stock: "Ajuste de Stock",
      cambio_precio: "Cambio de Precio",
      pedido_creado: "Orden Registrada",
      pedido_actualizado: "Orden Modificada",
      pedido_estado_cambiado: "Estado de Orden Actualizado",
      pedido_eliminado: "Orden Eliminada",
      configuracion_actualizada: "Ajustes Actualizados"
    };
    return labels[action] || action;
  };

  return (
    <div className="p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Date & Action */}
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {log.fecha}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
              {log.hora}
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeBg}`}>
            {getActionLabel(log.accion)}
          </span>
        </div>

        {/* Responsible & Entity */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <div className="text-slate-500 dark:text-zinc-400">
            Responsable: <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{log.admin_responsable}</strong>
          </div>
          {log.entidad_afectada && (
            <div className="px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/55 text-[10px]">
              {log.entidad_afectada} {log.entidad_id && <span className="font-mono font-bold">({log.entidad_id})</span>}
            </div>
          )}
        </div>

        {/* Action Toggle Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer focus:outline-none"
        >
          {expanded ? "Ocultar Detalles ▲" : "Ver Detalles ▼"}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left"
        >
          {/* Metadata */}
          <div className="space-y-2 bg-slate-50/50 dark:bg-zinc-950/10 p-3 rounded-xl border border-slate-100/60 dark:border-zinc-800/40 flex flex-col justify-between">
            <div>
              <h5 className="font-bold uppercase tracking-wider text-slate-400 text-[9px] mb-2">Información de Conexión</h5>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Dirección IP:</span>
                  <p className="font-mono text-slate-800 dark:text-zinc-200 font-bold">{log.ip || "127.0.0.1"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Navegador:</span>
                  <p className="text-slate-800 dark:text-zinc-200 truncate" title={log.navegador}>{log.navegador || "Desconocido"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Dispositivo:</span>
                  <p className="text-slate-800 dark:text-zinc-200 font-medium">{log.dispositivo || "Desconocido"}</p>
                </div>
              </div>
            </div>

            {onDelete && (
              <div className="pt-3 mt-2 border-t border-slate-100 dark:border-zinc-800/60 flex justify-end">
                <button
                  onClick={() => onDelete(log.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/30 font-bold text-[10px] uppercase tracking-wider rounded-lg border border-rose-100 dark:border-rose-900/30 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar Registro</span>
                </button>
              </div>
            )}
          </div>

          {/* Value Changes */}
          {(log.valor_anterior || log.valor_nuevo) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <h5 className="font-bold uppercase tracking-wider text-rose-500/80 text-[9px] mb-1">Estado Anterior</h5>
                {renderValueDetail(log.valor_anterior)}
              </div>
              <div>
                <h5 className="font-bold uppercase tracking-wider text-emerald-600/80 text-[9px] mb-1">Estado Nuevo</h5>
                {renderValueDetail(log.valor_nuevo)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-slate-450 dark:text-zinc-500 italic p-6">
              Sin cambios de valores registrados para esta acción.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
