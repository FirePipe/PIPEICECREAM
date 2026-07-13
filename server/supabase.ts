import { createClient } from "@supabase/supabase-js";
import { Product, Sale, ShopConfig, SaleItem } from "./db";

// Retrieve environment variables in a hybrid, environment-agnostic way
const getEnvVar = (key: string): string => {
  let val = "";
  if (typeof process !== "undefined" && process.env) {
    val = process.env[key] || process.env[`VITE_${key}`] || "";
  }
  return val;
};

const getSupabaseUrl = (): string => getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL") || "";
const getSupabaseKey = (): string => getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY") || "";

// Initialize Supabase Client if configured
export const isSupabaseConfigured = (): boolean => {
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key || url === "undefined" || key === "undefined" || url === "null" || key === "null") {
      return false;
    }
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
};

export const getSupabaseClient = () => {
  try {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (!url || !key || url === "undefined" || key === "undefined" || url === "null" || key === "null") {
      return null;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return null;
    }
    // Trim trailing slash or rest/v1 paths from url if present
    const sanitizedUrl = url.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
    return createClient(sanitizedUrl, key, {
      auth: {
        persistSession: false
      }
    });
  } catch (err) {
    console.error("[Supabase Engine] Error al instanciar el cliente:", err);
    return null;
  }
};

function logSupabaseError(context: string, error: any) {
  if (!error) return;
  console.error(`[Supabase Engine Error] Context: ${context} | Code: ${error.code} | Message: ${error.message} | Details: ${error.details || "none"} | Hint: ${error.hint || "none"}`);
}

// =========================================================================
// PRODUCTS MAPPER & ENDPOINTS
// =========================================================================

export async function supabaseFetchProducts(): Promise<Product[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let { data, error } = await client
      .from("products")
      .select("id, nombre, precio, costo, stock, imagen, updated_at, reserved, orden_manual")
      .order("id", { ascending: true });

    if (error && (error.message.includes("orden_manual") || error.code === "PGRST204" || error.message.includes("column"))) {
      console.warn("[Supabase Engine] 'orden_manual' column not found, falling back to legacy products query...");
      const retryResult = await client
        .from("products")
        .select("id, nombre, precio, costo, stock, imagen, updated_at, reserved")
        .order("id", { ascending: true });
      data = retryResult.data as any;
      error = retryResult.error;
    }

    if (error) {
      logSupabaseError("supabaseFetchProducts", error);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map snake_case columns back to the camelCase application types
    return data.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      precio: Number(row.precio),
      costo: Number(row.costo),
      stock: Number(row.stock),
      imagen: row.imagen || "",
      updated_at: row.updated_at,
      reserved: !!row.reserved,
      orden_manual: row.orden_manual !== undefined && row.orden_manual !== null ? Number(row.orden_manual) : undefined
    }));
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchProducts:", err);
    return null;
  }
}

