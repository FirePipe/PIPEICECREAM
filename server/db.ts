import fs from "fs";
import path from "path";
import {
  isSupabaseConfigured,
  getSupabaseClient,
  supabaseFetchProducts,
  supabaseSaveProducts,
  supabaseFetchSales,
  supabaseSaveSales,
  supabaseFetchShopConfig,
  supabaseSaveShopConfig
} from "./supabase";

const isVercel = !!process.env.VERCEL;
const BASE_DB_FILE = path.join(process.cwd(), "db.json");
const DB_FILE = isVercel ? "/tmp/db.json" : BASE_DB_FILE;

// On Vercel, copy the template db.json from the build directory to the writable /tmp/ folder
if (isVercel && !fs.existsSync("/tmp/db.json")) {
  try {
    if (fs.existsSync(BASE_DB_FILE)) {
      fs.copyFileSync(BASE_DB_FILE, "/tmp/db.json");
      console.log("[Vercel OS] Copied template db.json to /tmp/db.json successfully.");
    }
  } catch (err) {
    console.warn("[Vercel OS] Could not copy template db.json to /tmp/db.json:", err);
  }
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  costo: number;
  stock: number;
  imagen: string;
  updated_at?: string;
  reserved?: boolean;
  orden_manual?: number;
}

export interface SaleItem {
  productId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
}

export interface Sale {
  id: string;
  numero_orden?: number;
  fecha: string;
  hora: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteDireccion: string;
  items: SaleItem[];
  total: number;
  estado: string;
  payment_method?: string;
  payment_with_bill?: number;
  payment_change?: number;
  payment_status?: string;
  updated_at?: string;
}

export interface ShopConfig {
  tiendaNombre: string;
  contrasenaAdmin: string;
  metodoOrdenar?: string;
  cuentaNumero?: string;
  cuentaTitular?: string;
  whatsappNumero?: string;
  mostrarReloj?: boolean;
  mostrarClima?: boolean;
  syncEnabled?: boolean;
  catalogSortOrder?: "manual" | "stock_desc" | "stock_asc" | "alphabetical";
  catalogModeEnabled?: boolean;
  catalogModeMessage?: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "PROD-1",
    nombre: "Queso Bocadillo",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1W9ZtSzMXJY7lC93En7h9z9F1NC41-IX3"
  },
  {
    id: "PROD-2",
    nombre: "Coco",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1NYj2eM6mWBOMwsFh8kluqgkLICI3AjHd"
  },
  {
    id: "PROD-3",
    nombre: "Salpicon",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1GiLJ4mJQlM_PLTMl9nM9KIQwBqQ_DfLw"
  },
  {
    id: "PROD-4",
    nombre: "ChocoVainilla",
    precio: 2200,
    costo: 1140,
    stock: 2,
    imagen: "https://lh3.googleusercontent.com/d/18lJnx9HSQ8sW7pWQ8nBPZJNtfxxW-4OM"
  },
  {
    id: "PROD-5",
    nombre: "Ron & Pasas",
    precio: 2200,
    costo: 1140,
    stock: 3,
    imagen: "https://lh3.googleusercontent.com/d/1xp3eILHmEgilmBCxwacyKm36oiGiPBtL"
  },
  {
    id: "PROD-6",
    nombre: "Mani",
    precio: 2200,
    costo: 1140,
    stock: 4,
    imagen: "https://lh3.googleusercontent.com/d/1HPUpv6N2cRoK5gWa1u3BEGGjddhSP_xx"
  },
  {
    id: "PROD-7",
    nombre: "Chicle",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/19gAyeGotqO_tRIuS--M4QGWr8HKtBUbb"
  },
  {
    id: "PROD-8",
    nombre: "Paletas Mango Biche",
    precio: 2200,
    costo: 920,
    stock: 4,
    imagen: "https://lh3.googleusercontent.com/d/171saTSIh_oNyGc-ljUwQkML7URKro_0n"
  },
  {
    id: "PROD-9",
    nombre: "Fresa",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1b23jVJoWzBaBySx8GbkR3OdW9QCdb4eF"
  },
  {
    id: "PROD-10",
    nombre: "Guanabana",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1T4RKTW92Mnjo3MM8OD8AXQQA0QymnFWn"
  }
];

