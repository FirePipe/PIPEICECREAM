import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell as RechartsCell,
  AreaChart as RechartsAreaChart,
  Area as RechartsArea,
} from "recharts";
import {
  Activity,
  BarChart2,
  PieChart,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Check,
} from "lucide-react";
import { formatCOP } from "../lib/utils";
import { Sale, Product } from "../types";

interface SalesChartsProps {
  sales: Sale[];
  products: Product[];
  dashboardTimeRange: "hoy" | "semana" | "mes" | "todos";
  setDashboardTimeRange: (range: "hoy" | "semana" | "mes" | "todos") => void;
}

export const SalesCharts: React.FC<SalesChartsProps> = ({
  sales,
  products,
  dashboardTimeRange,
  setDashboardTimeRange,
}) => {
  // Filter sales based on dashboardTimeRange and status
  const approvedSales = useMemo(() => {
    let base = sales.filter((s) => s.estado === "Aprobado");
    if (dashboardTimeRange !== "todos") {
      const now = new Date();
      if (dashboardTimeRange === "hoy") {
        const todayStr = now.toISOString().split("T")[0];
        base = base.filter((s) => s.fecha === todayStr);
      } else if (dashboardTimeRange === "semana") {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        const lastWeekStr = lastWeek.toISOString().split("T")[0];
        base = base.filter((s) => s.fecha >= lastWeekStr);
      } else if (dashboardTimeRange === "mes") {
        const lastMonth = new Date();
        lastMonth.setDate(now.getDate() - 30);
        const lastMonthStr = lastMonth.toISOString().split("T")[0];
        base = base.filter((s) => s.fecha >= lastMonthStr);
      }
    }
    return base;
  }, [sales, dashboardTimeRange]);

  const { totalRecaudado, gananciaNeta, totalDespachados, flavorSalesArray } =
    useMemo(() => {
      try {
        const totalRecaudado = approvedSales.reduce((acc, curr) => acc + curr.total, 0);

        const totalCostoCompra = approvedSales.reduce(
          (acc, s) =>
            acc +
            s.items.reduce((sum, item) => {
              const product = products.find((p) => p.id === item.productId);
              const costo =
                product?.costo ||
                item.costoUnitario ||
                (item.nombre.toLowerCase().includes("mango biche") ? 920 : 1140);
              return sum + costo * item.cantidad;
            }, 0),
          0
        );

        const gananciaNeta = totalRecaudado - totalCostoCompra;

        const totalDespachados = approvedSales.reduce(
          (acc, s) => acc + s.items.reduce((sum, item) => sum + item.cantidad, 0),
          0
        );

        const flavorSalesCount: { [name: string]: number } = {};
        products.forEach((p) => {
          flavorSalesCount[p.nombre] = 0;
        });

        approvedSales.forEach((s) => {
          s.items.forEach((item) => {
            flavorSalesCount[item.nombre] =
              (flavorSalesCount[item.nombre] || 0) + item.cantidad;
          });
        });

        const flavorSalesArray = Object.entries(flavorSalesCount).map(
          ([nombre, totalUnits]) => ({
            nombre,
            totalUnits,
          })
        );

        return {
          totalRecaudado,
          gananciaNeta,
          totalDespachados,
          flavorSalesArray,
        };
      } catch (e) {
        console.error("Error computing metrics in AdminSalesCharts:", e);
        return {
          totalRecaudado: 0,
          gananciaNeta: 0,
          totalDespachados: 0,
          flavorSalesArray: [],
        };
      }
    }, [approvedSales, products]);

  // Recharts Data Computations
  const rechartsDailySalesData = useMemo(() => {
    const salesByDateMap: {
      [date: string]: {
        date: string;
        Recaudo: number;
        Ganancia: number;
        Pedidos: number;
        Unidades: number;
      };
    } = {};

    approvedSales.forEach((s) => {
      const d = s.fecha;
      if (!salesByDateMap[d]) {
        salesByDateMap[d] = {
          date: d,
          Recaudo: 0,
          Ganancia: 0,
          Pedidos: 0,
          Unidades: 0,
        };
      }
      salesByDateMap[d].Recaudo += s.total;
      salesByDateMap[d].Pedidos += 1;
      const qty = s.items.reduce((acc, curr) => acc + curr.cantidad, 0);
      salesByDateMap[d].Unidades += qty;

      const cost = s.items.reduce(
        (sum, item) =>
          sum +
          (item.costoUnitario ||
            (item.nombre.toLowerCase().includes("mango biche") ? 920 : 1140)) *
            item.cantidad,
        0
      );
      salesByDateMap[d].Ganancia += s.total - cost;
    });

    return Object.values(salesByDateMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [approvedSales]);

  return (
    <div className="space-y-8">
      {/* Dashboard Time Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-600" />
          <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100">
            Panel de Rendimiento
          </h3>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 p-1 rounded-xl border border-slate-100 dark:border-zinc-800">
          <button
            onClick={() => setDashboardTimeRange("hoy")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              dashboardTimeRange === "hoy"
                ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setDashboardTimeRange("semana")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              dashboardTimeRange === "semana"
                ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setDashboardTimeRange("mes")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              dashboardTimeRange === "mes"
                ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setDashboardTimeRange("todos")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              dashboardTimeRange === "todos"
                ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
              Recaudo Total
            </span>
            <h4 className="text-xl font-bold font-mono text-slate-800 dark:text-white mt-1">
              {formatCOP(totalRecaudado)}
            </h4>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
              Ganancia Neta
            </span>
            <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCOP(gananciaNeta)}
            </h4>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
              Helados Vendidos
            </span>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {totalDespachados}{" "}
              <span className="text-xs font-normal text-slate-400">unidades</span>
            </h4>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
              Pedidos Aprobados
            </span>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {approvedSales.length}{" "}
              <span className="text-xs font-normal text-slate-400">órdenes</span>
            </h4>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart 1: Daily Sales & Gains History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          <div className="mb-4">
            <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-500" />
              Historial de Ventas Diarias
            </h3>
            <p className="text-xs text-slate-400">
              Monitorea los ingresos y ganancias netas registradas día a día.
            </p>
          </div>

          {rechartsDailySalesData.length > 0 ? (
            <div className="h-72 w-full mt-2 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={rechartsDailySalesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <RechartsCartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.15)"
                  />
                  <RechartsXAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    dy={8}
                  />
                  <RechartsYAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                    dx={-8}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 41, 59, 0.95)",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    formatter={(value: any) => [formatCOP(Number(value)), ""]}
                    labelStyle={{
                      fontWeight: "bold",
                      color: "#38bdf8",
                      marginBottom: "4px",
                    }}
                  />
                  <RechartsLegend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                  />
                  <RechartsBar
                    name="Recaudo Total"
                    dataKey="Recaudo"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <RechartsBar
                    name="Ganancia Neta"
                    dataKey="Ganancia"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl dark:border-zinc-800 text-slate-400 my-auto">
              <BarChart2 className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm">
                No hay datos de ventas aprobadas para graficar.
              </p>
            </div>
          )}
        </div>

        {/* Chart 2: Best Selling Flavors (Pie/Donut Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          <div className="mb-4">
            <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-amber-500" />
              Sabores Más Vendidos
            </h3>
            <p className="text-xs text-slate-400">
              Participación en unidades vendidas de cada sabor del catálogo.
            </p>
          </div>

          {flavorSalesArray.some((f) => f.totalUnits > 0) ? (
            <div className="flex-1 w-full mt-4 flex flex-col gap-6">
              <div className="h-48 w-full text-xs relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <RechartsPie
                      data={flavorSalesArray.filter((f) => f.totalUnits > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="totalUnits"
                      nameKey="nombre"
                      stroke="none"
                    >
                      {flavorSalesArray
                        .filter((f) => f.totalUnits > 0)
                        .map((_entry, index) => {
                          const colors = [
                            "#3b82f6",
                            "#f59e0b",
                            "#10b981",
                            "#ec4899",
                            "#8b5cf6",
                            "#06b6d4",
                            "#ef4444",
                            "#14b8a6",
                            "#f43f5e",
                            "#8b5cf6",
                          ];
                          return (
                            <RechartsCell
                              key={`cell-${index}`}
                              fill={colors[index % colors.length]}
                              className="transition-all duration-300 hover:opacity-80"
                            />
                          );
                        })}
                    </RechartsPie>
                    <RechartsTooltip
                      allowEscapeViewBox={{ x: true, y: true }}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderRadius: "14px",
                        border: "none",
                        color: "#fff",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                        fontSize: "12px",
                        padding: "10px 14px",
                      }}
                      itemStyle={{ color: "#fff", fontWeight: "bold" }}
                      formatter={(value: any, name: any) => [
                        `${value} unidades`,
                        <span className="text-white font-black uppercase tracking-widest text-[10px]">
                          {name}
                        </span>,
                      ]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-700 dark:text-zinc-200">
                    {totalDespachados}
                  </span>
                </div>
              </div>

              {/* Custom list legend */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar text-xs">
                {flavorSalesArray
                  .filter((f) => f.totalUnits > 0)
                  .map((item, index) => {
                    const colors = [
                      "#3b82f6",
                      "#f59e0b",
                      "#10b981",
                      "#ec4899",
                      "#8b5cf6",
                      "#06b6d4",
                      "#ef4444",
                      "#14b8a6",
                      "#f43f5e",
                      "#8b5cf6",
                    ];
                    const percent =
                      totalDespachados > 0
                        ? (item.totalUnits / totalDespachados) * 100
                        : 0;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor: colors[index % colors.length],
                            }}
                          />
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">
                            {item.nombre}
                          </span>
                        </div>
                        <span className="font-mono text-slate-500 dark:text-zinc-400 shrink-0 font-bold ml-2">
                          {item.totalUnits} ud ({percent.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl dark:border-zinc-800 text-slate-400 my-auto">
              <PieChart className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm">Aún no hay unidades vendidas aprobadas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3: Net Profit Trend & Cumulative Revenue (Area Chart) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
        <div className="mb-4">
          <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Curva de Rendimiento Financiero
          </h3>
          <p className="text-xs text-slate-400">
            Visualiza el crecimiento del recaudo y las ganancias netas acumuladas.
          </p>
        </div>

        {rechartsDailySalesData.length > 0 ? (
          <div className="h-72 w-full mt-2 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsAreaChart
                data={rechartsDailySalesData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRecaudo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <RechartsCartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.15)"
                />
                <RechartsXAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  dy={8}
                />
                <RechartsYAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                  dx={-8}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(30, 41, 59, 0.95)",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                  }}
                  formatter={(value: any) => [formatCOP(Number(value)), ""]}
                  labelStyle={{
                    fontWeight: "bold",
                    color: "#38bdf8",
                    marginBottom: "4px",
                  }}
                />
                <RechartsLegend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                />
                <RechartsArea
                  name="Recaudo Diario"
                  type="monotone"
                  dataKey="Recaudo"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRecaudo)"
                />
                <RechartsArea
                  name="Ganancia Diaria"
                  type="monotone"
                  dataKey="Ganancia"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorGanancia)"
                />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl dark:border-zinc-800 text-slate-400 my-auto">
            <TrendingUp className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm">
              No hay datos financieros para trazar tendencias.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
