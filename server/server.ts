import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { z } from "zod";
import { getFullDb, saveProductsToDb, saveSalesToDb, saveConfigToDb, restoreDb, saveAuditLogToDb, getAuditLogsFromDb, deleteAuditLogFromDb, clearAuditLogsFromDb, optimizeAuditLogsInDb, getPaginatedAuditLogsFromDb } from "./db";
import { handleChatbotRequest } from "./chatbot";
import { handleAdminAssistantRequest } from "./admin-assistant";
import { supabaseTestConnection, supabaseFetchSales, supabaseDeductStockAtomic, isSupabaseConfigured } from "./supabase";
import { startTelegramBot, enviarComprobanteAdmin, notificarCambioEstado, enviarTicketDigital, enviarTicketDigitalConImagen, getPendingReceipts, clearPendingReceipt } from "./telegram";


dotenv.config();

// Initialize the Telegram Bot in the background (Long Polling)
startTelegramBot();

// ==========================================
// ENVIRONMENT VAR HELPERS
// ==========================================
const getEnvVar = (key: string): string => {
  let val = "";
  if (typeof process !== "undefined" && process.env) {
    val = process.env[key] || process.env[`VITE_${key}`] || "";
  }
  return val;
};

// ==========================================
// AUDIT LOG PARSING HELPERS
// ==========================================
function getClientIp(req: express.Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const parts = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    if (parts.length > 0) return parts[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { browser: "Desconocido", device: "PC / Escritorio" };
  
  let browser = "Desconocido";
  let device = "PC / Escritorio";
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") || ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
  
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
    device = "Celular / Móvil";
    if (ua.includes("ipad") || ua.includes("tablet")) {
      device = "Tablet";
    }
  } else if (ua.includes("ipad") || ua.includes("tablet")) {
    device = "Tablet";
  }
  
  return { browser, device };
}

const app = express();
const PORT = 3000;

// Configure CORS correctly to allow requests from the frontend or Netlify deployment
app.use(cors({
  origin: "*", // Allows robust local/container previews and netlify URLs
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Password"]
}));

app.use(express.json({ limit: '10mb' }));

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const ProductSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, "El nombre del producto es requerido"),
  precio: z.number().min(0, "El precio no puede ser negativo"),
  costo: z.number().min(0, "El costo no puede ser negativo").optional().default(0),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  imagen: z.string().optional().default(""),
  orden_manual: z.number().optional(),
  updated_at: z.string().optional()
});

const ProductsPayloadSchema = z.object({
  products: z.array(ProductSchema)
});

const SaleItemSchema = z.object({
  productId: z.string(),
  nombre: z.string(),
  cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.number().min(0).optional().default(0),
  costoUnitario: z.number().min(0).optional().default(0)
});

const SaleSchema = z.object({
  id: z.string(),
  numero_orden: z.number().optional(),
  fecha: z.string(),
  hora: z.string(),
  clienteNombre: z.string().default(""),
  clienteTelefono: z.string().default(""),
  clienteDireccion: z.string().default(""),
  items: z.array(SaleItemSchema),
  total: z.number().min(0),
  estado: z.string().default("Aprobado"),
  payment_method: z.string().optional(),
  payment_with_bill: z.number().optional(),
  payment_change: z.number().optional(),
  payment_status: z.string().optional(),
  updated_at: z.string().optional()
});

const SalesPayloadSchema = z.object({
  sales: z.array(SaleSchema)
});

const ShopConfigSchema = z.object({
  tiendaNombre: z.string().min(1, "El nombre de la tienda es requerido"),
  contrasenaAdmin: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  metodoOrdenar: z.string().optional(),
  cuentaNumero: z.string().optional(),
  cuentaTitular: z.string().optional(),
  whatsappNumero: z.string().optional(),
  mostrarReloj: z.boolean().optional(),
  mostrarClima: z.boolean().optional(),
  syncEnabled: z.boolean().optional(),
  catalogSortOrder: z.enum(["manual", "stock_desc", "stock_asc", "alphabetical"]).optional(),
  catalogModeEnabled: z.boolean().optional(),
  catalogModeMessage: z.string().optional()
});