const DEFAULT_CONFIG: ShopConfig = {
  tiendaNombre: "PIPE ICE CREAM",
  contrasenaAdmin: "PipeAdmin2026",
  metodoOrdenar: "SABOR QUE REFRESCA TU DÍA",
  cuentaNumero: "3184754263",
  cuentaTitular: "Alba Guaca",
  mostrarReloj: false,
  mostrarClima: false,
  syncEnabled: true,
  catalogSortOrder: "manual",
  catalogModeEnabled: false,
  catalogModeMessage: ""
};

// Shared cached state to optimize speed and provide instant lookups
export interface AuditLog {
  id?: string | number;
  fecha: string;
  hora: string;
  accion: string;
  admin_responsable: string;
  entidad_afectada: string;
  entidad_id?: string;
  valor_anterior?: any;
  valor_nuevo?: any;
  ip?: string;
  navegador?: string;
  dispositivo?: string;
  created_at?: string;
}

let memoryDb: {
  products: Product[];
  sales: Sale[];
  shopConfig: ShopConfig;
  auditLogs?: AuditLog[];
  stock_migrated_v4: boolean;
  stock_migrated_v5?: boolean;
  image_links_migrated_v6?: boolean;
  lastUpdated?: number;
} | null = null;

let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds TTL

// Read the complete database state
export async function getFullDb(forceRefresh = false) {
  const now = Date.now();
  if (memoryDb && !forceRefresh && (now - lastFetchTime < CACHE_TTL)) {
    return memoryDb;
  }

  // 1. Try fetching from Supabase if configured
  if (isSupabaseConfigured()) {
    console.log("[Supabase Engine] Supabase is configured. Fetching database...");
    try {
      const [sProducts, sSales, sConfig] = await Promise.all([
        supabaseFetchProducts(),
        supabaseFetchSales(),
        supabaseFetchShopConfig()
      ]);

      if (sProducts !== null && sSales !== null) {
        const localFallback = await getLocalDbFallback();
        const mergedConfig = sConfig || localFallback.shopConfig || DEFAULT_CONFIG;

        memoryDb = {
          products: sProducts,
          sales: sSales,
          shopConfig: mergedConfig,
          auditLogs: localFallback.auditLogs || [],
          stock_migrated_v4: true,
          stock_migrated_v5: true,
          image_links_migrated_v6: true,
          lastUpdated: Date.now()
        };
        lastFetchTime = Date.now();

        // Auto-seed: If Supabase tables are totally empty but we have local backup data, seed it!
        let hasSeeded = false;
        if (sProducts.length === 0 && localFallback.products.length > 0) {
          console.log("[Supabase Engine] Seeding empty Supabase products with local backup data...");
          await supabaseSaveProducts(localFallback.products);
          memoryDb.products = localFallback.products;
          hasSeeded = true;
        }
        if (!sConfig && localFallback.shopConfig) {
          console.log("[Supabase Engine] Seeding empty Supabase shop config with local backup config...");
          await supabaseSaveShopConfig(localFallback.shopConfig);
          hasSeeded = true;
        }
        if (sSales.length === 0 && localFallback.sales.length > 0) {
          console.log("[Supabase Engine] Seeding empty Supabase sales history with local backup sales...");
          await supabaseSaveSales(localFallback.sales);
          memoryDb.sales = localFallback.sales;
          hasSeeded = true;
        }

        if (hasSeeded) {
          // Re-fetch to guarantee sync state consistency
          const freshProducts = await supabaseFetchProducts();
          const freshSales = await supabaseFetchSales();
          const freshConfig = await supabaseFetchShopConfig();
          if (freshProducts) memoryDb.products = freshProducts;
          if (freshSales) memoryDb.sales = freshSales;
          if (freshConfig) memoryDb.shopConfig = freshConfig;
        }

        return memoryDb;
      }
      console.warn("[Supabase Engine] Failed to query Supabase tables. Falling back to local/blob storage...");
    } catch (err) {
      console.error("[Supabase Engine] Error fetching from Supabase:", err);
    }
  }

  return getLocalDbFallback();
}