export async function supabaseSaveProducts(products: Product[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = products.map((p) => {
      const row: any = {
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        costo: p.costo,
        stock: p.stock,
        imagen: p.imagen,
        updated_at: p.updated_at || new Date().toISOString()
      };
      
      // Only include reserved if it's explicitly part of the product object
      if (p.reserved !== undefined) {
        row.reserved = !!p.reserved;
      }

      // Only include orden_manual if it's explicitly part of the product object
      if (p.orden_manual !== undefined) {
        row.orden_manual = p.orden_manual;
      }
      
      return row;
    });

    const { error } = await client
      .from("products")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      // If it's a 'column not found' error for 'orden_manual' or 'reserved', try fallback
      if (error.message.includes("orden_manual") || error.message.includes("reserved") || error.code === "PGRST204") {
        console.warn("[Supabase Engine] Failed with potential column error. Retrying with stripped payload...");
        const fallbackPayload = payload.map(row => {
          const { orden_manual, ...rest } = row;
          return rest;
        });
        const { error: retryErr } = await client
          .from("products")
          .upsert(fallbackPayload, { onConflict: "id" });
        
        if (retryErr) {
          const barePayload = fallbackPayload.map(row => {
            const { reserved, ...rest } = row;
            return rest;
          });
          const { error: finalErr } = await client
            .from("products")
            .upsert(barePayload, { onConflict: "id" });

          if (finalErr) {
            logSupabaseError("supabaseSaveProducts(final)", finalErr);
            throw new Error(`Failed to upsert products even with bare fallback: ${finalErr.message}`);
          }
        }
      } else {
        logSupabaseError("supabaseSaveProducts", error);
        throw new Error(`Failed to upsert products: ${error.message}`);
      }
    }

    console.log(`[Supabase Engine] Successfully upserted ${products.length} products`);

    // Synchronize product deletions (if a product was removed locally, delete it from Supabase)
    try {
      const { data: existing, error: fetchErr } = await client.from("products").select("id");
      if (!fetchErr && existing) {
        const currentIds = new Set(products.map((p) => p.id));
        const idsToDelete = existing.map((row: any) => row.id).filter((id) => !currentIds.has(id));

        if (idsToDelete.length > 0) {
          console.log(`[Supabase Engine] Deleting ${idsToDelete.length} obsolete products from Supabase:`, idsToDelete);
          const { error: delErr } = await client
            .from("products")
            .delete()
            .in("id", idsToDelete);

          if (delErr) {
            console.warn("[Supabase Engine] Non-fatal: could not delete some obsolete products (they are probably referenced by existing sales):", delErr.message);
          } else {
            console.log(`[Supabase Engine] Obsolete products deleted successfully.`);
          }
        }
      }
    } catch (cleanErr) {
      console.warn("[Supabase Engine] Non-fatal exception during obsolete product deletion cleanup:", cleanErr);
    }

    return true;
  } catch (err) {
    console.error("[Supabase Engine] Exception in saveProducts:", err);
    throw err;
  }
}

// =========================================================================
// SALES MAPPER & ENDPOINTS (RELATIONAL: SALES + SALE_ITEMS)
// =========================================================================

export async function supabaseFetchSales(): Promise<Sale[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Fetch sales with their corresponding items selecting only required columns
    const { data: salesData, error: salesError } = await client
      .from("sales")
      .select(`
        id,
        numero_orden,
        fecha,
        hora,
        cliente_nombre,
        cliente_telefono,
        total,
        estado,
        payment_method,
        payment_with_bill,
        payment_change,
        payment_status,
        updated_at,
        sale_items (
          product_id,
          nombre,
          cantidad,
          precio_unitario,
          costo_unitario
        )
      `)
      .order("numero_orden", { ascending: true });

    if (salesError) {
      logSupabaseError("supabaseFetchSales", salesError);
      return null;
    }

    if (!salesData) return [];

    const mappedSales = salesData.map((row: any) => {
      // Reconstruct camelCase items array
      const items: SaleItem[] = (row.sale_items || []).map((item: any) => ({
        productId: item.product_id,
        nombre: item.nombre,
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precio_unitario),
        costoUnitario: Number(item.costo_unitario)
      }));

      // Convert numeric ID back to ORD-000000 format if it's a number
      let id = String(row.id);
      if (!isNaN(Number(row.id)) && !id.startsWith("ORD-") && id.length <= 10) {
        id = `ORD-${id.padStart(6, '0')}`;
      }

      return {
        id,
        numero_orden: row.numero_orden ? Number(row.numero_orden) : undefined,
        fecha: row.fecha,
        hora: row.hora,
        clienteNombre: row.cliente_nombre || "",
        clienteTelefono: row.cliente_telefono || "",
        clienteDireccion: "",
        items,
        total: Number(row.total),
        estado: row.estado || "Pendiente",
        payment_method: row.payment_method || "efectivo",
        payment_with_bill: row.payment_with_bill ? Number(row.payment_with_bill) : undefined,
        payment_change: row.payment_change ? Number(row.payment_change) : undefined,
        payment_status: row.payment_status || "Pendiente",
        updated_at: row.updated_at
      };
    });

    // Order by numero_orden ascending as requested
    const hasNumeroOrden = mappedSales.some(s => s.numero_orden !== undefined && s.numero_orden !== null);
    if (hasNumeroOrden) {
      mappedSales.sort((a, b) => {
        const numA = a.numero_orden || 0;
        const numB = b.numero_orden || 0;
        return numA - numB; // Oldest / first first
      });
    }

    return mappedSales;
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchSales:", err);
    return null;
  }
}

