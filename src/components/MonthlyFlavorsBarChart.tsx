import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from "recharts";
import {
  Award,
  BarChart3,
  Calendar,
  IceCream,
  TrendingUp,
  DollarSign,
  PackageCheck,
  ChevronRight
} from "lucide-react";
import { Sale, Product } from "../types";
import { parseSaleDate, toLocalDateString } from "../lib/sanitization";
import { formatCOP } from "../lib/utils";

interface MonthlyFlavorsBarChartProps {
  sales: Sale[];
  products: Product[];
}

export const MonthlyFlavorsBarChart: React.FC<MonthlyFlavorsBarChartProps> = ({
  sales,
  products
}) => {
  const [metric, setMetric] = useState<"units" | "revenue">("units");

  // Filter sales specifically for the LAST 30 DAYS (Último Mes)
  const lastMonthSalesData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Filter approved sales in the last 30 days
    const approvedMonthSales = sales.filter((s) => {
      if (!s || s.estado === "Eliminada" || s.estado === "Rechazado") return false;
      const saleDate = parseSaleDate(s.fecha);
      if (!saleDate) return false;
      return saleDate >= thirtyDaysAgo;
    });

    // Aggregate by flavor name
    const flavorStats: {
      [flavor: string]: {
        nombre: string;
        unidades: number;
        ingresos: number;
        costoTotal: number;
        imagen?: string;
      };
    } = {};

    // Initialize with all products in catalog
    products.forEach((p) => {
      flavorStats[p.nombre] = {
        nombre: p.nombre,
        unidades: 0,
        ingresos: 0,
        costoTotal: 0,
        imagen: p.imagen
      };
    });

    // Sum up sales in last 30 days
    approvedMonthSales.forEach((s) => {
      (s.items || []).forEach((item) => {
        const qty = typeof item.cantidad === "number" && !isNaN(item.cantidad) ? item.cantidad : 0;
        const price = typeof item.precioUnitario === "number" && !isNaN(item.precioUnitario) ? item.precioUnitario : 0;
        const cost = typeof item.costoUnitario === "number" && !isNaN(item.costoUnitario) ? item.costoUnitario : (item.nombre.toLowerCase().includes("mango biche") ? 920 : 1140);

        if (!flavorStats[item.nombre]) {
          const prod = products.find((p) => p.nombre.toLowerCase() === item.nombre.toLowerCase());
          flavorStats[item.nombre] = {
            nombre: item.nombre,
            unidades: 0,
            ingresos: 0,
            costoTotal: 0,
            imagen: prod?.imagen
          };
        }

        flavorStats[item.nombre].unidades += qty;
        flavorStats[item.nombre].ingresos += qty * price;
        flavorStats[item.nombre].costoTotal += qty * cost;
      });
    });

    const list = Object.values(flavorStats);

    // Sort by metric descending
    list.sort((a, b) => {
      if (metric === "units") return b.unidades - a.unidades;
      return b.ingresos - a.ingresos;
    });

    const totalUnitsMonth = list.reduce((sum, item) => sum + item.unidades, 0);
    const totalRevenueMonth = list.reduce((sum, item) => sum + item.ingresos, 0);

    return {
      flavors: list,
      totalUnitsMonth,
      totalRevenueMonth,
      orderCountMonth: approvedMonthSales.length
    };
  }, [sales, products, metric]);

  const { flavors, totalUnitsMonth, totalRevenueMonth, orderCountMonth } = lastMonthSalesData;

  // Modern vibrant bar chart color palette
  const BAR_COLORS = [
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#f43f5e", // Rose
    "#14b8a6", // Teal
    "#a855f7"  // Violet
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 sm:p-6 rounded-2xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-extrabold uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Últimos 30 días
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
              {orderCountMonth} pedidos registrados
            </span>
          </div>
          <h3 className="font-sans text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-1">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Gráfica de Sabores Más Vendidos (Último Mes)
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Ranking comparativo en gráfica de barras del rendimiento de cada sabor durante los últimos 30 días.
          </p>
        </div>

        {/* Metric Selector Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-zinc-700/60">
          <button
            onClick={() => setMetric("units")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === "units"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Por Unidades</span>
          </button>
          <button
            onClick={() => setMetric("revenue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === "revenue"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Por Ingresos ($)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Unidades Vendidas (30d)
          </span>
          <span className="block text-lg font-mono font-black text-slate-800 dark:text-white mt-0.5">
            {totalUnitsMonth} <span className="text-xs text-slate-400 font-normal">helados</span>
          </span>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Ingresos COP (30d)
          </span>
          <span className="block text-lg font-mono font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {formatCOP(totalRevenueMonth)}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
          <Award className="h-7 w-7 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
              Top #1 Sabor del Mes
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-white truncate block">
              {flavors[0]?.nombre || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      {flavors.some((f) => f.unidades > 0) ? (
        <div className="space-y-4">
          <div className="h-72 w-full text-xs pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={flavors.filter((f) => f.unidades > 0)}
                margin={{ top: 20, right: 15, left: -10, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.15)"
                />
                <XAxis
                  dataKey="nombre"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(val) =>
                    metric === "revenue"
                      ? `$${Math.round(val / 1000)}k`
                      : `${val}`
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderRadius: "14px",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                    padding: "12px 16px",
                  }}
                  formatter={(val: any, name: any, item: any) => {
                    const data = item.payload;
                    const pct =
                      totalUnitsMonth > 0
                        ? ((data.unidades / totalUnitsMonth) * 100).toFixed(1)
                        : "0";
                    return [
                      metric === "revenue"
                        ? `${formatCOP(Number(val))} (${data.unidades} ud)`
                        : `${val} unidades (${pct}% del mes)`,
                      <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                        {data.nombre}
                      </span>,
                    ];
                  }}
                />
                <Bar
                  dataKey={metric === "units" ? "unidades" : "ingresos"}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                >
                  {flavors
                    .filter((f) => f.unidades > 0)
                    .map((_entry, index) => (
                      <Cell
                        key={`cell-bar-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  <LabelList
                    dataKey={metric === "units" ? "unidades" : "ingresos"}
                    position="top"
                    formatter={(val: any) =>
                      metric === "units"
                        ? `${val} ud`
                        : `$${Math.round(Number(val) / 1000)}k`
                    }
                    style={{
                      fill: "#64748b",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking Cards Breakdown */}
          <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3">
              Desglose de Ranking del Mes (Últimos 30 días)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {flavors
                .filter((f) => f.unidades > 0)
                .map((f, idx) => {
                  const pct =
                    totalUnitsMonth > 0
                      ? ((f.unidades / totalUnitsMonth) * 100).toFixed(1)
                      : "0";
                  return (
                    <div
                      key={f.nombre}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? "bg-amber-400 text-amber-950 font-bold shadow-xs"
                              : idx === 1
                              ? "bg-slate-300 text-slate-900"
                              : idx === 2
                              ? "bg-amber-700 text-amber-100"
                              : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate block">
                            {f.nombre}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            {formatCOP(f.ingresos)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 block">
                          {f.unidades} ud
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 block">
                          {pct}% del total
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 my-auto p-6 text-center">
          <IceCream className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No hay datos de ventas registradas en los últimos 30 días
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Los helados comercializados durante este período aparecerán comparados automáticamente en la gráfica de barras.
          </p>
        </div>
      )}
    </div>
  );
};