// Internal fallback database reader (db.json)
async function getLocalDbFallback() {
  // Fallback to local db.json
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = {
        products: DEFAULT_PRODUCTS,
        sales: [] as Sale[],
        shopConfig: DEFAULT_CONFIG,
        auditLogs: [] as AuditLog[],
        stock_migrated_v4: true,
        stock_migrated_v5: true,
        lastUpdated: Date.now()
      };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
      } catch (err) {
        console.warn("Could not write initial db.json (expected in serverless):", err);
      }
      memoryDb = initialData;
      return memoryDb;
    }
    
    const dataStr = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(dataStr);
    let changed = false;
    
    if (!data.lastUpdated) {
      data.lastUpdated = Date.now();
      changed = true;
    }
    
    if (!data.products) {
      data.products = DEFAULT_PRODUCTS;
      changed = true;
    }
    if (!data.sales) {
      data.sales = [];
      changed = true;
    }
    if (!data.shopConfig) {
      data.shopConfig = DEFAULT_CONFIG;
      changed = true;
    }

    if (!data.shopConfig.cuentaNumero) {
      data.shopConfig.cuentaNumero = "3184754263";
      changed = true;
    }
    if (!data.shopConfig.cuentaTitular) {
      data.shopConfig.cuentaTitular = "Alba Guaca";
      changed = true;
    }
    
    // Ensure Fresa is included
    const hasFresa = data.products.some((p: any) => p.nombre.toLowerCase() === "fresa" || p.id === "PROD-9");
    if (!hasFresa) {
      data.products.push({
        id: "PROD-9",
        nombre: "Fresa",
        precio: 2200,
        costo: 1140,
        stock: 0,
        imagen: "https://lh3.googleusercontent.com/d/1b23jVJoWzBaBySx8GbkR3OdW9QCdb4eF"
      });
      changed = true;
    }

    // Ensure Guanabana is included
    const hasGuanabana = data.products.some((p: any) => p.nombre.toLowerCase() === "guanabana" || p.id === "PROD-10");
    if (!hasGuanabana) {
      data.products.push({
        id: "PROD-10",
        nombre: "Guanabana",
        precio: 2200,
        costo: 1140,
        stock: 0,
        imagen: "https://lh3.googleusercontent.com/d/1T4RKTW92Mnjo3MM8OD8AXQQA0QymnFWn"
      });
      changed = true;
    }

    // Force exact stocks migration v4 requested by user
    if (!data.stock_migrated_v4) {
      const targetStocks: { [key: string]: number } = {
        "Queso Bocadillo": 1,
        "Coco": 0,
        "Salpicon": 2,
        "ChocoVainilla": 3,
        "Ron & Pasas": 4,
        "Mani": 4,
        "Chicle": 1,
        "Paletas Mango Biche": 7,
        "Fresa": 0
      };
      
      data.products = data.products.map((p: any) => {
        if (targetStocks[p.nombre] !== undefined) {
          p.stock = targetStocks[p.nombre];
          changed = true;
        }
        return p;
      });
      data.stock_migrated_v4 = true;
      changed = true;
    }

    // Force exact stocks migration v5 requested by user
    if (!data.stock_migrated_v5) {
      const targetStocks: { [key: string]: number } = {
        "Queso Bocadillo": 0,
        "Coco": 0,
        "Salpicon": 0,
        "ChocoVainilla": 2,
        "Ron & Pasas": 3,
        "Mani": 4,
        "Chicle": 0,
        "Paletas Mango Biche": 4,
        "Fresa": 0
      };
      
      data.products = data.products.map((p: any) => {
        if (targetStocks[p.nombre] !== undefined) {
          p.stock = targetStocks[p.nombre];
          changed = true;
        }
        return p;
      });
      data.stock_migrated_v5 = true;
      changed = true;
    }

    // Force updated image links migration v6 requested by user
    if (!data.image_links_migrated_v6) {
      const newImages: { [key: string]: string } = {
        "Queso Bocadillo": "https://lh3.googleusercontent.com/d/1W9ZtSzMXJY7lC93En7h9z9F1NC41-IX3",
        "Coco": "https://lh3.googleusercontent.com/d/1NYj2eM6mWBOMwsFh8kluqgkLICI3AjHd",
        "Salpicon": "https://lh3.googleusercontent.com/d/1GiLJ4mJQlM_PLTMl9nM9KIQwBqQ_DfLw",
        "ChocoVainilla": "https://lh3.googleusercontent.com/d/18lJnx9HSQ8sW7pWQ8nBPZJNtfxxW-4OM",
        "Ron & Pasas": "https://lh3.googleusercontent.com/d/1xp3eILHmEgilmBCxwacyKm36oiGiPBtL",
        "Mani": "https://lh3.googleusercontent.com/d/1HPUpv6N2cRoK5gWa1u3BEGGjddhSP_xx",
        "Chicle": "https://lh3.googleusercontent.com/d/19gAyeGotqO_tRIuS--M4QGWr8HKtBUbb",
        "Paletas Mango Biche": "https://lh3.googleusercontent.com/d/171saTSIh_oNyGc-ljUwQkML7URKro_0n"
      };
      
      data.products = data.products.map((p: any) => {
        if (newImages[p.nombre] && p.imagen !== newImages[p.nombre]) {
          p.imagen = newImages[p.nombre];
          changed = true;
        }
        return p;
      });
      data.image_links_migrated_v6 = true;
      changed = true;
    }
    
    if (!data.auditLogs) {
      data.auditLogs = [];
      changed = true;
    }
    
    if (changed) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
      } catch (e) {
        console.warn("Could not write local db.json in fallback mode:", e);
      }
    }
    
    memoryDb = data;
    return memoryDb!;
  } catch (err) {
    console.error("Error reading JSON database, using memory defaults:", err);
    memoryDb = {
      products: DEFAULT_PRODUCTS,
      sales: [],
      shopConfig: DEFAULT_CONFIG,
      stock_migrated_v4: true,
      stock_migrated_v5: true
    };
    return memoryDb;
  }
}