let isSyncingSales = false;

export async function supabaseSaveSales(sales: Sale[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  if (isSyncingSales) {
    console.warn("[Supabase Engine] Sales sync already in progress. Skipping to prevent race condition duplicates.");
    return true;
  }
  isSyncingSales = true;

  try {
    // 0. Deduplicate sales by ID
    const uniqueSales = Array.from(new Map(sales.map(s => [s.id, s])).values());
    
    if (uniqueSales.length === 0) {
      // 1. Intentar llamar al RPC de Supabase que hace TRUNCATE con RESTART IDENTITY CASCADE
      // para limpiar las tablas sales y sale_items y resetear los contadores secuenciales.
      try {
        console.log("[Supabase Engine] Intentando llamar al RPC 'reset_sales_and_sequences' para truncar tablas y reiniciar secuencias...");
        const { data: rpcData, error: rpcError } = await client.rpc("reset_sales_and_sequences");
        if (!rpcError) {
          console.log("[Supabase Engine] RPC 'reset_sales_and_sequences' ejecutado con éxito.");
          return true;
        }
        console.error("[Supabase Engine] DETALLE DEL ERROR AL LLAMAR AL RPC:", JSON.stringify(rpcError, null, 2));
      } catch (rpcErr: any) {
        console.error("[Supabase Engine] Excepción catastrófica al llamar al RPC:", rpcErr.message || rpcErr);
      }

      // 2. Fallback de borrado directo si el RPC no existe o falla
      try {
        console.log("[Supabase Engine] Borrando todos los registros de sale_items...");
        // Use a filter that matches all rows: product_id is not empty
        await client.from("sale_items").delete().neq("product_id", "THIS_VALUE_SHOULD_NOT_EXIST_EVER_XYZ_123");
      } catch (err: any) {
        console.error("[Supabase Engine] Error al borrar sale_items manualmente:", err.message || err);
      }

      try {
        console.log("[Supabase Engine] Borrando todos los registros de sales...");
        // Use a filter that matches all rows: id is not empty
        await client.from("sales").delete().neq("id", "THIS_VALUE_SHOULD_NOT_EXIST_EVER_XYZ_123");
      } catch (err: any) {
        console.error("[Supabase Engine] Error al borrar sales manualmente:", err.message || err);
      }

      return true;
    }

    const salesPayload = uniqueSales.map((s) => {
      // Ensure numero_orden is definitely a number (INT in DB)
      let numericOrder = null;
      if (s.numero_orden !== undefined && s.numero_orden !== null) {
        const orderVal = s.numero_orden as any;
        if (typeof orderVal === 'string' && orderVal.startsWith('ORD-')) {
          numericOrder = parseInt(orderVal.replace('ORD-', ''), 10);
        } else {
          numericOrder = Number(orderVal);
        }
        if (isNaN(numericOrder)) numericOrder = null;
      }

      // Use the string ID directly as the DB column is TEXT
      const cleanId = s.id;

      // Normalize estado and payment_status for DB consistency (CamelCase)
      let normalizedEstado = s.estado || "Pendiente";
      if (normalizedEstado === "ENTREGADO" || normalizedEstado === "Finalizado" || normalizedEstado === "entregado") {
        normalizedEstado = "Entregado";
      } else if (normalizedEstado === "pendiente") {
        normalizedEstado = "Pendiente";
      } else if (normalizedEstado === "aprobado") {
        normalizedEstado = "Aprobado";
      }

      let normalizedPaymentStatus = s.payment_status || "Pendiente";
      if (normalizedPaymentStatus === "pagado" || normalizedPaymentStatus === "PAGADO" || normalizedPaymentStatus === "Pagado") {
        normalizedPaymentStatus = "Pagado";
      } else if (normalizedPaymentStatus === "pendiente" || normalizedPaymentStatus === "PENDIENTE" || normalizedPaymentStatus === "Pendiente") {
        normalizedPaymentStatus = "Pendiente";
      }

      const row: any = {
        id: cleanId,
        fecha: s.fecha,
        hora: s.hora,
        cliente_nombre: s.clienteNombre || "",
        cliente_telefono: s.clienteTelefono || "",
        total: s.total,
        estado: normalizedEstado,
        payment_method: s.payment_method || "efectivo",
        payment_with_bill: s.payment_with_bill || null,
        payment_change: s.payment_change || null,
        payment_status: normalizedPaymentStatus,
        updated_at: s.updated_at || new Date().toISOString()
      };
      
      if (numericOrder !== null) {
        row.numero_orden = numericOrder;
      }
      
      return row;
    });

    // Upsert sales records
    const { error: salesError } = await client
      .from("sales")
      .upsert(salesPayload, { onConflict: "id" });

    if (salesError) {
      logSupabaseError("supabaseSaveSales", salesError);
      throw new Error(`Failed to upsert sales: ${salesError.message}`);
    }

    // 2. Prepare and upsert items using a safer batched approach
    // We process sales in smaller batches to avoid timeouts and minimize race conditions
    const BATCH_SIZE = 50;
    for (let i = 0; i < uniqueSales.length; i += BATCH_SIZE) {
      const batch = uniqueSales.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map((s) => s.id);

      // 2a. Delete existing items for THIS batch only
      const { error: deleteError } = await client
        .from("sale_items")
        .delete()
        .in("sale_id", batchIds);

      if (deleteError) {
        console.error(`[Supabase Engine] Error cleaning up sale_items for batch starting at ${i}:`, deleteError);
        // Continue to insertion anyway, as partial data is better than nothing, but it may cause duplicates if delete failed
      }

      // 2b. Build items for THIS batch
      const itemsPayload: any[] = [];
      batch.forEach((s) => {
        // Deduplicate items in this sale to prevent accidental duplication in the database
        // This ensures that even if the local state has duplicates, Supabase only gets one entry per product per sale
        const itemMap = new Map<string, any>();
        
        (s.items || []).forEach((item) => {
          const key = `${s.id}-${item.productId}`;
          
          // Use the string ID directly as the DB column is TEXT
          const cleanSaleId = s.id;

          if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.cantidad += item.cantidad;
          } else {
            itemMap.set(key, {
              sale_id: cleanSaleId,
              product_id: item.productId || "unknown",
              nombre: item.nombre || "Producto Desconocido",
              cantidad: item.cantidad || 1,
              precio_unitario: item.precioUnitario || 0,
              costo_unitario: item.costoUnitario || 0
            });
          }
        });
        
        itemsPayload.push(...Array.from(itemMap.values()));
      });

      if (itemsPayload.length > 0) {
        // 2c. Bulk insert items for this batch
        const { error: itemsError } = await client
          .from("sale_items")
          .insert(itemsPayload);

        if (itemsError) {
          logSupabaseError(`supabaseSaveSales(sale_items) batch ${i}`, itemsError);
          // Non-fatal error for the whole process, but we log it
        }
      }
    }

    console.log(`[Supabase Engine] Successfully saved ${uniqueSales.length} sales and sync'd nested items in batches`);
    return true;
  } catch (err) {
    console.error("[Supabase Engine] Exception in saveSales:", err);
    throw err;
  } finally {
    isSyncingSales = false;
  }
}

