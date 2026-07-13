import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { Sale } from "../types";
import { TrendingUp, Award, Layers } from "lucide-react";

interface SalesChartsProps {
  sales: Sale[];
}

export const SalesCharts: React.FC<SalesChartsProps> = ({ sales }) => {

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter valid sales
  const validSales = useMemo(() => {
    return sales.filter((s) => s.estado !== "Eliminada" && s.estado !== "Rechazado");
  }, [sales]);

  // Prepare Top Products and Profit Margins Data
  const topProductsData = useMemo(() => {
    const map = new Map<string, { cantidad: number; ingresos: number; costoTotal: number }>();

    validSales.forEach((s) => {
      s.items.forEach((item) => {
        const current = map.get(item.nombre) || { cantidad: 0, ingresos: 0, costoTotal: 0 };
        const cost = item.costoUnitario !== undefined 
          ? item.costoUnitario 
          : ((item as any).costo_unitario !== undefined ? (item as any).costo_unitario : item.precioUnitario * 0.5);

        map.set(item.nombre, {
          cantidad: current.cantidad + item.cantidad,
          ingresos: current.ingresos + (item.precioUnitario * item.cantidad),
          costoTotal: current.costoTotal + (cost * item.cantidad),
        });
      });
    });

    return Array.from(map.entries())
      .map(([nombre, data]) => {
        const ganancia = data.ingresos - data.costoTotal;
        const margenPorcentual = data.ingresos > 0 ? (ganancia / data.ingresos) * 100 : 0;
        return {
          nombre,
          cantidad: data.cantidad,
          ingresos: data.ingresos,
          "Costo Total": data.costoTotal,
          "Ganancia Estimada": ganancia > 0 ? ganancia : 0,
          margen: margenPorcentual,
        };
      })
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [validSales]);

  return (
    <div className="grid grid-cols-1 gap-8">
      {/* Popular Products with Financial Margins (Full Width) */}
      <div className="bg-white dark:bg-zinc-900/50 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col h-full min-h-[420px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-emerald-500 animate-bounce" style={{ animationDuration: "3s" }} />
              Productos Más Vendidos y Rentabilidad Detallada
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Desglose completo de ingresos vs ganancia neta estimada por producto
            </p>
          </div>
        </div>

        <div className="relative flex-1 w-full h-[300px] mb-4 overflow-x-auto custom-scrollbar">
          {topProductsData.length > 0 ? (
            <div style={{ minWidth: topProductsData.length > 10 ? `${topProductsData.length * 60}px` : "100%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={topProductsData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="nombre" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} 
                    dy={8}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis 
                    yAxisId="left"
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 10 }} 
                    tickFormatter={(val) => `$${new Intl.NumberFormat('es-CO').format(val)}`} 
                    dx={-10}
                    width={80}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#10b981", fontSize: 10 }} 
                    tickFormatter={(val) => `$${new Intl.NumberFormat('es-CO').format(val)}`} 
                    dx={10}
                    width={80}
                  />
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "rgba(30, 41, 59, 0.95)",
                      borderRadius: "16px",
                      border: "none",
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                      fontSize: "14px",
                      padding: "12px 16px"
                    }}
                    formatter={(value: any, name: any, props: any) => {
                      if (name === "margen") return [`${Number(value).toFixed(1)}%`, "Margen de Ganancia"];
                      return [formatCOP(Number(value)), name];
                    }}
                    labelStyle={{ fontWeight: "bold", color: "#fbbf24", marginBottom: "8px", fontSize: "16px" }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "15px" }} />
                  <Bar yAxisId="left" dataKey="ingresos" name="Ingreso de Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {topProductsData.map((_, index) => (
                      <Cell key={`cell-in-${index}`} fill="#3b82f6" className="transition-all duration-300 hover:fill-blue-400" />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="Ganancia Estimada" name="Ganancia Neta Estimada" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No hay datos de ventas disponibles para graficar sabores
            </div>
          )}
        </div>
        
        {/* Table representation for perfect clarity */}
        {topProductsData.length > 0 && (
          <div className="mt-6 border-t border-slate-50 dark:border-zinc-800/50 pt-5 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2">
                  <th className="pb-2">Sabor / Producto</th>
                  <th className="pb-2 text-center">Unidades Vendidas</th>
                  <th className="pb-2 text-right">Ingresos Totales</th>
                  <th className="pb-2 text-right">Ganancia Estimada</th>
                  <th className="pb-2 text-right">Rentabilidad %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-zinc-800/40">
                {topProductsData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all font-semibold">
                    <td className="py-2.5 text-slate-800 dark:text-zinc-200">{p.nombre}</td>
                    <td className="py-2.5 text-center text-slate-500 dark:text-zinc-400 font-mono">{p.cantidad} unds</td>
                    <td className="py-2.5 text-right text-slate-800 dark:text-zinc-100">{formatCOP(p.ingresos)}</td>
                    <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400">{formatCOP(p["Ganancia Estimada"])}</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-mono">
                        {p.margen.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