const ConfigPayloadSchema = z.object({
  shopConfig: ShopConfigSchema
});

const ChatPayloadSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío"),
  history: z.array(z.any()).optional().default([]),
  catalog: z.array(z.any()).optional().default([]),
  config: z.any().optional()
});

const AdminAssistantPayloadSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío"),
  history: z.array(z.any()).optional().default([])
});

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================
const adminAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers["x-admin-password"];
    const data = await getFullDb();
    
    const envPassword = getEnvVar("ADMIN_PASSWORD");
    const dbPassword = data.shopConfig?.contrasenaAdmin;
    const defaultPassword = "PipeAdmin2026";
    
    const isValid = (envPassword && authHeader === envPassword) ||
                    (dbPassword && authHeader === dbPassword) ||
                    (authHeader === defaultPassword);
    
    if (!authHeader || !isValid) {
      return res.status(401).json({
        error: "No autorizado",
        message: "Acceso denegado. La contraseña de administrador es incorrecta o no fue enviada."
      });
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: "Error de Servidor", message: err.message });
  }
};

// Middleware de depuración y protección de cabeceras para /api/db y /api/checkout
app.use(["/api/db*", "/api/checkout*"], (req, res, next) => {
  // Asegurar cabecera Content-Type como application/json
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  
  // Interceptar res.send para garantizar que la respuesta es JSON válido y no HTML o logs
  const originalSend = res.send;
  res.send = function (body) {
    if (typeof body === "string") {
      const trimmed = body.trim();
      if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<div")) {
        console.error(`[API Debug Middleware] Detectada respuesta HTML inválida para ${req.originalUrl}:`, trimmed.substring(0, 200));
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return originalSend.call(this, JSON.stringify({
          error: "Invalid Response Format",
          message: "Se detectó un formato HTML inesperado en el servidor.",
          details: trimmed.substring(0, 150)
        }));
      }
    }
    return originalSend.call(this, body);
  };
  
  next();
});

// ==========================================
// REST API ROUTES
// ==========================================

// GET database state - Supports partial sync via 'since' parameter with secure role-based sanitization
app.get("/api/db", async (req, res) => {
  try {
    const data = await getFullDb();
    
    // Check if requester is authorized admin
    const authHeader = req.headers["x-admin-password"];
    const envPassword = getEnvVar("ADMIN_PASSWORD");
    const dbPassword = data.shopConfig?.contrasenaAdmin;
    const defaultPassword = "PipeAdmin2026";
    
    const isAuthorizedAdmin = !!authHeader && (
      (envPassword && authHeader === envPassword) ||
      (dbPassword && authHeader === dbPassword) ||
      (authHeader === defaultPassword)
    );
    
    // Safely copy products and restrict sales to authorized admin only
    const productsCopy = JSON.parse(JSON.stringify(data.products || []));
    const salesCopy = isAuthorizedAdmin ? JSON.parse(JSON.stringify(data.sales || [])) : [];
    
    // Mask sensitive admin password from shopConfig if not an authorized admin
    const shopConfigCopy = JSON.parse(JSON.stringify(data.shopConfig || {}));
    if (!isAuthorizedAdmin) {
      delete shopConfigCopy.contrasenaAdmin;
    }
    
    const since = req.query.since as string;
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        const filteredProducts = productsCopy.filter((p: any) => 
          p.updated_at && new Date(p.updated_at) > sinceDate
        );
        const filteredSales = salesCopy.filter((s: any) => 
          s.updated_at && new Date(s.updated_at) > sinceDate
        );
        
        return res.json({
          products: filteredProducts,
          sales: filteredSales,
          shopConfig: shopConfigCopy,
          isPartial: true
        });
      }
    }
    
    res.json({
      products: productsCopy,
      sales: salesCopy,
      shopConfig: shopConfigCopy,
      lastUpdated: data.lastUpdated
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read database", message: error.message });
  }
});

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET Supabase connection status - Publicly readable for status check
app.get("/api/supabase-status", async (req, res) => {
  console.log(`[API] [${new Date().toISOString()}] Received request for /api/supabase-status from ${getClientIp(req)}`);
  try {
    const status = await supabaseTestConnection();
    console.log(`[API] Supabase status check completed. Connected: ${status.connected}, Configured: ${status.configured}`);
    
    // Explicitly set content-type to avoid any ambiguity
    res.setHeader('Content-Type', 'application/json');
    res.json(status);
  } catch (error: any) {
    console.error("[API] Fatal error in /api/supabase-status handler:", error);
    res.status(500).json({ 
      configured: false, 
      connected: false, 
      error: `Internal Server Error: ${error.message || "Unknown error"}` 
    });
  }
});