// Save complete DB to memory + persistent store
async function persistDb(data: any, changedSales?: Sale[]) {
  memoryDb = data;
  
  // 1. Write to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      console.log("[Supabase Engine] Saving state in Supabase...");
      const tasks = [
        supabaseSaveProducts(data.products),
        supabaseSaveShopConfig(data.shopConfig)
      ];
      if (changedSales) {
        tasks.push(supabaseSaveSales(changedSales));
      }
      await Promise.all(tasks);
    } catch (err) {
      console.error("[Supabase Engine] Failed to sync update to Supabase:", err);
    }
  }

  // 3. Write to local db.json for fallback robustness
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to local db.json file:", err);
  }
}

export async function saveProductsToDb(products: Product[]) {
  const current = await getFullDb();
  
  // Set updated_at for modified/new products
  const productsToUpdate = products.map(p => {
    const existing = current.products.find(ep => ep.id === p.id);
    const hasChanged = !existing || JSON.stringify(existing) !== JSON.stringify(p);
    return {
      ...p,
      updated_at: hasChanged ? new Date().toISOString() : (existing?.updated_at || new Date().toISOString())
    };
  });

  current.products = productsToUpdate;
  current.lastUpdated = Date.now();
  await persistDb(current);
}

export function areSalesEqual(a: Sale, b: Sale): boolean {
  if (a.id !== b.id) return false;
  if (a.fecha !== b.fecha) return false;
  if (a.hora !== b.hora) return false;
  if ((a.clienteNombre || '').trim() !== (b.clienteNombre || '').trim()) return false;
  if ((a.clienteTelefono || '').trim() !== (b.clienteTelefono || '').trim()) return false;
  if ((a.clienteDireccion || '').trim() !== (b.clienteDireccion || '').trim()) return false;
  if (Number(a.total) !== Number(b.total)) return false;
  if (a.estado !== b.estado) return false;
  if ((a.payment_method || 'efectivo') !== (b.payment_method || 'efectivo')) return false;
  if (Number(a.payment_with_bill || 0) !== Number(b.payment_with_bill || 0)) return false;
  if (Number(a.payment_change || 0) !== Number(b.payment_change || 0)) return false;
  if ((a.payment_status || 'Pendiente') !== (b.payment_status || 'Pendiente')) return false;
  
  const itemsA = a.items || [];
  const itemsB = b.items || [];
  if (itemsA.length !== itemsB.length) return false;
  
  for (const itemA of itemsA) {
    const itemB = itemsB.find(it => it.productId === itemA.productId);
    if (!itemB) return false;
    if (Number(itemA.cantidad) !== Number(itemB.cantidad)) return false;
    if (Number(itemA.precioUnitario) !== Number(itemB.precioUnitario)) return false;
    if (Number(itemA.costoUnitario) !== Number(itemB.costoUnitario)) return false;
  }
  
  return true;
}

