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
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("id", { ascending: true });

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
      nombre: row.nombre || "",
      precio: Number(row.precio || 0),
      costo: Number(row.costo || 0),
      stock: Number(row.stock || 0),
      imagen: row.imagen || "",
      version: row.version !== undefined && row.version !== null ? Number(row.version) : 1,
      updated_at: row.updated_at,
      reserved: !!row.reserved,
      orden_manual: row.orden_manual !== undefined && row.orden_manual !== null ? Number(row.orden_manual) : undefined
    }));
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchProducts:", err);
    return null;
  }
}

let unsupportedProductColumns = new Set<string>();

export async function supabaseSaveProducts(products: Product[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const buildPayload = (colsToOmit: Set<string>) => {
      return products.map((p) => {
        const row: any = {
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          costo: p.costo,
          stock: p.stock,
          imagen: p.imagen || ""
        };
        
        if (!colsToOmit.has("version") && p.version !== undefined) {
          row.version = p.version;
        }
        if (!colsToOmit.has("updated_at")) {
          row.updated_at = p.updated_at || new Date().toISOString();
        }
        if (!colsToOmit.has("reserved") && p.reserved !== undefined) {
          row.reserved = !!p.reserved;
        }
        if (!colsToOmit.has("orden_manual") && p.orden_manual !== undefined) {
          row.orden_manual = p.orden_manual;
        }
        
        return row;
      });
    };

    let payload = buildPayload(unsupportedProductColumns);

    let { error } = await client
      .from("products")
      .upsert(payload, { onConflict: "id" });

    if (error && (error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("schema cache"))) {
      console.warn("[Supabase Engine] Column mismatch in products upsert. Retrying with fallback schema tiers...");
      
      const fallbackTiers = [
        ["version", "orden_manual"],
        ["version", "orden_manual", "reserved"],
        ["version", "orden_manual", "reserved", "updated_at"]
      ];

      let succeeded = false;
      for (const tier of fallbackTiers) {
        const tierSet = new Set([...unsupportedProductColumns, ...tier]);
        const fallbackPayload = buildPayload(tierSet);
        const { error: retryErr } = await client
          .from("products")
          .upsert(fallbackPayload, { onConflict: "id" });
        
        if (!retryErr) {
          tier.forEach(col => unsupportedProductColumns.add(col));
          console.log(`[Supabase Engine] Successfully upserted products without missing columns: ${tier.join(", ")}`);
          succeeded = true;
          break;
        }
      }

      if (!succeeded) {
        const barePayload = products.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          costo: p.costo,
          stock: p.stock,
          imagen: p.imagen || ""
        }));
        const { error: finalErr } = await client
          .from("products")
          .upsert(barePayload, { onConflict: "id" });

        if (finalErr) {
          logSupabaseError("supabaseSaveProducts(final)", finalErr);
          throw new Error(`Failed to upsert products even with bare fallback: ${finalErr.message}`);
        }
        ["version", "orden_manual", "reserved", "updated_at"].forEach(col => unsupportedProductColumns.add(col));
        succeeded = true;
      }
    } else if (error) {
      logSupabaseError("supabaseSaveProducts", error);
      throw new Error(`Failed to upsert products: ${error.message}`);
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
            console.warn("[Supabase Engine] Non-fatal: could not delete some obsolete products:", delErr.message);
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
    const { data: salesData, error: salesError } = await client
      .from("sales")
      .select(`
        *,
        sale_items (
          *
        )
      `)
      .order("numero_orden", { ascending: true });

    if (salesError) {
      logSupabaseError("supabaseFetchSales", salesError);
      return null;
    }

    if (!salesData) return [];

    const mappedSales = salesData.map((row: any) => {
      const items: SaleItem[] = (row.sale_items || []).map((item: any) => ({
        productId: item.product_id,
        nombre: item.nombre,
        cantidad: Number(item.cantidad || 0),
        precioUnitario: Number(item.precio_unitario || 0),
        costoUnitario: Number(item.costo_unitario || 0)
      }));

      let id = String(row.id);
      if (!isNaN(Number(row.id)) && !id.startsWith("ORD-") && id.length <= 10) {
        id = `ORD-${id.padStart(6, '0')}`;
      }

      return {
        id,
        numero_orden: row.numero_orden !== undefined && row.numero_orden !== null ? Number(row.numero_orden) : undefined,
        fecha: row.fecha || "",
        hora: row.hora || "",
        clienteNombre: row.cliente_nombre || "",
        clienteTelefono: row.cliente_telefono || "",
        clienteDireccion: "",
        items,
        total: Number(row.total || 0),
        estado: row.estado || "Pendiente",
        payment_method: row.payment_method || "efectivo",
        payment_with_bill: row.payment_with_bill ? Number(row.payment_with_bill) : undefined,
        payment_change: row.payment_change ? Number(row.payment_change) : undefined,
        payment_status: row.payment_status || "Pendiente",
        updated_at: row.updated_at
      };
    });

    const hasNumeroOrden = mappedSales.some(s => s.numero_orden !== undefined && s.numero_orden !== null);
    if (hasNumeroOrden) {
      mappedSales.sort((a, b) => {
        const numA = a.numero_orden || 0;
        const numB = b.numero_orden || 0;
        return numA - numB;
      });
    }

    return mappedSales;
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchSales:", err);
    return null;
  }
}