// GET Supabase config - Publicly readable for dynamic frontend client connection
app.get("/api/supabase-config", (req, res) => {
  res.json({
    url: getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL") || "",
    anonKey: getEnvVar("SUPABASE_ANON_KEY") || getEnvVar("VITE_SUPABASE_ANON_KEY") || ""
  });
});


// POST admin login - Public route that validates password server-side and logs audits
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password, adminName } = req.body;
    if (!password) {
      return res.status(400).json({ error: "La contraseña es requerida" });
    }
    const data = await getFullDb();
    
    const envPassword = getEnvVar("ADMIN_PASSWORD");
    const dbPassword = data.shopConfig?.contrasenaAdmin;
    const defaultPassword = "PipeAdmin2026";
    
    const isValid = (envPassword && password === envPassword) ||
                    (dbPassword && password === dbPassword) ||
                    (password === defaultPassword);
    
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    
    if (isValid) {
      await saveAuditLogToDb({
        fecha: now.toISOString().split("T")[0],
        hora: now.toTimeString().split(" ")[0].substring(0, 5),
        accion: "inicio_sesion",
        admin_responsable: adminName || "admin",
        entidad_afectada: "auth",
        ip,
        navegador: uaInfo.browser,
        dispositivo: uaInfo.device
      });
      res.json({ success: true, message: "Autenticación exitosa" });
    } else {
      await saveAuditLogToDb({
        fecha: now.toISOString().split("T")[0],
        hora: now.toTimeString().split(" ")[0].substring(0, 5),
        accion: "inicio_sesion_fallido",
        admin_responsable: adminName || "desconocido",
        entidad_afectada: "auth",
        ip,
        navegador: uaInfo.browser,
        dispositivo: uaInfo.device
      });
      res.status(401).json({ error: "Contraseña incorrecta" });
    }
  } catch (error: any) {
    res.status(500).json({ error: "Error de Servidor", message: error.message });
  }
});

// POST admin logout - Safely logs logout actions
app.post("/api/admin/logout", async (req, res) => {
  try {
    const { adminName } = req.body;
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    
    await saveAuditLogToDb({
      fecha: now.toISOString().split("T")[0],
      hora: now.toTimeString().split(" ")[0].substring(0, 5),
      accion: "cierre_sesion",
      admin_responsable: adminName || "admin",
      entidad_afectada: "auth",
      ip,
      navegador: uaInfo.browser,
      dispositivo: uaInfo.device
    });
    
    res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (err: any) {
    res.status(500).json({ error: "Server Error", message: err.message });
  }
});

// GET audit logs - Protected admin route
app.get("/api/admin/audit-logs", adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filterAction = req.query.action as string;
    const filterResponsable = req.query.responsable as string;
    const sortOrder = (req.query.sortOrder as "reciente" | "antiguo") || "reciente";

    const { logs, total } = await getPaginatedAuditLogsFromDb(page, limit, filterAction, filterResponsable, sortOrder);
    res.json({ success: true, logs, total });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch audit logs", message: error.message });
  }
});