// =========================================================================
// SHOP CONFIG MAPPER & ENDPOINTS
// =========================================================================

export async function supabaseFetchShopConfig(): Promise<ShopConfig | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("shop_config")
      .select("tienda_nombre, contrasena_admin, whatsapp_telefono, metodo_ordenar, cuenta_numero, cuenta_titular, mostrar_reloj, mostrar_clima, sync_enabled, catalog_sort_order, catalog_mode_enabled, catalog_mode_message")
      .eq("id", "primary")
      .single();

    if (error) {
      // If it doesn't exist yet, we'll return null so that the caller can supply defaults and write it initially
      if (error.code === "PGRST116") {
        console.log("[Supabase Engine] No shop config found for id 'primary'. Initializing later.");
        return null;
      }
      logSupabaseError("supabaseFetchShopConfig", error);
      return null;
    }

    if (!data) return null;

    return {
      tiendaNombre: data.tienda_nombre,
      contrasenaAdmin: data.contrasena_admin,
      whatsappNumero: data.whatsapp_telefono || "573185074440",
      metodoOrdenar: data.metodo_ordenar || "",
      cuentaNumero: data.cuenta_numero || "",
      cuentaTitular: data.cuenta_titular || "",
      mostrarReloj: !!data.mostrar_reloj,
      mostrarClima: !!data.mostrar_clima,
      syncEnabled: data.sync_enabled !== false,
      catalogSortOrder: data.catalog_sort_order || "manual",
      catalogModeEnabled: !!data.catalog_mode_enabled,
      catalogModeMessage: data.catalog_mode_message || ""
    };
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchShopConfig:", err);
    return null;
  }
}