let isSyncingSales = false;
let unsupportedSalesColumns = new Set<string>();

export async function supabaseSaveSales(sales: Sale[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  if (isSyncingSales) {
    console.warn("[Supabase Engine] Sales sync already in progress. Skipping to prevent race condition duplicates.");
    return true;
  }
  isSyncingSales = true;

  try {
    const uniqueSales = Array.from(new Map(sales.map(s => [s.id, s])).values());
    
    if (uniqueSales.length === 0) {
      try {
        console.log("[Supabase Engine] Intentando llamar al RPC 'reset_sales_and_sequences' para truncar tablas y reiniciar secuencias...");
        const { error: rpcError } = await client.rpc("reset_sales_and_sequences");
        if (!rpcError) {
          console.log("[Supabase Engine] RPC 'reset_sales_and_sequences' ejecutado con éxito.");
          return true;
        }
      } catch (rpcErr: any) {
        console.error("[Supabase Engine] Excepción al llamar al RPC:", rpcErr.message || rpcErr);
      }

      try {
        await client.from("sale_items").delete().neq("product_id", "THIS_VALUE_SHOULD_NOT_EXIST_EVER_XYZ_123");
      } catch (err: any) {}

      try {
        await client.from("sales").delete().neq("id", "THIS_VALUE_SHOULD_NOT_EXIST_EVER_XYZ_123");
      } catch (err: any) {}

      return true;
    }

    const buildSalesPayload = (colsToOmit: Set<string>) => {
      return uniqueSales.map((s) => {
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
          id: s.id,
          fecha: s.fecha,
          hora: s.hora,
          cliente_nombre: s.clienteNombre || "",
          cliente_telefono: s.clienteTelefono || "",
          total: s.total,
          estado: normalizedEstado,
          payment_method: s.payment_method || "efectivo"
        };

        if (!colsToOmit.has("payment_with_bill") && s.payment_with_bill !== undefined) {
          row.payment_with_bill = s.payment_with_bill;
        }
        if (!colsToOmit.has("payment_change") && s.payment_change !== undefined) {
          row.payment_change = s.payment_change;
        }
        if (!colsToOmit.has("payment_status")) {
          row.payment_status = normalizedPaymentStatus;
        }
        if (!colsToOmit.has("updated_at")) {
          row.updated_at = s.updated_at || new Date().toISOString();
        }
        if (!colsToOmit.has("numero_orden") && numericOrder !== null) {
          row.numero_orden = numericOrder;
        }

        return row;
      });
    };

    let salesPayload = buildSalesPayload(unsupportedSalesColumns);

    let { error: salesError } = await client
      .from("sales")
      .upsert(salesPayload, { onConflict: "id" });

    if (salesError && (salesError.code === "PGRST204" || salesError.message?.includes("column") || salesError.message?.includes("schema cache"))) {
      console.warn("[Supabase Engine] Column mismatch in sales upsert. Retrying with fallback schema tiers...");
      const fallbackTiers = [
        ["payment_with_bill", "payment_change", "payment_status"],
        ["payment_with_bill", "payment_change", "payment_status", "updated_at"],
        ["payment_with_bill", "payment_change", "payment_status", "updated_at", "numero_orden"]
      ];

      let succeeded = false;
      for (const tier of fallbackTiers) {
        const tierSet = new Set([...unsupportedSalesColumns, ...tier]);
        const fallbackPayload = buildSalesPayload(tierSet);
        const { error: retryErr } = await client
          .from("sales")
          .upsert(fallbackPayload, { onConflict: "id" });

        if (!retryErr) {
          tier.forEach(col => unsupportedSalesColumns.add(col));
          succeeded = true;
          break;
        }
      }

      if (!succeeded) {
        logSupabaseError("supabaseSaveSales", salesError);
        throw new Error(`Failed to upsert sales: ${salesError.message}`);
      }
    } else if (salesError) {
      logSupabaseError("supabaseSaveSales", salesError);
      throw new Error(`Failed to upsert sales: ${salesError.message}`);
    }

    // 2. Prepare and upsert items using a safer batched approach
    const BATCH_SIZE = 50;
    for (let i = 0; i < uniqueSales.length; i += BATCH_SIZE) {
      const batch = uniqueSales.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map((s) => s.id);

      const { error: deleteError } = await client
        .from("sale_items")
        .delete()
        .in("sale_id", batchIds);

      if (deleteError) {
        console.error(`[Supabase Engine] Error cleaning up sale_items for batch starting at ${i}:`, deleteError);
      }

      const itemsPayload: any[] = [];
      batch.forEach((s) => {
        const itemMap = new Map<string, any>();
        
        (s.items || []).forEach((item) => {
          const key = `${s.id}-${item.productId}`;
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
        const { error: itemsError } = await client
          .from("sale_items")
          .insert(itemsPayload);

        if (itemsError) {
          logSupabaseError(`supabaseSaveSales(sale_items) batch ${i}`, itemsError);
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
      .select("*")
      .eq("id", "primary")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log("[Supabase Engine] No shop config found for id 'primary'. Initializing later.");
        return null;
      }
      logSupabaseError("supabaseFetchShopConfig", error);
      return null;
    }

    if (!data) return null;

    return {
      tiendaNombre: data.tienda_nombre || "Pico Y Menta",
      contrasenaAdmin: data.contrasena_admin || "",
      whatsappNumero: data.whatsapp_telefono || "573185074440",
      metodoOrdenar: data.metodo_ordenar || "",
      cuentaNumero: data.cuenta_numero || "",
      cuentaTitular: data.cuenta_titular || "",
      mostrarReloj: !!data.mostrar_reloj,
      mostrarClima: !!data.mostrar_clima,
      syncEnabled: data.sync_enabled !== false,
      catalogSortOrder: data.catalog_sort_order || "manual",
      catalogModeEnabled: !!data.catalog_mode_enabled,
      catalogModeMessage: data.catalog_mode_message || "",
      hideOutOfStock: !!data.hide_out_of_stock,
      hasSeenTutorial: !!data.has_seen_tutorial
    };
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchShopConfig:", err);
    return null;
  }
}

let unsupportedShopConfigColumns = new Set<string>();

export async function supabaseSaveShopConfig(config: ShopConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const buildPayload = (colsToOmit: Set<string>) => {
      const payload: any = {
        id: "primary",
        tienda_nombre: config.tiendaNombre,
        contrasena_admin: config.contrasenaAdmin
      };

      if (!colsToOmit.has("whatsapp_telefono")) payload.whatsapp_telefono = config.whatsappNumero || "";
      if (!colsToOmit.has("metodo_ordenar")) payload.metodo_ordenar = config.metodoOrdenar || "";
      if (!colsToOmit.has("cuenta_numero")) payload.cuenta_numero = config.cuentaNumero || "";
      if (!colsToOmit.has("cuenta_titular")) payload.cuenta_titular = config.cuentaTitular || "";
      if (!colsToOmit.has("mostrar_reloj")) payload.mostrar_reloj = !!config.mostrarReloj;
      if (!colsToOmit.has("mostrar_clima")) payload.mostrar_clima = !!config.mostrarClima;
      if (!colsToOmit.has("sync_enabled")) payload.sync_enabled = config.syncEnabled !== false;
      if (!colsToOmit.has("catalog_sort_order")) payload.catalog_sort_order = config.catalogSortOrder || "manual";
      if (!colsToOmit.has("catalog_mode_enabled")) payload.catalog_mode_enabled = !!config.catalogModeEnabled;
      if (!colsToOmit.has("catalog_mode_message")) payload.catalog_mode_message = config.catalogModeMessage || "";
      if (!colsToOmit.has("hide_out_of_stock")) payload.hide_out_of_stock = !!config.hideOutOfStock;
      if (!colsToOmit.has("has_seen_tutorial")) payload.has_seen_tutorial = !!config.hasSeenTutorial;
      if (!colsToOmit.has("updated_at")) payload.updated_at = new Date().toISOString();

      return payload;
    };

    let payload = buildPayload(unsupportedShopConfigColumns);

    let { error } = await client
      .from("shop_config")
      .upsert(payload, { onConflict: "id" });

    if (error && (error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("schema cache"))) {
      console.warn("[Supabase Engine] Column missing in remote shop_config, attempting fallback save...");
      const fallbackTiers = [
        ["hide_out_of_stock", "has_seen_tutorial"],
        ["hide_out_of_stock", "has_seen_tutorial", "updated_at"],
        ["hide_out_of_stock", "has_seen_tutorial", "updated_at", "catalog_mode_enabled", "catalog_mode_message", "catalog_sort_order"]
      ];

      let succeeded = false;
      for (const tier of fallbackTiers) {
        const tierSet = new Set([...unsupportedShopConfigColumns, ...tier]);
        const fallbackPayload = buildPayload(tierSet);
        const { error: retryErr } = await client
          .from("shop_config")
          .upsert(fallbackPayload, { onConflict: "id" });

        if (!retryErr) {
          tier.forEach(col => unsupportedShopConfigColumns.add(col));
          succeeded = true;
          break;
        }
      }

      if (!succeeded) {
        logSupabaseError("supabaseSaveShopConfig", error);
        throw new Error(`Failed to upsert shop config: ${error.message}`);
      }
    } else if (error) {
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

export async function supabaseFetchInventoryMovements(options: { page?: number; limit?: number; tipo?: string; sort?: string }): Promise<{ movements: any[]; total: number }> {
  const client = getSupabaseClient();
  if (!client) return { movements: [], total: 0 };

  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let query = client.from("inventory_movements").select("*", { count: "exact" });

    if (options.tipo && options.tipo.trim() !== "") {
      query = query.eq("tipo_movimiento", options.tipo.trim());
    }

    const ascending = options.sort === "antiguo";
    query = query.order("created_at", { ascending }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("inventory_movements")) {
        console.warn("[Supabase Engine] Table 'inventory_movements' does not exist in Supabase yet. Returning empty movements list.");
        return { movements: [], total: 0 };
      }
      logSupabaseError("supabaseFetchInventoryMovements", error);
      return { movements: [], total: 0 };
    }

    return {
      movements: data || [],
      total: count !== null ? count : (data ? data.length : 0)
    };
  } catch (err) {
    console.error("[Supabase Engine] Exception in fetchInventoryMovements:", err);
    return { movements: [], total: 0 };
  }
}

export async function supabaseClearInventoryMovements(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from("inventory_movements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("inventory_movements")) {
        console.warn("[Supabase Engine] Table 'inventory_movements' does not exist in Supabase yet.");
        return true;
      }
      logSupabaseError("supabaseClearInventoryMovements", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase Engine] Exception in clearInventoryMovements:", err);
    return false;
  }
}