// DELETE single audit log - Protected admin route
app.delete("/api/admin/audit-logs/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAuditLogFromDb(id);
    res.json({ success: true, message: "Registro de auditoría eliminado" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete audit log", message: error.message });
  }
});

// POST clear all audit logs - Protected admin route
app.post("/api/admin/audit-logs/clear", adminAuthMiddleware, async (req, res) => {
  try {
    await clearAuditLogsFromDb();
    res.json({ success: true, message: "Todos los registros de auditoría han sido eliminados" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to clear audit logs", message: error.message });
  }
});

// POST optimize audit logs - Protected admin route to keep only latest N logs to prevent database saturation
app.post("/api/admin/audit-logs/optimize", adminAuthMiddleware, async (req, res) => {
  try {
    const keepCount = parseInt(req.body.keepCount) || 200;
    await optimizeAuditLogsInDb(keepCount);
    res.json({ success: true, message: `Auditorías optimizadas. Solo se conservaron los últimos ${keepCount} registros.` });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to optimize audit logs", message: error.message });
  }
});

// Simple and robust Mutual Exclusion Lock to prevent concurrent race conditions within the node server process
class AsyncLock {
  private promise: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let resolve: () => void;
    const next = new Promise<void>((r) => {
      resolve = r;
    });
    const current = this.promise;
    this.promise = next;
    await current;
    return resolve!;
  }
}
const checkoutLock = new AsyncLock();

// POST checkout - Public secure endpoint for customers to place orders
app.post("/api/checkout", async (req, res) => {
  const release = await checkoutLock.acquire();
  try {
    const { sale } = req.body;
    if (!sale) {
      return res.status(400).json({ error: "Falta el pedido en el cuerpo de la petición" });
    }
    
    // 1. Fetch fresh DB state (forceRefresh = true bypasses memory TTL)
    const data = await getFullDb(true);
    
    // Idempotency check
    if (sale.clientRequestId) {
      const existingSale = data.sales.find((s: any) => s.clientRequestId === sale.clientRequestId);
      if (existingSale) {
        return res.json({ success: true, sale: existingSale, products: data.products });
      }
    }
    
    console.log("[API/checkout] Starting sale registration for:", sale.id);
    let updatedProducts = data.products;

    if (isSupabaseConfigured()) {
      console.log("[API/checkout] Supabase is configured, deducting stock atomically.");
      // Use PostgreSQL RPC for atomic stock verification and subtraction with FOR UPDATE locking
      const itemsToDeduct = sale.items.map((it: any) => ({
        id: it.productId,
        cantidad: it.cantidad
      }));
      const rpcResult = await supabaseDeductStockAtomic(itemsToDeduct);
      if (!rpcResult.success) {
        console.error("[API/checkout] Stock deduction failed:", rpcResult.error);
        return res.status(400).json({
          error: "Stock Insuficiente",
          message: rpcResult.error === "Stock insuficiente"
            ? `Lo sentimos, no hay suficiente stock disponible para el sabor "${rpcResult.nombre}" (Disponible: ${rpcResult.stock}, Solicitado: ${rpcResult.requested}).`
            : rpcResult.error || "No hay stock suficiente en este momento."
        });
      }
      console.log("[API/checkout] Stock deducted successfully.");
      // Re-fetch the fresh database state containing the deducted stock
      const freshData = await getFullDb(true);
      updatedProducts = freshData.products;
    } else {
      console.warn("[API/checkout] Supabase is NOT configured, using local backup mode.");
      // 2. Rigorous server-side stock verification
      const outOfStockItems: string[] = [];
      for (const item of sale.items) {
        const dbProduct = data.products.find((p: any) => p.id === item.productId);
        if (!dbProduct) {
          return res.status(400).json({ error: "Producto no encontrado", message: `El helado con sabor "${item.nombre}" ya no existe en nuestro catálogo.` });
        }
        if (dbProduct.stock < item.cantidad) {
          outOfStockItems.push(`${dbProduct.nombre} (Solicitado: ${item.cantidad}, Disponible: ${dbProduct.stock})`);
        }
      }

      if (outOfStockItems.length > 0) {
        return res.status(400).json({
          error: "Stock Insuficiente",
          message: `Lo sentimos, no hay suficiente stock disponible para completar su pedido:\n\n${outOfStockItems.join("\n")}\n\nPor favor, actualice su carrito.`
        });
      }

      // 3. Deduct stock safely
      updatedProducts = data.products.map((p: any) => {
        const orderedItem = sale.items.find((item: any) => item.productId === p.id);
        if (orderedItem) {
          return {
            ...p,
            stock: Math.max(0, p.stock - orderedItem.cantidad),
            updated_at: new Date().toISOString()
          };
        }
        return p;
      });
      
      await saveProductsToDb(updatedProducts);
    }
    
    // 4. Assign sequential order number dynamically on the server to prevent duplicates and race conditions
    const maxOrden = data.sales.reduce((max: number, s: any) => {
      let num = 0;
      if (s.numero_orden !== undefined && s.numero_orden !== null) {
        num = Number(s.numero_orden);
      } else if (s.id && s.id.startsWith("ORD-")) {
        num = parseInt(s.id.split("-")[1], 10);
      }
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const numero_orden = maxOrden + 1;
    const orderId = `ORD-${String(numero_orden).padStart(6, '0')}`;
    
    // Format orders count overriding client-sent IDs to ensure database integrity
    const saleWithTime = {
      ...sale,
      id: orderId,
      numero_orden,
      updated_at: new Date().toISOString()
    };
    
    const updatedSales = [saleWithTime, ...data.sales];
    await saveSalesToDb(updatedSales);
    
    // Send voucher and order details to Telegram Admin in the background
    enviarComprobanteAdmin(orderId);
    
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    
    await saveAuditLogToDb({
      fecha: now.toISOString().split("T")[0],
      hora: now.toTimeString().split(" ")[0].substring(0, 5),
      accion: "pedido_creado",
      admin_responsable: "sistema_cliente",
      entidad_afectada: "sales",
      entidad_id: orderId,
      valor_nuevo: saleWithTime,
      ip,
      navegador: uaInfo.browser,
      dispositivo: uaInfo.device
    });
    
    res.json({
      success: true,
      sale: saleWithTime,
      products: updatedProducts
    });
  } catch (err: any) {
    console.error("[API] Error in /api/checkout:", err);
    res.status(500).json({ error: "Error en el servidor", message: err.message });
  } finally {
    release();
  }
});


// POST clear sales - Protected admin route
app.post("/api/db/clear-sales", adminAuthMiddleware, async (req, res) => {
  try {
    const currentDb = await getFullDb();
    const oldSales = JSON.parse(JSON.stringify(currentDb.sales || []));
    
    currentDb.sales = [];
    currentDb.lastUpdated = Date.now();
    await saveSalesToDb([]); // This will update Supabase as well
    
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    
    await saveAuditLogToDb({
      fecha: now.toISOString().split("T")[0],
      hora: now.toTimeString().split(" ")[0].substring(0, 5),
      accion: "pedido_eliminado", // clears all sales
      admin_responsable: req.headers["x-admin-name"] as string || "admin",
      entidad_afectada: "sales",
      entidad_id: "all",
      valor_anterior: oldSales,
      ip,
      navegador: uaInfo.browser,
      dispositivo: uaInfo.device
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to clear sales", message: error.message });
  }
});

// GET cloud stats - Protected admin route
app.get("/api/cloud-stats", adminAuthMiddleware, async (req, res) => {
  try {
    const sales = await supabaseFetchSales();
    if (!sales) {
        return res.status(500).json({ error: "Failed to fetch cloud sales" });
    }
    res.json({ sales });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch cloud statistics", message: error.message });
  }
});

// POST save products - Protected admin route with rich audit logging
app.post("/api/db/products", adminAuthMiddleware, async (req, res) => {
  try {
    // Validate request body schema with Zod
    const result = ProductsPayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validación Fallida", 
        details: result.error.flatten() 
      });
    }

    const oldData = await getFullDb();
    const oldProducts = JSON.parse(JSON.stringify(oldData.products || []));
    
    await saveProductsToDb(result.data.products);
    
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    const adminName = req.headers["x-admin-name"] as string || "admin";
    
    // Record explicit audit logs for changes
    for (const newP of result.data.products) {
      const oldP = oldProducts.find((p: any) => p.id === newP.id);
      if (!oldP) {
        await saveAuditLogToDb({
          fecha: now.toISOString().split("T")[0],
          hora: now.toTimeString().split(" ")[0].substring(0, 5),
          accion: "creacion_producto",
          admin_responsable: adminName,
          entidad_afectada: "products",
          entidad_id: newP.id,
          valor_nuevo: newP,
          ip,
          navegador: uaInfo.browser,
          dispositivo: uaInfo.device
        });
      } else if (JSON.stringify(oldP) !== JSON.stringify(newP)) {
        let action = "actualizacion_producto";
        if (oldP.stock !== newP.stock) action = "cambio_stock";
        else if (oldP.precio !== newP.precio) action = "cambio_precio";
        
        await saveAuditLogToDb({
          fecha: now.toISOString().split("T")[0],
          hora: now.toTimeString().split(" ")[0].substring(0, 5),
          accion: action,
          admin_responsable: adminName,
          entidad_afectada: "products",
          entidad_id: newP.id,
          valor_anterior: oldP,
          valor_nuevo: newP,
          ip,
          navegador: uaInfo.browser,
          dispositivo: uaInfo.device
        });
      }
    }

    res.json({ success: true, products: result.data.products });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save products", message: error.message });
  }
});

// POST save sales - Protected admin route with rich audit logging
app.post("/api/db/sales", adminAuthMiddleware, async (req, res) => {
  try {
    // Validate request body schema with Zod
    const result = SalesPayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validación Fallida", 
        details: result.error.flatten() 
      });
    }

    const oldData = await getFullDb();
    const oldSales = JSON.parse(JSON.stringify(oldData.sales || []));

    await saveSalesToDb(result.data.sales);
    
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    const adminName = req.headers["x-admin-name"] as string || "admin";
    
    // Record audit logs for modifications and trigger telegram notifications
    for (const newS of result.data.sales) {
      const oldS = oldSales.find((s: any) => s.id === newS.id);
      if (!oldS) {
        // Safe background notification for new sales
        enviarComprobanteAdmin(newS.id);

        await saveAuditLogToDb({
          fecha: now.toISOString().split("T")[0],
          hora: now.toTimeString().split(" ")[0].substring(0, 5),
          accion: "pedido_creado",
          admin_responsable: adminName,
          entidad_afectada: "sales",
          entidad_id: newS.id,
          valor_nuevo: newS,
          ip,
          navegador: uaInfo.browser,
          dispositivo: uaInfo.device
        });
      } else if (JSON.stringify(oldS) !== JSON.stringify(newS)) {
        let action = "pedido_actualizado";
        if (oldS.estado !== newS.estado) {
          action = "pedido_estado_cambiado";
          // Trigger status alert
          notificarCambioEstado(newS.id, newS.estado);
        }
        
        await saveAuditLogToDb({
          fecha: now.toISOString().split("T")[0],
          hora: now.toTimeString().split(" ")[0].substring(0, 5),
          accion: action,
          admin_responsable: adminName,
          entidad_afectada: "sales",
          entidad_id: newS.id,
          valor_anterior: oldS,
          valor_nuevo: newS,
          ip,
          navegador: uaInfo.browser,
          dispositivo: uaInfo.device
        });
      }
    }

    res.json({ success: true, sales: result.data.sales });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save sales", message: error.message });
  }
});

