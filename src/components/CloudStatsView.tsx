import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  DollarSign, 
  Check, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  Activity, 
  BarChart2, 
  ShieldAlert,
  Award,
  Users,
  Zap,
  Terminal,
  Wifi,
  Database,
  AlertTriangle,
  RefreshCw,
  Smartphone
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";

interface CloudStatsViewProps {
  contrasenaAdmin: string;
}

export const CloudStatsView: React.FC<CloudStatsViewProps> = ({ contrasenaAdmin }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"hoy" | "semana" | "mes" | "todos">("todos");
  const [subTab, setSubTab] = useState<"general" | "pago_tiempo" | "fidelidad_rangos" | "financiero" | "telemetria">("general");
  const [allSales, setAllSales] = useState<any[]>([]);

  // Telemetry interactive states
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingStatus, setPingStatus] = useState<"idle" | "success" | "error">("idle");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [INFO] Sistema de telemetría e inteligencia cloud inicializado.`,
    `[${new Date().toLocaleTimeString()}] [INFO] Conexión establecida con el pool de base de datos Supabase.`
  ]);

  // KPIs
  const [kpi, setKpi] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    profitMargin: 0,
    bestSellerProduct: "—",
    bestSellerQty: 0
  });

  // Chart data sets
  const [dailySalesData, setDailySalesData] = useState<any[]>([]);
  const [productSalesData, setProductSalesData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any[]>([]);

  // Gamification Rank Distributions
  const [rankDistribution, setRankDistribution] = useState<any[]>([]);
  const [uniqueCustomersCount, setUniqueCustomersCount] = useState(0);
  const [returningCustomersCount, setReturningCustomersCount] = useState(0);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  // Local storage parities
  const [localSalesCount, setLocalSalesCount] = useState(0);
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  const fetchCloudStats = async () => {
    const activePassword = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_password")) || contrasenaAdmin || "PipeAdmin2026";
    if (!activePassword) {
      setError("Contraseña de administrador no configurada.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cloud-stats", {
        headers: {
          "X-Admin-Password": activePassword
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al conectar con la base de datos");
      }
      const { sales: dbSales } = await response.json();
      
      if (!dbSales) {
        throw new Error("No se encontraron datos en la nube.");
      }

      setAllSales(dbSales);
      processSales(dbSales, timeRange);
      
      // Read local state for parity metrics
      if (typeof localStorage !== "undefined") {
        try {
          const localSales = JSON.parse(localStorage.getItem("ventas") || "[]");
          setLocalSalesCount(localSales.length);
          const syncQueue = JSON.parse(localStorage.getItem("sync_queue") || "[]");
          setSyncQueueCount(syncQueue.length);
        } catch (e) {
          console.error("Error reading local sales/queue for telemetry:", e);
        }
      }

      // Append success log
      appendLog(`[INFO] Sincronización de analítica completada. Cargadas ${dbSales.length} ventas de la nube.`);
    } catch (err: any) {
      console.error("Error fetching Cloud statistics:", err);
      setError(err.message || "Error al conectar con la base de datos.");
      appendLog(`[ERROR] Falló la carga de datos de analítica: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const appendLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${time}] ${msg}`].slice(-25)); // Keep last 25 logs
  };

  const runLivePingTest = async () => {
    setIsPinging(true);
    setPingStatus("idle");
    appendLog("[PING] Enviando paquete de latido (heartbeat) al servidor...");
    const startTime = performance.now();
    try {
      const response = await fetch("/api/supabase-status");
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      
      if (response.ok) {
        const data = await response.json();
        setPingLatency(elapsed);
        setPingStatus("success");
        appendLog(`[PONG] Respuesta de la base de datos recibida en ${elapsed}ms.`);
        appendLog(`[DB_STATUS] Conectado: ${data.connected ? "SÍ" : "NO"} | Configurado: ${data.configured ? "SÍ" : "NO"}`);
      } else {
        throw new Error("Server returned non-200 status");
      }
    } catch (err: any) {
      console.error("Ping benchmark fail:", err);
      setPingStatus("error");
      setPingLatency(null);
      appendLog(`[ERROR] Paquete de ping perdido o rechazado: ${err.message || "Servidor inalcanzable"}`);
    } finally {
      setIsPinging(false);
    }
  };

  const getCoDRankName = (orders: number) => {
    if (orders >= 12) return "Leyenda";
    if (orders >= 8) return "Gran Maestro";
    if (orders >= 5) return "Maestro";
    if (orders >= 3) return "Profesional";
    if (orders >= 2) return "Élite";
    return "Recluta";
  };

  const getCoDRankInfo = (orders: number) => {
    if (orders >= 12) return { name: "Leyenda", icon: "👑", color: "#f59e0b" };
    if (orders >= 8) return { name: "Gran Maestro", icon: "💎", color: "#8b5cf6" };
    if (orders >= 5) return { name: "Maestro", icon: "🔮", color: "#ec4899" };
    if (orders >= 3) return { name: "Profesional", icon: "🎖️", color: "#3b82f6" };
    if (orders >= 2) return { name: "Élite", icon: "⚡", color: "#10b981" };
    return { name: "Recluta", icon: "🔰", color: "#64748b" };
  };

  const processSales = (salesData: any[], range: string) => {
    let validSales = salesData.filter((s: any) => s.estado === "Aprobado" || s.estado === "Entregado" || s.estado === "Pre-Aprobado");

    if (range !== "todos") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      
      if (range === "hoy") {
        validSales = validSales.filter(s => s.fecha === todayStr);
      } else if (range === "semana") {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        const lastWeekStr = lastWeek.toISOString().split("T")[0];
        validSales = validSales.filter(s => s.fecha >= lastWeekStr);
      } else if (range === "mes") {
        const lastMonth = new Date();
        lastMonth.setDate(now.getDate() - 30);
        const lastMonthStr = lastMonth.toISOString().split("T")[0];
        validSales = validSales.filter(s => s.fecha >= lastMonthStr);
      }
    }

    let revenueSum = 0;
    let costSum = 0;
    const dailyMap: { [date: string]: number } = {};
    const productMap: { [name: string]: number } = {};

    // Payment methods aggregation
    let efectivoCount = 0;
    let efectivoTotal = 0;
    let transferenciaCount = 0;
    let transferenciaTotal = 0;

    // Hourly aggregation
    const hourBlocks = {
      "Madrugada (12am - 6am)": 0,
      "Mañana (6am - 12pm)": 0,
      "Tarde (12pm - 6pm)": 0,
      "Noche (6pm - 12am)": 0
    };

    // Client maps for gamification
    const clientMap = new Map<string, { nombre: string; telefono: string; pedidos: number; gastado: number }>();

    validSales.forEach((s: any) => {
      const totalVal = Number(s.total) || 0;
      revenueSum += totalVal;
      
      const dateStr = s.fecha;
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + totalVal;

      // Method of payment
      const method = (s.payment_method || "efectivo").toLowerCase();
      if (method === "transferencia" || method === "nequi" || method === "bancolombia") {
        transferenciaCount++;
        transferenciaTotal += totalVal;
      } else {
        efectivoCount++;
        efectivoTotal += totalVal;
      }

      // Hour of day
      const hourStr = s.hora || "12:00";
      const hourNum = parseInt(hourStr.split(":")[0]) || 0;
      if (hourNum >= 0 && hourNum < 6) {
        hourBlocks["Madrugada (12am - 6am)"]++;
      } else if (hourNum >= 6 && hourNum < 12) {
        hourBlocks["Mañana (6am - 12pm)"]++;
      } else if (hourNum >= 12 && hourNum < 18) {
        hourBlocks["Tarde (12pm - 6pm)"]++;
      } else {
        hourBlocks["Noche (6pm - 12am)"]++;
      }

      // Items & Cost of goods
      const items = s.items || [];
      items.forEach((item: any) => {
        const name = item.nombre;
        const qty = Number(item.cantidad) || 0;
        productMap[name] = (productMap[name] || 0) + qty;

        // Cost estimation
        const costUnit = Number(item.costoUnitario) || Number(item.costo) || 0;
        costSum += costUnit * qty;
      });

      // Customer indexing (ignoring empty phones)
      const tel = s.clienteTelefono?.trim();
      if (tel) {
        const existing = clientMap.get(tel) || { nombre: s.clienteNombre || "Cliente Anónimo", telefono: tel, pedidos: 0, gastado: 0 };
        existing.pedidos++;
        existing.gastado += totalVal;
        clientMap.set(tel, existing);
      }
    });

    const sortedDates = Object.keys(dailyMap).sort((a, b) => a.localeCompare(b));
    const dailyTrend = sortedDates.map(d => ({
      Fecha: d,
      Ventas: dailyMap[d]
    }));

    const productSales = Object.keys(productMap).map(name => ({
      Nombre: name,
      Cantidad: productMap[name]
    })).sort((a, b) => b.Cantidad - a.Cantidad);

    let bsProduct = "—";
    let bsQty = 0;
    if (productSales.length > 0) {
      bsProduct = productSales[0].Nombre;
      bsQty = productSales[0].Cantidad;
    }

    const netProfit = revenueSum - costSum;
    const profitMargin = revenueSum > 0 ? (netProfit / revenueSum) * 100 : 0;

    setKpi({
      totalSales: validSales.length,
      totalRevenue: revenueSum,
      totalCost: costSum,
      netProfit,
      profitMargin,
      bestSellerProduct: bsProduct,
      bestSellerQty: bsQty
    });

    setDailySalesData(dailyTrend);
    setProductSalesData(productSales);

    setPaymentData([
      { name: "Efectivo", Transacciones: efectivoCount, Monto: efectivoTotal },
      { name: "Transferencia", Transacciones: transferenciaCount, Monto: transferenciaTotal }
    ]);

    setHourlyData(
      Object.keys(hourBlocks).map(key => ({
        Horario: key,
        Órdenes: hourBlocks[key as keyof typeof hourBlocks]
      }))
    );

    setFinancialData([
      { name: "Finanzas", "Ingresos Totales": revenueSum, "Costo de Compra": costSum, "Ganancia Neta": netProfit }
    ]);

    // Build Gamification Statistics
    const customersArray = Array.from(clientMap.values());
    setUniqueCustomersCount(customersArray.length);

    const recurring = customersArray.filter(c => c.pedidos >= 2).length;
    setReturningCustomersCount(recurring);

    // Rank counts
    const rankCounts: { [key: string]: number } = {
      "Recluta": 0,
      "Élite": 0,
      "Profesional": 0,
      "Maestro": 0,
      "Gran Maestro": 0,
      "Leyenda": 0
    };

    customersArray.forEach(c => {
      const rankName = getCoDRankName(c.pedidos);
      rankCounts[rankName] = (rankCounts[rankName] || 0) + 1;
    });

    const rankChartData = Object.keys(rankCounts).map(rank => {
      const info = getCoDRankInfo(0); // placeholder for default colors
      let color = "#64748b";
      let icon = "🔰";
      if (rank === "Leyenda") { color = "#f59e0b"; icon = "👑"; }
      else if (rank === "Gran Maestro") { color = "#8b5cf6"; icon = "💎"; }
      else if (rank === "Maestro") { color = "#ec4899"; icon = "🔮"; }
      else if (rank === "Profesional") { color = "#3b82f6"; icon = "🎖️"; }
      else if (rank === "Élite") { color = "#10b981"; icon = "⚡"; }

      return {
        name: rank,
        icon,
        "Clientes": rankCounts[rank],
        fill: color
      };
    });

    setRankDistribution(rankChartData);

    // Top Month Customers
    const sortedCustomers = [...customersArray]
      .sort((a, b) => b.pedidos - a.pedidos)
      .slice(0, 5);
    setTopCustomers(sortedCustomers);
  };

  useEffect(() => {
    fetchCloudStats();
  }, []);

  useEffect(() => {
    if (allSales.length > 0) {
      processSales(allSales, timeRange);
    }
  }, [timeRange, allSales]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-zinc-400 space-y-3">
        <div className="h-6 w-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin font-sans"></div>
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse font-mono">Accediendo a la Nube...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
        <p className="text-rose-700 dark:text-rose-400 mb-4 font-bold">{error}</p>
        <button 
          onClick={fetchCloudStats} 
          className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-all active:scale-[0.98] cursor-pointer"
        >
          Reintentar Conexión
        </button>
      </div>
    );
  }

  // Calculate sync parity percent
  const differenceCount = Math.abs(localSalesCount - allSales.length);
  const maxSalesVal = Math.max(localSalesCount, allSales.length, 1);
  const syncParityPercent = Math.max(0, Math.min(100, Math.round(((maxSalesVal - differenceCount) / maxSalesVal) * 100)));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Time Range Filter & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans text-base font-black text-slate-800 dark:text-slate-100">Analítica Cloud en Vivo</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500">Métricas consolidadas directamente de la base de datos Supabase.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button 
            onClick={fetchCloudStats}
            title="Actualizar Datos"
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-150 dark:border-zinc-700 rounded-xl text-slate-500 dark:text-zinc-400 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 p-1 rounded-xl border border-slate-100 dark:border-zinc-800">
            {(["hoy", "semana", "mes", "todos"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timeRange === range
                    ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-xs border border-slate-100 dark:border-zinc-700 font-black"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
                }`}
              >
                {range === "todos" ? "Histórico" : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Tabs View Selector */}
      <div className="flex flex-wrap border-b border-slate-100 dark:border-zinc-800 gap-1 sm:gap-0">
        <button
          onClick={() => setSubTab("general")}
          className={`px-4 sm:px-5 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "general"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          Ventas y Sabores
        </button>
        <button
          onClick={() => setSubTab("pago_tiempo")}
          className={`px-4 sm:px-5 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "pago_tiempo"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Métodos y Horarios
        </button>
        <button
          onClick={() => setSubTab("fidelidad_rangos")}
          className={`px-4 sm:px-5 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "fidelidad_rangos"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <Award className="h-4 w-4" />
          Fidelidad y Rangos
        </button>
        <button
          onClick={() => setSubTab("financiero")}
          className={`px-4 sm:px-5 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "financiero"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <Activity className="h-4 w-4" />
          Análisis Financiero
        </button>
        <button
          onClick={() => setSubTab("telemetria")}
          className={`px-4 sm:px-5 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "telemetria"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <Terminal className="h-4 w-4" />
          Telemetría y Estado
        </button>
      </div>

      {/* RENDER TAB CONTENTS */}
      {subTab === "general" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Ingresos Netos Cloud</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block tracking-tight">{formatCOP(kpi.totalRevenue)}</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Órdenes confirmadas en tiempo real</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Órdenes Procesadas</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block tracking-tight">{kpi.totalSales} <span className="text-xs font-normal text-slate-400">pedidos</span></strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Volumen transaccional en la nube</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Sabor Más Vendido</span>
                <strong className="text-sm font-black text-brand-600 dark:text-brand-400 mt-1.5 block truncate max-w-[180px]">{kpi.bestSellerProduct}</strong>
                <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">{kpi.bestSellerQty} unidades vendidas</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trend Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
              <div className="mb-4">
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Tendencia de Ventas Diarias</h4>
                <p className="text-[10px] text-slate-400">Total recaudado por día directamente de la tabla sales.</p>
              </div>
              
              {dailySalesData.length > 0 ? (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                      <XAxis dataKey="Fecha" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${Math.round(val/1000)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "10px", color: "#fff" }}
                        formatter={(val: any) => [`$${val.toLocaleString()}`, "Recaudo"]}
                      />
                      <Bar dataKey="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center border border-dashed border-slate-150 rounded-xl dark:border-zinc-800 text-slate-400">
                  Sin datos diarios registrados.
                </div>
              )}
            </div>

            {/* Best Seller Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
              <div className="mb-4">
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Paletas y Sabores Más Vendidos</h4>
                <p className="text-[10px] text-slate-400">Unidades vendidas agregadas por sabor en tiempo real.</p>
              </div>

              {productSalesData.length > 0 ? (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productSalesData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="Nombre" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} width={85} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "10px", color: "#fff" }}
                        formatter={(val: any) => [`${val} unidades`, "Despachado"]}
                      />
                      <Bar dataKey="Cantidad" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center border border-dashed border-slate-150 rounded-xl dark:border-zinc-800 text-slate-400">
                  Sin productos vendidos registrados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === "pago_tiempo" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Methods Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
              <div className="mb-4">
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Distribución por Método de Pago</h4>
                <p className="text-[10px] text-slate-400">Comparativa de transacciones y dinero recaudado en Efectivo vs Transferencia.</p>
              </div>

              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: "#3b82f6", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#10b981", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${Math.round(val/1000)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "10px", color: "#fff" }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="Transacciones" fill="#3b82f6" name="Pedidos" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="right" dataKey="Monto" fill="#10b981" name="Recaudado ($)" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly density analysis */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
              <div className="mb-4">
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Densidad de Pedidos por Horas</h4>
                <p className="text-[10px] text-slate-400">Distribución de compras por franjas horarias para identificar picos de demanda.</p>
              </div>

              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="Horario" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "10px", color: "#fff" }}
                      formatter={(val: any) => [`${val} pedidos`, "Volumen"]}
                    />
                    <Bar dataKey="Órdenes" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUB-TAB: FIDELIDAD Y RANGOS (GAMIFICATION ANALYSIS) */}
      {subTab === "fidelidad_rangos" && (
        <div className="space-y-6 animate-fade-in">
          {/* Gamification KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Clientes Únicos</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1 block tracking-tight">{uniqueCustomersCount} <span className="text-xs font-normal text-slate-400">números</span></strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Base de datos telefónica indexada</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Clientes Recurrentes</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1 block tracking-tight">{returningCustomersCount} <span className="text-xs font-normal text-slate-400">personas</span></strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Con 2 o más pedidos comprados</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Tasa de Fidelización</span>
                <strong className="text-xl font-black text-brand-600 dark:text-brand-400 mt-1 block tracking-tight">
                  {uniqueCustomersCount > 0 ? Math.round((returningCustomersCount / uniqueCustomersCount) * 100) : 0}%
                </strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Porcentaje de retorno de clientes</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Frecuencia de Compra</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1 block tracking-tight">
                  {uniqueCustomersCount > 0 ? (allSales.length / uniqueCustomersCount).toFixed(1) : "0.0"} <span className="text-xs font-normal text-slate-400">ped/cli</span>
                </strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Promedio de compras por cliente</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ranks distribution bar chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
              <div className="mb-4">
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Distribución de Rangos Gamificados (CoD Mobile)</h4>
                <p className="text-[10px] text-slate-400">Total de clientes activos clasificados bajo las insignias del club.</p>
              </div>

              {uniqueCustomersCount > 0 ? (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankDistribution} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "10px", color: "#fff" }}
                        formatter={(val: any, name: any, props: any) => [`${val} Clientes`, `${props.payload.icon} ${props.payload.name}`]}
                      />
                      <Bar dataKey="Clientes" radius={[4, 4, 0, 0]} barSize={25}>
                        {rankDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center border border-dashed border-slate-150 rounded-xl dark:border-zinc-800 text-slate-400">
                  No hay datos suficientes para generar la distribución.
                </div>
              )}
            </div>

            {/* Top Month Customers Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
              <div className="mb-4">
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Top 5 Clientes Más Fieles del Periodo</h4>
                <p className="text-[10px] text-slate-400">Usuarios estrella con mayor cantidad de compras registradas.</p>
              </div>

              {topCustomers.length > 0 ? (
                <div className="overflow-x-auto grow">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-850 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 px-3">Pos</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3 text-center">Pedidos</th>
                        <th className="py-2.5 px-3 text-right">Inversión</th>
                        <th className="py-2.5 px-3 text-right">Rango</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                      {topCustomers.map((c, idx) => {
                        const rank = getCoDRankInfo(c.pedidos);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-zinc-850/10 transition-colors text-xs">
                            <td className="py-3 px-3 font-black text-slate-400 font-mono">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{c.nombre}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.telefono}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-zinc-300 font-mono">
                              {c.pedidos}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-brand-600 dark:text-brand-400 font-mono">
                              {formatCOP(c.gastado)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span 
                                style={{ color: rank.color, backgroundColor: `${rank.color}10`, borderColor: `${rank.color}25` }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                              >
                                <span>{rank.icon}</span>
                                <span>{rank.name}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center border border-dashed border-slate-150 rounded-xl dark:border-zinc-800 text-slate-400">
                  Sin clientes registrados aún.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === "financiero" && (
        <div className="space-y-6 animate-fade-in">
          {/* Financial details KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Ingresos de Ventas</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block tracking-tight">{formatCOP(kpi.totalRevenue)}</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Venta total registrada</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Costo de Inversión (Compra)</span>
                <strong className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1.5 block tracking-tight">{formatCOP(kpi.totalCost)}</strong>
                <span className="text-[9px] text-slate-400 block mt-0.5">Costo histórico de fabricación</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Ganancia Neta Calculada</span>
                <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block tracking-tight">{formatCOP(kpi.netProfit)}</strong>
                <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">Margen de utilidad: <span className="text-emerald-600 dark:text-emerald-400">{kpi.profitMargin.toFixed(1)}%</span></span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Income vs Investment comparitive chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150/50 shadow-xs dark:bg-zinc-900/40 dark:border-zinc-800/50 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-sans text-sm font-black text-slate-800 dark:text-slate-200">Balance Financiero en la Nube</h4>
                <p className="text-[10px] text-slate-400">Visualización de ingresos frente al costo de inversión y la utilidad resultante.</p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg">
                Margen Promedio: {kpi.profitMargin.toFixed(1)}%
              </span>
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${Math.round(val/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "10px", color: "#fff" }}
                    formatter={(val: any) => [`$${val.toLocaleString()}`, "COP"]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', marginTop: '12px' }} />
                  <Bar dataKey="Ingresos Totales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                  <Bar dataKey="Costo de Compra" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={50} />
                  <Bar dataKey="Ganancia Neta" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUB-TAB: TELEMETRÍA Y ESTADO DE LA NUBE */}
      {subTab === "telemetria" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Database Health Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Infraestructura Nube</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <h4 className="text-lg font-black text-slate-800 dark:text-white mt-2">Supabase PostgreSQL</h4>
                <p className="text-xs text-slate-400 mt-1">Conexión de backend directa a tablas relacionales de producción.</p>
                
                <div className="space-y-3 mt-5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-zinc-800/60">
                    <span className="text-slate-400">Proveedor de Datos:</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300 font-mono">Supabase Cloud</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-zinc-800/60">
                    <span className="text-slate-400">Región de Hospedaje:</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300 font-mono">AWS us-east-1</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400">Latencia de Red:</span>
                    <span className={`font-mono font-black ${pingLatency && pingLatency < 100 ? "text-emerald-500" : pingLatency ? "text-amber-500" : "text-slate-400"}`}>
                      {pingLatency ? `${pingLatency} ms` : "Sin probar"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={runLivePingTest}
                disabled={isPinging}
                className={`w-full py-2.5 mt-6 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isPinging 
                    ? "bg-amber-500 cursor-not-allowed" 
                    : pingStatus === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : pingStatus === "error"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                }`}
              >
                {isPinging ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Midiendo...
                  </>
                ) : pingStatus === "success" ? (
                  "¡Ping Exitoso! ✓"
                ) : pingStatus === "error" ? (
                  "Fallo de Enlace ✗"
                ) : (
                  <>
                    <Wifi className="h-4 w-4" />
                    Probar Latencia DB
                  </>
                )}
              </button>
            </div>

            {/* Parity & Offline Cache Balance */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Sincronización de Datos</span>
                <h4 className="text-lg font-black text-slate-800 dark:text-white mt-2">Paridad de Persistencia</h4>
                <p className="text-xs text-slate-400 mt-1">Nivel de alineación entre los datos en este navegador y la base de datos centralizada.</p>

                <div className="space-y-3 mt-5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-zinc-800/60">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5" /> Ventas en Local:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300 font-mono">{localSalesCount} ords</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-zinc-800/60">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Cloud className="h-3.5 w-3.5" /> Ventas en la Nube:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300 font-mono">{allSales.length} ords</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-zinc-800/60">
                    <span className="text-slate-400 flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Cola de Subida:
                    </span>
                    <span className={`font-mono font-bold ${syncQueueCount > 0 ? "text-amber-500 font-black" : "text-slate-500"}`}>
                      {syncQueueCount} pendientes
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Estado de Paridad:</span>
                  <span className="font-black text-brand-600 dark:text-brand-400 font-mono">{syncParityPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${syncParityPercent}%` }} 
                    className="bg-brand-600 h-full rounded-full transition-all duration-500"
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 text-center leading-snug">
                  {syncParityPercent === 100 
                    ? "✓ Todos los datos están completamente respaldados y sincronizados en la nube."
                    : `⚠️ Hay ${differenceCount} órdenes de diferencia. Presione "Forzar Sincronización" en Ajustes.`}
                </p>
              </div>
            </div>

            {/* Live Operations Terminal Log */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 flex flex-col shadow-xs lg:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Consola de Operaciones</span>
              <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2 mb-3 flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-brand-600" /> Historial de Registro
              </h4>
              
              <div className="bg-slate-950 text-emerald-400 font-mono text-[9px] p-3.5 rounded-xl grow overflow-y-auto max-h-[160px] min-h-[160px] space-y-1.5 border border-slate-850 shadow-inner scrollbar-thin">
                {terminalLogs.map((log, idx) => {
                  let colorClass = "text-emerald-400";
                  if (log.includes("[ERROR]")) colorClass = "text-rose-400";
                  if (log.includes("[PING]")) colorClass = "text-amber-400";
                  if (log.includes("[SUCCESS]")) colorClass = "text-cyan-400 font-bold";
                  if (log.includes("[DB_STATUS]")) colorClass = "text-purple-300";

                  return (
                    <div key={idx} className={`${colorClass} leading-relaxed break-all`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
