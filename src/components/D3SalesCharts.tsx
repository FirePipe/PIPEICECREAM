import React, { useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Sale } from '../types';
import { parseSaleDate } from '../lib/sanitization';
import { Award, BarChart3, TrendingUp } from 'lucide-react';

const formatCOP = (value: number) => `$${new Intl.NumberFormat('es-CO').format(value)}`;

interface D3SalesChartsProps {
  sales: Sale[];
}

export const D3SalesCharts: React.FC<D3SalesChartsProps> = ({ sales }) => {
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);

  const [timePeriod, setTimePeriod] = React.useState<"diario" | "semanal" | "mensual">("diario");

  // Filter valid sales
  const validSales = useMemo(() => {
    return sales.filter((s) => s && s.estado !== "Eliminada" && s.estado !== "Rechazado");
  }, [sales]);

  // Daily/Weekly/Monthly data processing
  const timeSeriesData = useMemo(() => {
    const map = new Map<string, number>();
    
    validSales.forEach(s => {
      const dateObj = parseSaleDate(s.fecha);
      if (!dateObj) return;
      
      let key = "";
      if (timePeriod === "diario") {
        key = dateObj.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      } else if (timePeriod === "semanal") {
        // Simple week string
        const week = d3.timeWeek.floor(dateObj);
        key = week.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      } else if (timePeriod === "mensual") {
        key = dateObj.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
      }
      
      const safeTotal = typeof s.total === "number" && !isNaN(s.total) ? s.total : 0;
      map.set(key, (map.get(key) || 0) + safeTotal);
    });
    
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .slice(-14);
  }, [validSales, timePeriod]);

  // Prepare Top Products and Profit Margins Data for Bar Chart
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
          nombre: nombre.length > 15 ? nombre.substring(0, 15) + '...' : nombre,
          cantidad: data.cantidad,
          ingresos: data.ingresos,
          ganancia: ganancia > 0 ? ganancia : 0,
          margen: margenPorcentual,
        };
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10); // Top 10
  }, [validSales]);

  // Render Bar Chart
  useEffect(() => {
    if (!barChartRef.current || topProductsData.length === 0) return;
    
    // Clear previous
    d3.select(barChartRef.current).selectAll("*").remove();
    
    const width = barChartRef.current.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    
    const svg = d3.select(barChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);
      
    const x = d3.scaleBand()
      .domain(topProductsData.map(d => d.nombre))
      .range([margin.left, width - margin.right])
      .padding(0.3);
      
    const y = d3.scaleLinear()
      .domain([0, d3.max(topProductsData, d => d.ingresos) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);
      
    // Add tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(30, 41, 59, 0.95)")
      .style("color", "#fff")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 10px 25px -5px rgba(0,0,0,0.3)");

    svg.append("g")
      .attr("fill", "#3b82f6")
      .selectAll("rect")
      .data(topProductsData)
      .join("rect")
      .attr("x", d => x(d.nombre) || 0)
      .attr("y", d => y(0))
      .attr("height", 0)
      .attr("width", x.bandwidth())
      .attr("rx", 4)
      .attr("ry", 4)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("fill", "#60a5fa");
        tooltip.style("visibility", "visible")
          .html(`<strong>${d.nombre}</strong><br/>Ingresos: ${formatCOP(d.ingresos)}<br/>Ganancia: ${formatCOP(d.ganancia)}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("fill", "#3b82f6");
        tooltip.style("visibility", "hidden");
      })
      .transition()
      .duration(800)
      .attr("y", d => y(d.ingresos))
      .attr("height", d => y(0) - y(d.ingresos));

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-25)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("fill", "#64748b")
      .style("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat((d: any) => `$${d/1000}k`))
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .style("font-size", "10px");
      
    // Remove axes domain lines for cleaner look
    svg.selectAll(".domain").remove();
    
    return () => {
      d3.selectAll(".d3-tooltip").remove();
    };
  }, [topProductsData]);

  // Render Line Chart
  useEffect(() => {
    if (!lineChartRef.current || timeSeriesData.length === 0) return;
    
    d3.select(lineChartRef.current).selectAll("*").remove();
    
    const width = lineChartRef.current.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 70 };
    
    const svg = d3.select(lineChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);
      
    const x = d3.scalePoint()
      .domain(timeSeriesData.map(d => d.date))
      .range([margin.left, width - margin.right])
      .padding(0.5);
      
    const y = d3.scaleLinear()
      .domain([0, d3.max(timeSeriesData, d => d.total) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);
      
    const line = d3.line<any>()
      .x(d => x(d.date) || 0)
      .y(d => y(d.total))
      .curve(d3.curveMonotoneX);

    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(30, 41, 59, 0.95)")
      .style("color", "#fff")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "rgba(148, 163, 184, 0.1)")
      .attr("stroke-dasharray", "3,3");

    const path = svg.append("path")
      .datum(timeSeriesData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Animate path
    const totalLength = (path.node() as SVGPathElement).getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    svg.append("g")
      .selectAll("circle")
      .data(timeSeriesData)
      .join("circle")
      .attr("cx", d => x(d.date) || 0)
      .attr("cy", d => y(d.total))
      .attr("r", 0)
      .attr("fill", "#10b981")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 6);
        tooltip.style("visibility", "visible")
          .html(`<strong>${d.date}</strong><br/>Total: ${formatCOP(d.total)}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4);
        tooltip.style("visibility", "hidden");
      })
      .transition()
      .delay((d, i) => i * (1500 / timeSeriesData.length))
      .duration(300)
      .attr("r", 4);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "#64748b")
      .style("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat((d: any) => `$${d/1000}k`))
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .style("font-size", "10px");

    svg.selectAll(".domain").remove();

    return () => {
      d3.selectAll(".d3-tooltip").remove();
    };
  }, [timeSeriesData]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Popular Products with Financial Margins (Full Width) */}
      <div className="bg-white dark:bg-zinc-900/50 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col h-full min-h-[420px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-blue-500 animate-bounce" style={{ animationDuration: "3s" }} />
              Top Productos (D3.js)
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Desglose de ingresos por producto más vendido
            </p>
          </div>
        </div>
        
        <div className="relative flex-1 w-full h-[300px] mb-4" ref={barChartRef}>
          {topProductsData.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No hay datos de ventas disponibles
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col h-full min-h-[420px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500 animate-bounce" style={{ animationDuration: "3s" }} />
              Tendencia de Ventas (D3.js)
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Análisis interactivo de ingresos en el tiempo
            </p>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-xl">
            {(["diario", "semanal", "mensual"] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  timePeriod === period 
                    ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-slate-200 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative flex-1 w-full h-[300px] mb-4" ref={lineChartRef}>
          {timeSeriesData.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No hay datos de ventas disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