// POST save configuration - Protected admin route with audit logging
app.post("/api/db/config", adminAuthMiddleware, async (req, res) => {
  try {
    // Validate request body schema with Zod
    const result = ConfigPayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validación Fallida", 
        details: result.error.flatten() 
      });
    }

    const oldData = await getFullDb();
    const oldConfig = JSON.parse(JSON.stringify(oldData.shopConfig || {}));

    await saveConfigToDb(result.data.shopConfig);
    
    const ip = getClientIp(req);
    const uaInfo = parseUserAgent(req.headers["user-agent"]);
    const now = new Date();
    const adminName = req.headers["x-admin-name"] as string || "admin";
    
    if (JSON.stringify(oldConfig) !== JSON.stringify(result.data.shopConfig)) {
      const maskPassword = (conf: any) => {
        if (!conf) return null;
        const copy = { ...conf };
        delete copy.contrasenaAdmin;
        return copy;
      };
      
      await saveAuditLogToDb({
        fecha: now.toISOString().split("T")[0],
        hora: now.toTimeString().split(" ")[0].substring(0, 5),
        accion: "configuracion_actualizada",
        admin_responsable: adminName,
        entidad_afectada: "shop_config",
        entidad_id: "primary",
        valor_anterior: maskPassword(oldConfig),
        valor_nuevo: maskPassword(result.data.shopConfig),
        ip,
        navegador: uaInfo.browser,
        dispositivo: uaInfo.device
      });
    }

    res.json({ success: true, shopConfig: result.data.shopConfig });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save configuration", message: error.message });
  }
});