export async function saveSalesToDb(sales: Sale[]) {
  const current = await getFullDb();
  
  const changedSales: Sale[] = [];
  
  // Set updated_at for modified/new sales
  const salesToUpdate = sales.map(s => {
    const existing = current.sales.find(es => es.id === s.id);
    const hasChanged = !existing || !areSalesEqual(existing, s);
    const updatedSale = {
      ...s,
      updated_at: hasChanged ? new Date().toISOString() : (existing?.updated_at || new Date().toISOString())
    };
    if (hasChanged) changedSales.push(updatedSale);
    return updatedSale;
  });

  current.sales = salesToUpdate;
  current.lastUpdated = Date.now();
  // Always persist to Supabase if we are clearing the sales list
  await persistDb(current, (changedSales.length > 0 || sales.length === 0) ? (sales.length === 0 ? [] : changedSales) : undefined);
}

export async function saveConfigToDb(config: ShopConfig) {
  const current = await getFullDb();
  current.shopConfig = config;
  current.lastUpdated = Date.now();
  await persistDb(current);
}

export async function restoreDb(products: Product[], sales: Sale[], shopConfig: ShopConfig, lastUpdated: number) {
  const current = {
    products,
    sales,
    shopConfig,
    stock_migrated_v4: true,
    stock_migrated_v5: true,
    image_links_migrated_v6: true,
    lastUpdated
  };
  await persistDb(current);
}

export async function saveAuditLogToDb(log: Omit<AuditLog, "id" | "created_at">) {
  const current = await getFullDb();
  if (!current.auditLogs) {
    current.auditLogs = [];
  }
  
  const nextId = current.auditLogs.length > 0 
    ? Math.max(...current.auditLogs.map((l: any) => typeof l.id === 'number' ? l.id : 0)) + 1 
    : 1;
    
  const logWithId: AuditLog = {
    id: nextId,
    created_at: new Date().toISOString(),
    ...log
  };
  
  current.auditLogs.unshift(logWithId);
  if (current.auditLogs.length > 500) {
    current.auditLogs = current.auditLogs.slice(0, 500);
  }
  
  current.lastUpdated = Date.now();
  memoryDb = current;
  
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from("audit_logs").insert({
          fecha: logWithId.fecha,
          hora: logWithId.hora,
          accion: logWithId.accion,
          admin_responsable: logWithId.admin_responsable,
          entidad_afectada: logWithId.entidad_afectada,
          entidad_id: logWithId.entidad_id || null,
          valor_anterior: logWithId.valor_anterior || null,
          valor_nuevo: logWithId.valor_nuevo || null,
          ip: logWithId.ip || '127.0.0.1',
          navegador: logWithId.navegador || 'Desconocido',
          dispositivo: logWithId.dispositivo || 'Dispositivo'
        });
      } catch (err) {
        console.error("[Supabase Engine] Failed to save audit log to Supabase:", err);
      }
    }
  }
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write audit logs to local db.json:", err);
  }
}

export async function getAuditLogsFromDb(): Promise<AuditLog[]> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from("audit_logs")
          .select("id, fecha, hora, accion, admin_responsable, entidad_afectada, entidad_id, valor_anterior, valor_nuevo, ip, navegador, dispositivo, created_at")
          .order("id", { ascending: false })
          .limit(200);
        if (!error && data) {
          return data.map((l: any) => ({
            id: l.id,
            fecha: l.fecha,
            hora: l.hora,
            accion: l.accion,
            admin_responsable: l.admin_responsable,
            entidad_afectada: l.entidad_afectada,
            entidad_id: l.entidad_id,
            valor_anterior: l.valor_anterior,
            valor_nuevo: l.valor_nuevo,
            ip: l.ip,
            navegador: l.navegador,
            dispositivo: l.dispositivo,
            created_at: l.created_at
          }));
        }
      } catch (err) {
        console.error("[Supabase Engine] Exception in fetching audit logs, falling back:", err);
      }
    }
  }
  
  const current = await getFullDb();
  return current.auditLogs || [];
}

