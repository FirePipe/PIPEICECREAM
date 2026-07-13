import { GoogleGenAI } from "@google/genai";
import { getGeminiClient } from "./chatbot";

export function getProductBase(nombre: string): "Leche" | "Agua" {
  const n = nombre.toLowerCase();
  // Milk base: Queso/Queso Bocadillo, Coco, ChocoVainilla, Ron & Pasas, Maní, Chicle
  if (
    n.includes("queso") || 
    n.includes("coco") || 
    n.includes("choco") || 
    n.includes("pasas") || 
    n.includes("mani") || 
    n.includes("maní") || 
    n.includes("chicle")
  ) {
    return "Leche";
  }
  // Water base: Fresa, Salpicón, Mango Biche, Guanábana, Mora
  return "Agua";
}

export function calculateBusinessMetrics(products: any[], sales: any[]) {
  const totalProducts = products.length;
  let totalStockUnits = 0;
  let totalStockPriceValue = 0;
  let totalStockCostValue = 0;
  const lowStockItems: any[] = [];

  let catalogLecheCount = 0;
  let catalogAguaCount = 0;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    const precio = Number(p.precio) || 0;
    const costo = Number(p.costo) || 0;

    totalStockUnits += stock;
    totalStockPriceValue += stock * precio;
    totalStockCostValue += stock * costo;
    if (stock <= 5) {
      lowStockItems.push({ nombre: p.nombre, stock });
    }

    if (getProductBase(p.nombre) === "Leche") {
      catalogLecheCount++;
    } else {
      catalogAguaCount++;
    }
  });

  const totalOrders = sales.length;
  let totalRevenue = 0;
  let totalCOGS = 0;
  const productSalesMap: Record<string, { cantidad: number; ingresos: number; ganancia: number; base: "Leche" | "Agua" }> = {};
  const paymentMethodMap: Record<string, number> = {};

  let lecheQty = 0;
  let lecheRevenue = 0;
  let lecheCOGS = 0;
  let lecheProfit = 0;

  let aguaQty = 0;
  let aguaRevenue = 0;
  let aguaCOGS = 0;
  let aguaProfit = 0;

  sales.forEach(sale => {
    const isApproved = !sale.estado || sale.estado === "Aprobado" || sale.estado === "Completado" || sale.estado === "Entregado";
    if (isApproved) {
      const total = Number(sale.total) || 0;
      totalRevenue += total;
      
      const method = sale.payment_method || "Efectivo";
      paymentMethodMap[method] = (paymentMethodMap[method] || 0) + total;

      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const qty = Number(item.cantidad) || 0;
          const precio = Number(item.precioUnitario) || 0;
          const costo = Number(item.costoUnitario) || 0;
          const base = getProductBase(item.nombre);
          
          totalCOGS += qty * costo;

          if (!productSalesMap[item.nombre]) {
            productSalesMap[item.nombre] = { cantidad: 0, ingresos: 0, ganancia: 0, base: base };
          }
          productSalesMap[item.nombre].cantidad += qty;
          productSalesMap[item.nombre].ingresos += qty * precio;
          productSalesMap[item.nombre].ganancia += qty * (precio - costo);

          if (base === "Leche") {
            lecheQty += qty;
            lecheRevenue += qty * precio;
            lecheCOGS += qty * costo;
            lecheProfit += qty * (precio - costo);
          } else {
            aguaQty += qty;
            aguaRevenue += qty * precio;
            aguaCOGS += qty * costo;
            aguaProfit += qty * (precio - costo);
          }
        });
      }
    }
  });

  const netProfit = totalRevenue - totalCOGS;
  const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const popularItems = Object.entries(productSalesMap)
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    inventory: {
      totalProducts,
      totalStockUnits,
      totalStockPriceValue,
      totalStockCostValue,
      lowStockItems,
      catalogLecheCount,
      catalogAguaCount
    },
    sales: {
      totalOrders,
      totalRevenue,
      totalCOGS,
      netProfit,
      profitMarginPercent,
      popularItems,
      paymentMethodMap,
      bases: {
        leche: {
          cantidad: lecheQty,
          ingresos: lecheRevenue,
          cogs: lecheCOGS,
          ganancia: lecheProfit,
          margen: lecheRevenue > 0 ? (lecheProfit / lecheRevenue) * 100 : 0
        },
        agua: {
          cantidad: aguaQty,
          ingresos: aguaRevenue,
          cogs: aguaCOGS,
          ganancia: aguaProfit,
          margen: aguaRevenue > 0 ? (aguaProfit / aguaRevenue) * 100 : 0
        }
      }
    }
  };
}