// POST restore database - Self-healing endpoint
const RestorePayloadSchema = z.object({
  products: z.array(ProductSchema),
  sales: z.array(SaleSchema),
  shopConfig: ShopConfigSchema,
  lastUpdated: z.number()
});

app.post("/api/db/restore", adminAuthMiddleware, async (req, res) => {
  try {
    const result = RestorePayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validación Fallida", 
        details: result.error.flatten() 
      });
    }
    const { products, sales, shopConfig, lastUpdated } = result.data;
    const currentDb = await getFullDb();
    
    const serverLastUpdated = currentDb.lastUpdated || 0;
    if (lastUpdated > serverLastUpdated) {
      await restoreDb(products, sales, shopConfig, lastUpdated);
      return res.json({ success: true, restored: true, message: "Base de datos restaurada al estado local más reciente." });
    }
    
    res.json({ success: true, restored: false, message: "La base de datos del servidor ya está actualizada." });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to restore database", message: error.message });
  }
});

// AI Chatbot Route with standard & fallback models - Publicly accessible
app.post("/api/gemini/chat", async (req, res) => {
  try {
    // Validate request body schema with Zod
    const result = ChatPayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validación Fallida", 
        details: result.error.flatten() 
      });
    }

    const { message, history, catalog, config } = result.data;
    const responseText = await handleChatbotRequest(message, history, catalog, config);
    res.json({ text: responseText });
  } catch (error: any) {
    console.error("Express routing error during chatbot session:", error);
    res.status(500).json({ error: "Chat processing failed", message: error.message });
  }
});

