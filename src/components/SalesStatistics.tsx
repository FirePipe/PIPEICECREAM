import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Sale } from "../types";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers
} from "lucide-react";

interface SalesStatisticsProps {
  sales: Sale[];
}

type PeriodFilter = "7days" | "30days" | "currentMonth" | "all";

export const SalesStatistics: React.FC<SalesStatisticsProps> = ({ sales }) => {
  const [period, setPeriod] = useState<PeriodFilter>("7days");

  // Format money helpers
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter sales based on period and exclude "Eliminada" / "Rechazado"
  const filteredSales = useMemo(() => {
    const validSales = sales.filter((s) => s.estado !== "Eliminada" && s.estado !== "Rechazado");
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (period === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const limitStr = sevenDaysAgo.toISOString().split("T")[0];
      return validSales.filter((s) => s.fecha >= limitStr);
    }

    if (period === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const limitStr = thirtyDaysAgo.toISOString().split("T")[0];
      return validSales.filter((s) => s.fecha >= limitStr);
    }

    if (period === "currentMonth") {
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth(); // 0-11
      return validSales.filter((s) => {
        const sDate = new Date(s.fecha + "T00:00:00");
        return sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonthNum;
      });
    }

    return validSales; // "all"
  }, [sales, period]);

  // General KPIs based on filtered period
  const kpis = useMemo(() => {
    let totalSales = 0;
    let totalCost = 0;
    let totalOrders = filteredSales.length;

    filteredSales.forEach((s) => {
      totalSales += s.total;
      s.items.forEach((item) => {
        // Fallback for missing costUnitario or legacy key cost_unitario
        const cost = item.costoUnitario !== undefined 
          ? item.costoUnitario 
          : ((item as any).costo_unitario !== undefined ? (item as any).costo_unitario : item.precioUnitario * 0.5);
        totalCost += cost * item.cantidad;
      });
    });

    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const ticketAverage = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalCost,
      netProfit,
      profitMargin,
      totalOrders,
      ticketAverage,
    };
  }, [filteredSales]);

  // Trend Chart Data (grouped by date)
  const trendData = useMemo(() => {
    const dailyMap = new Map<string, { totalSales: number; totalCost: number }>();

    // Seed dates if 7days or 30days to have a continuous sequence
    if (period === "7days" || period === "30days") {
      const days = period === "7days" ? 7 : 30;
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dailyMap.set(dateStr, { totalSales: 0, totalCost: 0 });
      }
    }

    filteredSales.forEach((s) => {
      const date = s.fecha;
      const current = dailyMap.get(date) || { totalSales: 0, totalCost: 0 };
      
      let saleCost = 0;
      s.items.forEach((item) => {
        const cost = item.costoUnitario !== undefined 
          ? item.costoUnitario 
          : ((item as any).costo_unitario !== undefined ? (item as any).costo_unitario : item.precioUnitario * 0.5);
        saleCost += cost * item.cantidad;
      });

      dailyMap.set(date, {
        totalSales: current.totalSales + s.total,
        totalCost: current.totalCost + saleCost,
      });
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => {
        const dateObj = new Date(date + "T00:00:00");
        const formattedDate = new Intl.DateTimeFormat("es-CO", {
          month: "short",
          day: "numeric",
        }).format(dateObj);

        const profit = data.totalSales - data.totalCost;

        return {
          date,
          formattedDate,
          "Ventas Brutas": data.totalSales,
          "Ganancia Neta": profit > 0 ? profit : 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, period]);

  // Payment Methods Distribution Data
  const paymentMethodsData = useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;

    filteredSales.forEach((s) => {
      const method = s.payment_method || "efectivo";
      if (method === "transferencia") {
        transferencia += s.total;
      } else {
        efectivo += s.total;
      }
    });

    const total = efectivo + transferencia;

    return [
      {
        name: "Efectivo",
        value: efectivo,
        percentage: total > 0 ? Math.round((efectivo / total) * 100) : 0,
        color: "#fb8c00",
      },
      {
        name: "Transferencia",
        value: transferencia,
        percentage: total > 0 ? Math.round((transferencia / total) * 100) : 0,
        color: "#3949ab",
      },
    ];
  }, [filteredSales]);

  // Period label translation
  const periodLabel = {
    "7days": "últimos 7 días",
    "30days": "últimos 30 días",
    currentMonth: "este mes",
    all: "todo el histórico",
  }[period];

  return (
    <div className="space-y-8">
      {/* FILTER PANEL */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-3xl border border-slate-100 dark:border-zinc-800/60 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-5 w-5 text-brand-500" />
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-zinc-200">
              Período de Análisis
            </h4>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Datos actualizados en tiempo real
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80">
          {(["7days", "30days", "currentMonth", "all"] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-black rounded-xl transition-all cursor-pointer ${
                period === p
                  ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-100 dark:border-zinc-700 font-extrabold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-semibold"
              }`}
            >
              {p === "7days"
                ? "7 Días"
                : p === "30days"
                ? "30 Días"
                : p === "currentMonth"
                ? "Este Mes"
                : "Todo"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI GRID (Bento Grid Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales KPI */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 h-16 w-16 bg-brand-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              Ventas Totales
            </span>
            <div className="p-2 bg-brand-50 dark:bg-brand-950/40 rounded-xl">
              <DollarSign className="h-4 w-4 text-brand-500" />
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCOP(kpis.totalSales)}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              Ingresos del período
            </p>
          </div>
        </div>

        {/* COGS (Costo de Venta) KPI */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              Costo de Ventas
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
              <Layers className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCOP(kpis.totalCost)}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              Inversión en insumos
            </p>
          </div>
        </div>

        {/* Net Profit KPI */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              Ganancia Neta
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCOP(kpis.netProfit)}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              Utilidad libre estimada
            </p>
          </div>
        </div>

        {/* Profit Margin % KPI */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              Margen Útil
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
              <Percent className="h-4 w-4 text-indigo-500" />
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {kpis.profitMargin.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
              Eficiencia del negocio
            </p>
          </div>
        </div>
      </div>

      {/* SECONDARY MINI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/60 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-xs border border-slate-100 dark:border-zinc-800">
              <ShoppingBag className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                Transacciones Realizadas
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white mt-0.5 block">
                {kpis.totalOrders} pedidos
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-bold bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
            Ventas Registradas
          </span>
        </div>

        <div className="bg-slate-50/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/60 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-xs border border-slate-100 dark:border-zinc-800">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                Valor Ticket Promedio
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white mt-0.5 block">
                {formatCOP(kpis.ticketAverage)}
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-bold bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
            Gasto por pedido
          </span>
        </div>
      </div>

      {/* DETAILED RECHARTS CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend of Sales and Net Profit (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 shadow-sm rounded-2xl p-5 sm:p-6 flex flex-col h-[380px]">
          <div className="mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500 animate-pulse" />
              Evolución de Ingresos y Ganancia Neta
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Relación diaria entre ventas brutas y rentabilidad estimada
            </p>
          </div>
          <div className="relative flex-1 w-full h-[250px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis
                    dataKey="formattedDate"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 41, 59, 0.95)",
                      borderRadius: "16px",
                      border: "none",
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name: any) => [
                      formatCOP(Number(value)),
                      name,
                    ]}
                    labelStyle={{ fontWeight: "bold", color: "#60a5fa", marginBottom: "4px" }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="Ventas Brutas"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Ganancia Neta"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No hay transacciones registradas en este período
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Chart (1/3 width) */}
        <div className="bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 shadow-sm rounded-2xl p-5 sm:p-6 flex flex-col h-[380px]">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-500" />
              Métodos de Pago Preferidos
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Distribución de ingresos por tipo de pago
            </p>
          </div>
          <div className="relative flex-1 w-full flex items-center justify-center min-h-[220px]">
            {kpis.totalSales > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "14px",
                      border: "none",
                      color: "#fff",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                      fontSize: "14px",
                      padding: "12px 16px"
                    }}
                    itemStyle={{ color: "#fff", fontWeight: "bold" }}
                    formatter={(value: any, name: any, props: any) => [
                      `${formatCOP(Number(value))} (${props.payload.percentage}%)`,
                      <span className="text-white font-black uppercase tracking-widest text-[11px]">{name}</span>
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">Sin transacciones</div>
            )}
          </div>
          {/* Legend Table */}
          <div className="space-y-2 mt-4 border-t border-slate-50 dark:border-zinc-800/50 pt-4">
            {paymentMethodsData.map((method) => (
              <div key={method.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: method.color }} />
                  <span>{method.name}</span>
                </div>
                <div className="text-slate-800 dark:text-white font-bold flex gap-2">
                  <span>{formatCOP(method.value)}</span>
                  <span className="text-slate-400 dark:text-zinc-500 font-normal">({method.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
