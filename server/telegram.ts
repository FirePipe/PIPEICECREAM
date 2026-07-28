import { Bot, InputFile } from 'grammy'; 
import { getFullDb } from "./db";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || '');

const pendingReceiptRequests: string[] = [];
export function getPendingReceipts() { return pendingReceiptRequests; }
export function clearPendingReceipt(id: string) { 
  const idx = pendingReceiptRequests.indexOf(id); 
  if (idx > -1) pendingReceiptRequests.splice(idx, 1); 
}

// Formateador auxiliar para valores de COP en ticket
function formatNumber(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}

// 3. Controlador principal optimizado sin dependencias de Puppeteer/Chromium (100% confiable y veloz)
export async function sendTicketNotification(chatId: string, orderData: any) {
  try {
    const formattedItems = orderData.itemsSummary 
      ? orderData.itemsSummary.split(", ").map((item: string) => `• ${item}`).join("\n")
      : "No especificado";

    // Mapeo amigable de emojis para estados de pedido y pago
    const orderStatus = (orderData.status || 'Pendiente').toUpperCase();
    const paymentStatus = (orderData.paymentStatus || 'Pendiente').toUpperCase();

    let orderEmoji = "🔄";
    if (orderStatus === "ENTREGADO" || orderStatus === "APROBADO") orderEmoji = "✅";
    else if (orderStatus === "RECHAZADO" || orderStatus === "ELIMINADA") orderEmoji = "❌";

    let paymentEmoji = "⏳";
    if (paymentStatus === "PAGADO" || paymentStatus === "PAGO APROBADO") paymentEmoji = "🟢";
    else if (paymentStatus === "ANULADO" || paymentStatus === "RECHAZADO") paymentEmoji = "🔴";

    const textMsg = 
      `🎫 *TICKET DE COMPRA DIGITAL* 🎫\n` +
      `*Pipe Ice Cream — Sabor que refresca tu día*\n` +
      `----------------------------------------\n` +
      `📌 *Pedido:* #${orderData.idString || 'N/A'}\n` +
      `📅 *Fecha/Hora:* ${orderData.createdAt || 'N/A'}\n` +
      `👤 *Cliente:* ${orderData.customerName || 'N/A'}\n` +
      `📞 *Contacto:* ${orderData.customerPhone || 'N/A'}\n` +
      `----------------------------------------\n` +
      `🛒 *Detalle del Pedido:*\n` +
      `${formattedItems}\n` +
      `----------------------------------------\n` +
      `💳 *Método de Pago:* ${(orderData.paymentMethod || 'EFECTIVO').toUpperCase()}\n` +
      `🚦 *Estado Orden:* ${orderEmoji} ${orderStatus}\n` +
      `🚦 *Estado de Pago:* ${paymentEmoji} ${paymentStatus}\n` +
      `----------------------------------------\n` +
      `💰 *TOTAL A PAGAR:* $ ${orderData.total} COP\n\n` +
      `¡Gracias por refrescar tu día! 🍦`;

    await bot.api.sendMessage(chatId, textMsg, { parse_mode: "Markdown" });
    console.log("[Telegram Bot] Ticket enviado exitosamente vía texto.");
    return { success: true };
  } catch (error) {
    console.error("[Telegram Bot] Error al enviar ticket de texto:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 4. Inicializador del Bot de Telegram en Segundo Plano (Long Polling)
let botStarted = false;

export function startTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN no configurado. El bot de Telegram no se iniciará.");
    return;
  }
  
  if (botStarted) {
    console.log("[Telegram Bot] El bot ya está marcado como iniciado en este proceso.");
    return;
  }
  botStarted = true;
  
  // Comando básico para que el administrador pueda conocer su Chat ID
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.reply(
      `👋 ¡Hola! Soy el asistente automatizado de Pipe Ice Cream. Administrador: ${chatId}\n\n` +
      `¿En qué puedo ayudarte hoy?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            [{ text: "📦 Ver Stock" }, { text: "💰 Ver Balance" }],
            [{ text: "🎫 Generar Comprobante" }]
          ],
          one_time_keyboard: false,
          resize_keyboard: true
        }
      }
    );
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const db = await getFullDb();

    if (text === "📦 Ver Stock") {
        const stock = db.products.map((p: any) => `${p.nombre}: ${p.stock}`).join("\n");
        await ctx.reply(`📦 *Stock Actual:*\n\n${stock}`, { parse_mode: "Markdown" });
    } else if (text === "💰 Ver Balance") {
        const validSales = db.sales.filter((s: any) => s.estado !== "Rechazado" && s.estado !== "Eliminada");
        
        const recaudo = validSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
        
        let costoTotal = 0;
        validSales.forEach((s: any) => {
            (s.items || []).forEach((item: any) => {
                costoTotal += (item.costoUnitario || 0) * (item.cantidad || 0);
            });
        });
        
        const ganancia = recaudo - costoTotal;

        await ctx.reply(
            `💰 *Balance Total de Ventas:*\n\n` +
            `📈 *Recaudo (Ventas):* $ ${formatNumber(recaudo)} COP\n` +
            `📉 *Costo de compra (Inversión):* $ ${formatNumber(costoTotal)} COP\n` +
            `💸 *Ganancias (Utilidad):* $ ${formatNumber(ganancia)} COP`, 
            { parse_mode: "Markdown" }
        );
    } else if (text === "🎫 Generar Comprobante") {
        await ctx.reply("Por favor, envía el ID de la orden que deseas generar (ej: ORD-12345). Asegúrate de escribirlo tal cual aparece.");
    } else if (text.startsWith("ORD-")) {
        const orderId = text.trim();
        const loadingMsg = await ctx.reply(`⏳ Solicitando comprobante de imagen al panel para ${orderId}...`);
        
        pendingReceiptRequests.push(orderId);
        
        let waitTime = 0;
        let processed = false;
        
        // Wait up to 10 seconds for the frontend to process it
        while (waitTime < 10000) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitTime += 1000;
            if (!pendingReceiptRequests.includes(orderId)) {
                processed = true;
                break;
            }
        }
        
        if (!processed) {
            // Fallback to text receipt if panel is not open or unresponsive
            const index = pendingReceiptRequests.indexOf(orderId);
            if (index > -1) pendingReceiptRequests.splice(index, 1);
            
            await bot.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `⚠️ El panel de administración no está abierto.\nGenerando comprobante de texto como respaldo para ${orderId}...`);
            const res = await enviarComprobanteAdmin(orderId);
            
            if (!res) {
                await bot.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `❌ No se pudo encontrar la orden ${orderId}.`);
            } else {
                await bot.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `✅ Comprobante de texto enviado para ${orderId}. (Abre el panel para recibir imágenes)`);
            }
        } else {
            await bot.api.deleteMessage(ctx.chat.id, loadingMsg.message_id);
            await ctx.reply(`✅ Comprobante de imagen enviado exitosamente para la orden ${orderId}.`);
        }
    } else {
        await ctx.reply("No entiendo ese comando. Usa los botones del menú inferior.");
    }
  });

  // Limpiar webhook e iniciar de forma segura en segundo plano
  (async () => {
    // Skip starting long polling in Vercel Serverless environments to prevent functions from hanging
    if (process.env.VERCEL) {
      console.log("[Telegram Bot] Entorno Vercel Serverless detectado. Omitiendo inicio del bot por Long Polling para evitar colgar las funciones.");
      return;
    }

    try {
      // Desactivar cualquier webhook previo que pueda bloquear el long polling
      await bot.api.deleteWebhook({ drop_pending_updates: true }).catch(() => {});
      
      console.log("[Telegram Bot] Iniciando conexión con Telegram...");
      await bot.start({
        onStart: (botInfo) => {
          console.log(`[Telegram Bot] Bot iniciado exitosamente como @${botInfo.username}`);
        }
      });
    } catch (err: any) {
      const errStr = String(err);
      if (errStr.includes("409") || errStr.includes("Conflict") || errStr.includes("terminated by other getUpdates")) {
        console.warn("[Telegram Bot] Aviso: El bot ya se encuentra en ejecución en otra instancia o proceso activo (Conflicto 409). Se omite este inicio redundante.");
      } else {
        console.warn("[Telegram Bot] Advertencia al iniciar el bot de Telegram:", err.message || err);
      }
    }
  })();
}

// 5. Envía un comprobante y detalles del pedido al administrador
export async function enviarComprobanteAdmin(saleId: string): Promise<boolean> {
  try {
    const db = await getFullDb();
    
    // Attempt to find the sale by ID, allowing for flexible padding
    let sale = db.sales.find((s: any) => s.id === saleId);
    
    if (!sale) {
        // Fallback: try finding by matching numerical part
        const numericPart = saleId.replace('ORD-', '');
        sale = db.sales.find((s: any) => {
            const saleNumeric = s.id.replace('ORD-', '');
            return parseInt(saleNumeric, 10) === parseInt(numericPart, 10);
        });
    }

    if (!sale) {
      console.error(`[Telegram Admin] Venta no encontrada para ID: ${saleId}`);
      return false;
    }

    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) {
      console.warn("[Telegram Admin] TELEGRAM_ADMIN_CHAT_ID no configurado. Omitiendo notificación.");
      return false;
    }

    // Adaptar venta a orderData
    const orderData = {
      idString: sale.id.replace('ORD-', ''),
      createdAt: `${sale.fecha} ${sale.hora}`,
      status: sale.estado,
      paymentStatus: sale.payment_status || "Pendiente",
      customerName: sale.clienteNombre,
      customerPhone: sale.clienteTelefono,
      itemsSummary: sale.items.map((item: any) => `${item.cantidad}x ${item.nombre}`).join(", "),
      subtotal: formatNumber(sale.total),
      paymentMethod: sale.payment_method || "EFECTIVO",
      total: formatNumber(sale.total)
    };

    // Envía la imagen del ticket
    await sendTicketNotification(chatId, orderData);
    
    // Envía mensaje de texto estructurado adicional
    const textMsg = 
      `🚨 *NUEVO PEDIDO RECIBIDO* 🚨\n\n` +
      `📌 *Pedido:* #${orderData.idString}\n` +
      `👤 *Cliente:* ${orderData.customerName}\n` +
      `📞 *Contacto:* ${orderData.customerPhone}\n` +
      `📍 *Dirección:* ${sale.clienteDireccion || 'No especificada'}\n` +
      `💳 *Método de Pago:* ${orderData.paymentMethod.toUpperCase()}\n` +
      `💰 *Total:* $ ${orderData.total}\n\n` +
      `📝 *Productos:* \n` +
      sale.items.map((item: any) => `• ${item.cantidad}x ${item.nombre} ($ ${formatNumber(item.precioUnitario * item.cantidad)})`).join("\n") +
      `\n\n⚡ _Usa el panel de administración para gestionar la orden._`;

    await bot.api.sendMessage(chatId, textMsg, { parse_mode: "Markdown" });
    return true;
  } catch (err) {
    console.error("[Telegram Admin] Error al enviar comprobante de admin:", err);
    return false;
  }
}

// 6. Notifica un cambio de estado de un pedido
export async function notificarCambioEstado(saleId: string, nuevoEstado: string) {
  try {
    const db = await getFullDb();
    const sale = db.sales.find((s: any) => s.id === saleId);
    if (!sale) return;

    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) return;

    const orderNo = sale.id.replace('ORD-', '');
    const estadoLimpio = nuevoEstado.toUpperCase();
    
    let emoji = "🔄";
    if (estadoLimpio === "ENTREGADO" || estadoLimpio === "APROBADO") {
        emoji = "✅";
        if (estadoLimpio === "ENTREGADO") {
            await enviarComprobanteAdmin(saleId);
        }
    }
    else if (estadoLimpio === "RECHAZADO" || estadoLimpio === "ELIMINADA") emoji = "❌";

    const textMsg = 
      `🔔 *ESTADO DE PEDIDO ACTUALIZADO*\n\n` +
      `📌 *Pedido:* #${orderNo}\n` +
      `👤 *Cliente:* ${sale.clienteNombre}\n` +
      `📈 *Nuevo Estado:* ${emoji} *${estadoLimpio}*\n` +
      `💰 *Monto:* $ ${formatNumber(sale.total)}\n\n` +
      `La orden ha sido actualizada en el panel administrativo.`;

    await bot.api.sendMessage(chatId, textMsg, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[Telegram Admin] Error al notificar cambio de estado:", err);
  }
}

// 7.5. Envía un ticket digital usando una imagen pre-generada en el cliente (Base64)
export async function enviarTicketDigitalConImagen(saleId: string, base64Image: string): Promise<boolean> {
  try {
    console.log("[Telegram Admin] Iniciando envío de ticket con imagen para saleId:", saleId);
    const db = await getFullDb();
    const sale = db.sales.find((s: any) => s.id === saleId);
    if (!sale) {
      console.error("[Telegram Admin] Venta no encontrada para ID:", saleId);
      return false;
    }

    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) {
      console.warn("[Telegram Admin] TELEGRAM_ADMIN_CHAT_ID no configurado.");
      return false;
    }

    // Validación y saneamiento del flujo Base64 según la Directriz 2
    if (!base64Image || typeof base64Image !== 'string') {
      console.error("[Telegram Admin] El string de imagen provisto es inválido o nulo.");
      return false;
    }

    // Eliminar espacios, saltos de línea y el posible prefijo de Data URL
    let cleanedBase64 = base64Image.trim().replace(/\s/g, "");
    cleanedBase64 = cleanedBase64.replace(/^data:image\/\w+;base64,/, "");

    // Validar formato Base64 básico
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Regex.test(cleanedBase64)) {
      console.error("[Telegram Admin] La cadena provista no cumple con el formato Base64 estándar.");
      return false;
    }

    const buffer = Buffer.from(cleanedBase64, 'base64');
    
    // Validar que el buffer no sea un archivo vacío o corrupto
    if (buffer.length === 0) {
      console.error("[Telegram Admin] El Buffer binario derivado de la imagen Base64 está vacío.");
      return false;
    }
    
    const customerName = sale.clienteNombre || 'Cliente Anónimo';
    const idString = sale.id ? sale.id.replace('ORD-', '') : '000000';

    console.log("[Telegram Admin] Enviando foto a Telegram, buffer size:", buffer.length);
    await bot.api.sendPhoto(chatId, new InputFile(buffer, `ticket-${idString}.png`), {
      caption: `🧾 *Ticket Digital de Compra (Renderizado en Cliente)*\n\n📌 *Pedido:* #${idString}\n👤 *Cliente:* ${customerName}`,
      parse_mode: 'Markdown'
    });
    console.log("[Telegram Admin] Foto enviada exitosamente.");

    return true;
  } catch (err) {
    console.error("[Telegram Admin] Error en enviarTicketDigitalConImagen:", err);
    return false;
  }
}

// 7. Envía un ticket digital a petición
export async function enviarTicketDigital(saleId: string): Promise<boolean> {
  try {
    const db = await getFullDb();
    const sale = db.sales.find((s: any) => s.id === saleId);
    if (!sale) return false;

    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) return false;

    const orderData = {
      idString: sale.id ? sale.id.replace('ORD-', '') : '000000',
      createdAt: `${sale.fecha || 'N/A'} ${sale.hora || 'N/A'}`,
      status: sale.estado || 'Pendiente',
      paymentStatus: sale.payment_status || "Pendiente",
      customerName: sale.clienteNombre || 'Cliente Anónimo',
      customerPhone: sale.clienteTelefono || 'N/A',
      itemsSummary: (sale.items || []).map((item: any) => `${item.cantidad || 0}x ${item.nombre || 'N/A'}`).join(", "),
      subtotal: formatNumber(sale.total || 0),
      paymentMethod: sale.payment_method || "EFECTIVO",
      total: formatNumber(sale.total || 0)
    };

    const res = await sendTicketNotification(chatId, orderData);
    return res.success;
  } catch (err) {
    console.error("[Telegram Admin] Error en enviarTicketDigital:", err);
    return false;
  }
}