export async function getPaginatedAuditLogsFromDb(
  page: number,
  limit: number,
  filterAction?: string,
  filterResponsable?: string,
  sortOrder: "reciente" | "antiguo" = "reciente"
): Promise<{ logs: AuditLog[]; total: number }> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client
          .from("audit_logs")
          .select("id, fecha, hora, accion, admin_responsable, entidad_afectada, entidad_id, valor_anterior, valor_nuevo, ip, navegador, dispositivo, created_at", { count: "exact" })
          .order("id", { ascending: sortOrder === "reciente" ? false : true });

        if (filterAction) query = query.eq("accion", filterAction);
        if (filterResponsable) query = query.eq("admin_responsable", filterResponsable);

        const startIndex = (page - 1) * limit;
        const { data, count, error } = await query
          .range(startIndex, startIndex + limit - 1);

        if (!error && data) {
          const logs = data.map((l: any) => ({
            id: l.id,
            fecha: l.fecha,
            hora: l.hora,
            accion: l.accion,
            admin_responsable: l.admin_responsable,
            entidad_afectada: l.entidad_afectada,
            entidad_id: l.entidad_id,
            valor_anterior: l.valor_anterior,
            valor_nuevo: l.valor_nuevo,
            ip: l.ip,
            navegador: l.navegador,
            dispositivo: l.dispositivo,
            created_at: l.created_at,
          }));
          return { logs, total: count || 0 };
        }
      } catch (err) {
        console.error("[Supabase Engine] Exception fetching paginated audit logs:", err);
      }
    }
  }
  // Fallback to memory DB
  const current = await getFullDb();
  let logs = current.auditLogs || [];
  if (filterAction) logs = logs.filter((l) => l.accion === filterAction);
  if (filterResponsable) logs = logs.filter((l) => l.admin_responsable === filterResponsable);
  
  const startIndex = (page - 1) * limit;
  const paginated = logs.slice(startIndex, startIndex + limit);
  return { logs: paginated, total: logs.length };
}

export async function deleteAuditLogFromDb(id: number | string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from("audit_logs")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("[Supabase Engine] Error deleting audit log:", error);
        }
      } catch (err) {
        console.error("[Supabase Engine] Exception deleting audit log:", err);
      }
    }
  }

  // Fallback / local
  const current = await getFullDb();
  if (current.auditLogs) {
    current.auditLogs = current.auditLogs.filter((l: any) => String(l.id) !== String(id));
  }
  current.lastUpdated = Date.now();
  memoryDb = current;
  await persistDb(current);
  return true;
}

export async function clearAuditLogsFromDb(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from("audit_logs")
          .delete()
          .neq("id", -999999);
// Using a very small number to delete everything
        
        if (error) {
          console.error("[Supabase Engine] Error clearing audit logs:", error);
        }
      } catch (err) {
        console.error("[Supabase Engine] Exception clearing audit logs:", err);
      }
    }
  }

  // Fallback / local
  const current = await getFullDb();
  current.auditLogs = [];
  current.lastUpdated = Date.now();
  
  // Ensure local changes are persisted
  await persistDb(current);

  return true;
}

export async function optimizeAuditLogsInDb(keepCount: number = 200): Promise<boolean> {
  const current = await getFullDb();
  if (current.auditLogs && current.auditLogs.length > keepCount) {
    current.auditLogs = current.auditLogs.slice(0, keepCount);
    current.lastUpdated = Date.now();
    memoryDb = current;
    await persistDb(current);
  }

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from("audit_logs")
          .select("id")
          .order("id", { ascending: false });
        if (!error && data && data.length > keepCount) {
          const cutOffId = data[keepCount - 1].id;
          const { error: delError } = await client
            .from("audit_logs")
            .delete()
            .lt("id", cutOffId);
          if (delError) {
            console.error("[Supabase Engine] Error optimizing audit logs table:", delError);
          }
        }
      } catch (err) {
        console.error("[Supabase Engine] Exception during audit logs table optimization:", err);
      }
    }
  }
  return true;
}