export async function handleAdminAssistantRequest(
  message: string,
  history: any[],
  products: any[],
  sales: any[],
  config: any
): Promise<string> {
  const client = getGeminiClient();
  const metrics = calculateBusinessMetrics(products, sales);
  const shopName = config?.tiendaNombre || "PIPE ICE CREAM";

  // Format summaries to feed into the model
  const lowStockString = metrics.inventory.lowStockItems.length > 0
    ? metrics.inventory.lowStockItems.map(it => `- ${it.nombre}: ${it.stock} unidades restantes`).join("\n")
    : "No hay productos con bajo stock (menor o igual a 5 unidades).";

  const popularItemsString = metrics.sales.popularItems.length > 0
    ? metrics.sales.popularItems.map((it, idx) => `${idx + 1}. ${it.nombre} (Base ${getProductBase(it.nombre)}): ${it.cantidad} unidades vendidas | Ingresos: $${it.ingresos.toLocaleString("es-CO")} COP | Ganancia: $${it.ganancia.toLocaleString("es-CO")} COP`).join("\n")
    : "No se registran ventas para calcular productos populares.";

  const inventoryDetailsString = products.map(p => 
    `- Sabor: ${p.nombre} [Base: ${getProductBase(p.nombre)}] | Stock: ${p.stock} u. | Precio Venta: $${Number(p.precio).toLocaleString("es-CO")} | Costo: $${Number(p.costo || 0).toLocaleString("es-CO")} | Margen unitario: $${(Number(p.precio) - Number(p.costo || 0)).toLocaleString("es-CO")}`
  ).join("\n");

  const systemInstruction = `Eres el Analista Inteligente Administrativo y de Negocios de la heladería ${shopName}. 
Tu propósito exclusivo es ayudar al Administrador del negocio a tomar decisiones estratégicas basadas en los datos reales de ventas, inventario, costos y tipo de base de producto (Leche o Agua).

REGLAS DE COMPORTAMIENTO:
1. NO respondas preguntas orientadas a clientes sobre sabores o productos en tono de atención al cliente. Tu interlocutor es el DUEÑO/ADMINISTRADOR del negocio.
2. Habla con un lenguaje profesional, de negocios, estratégico y analítico. Sé directo y aporta un gran valor administrativo en tus análisis.
3. Utiliza la información provista en el contexto analítico en tiempo real para dar respuestas exactas y precisas. No inventes transacciones.
4. Si el usuario te pregunta sobre ingresos, costos, productos populares, o bases (leche vs agua), utiliza los cálculos numéricos provistos a continuación y muéstralos de forma elegante y estructurada (usa negritas, listas o tablas Markdown si corresponde).
5. Explica claramente la dinámica de preferencia de los consumidores en Cali respecto a helados base Leche (textura cremosa) vs helados base Agua (textura frutal, refrescante para el clima caluroso), y destaca cuál de las dos bases ofrece mejores márgenes y rentabilidad total para el negocio.
6. Mantén tus respuestas concisas pero muy detalladas en lo estratégico (máximo 4 párrafos o una tabla y 2 párrafos de análisis).

DATOS ANALÍTICOS DEL NEGOCIO EN TIEMPO REAL:

--- INVENTARIO ---
- Total sabores en catálogo: ${metrics.inventory.totalProducts} (Base Leche: ${metrics.inventory.catalogLecheCount} | Base Agua: ${metrics.inventory.catalogAguaCount})
- Unidades totales en stock: ${metrics.inventory.totalStockUnits}
- Valor de venta del stock actual: $${metrics.inventory.totalStockPriceValue.toLocaleString("es-CO")} COP
- Valor de costo del stock actual (inversión en nevera): $${metrics.inventory.totalStockCostValue.toLocaleString("es-CO")} COP
- Alerta de Stock Bajo (<= 5 unidades):
${lowStockString}

Detalle de Inventario por Sabor y Base:
${inventoryDetailsString}

--- VENTAS Y RENTABILIDAD ---
- Total pedidos registrados: ${metrics.sales.totalOrders}
- Ingresos Totales (Ventas aprobadas/completadas): $${metrics.sales.totalRevenue.toLocaleString("es-CO")} COP
- Costo Total de Ventas (COGS): $${metrics.sales.totalCOGS.toLocaleString("es-CO")} COP
- Ganancia Neta Real: $${metrics.sales.netProfit.toLocaleString("es-CO")} COP
- Margen de Ganancia Promedio: ${metrics.sales.profitMarginPercent.toFixed(1)}%

--- DESEMPEÑO POR TIPO DE BASE (LECHE VS AGUA) ---
* Helados Base LECHE (Cremosos):
  - Cantidad acumulada vendida: ${metrics.sales.bases.leche.cantidad} unidades
  - Ingresos brutos generados: $${metrics.sales.bases.leche.ingresos.toLocaleString("es-CO")} COP
  - Costo de producción (COGS): $${metrics.sales.bases.leche.cogs.toLocaleString("es-CO")} COP
  - Utilidad neta generada: $${metrics.sales.bases.leche.ganancia.toLocaleString("es-CO")} COP
  - Margen de utilidad por base Leche: ${metrics.sales.bases.leche.margen.toFixed(1)}%

* Helados Base AGUA (Frutales / Refrescantes):
  - Cantidad acumulada vendida: ${metrics.sales.bases.agua.cantidad} unidades
  - Ingresos brutos generados: $${metrics.sales.bases.agua.ingresos.toLocaleString("es-CO")} COP
  - Costo de producción (COGS): $${metrics.sales.bases.agua.cogs.toLocaleString("es-CO")} COP
  - Utilidad neta generada: $${metrics.sales.bases.agua.ganancia.toLocaleString("es-CO")} COP
  - Margen de utilidad por base Agua: ${metrics.sales.bases.agua.margen.toFixed(1)}%

Ranking de Sabores Más Vendidos:
${popularItemsString}

Métodos de Pago Utilizados (Ingresos por método):
${Object.entries(metrics.sales.paymentMethodMap).map(([method, val]) => `- ${method}: $${val.toLocaleString("es-CO")} COP`).join("\n") || "- Sin ventas registradas aún."}
`;
  // Generate a premium styled report for when the Gemini service is unavailable
  function getLocalFallbackReport(errDetail?: string): string {
    const lowStockString = metrics.inventory.lowStockItems.length > 0
      ? metrics.inventory.lowStockItems.map((it: any) => `- **${it.nombre}**: ${it.stock} unidades restantes.`).join("\n")
      : "✅ Todo el stock se encuentra en niveles saludables (mayor a 5 unidades).";

    const popularItemsString = metrics.sales.popularItems.length > 0
      ? metrics.sales.popularItems.slice(0, 4).map((it: any, idx: number) => `**${idx + 1}. ${it.nombre}** (${it.cantidad} u. vendidas [Base ${getProductBase(it.nombre)}])`).join("\n")
      : "Aún no se registran ventas para calcular productos populares.";

    return `⚠️ **Servicio Analítico Temporalmente Simplificado**
${errDetail ? `*Nota: El motor de inteligencia artificial de Gemini reportó alta demanda o error temporal (${errDetail}). Mostrando reporte ejecutivo local automatizado.*` : `*Nota: El asistente inteligente de negocios se encuentra operando sin conexión a internet o sin API Key de Gemini.*`}

📊 **Reporte Ejecutivo de Negocios — ${shopName}**

💰 **Rentabilidad y Balance Financiero:**
- **Ingresos Totales:** $${metrics.sales.totalRevenue.toLocaleString("es-CO")} COP *(De ${metrics.sales.totalOrders} pedidos aprobados)*
- **Costo de Ventas (COGS):** $${metrics.sales.totalCOGS.toLocaleString("es-CO")} COP
- **Ganancia Neta Real:** **$${metrics.sales.netProfit.toLocaleString("es-CO")} COP**
- **Margen de Utilidad Promedio:** **${metrics.sales.profitMarginPercent.toFixed(1)}%**

🥛 **Preferencia de Base (Leche vs Agua):**
- **Bases de Leche (Cremosos):** **${metrics.sales.bases.leche.cantidad} unidades** vendidas | Ingresos: $${metrics.sales.bases.leche.ingresos.toLocaleString("es-CO")} COP | Utilidad: $${metrics.sales.bases.leche.ganancia.toLocaleString("es-CO")} COP | Margen: ${metrics.sales.bases.leche.margen.toFixed(1)}%
- **Bases de Agua (Refrescantes):** **${metrics.sales.bases.agua.cantidad} unidades** vendidas | Ingresos: $${metrics.sales.bases.agua.ingresos.toLocaleString("es-CO")} COP | Utilidad: $${metrics.sales.bases.agua.ganancia.toLocaleString("es-CO")} COP | Margen: ${metrics.sales.bases.agua.margen.toFixed(1)}%

📦 **Estado de Inventario en Neveras:**
- **Total Sabores en Catálogo:** ${metrics.inventory.totalProducts} sabores
- **Stock Total Disponible:** ${metrics.inventory.totalStockUnits} unidades
- **Inversión Inmovilizada (Costo Stock):** $${metrics.inventory.totalStockCostValue.toLocaleString("es-CO")} COP
- **Valor Comercial de Reventa:** $${metrics.inventory.totalStockPriceValue.toLocaleString("es-CO")} COP

⚠️ **Alertas de Stock Crítico (5 unidades o menos):**
${lowStockString}

🏆 **Sabores más Vendidos (Top de Salida):**
${popularItemsString}

*(La IA volverá a activarse automáticamente una vez se reestablezca la disponibilidad de los servidores).*`;
  }

  if (!client) {
    return getLocalFallbackReport();
  }

  try {
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      });
    }
    
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Highly resilient retry and model fallback strategy (gemini-3.5-flash -> gemini-3.1-flash-lite)
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;
    let responseText = "";

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Admin Assistant] Trying ${model} (Attempt ${attempt}/2)...`);
          const response = await client.models.generateContent({
            model: model,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.5,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.log(`[Admin Assistant] Attempt ${attempt} with ${model} did not complete successfully. Retrying next step...`);
          // Wait briefly (500ms) before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      throw lastError || new Error("Failed to generate response after trying multiple models.");
    }

    return responseText;
  } catch (err: any) {
    console.log("Notice: Gemini API not responding for Admin Assistant, generating fallback report.");
    return getLocalFallbackReport(err.message || "Interrupción de red/servidor");
  }
}