// AI Admin Assistant Route - Protected admin route
app.post("/api/admin/assistant", adminAuthMiddleware, async (req, res) => {
  try {
    const result = AdminAssistantPayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validación Fallida", 
        details: result.error.flatten() 
      });
    }

    const { message, history } = result.data;
    const dbData = await getFullDb(true); // Always get fresh data
    const responseText = await handleAdminAssistantRequest(
      message,
      history,
      dbData.products || [],
      dbData.sales || [],
      dbData.shopConfig || {}
    );
    res.json({ text: responseText });
  } catch (error: any) {
    console.error("Express routing error during admin assistant session:", error);
    res.status(500).json({ error: "Admin assistant processing failed", message: error.message });
  }
});

// PUT single sale status - Protected admin route with audit logging and Telegram notification
app.put("/api/db/sales/:id/status", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: "El campo 'estado' es requerido en el cuerpo de la petición." });
    }

    const dbData = await getFullDb(true);
    const matchedSaleIndex = dbData.sales.findIndex((s: any) => s.id === id);

    if (matchedSaleIndex === -1) {
      return res.status(404).json({ error: "No encontrado", message: `La orden con ID ${id} no existe.` });
    }

    const oldSale = dbData.sales[matchedSaleIndex];
    const oldEstado = oldSale.estado;

    if (oldEstado !== estado) {
      const updatedSale = {
        ...oldSale,
        estado,
        updated_at: new Date().toISOString()
      };
      
      dbData.sales[matchedSaleIndex] = updatedSale;
      await saveSalesToDb(dbData.sales);

      // Trigger Telegram notification asynchronously
      notificarCambioEstado(id, estado);
      
      // Record audit log
      const ip = getClientIp(req);
      const uaInfo = parseUserAgent(req.headers["user-agent"]);
      const now = new Date();
      const adminName = req.headers["x-admin-name"] as string || "admin";

      await saveAuditLogToDb({
        fecha: now.toISOString().split("T")[0],
        hora: now.toTimeString().split(" ")[0].substring(0, 5),
        accion: "pedido_estado_cambiado",
        admin_responsable: adminName,
        entidad_afectada: "sales",
        entidad_id: id,
        valor_anterior: oldSale,
        valor_nuevo: updatedSale,
        ip,
        navegador: uaInfo.browser,
        dispositivo: uaInfo.device
      });
    }

    res.json({ success: true, sale: dbData.sales[matchedSaleIndex] });
  } catch (error: any) {
    console.error(`[API] Error actualizando estado de venta ${req.params.id}:`, error);
    res.status(500).json({ error: "Fallo al actualizar estado", message: error.message });
  }
});