export async function supabaseSaveShopConfig(config: ShopConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: "primary",
      tienda_nombre: config.tiendaNombre,
      contrasena_admin: config.contrasenaAdmin,
      whatsapp_telefono: config.whatsappNumero || "",
      metodo_ordenar: config.metodoOrdenar || "",
      cuenta_numero: config.cuentaNumero || "",
      cuenta_titular: config.cuentaTitular || "",
      mostrar_reloj: !!config.mostrarReloj,
      mostrar_clima: !!config.mostrarClima,
      sync_enabled: config.syncEnabled !== false,
      catalog_sort_order: config.catalogSortOrder || "manual",
      catalog_mode_enabled: !!config.catalogModeEnabled,
      catalog_mode_message: config.catalogModeMessage || "",
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from("shop_config")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      logSupabaseError("supabaseSaveShopConfig", error);
      throw new Error(`Failed to upsert shop config: ${error.message}`);
    }

    console.log(`[Supabase Engine] Successfully saved shop configuration: "${config.tiendaNombre}"`);
    return true;
  } catch (err) {
    console.error("[Supabase Engine] Exception in saveShopConfig:", err);
    throw err;
  }
}

export async function supabaseTestConnection(): Promise<{ configured: boolean; connected: boolean; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { configured: false, connected: false, error: "Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY" };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { configured: true, connected: false, error: "No se pudo instanciar el cliente de Supabase" };
  }
  try {
    // Add a race with a timeout to avoid hanging the request
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Tiempo de espera agotado (timeout)")), 8000)
    );
    
    // We explicitly await the query to get { data, error }
    const query = client.from("products").select("id", { count: "exact" }).limit(1);
    
    // Execute the race
    const result = await Promise.race([query, timeout]) as any;
    
    // In supabase-js, the response object contains 'error'
    if (result && result.error) {
      return { configured: true, connected: false, error: `${result.error.code || "ERR"}: ${result.error.message}` };
    }
    
    return { configured: true, connected: true, error: null };
  } catch (err: any) {
    console.error("[Supabase Engine] Connection test failed:", err);
    return { configured: true, connected: false, error: err.message || "Error desconocido al conectar" };
  }
}

export async function supabaseDeductStockAtomic(items: { id: string; cantidad: number }[]): Promise<{ success: boolean; error?: string; nombre?: string; stock?: number; requested?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Supabase no está configurado" };
  }
  try {
    const { data, error } = await client.rpc("deduct_stock_atomic", {
      items_to_deduct: items
    });
    if (error) {
      console.error("[Supabase Engine] Error invoking deduct_stock_atomic:", error);
      return { success: false, error: error.message };
    }
    return data as any;
  } catch (err: any) {
    console.error("[Supabase Engine] Exception invoking deduct_stock_atomic:", err);
    return { success: false, error: err.message || "Error desconocido" };
  }
}