// POST send notification to Telegram - Protected admin route
app.post("/api/telegram/send-notification", adminAuthMiddleware, async (req, res) => {
  try {
    const { saleId, nuevoEstado } = req.body;
    if (!saleId || !nuevoEstado) return res.status(400).json({ error: "Sale ID and status required" });
    
    await notificarCambioEstado(saleId, nuevoEstado);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to notify via Telegram", message: err.message });
  }
});

// API to poll pending receipt requests
app.get("/api/telegram/pending-receipts", adminAuthMiddleware, (req, res) => {
  res.json({ pending: getPendingReceipts() });
});

// API to clear pending receipt request once processed
app.post("/api/telegram/clear-pending", adminAuthMiddleware, (req, res) => {
  const { saleId } = req.body;
  clearPendingReceipt(saleId);
  res.json({ success: true });
});

// POST send digital receipt to Admin via Telegram
app.post("/api/telegram/send-receipt", adminAuthMiddleware, async (req, res) => {
  try {
    const { saleId, imageBuffer } = req.body;
    if (!saleId) return res.status(400).json({ error: "Sale ID is required" });
    
    let success = false;
    if (imageBuffer) {
      success = await enviarTicketDigitalConImagen(saleId, imageBuffer);
    } else {
      success = await enviarTicketDigital(saleId);
    }

    if (success) {
      res.json({ success: true, message: "Recibo enviado a Telegram correctamente" });
    } else {
      res.status(500).json({ error: "Error al enviar el recibo a Telegram" });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

// Fallback para cualquier endpoint /api/ no encontrado - Evita que caiga en el index.html de Vite/SPA y devuelva HTML
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `El endpoint de API solicitado no existe: ${req.method} ${req.originalUrl}`
  });
});

// ==========================================
// PRODUCTION CONFIGURATION (Non-Netlify / Cloud Run)
// ==========================================

// Solo iniciamos el servidor aquí si estamos en producción y no es Netlify ni Vercel.
// En desarrollo, el servidor se inicia desde server/dev.ts para incluir Vite.
if (!process.env.NETLIFY && !process.env.VERCEL && process.env.NODE_ENV === "production" && !global.serverStarted) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PIPE ICE CREAM Production] Server running on port ${PORT}`);
  });
  (global as any).serverStarted = true;
}

export { app };
