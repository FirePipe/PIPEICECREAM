import { Product, Sale, SaleItem, ShopConfig } from "../types";
import { DEFAULT_PRODUCTS, DEFAULT_CONFIG } from "../constants";

export const validateAndSanitizeProducts = (saved: string | null): Product[] => {
  let result = DEFAULT_PRODUCTS;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const needsUpgrade = parsed.some((p: any) => p.costo === undefined);
        const missingFresa = !parsed.some((p: any) => p.nombre.toLowerCase() === "fresa" || p.id === "PROD-9");
        const missingGuanabana = !parsed.some((p: any) => p.nombre.toLowerCase() === "guanabana" || p.id === "PROD-10");
        if (!needsUpgrade && !missingFresa && !missingGuanabana) {
          result = parsed.map((p: any) => ({
            id: String(p.id),
            nombre: String(p.nombre),
            precio: Number(p.precio),
            costo: Number(p.costo),
            stock: Number(p.stock),
            imagen: typeof p.imagen === "string" ? p.imagen : "",
            updated_at: typeof p.updated_at === "string" ? p.updated_at : undefined,
            reserved: p.reserved !== undefined ? Boolean(p.reserved) : undefined,
            orden_manual: p.orden_manual !== undefined ? Number(p.orden_manual) : undefined,
          }));
        }
      }
    } catch (e) {
      console.warn("Products from LocalStorage corrupt. Restoring defaults.");
      result = DEFAULT_PRODUCTS;
    }
  }

  // Force stock levels requested by user
  const stockMigrated = localStorage.getItem("stock_migrated_v4");
  if (!stockMigrated) {
    const targetStocks: { [key: string]: number } = {
      "Queso Bocadillo": 0,
      "Coco": 0,
      "Salpicon": 0,
      "ChocoVainilla": 0,
      "Ron & Pasas": 3,
      "Mani": 3,
      "Chicle": 0,
      "Helado Mango Biche": 0,
      "Fresa": 0,
      "Guanabana": 0
    };
    result = result.map((p) => {
      if (targetStocks[p.nombre] !== undefined) {
        return { ...p, stock: targetStocks[p.nombre] };
      }
      return p;
    });
    localStorage.setItem("productos", JSON.stringify(result));
    localStorage.setItem("stock_migrated_v2", "true");
    localStorage.setItem("stock_migrated_v3", "true");
    localStorage.setItem("stock_migrated_v4", "true");
  }
  return result;
};

export const parseSaleDate = (fechaStr: string | undefined | null): Date | null => {
  if (!fechaStr || typeof fechaStr !== "string") return null;
  const trimmed = fechaStr.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  } else if (trimmed.includes('-')) {
    const datePart = trimmed.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const d = new Date(trimmed);
  return !isNaN(d.getTime()) ? d : null;
};

export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const cleanOldSales = (salesList: Sale[]): Sale[] => {
  if (!Array.isArray(salesList)) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(23, 59, 59, 999);

  const salesMap = new Map<string, Sale>();

  for (const s of salesList) {
    if (!s || typeof s !== "object") continue;

    // Validate ID
    const rawId = s.id;
    if (!rawId || (typeof rawId !== "string" && typeof rawId !== "number")) continue;
    const cleanId = String(rawId).trim();
    if (!cleanId) continue;

    // Parse and validate date
    const dateObj = parseSaleDate(s.fecha);
    if (!dateObj) continue;
    if (dateObj < thirtyDaysAgo || dateObj > tomorrow) continue;

    const normalizedFecha = toLocalDateString(dateObj);

    // Validate items array
    if (!Array.isArray(s.items)) continue;
    const validatedItems: SaleItem[] = [];
    for (const item of s.items) {
      if (!item || typeof item !== "object") continue;
      const pId = typeof item.productId === "string" ? item.productId.trim() : String(item.productId || "").trim();
      const name = typeof item.nombre === "string" ? item.nombre.trim() : "Producto";
      const qty = typeof item.cantidad === "number" && !isNaN(item.cantidad) && item.cantidad > 0 ? item.cantidad : 1;
      const pu = typeof item.precioUnitario === "number" && !isNaN(item.precioUnitario) && item.precioUnitario >= 0 ? item.precioUnitario : 0;
      const cu = typeof item.costoUnitario === "number" && !isNaN(item.costoUnitario) && item.costoUnitario >= 0 ? item.costoUnitario : 0;

      if (!pId || !name) continue;
      validatedItems.push({
        productId: pId,
        nombre: name,
        cantidad: qty,
        precioUnitario: pu,
        costoUnitario: cu,
      });
    }

    if (validatedItems.length === 0) continue;

    const computedTotal = validatedItems.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
    const validTotal = typeof s.total === "number" && !isNaN(s.total) && s.total >= 0 ? s.total : computedTotal;

    // Normalize status fields
    const rawEstado = String(s.estado || "Pendiente").trim();
    let normalizedEstado: Sale['estado'] = "Pendiente";
    if (rawEstado === "ENTREGADO" || rawEstado === "Finalizado" || rawEstado.toLowerCase() === "entregado") {
      normalizedEstado = "Entregado";
    } else if (rawEstado.toLowerCase() === "aprobado") {
      normalizedEstado = "Aprobado";
    } else if (rawEstado === "Pre-Aprobado" || rawEstado === "PRE-APROBADO") {
      normalizedEstado = "Pre-Aprobado";
    } else if (rawEstado === "En espera") {
      normalizedEstado = "En espera";
    } else if (rawEstado === "Rechazado") {
      normalizedEstado = "Rechazado";
    } else if (rawEstado === "Eliminada") {
      normalizedEstado = "Eliminada";
    }

    const rawPaymentStatus = String(s.payment_status || "Pendiente").trim();
    let normalizedPaymentStatus: Sale['payment_status'] = "Pendiente";
    if (rawPaymentStatus.toLowerCase() === "pagado") {
      normalizedPaymentStatus = "Pagado";
    } else if (rawPaymentStatus.toLowerCase() === "anulado") {
      normalizedPaymentStatus = "Anulado";
    }

    const rawPaymentMethod = String(s.payment_method || "efectivo").trim().toLowerCase();
    const cleanPaymentMethod: Sale['payment_method'] = rawPaymentMethod === "transferencia" ? "transferencia" : "efectivo";

    const cleanSale: Sale = {
      id: cleanId,
      fecha: normalizedFecha,
      hora: typeof s.hora === "string" && s.hora.trim() ? s.hora.trim() : "00:00",
      items: validatedItems,
      total: validTotal,
      clienteNombre: typeof s.clienteNombre === "string" && s.clienteNombre.trim() ? s.clienteNombre.trim() : "Cliente",
      clienteTelefono: typeof s.clienteTelefono === "string" ? s.clienteTelefono.trim() : "",
      clienteDireccion: typeof s.clienteDireccion === "string" ? s.clienteDireccion.trim() : undefined,
      estado: normalizedEstado,
      numero_orden: typeof s.numero_orden === "number" && !isNaN(s.numero_orden) ? s.numero_orden : undefined,
      payment_method: cleanPaymentMethod,
      payment_with_bill: typeof s.payment_with_bill === "number" && !isNaN(s.payment_with_bill) ? s.payment_with_bill : undefined,
      payment_change: typeof s.payment_change === "number" && !isNaN(s.payment_change) ? s.payment_change : undefined,
      payment_status: normalizedPaymentStatus,
      updated_at: typeof s.updated_at === "string" && s.updated_at.trim() ? s.updated_at : new Date().toISOString(),
    };

    const existing = salesMap.get(cleanId);
    if (!existing) {
      salesMap.set(cleanId, cleanSale);
    } else {
      const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const cleanTime = cleanSale.updated_at ? new Date(cleanSale.updated_at).getTime() : 0;
      if (cleanTime >= existingTime) {
        salesMap.set(cleanId, cleanSale);
      }
    }
  }

  return Array.from(salesMap.values());
};

export const validateAndSanitizeSales = (saved: string | null): Sale[] => {
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return cleanOldSales(parsed);
  } catch (e) {
    console.warn("Sales from LocalStorage corrupt. Resetting sales state.");
    return [];
  }
};

export const validateAndSanitizeShopConfig = (saved: string | null): ShopConfig => {
  let config = DEFAULT_CONFIG;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        if (parsed.tiendaNombre && !parsed.tiendaNombre.includes("FROST") && parsed.contrasenaAdmin !== "admin123") {
          config = {
            tiendaNombre: String(parsed.tiendaNombre || DEFAULT_CONFIG.tiendaNombre),
            contrasenaAdmin: String(parsed.contrasenaAdmin || DEFAULT_CONFIG.contrasenaAdmin),
            metodoOrdenar: typeof parsed.metodoOrdenar === "string" ? parsed.metodoOrdenar : DEFAULT_CONFIG.metodoOrdenar,
            cuentaNumero: typeof parsed.cuentaNumero === "string" ? parsed.cuentaNumero : "",
            cuentaTitular: typeof parsed.cuentaTitular === "string" ? parsed.cuentaTitular : "",
            whatsappNumero: typeof parsed.whatsappNumero === "string" ? parsed.whatsappNumero : "3185074440",
            mostrarReloj: typeof parsed.mostrarReloj === "boolean" ? parsed.mostrarReloj : false,
            mostrarClima: typeof parsed.mostrarClima === "boolean" ? parsed.mostrarClima : false,
            syncEnabled: typeof parsed.syncEnabled === "boolean" ? parsed.syncEnabled : true,
            catalogSortOrder: (parsed.catalogSortOrder || "manual") as any,
            catalogModeEnabled: typeof parsed.catalogModeEnabled === "boolean" ? parsed.catalogModeEnabled : false,
            catalogModeMessage: typeof parsed.catalogModeMessage === "string" ? parsed.catalogModeMessage : "",
            hideOutOfStock: typeof parsed.hideOutOfStock === "boolean" ? parsed.hideOutOfStock : false,
            hasSeenTutorial: typeof parsed.hasSeenTutorial === "boolean" ? parsed.hasSeenTutorial : false,
          };
        } else {
          localStorage.removeItem("configuracion");
        }
      }
    } catch (e) {
      console.warn("ShopConfig corrupt. Restoring defaults.");
      config = DEFAULT_CONFIG;
    }
  }

  // Force deactivate clock and weather by default once to honor request
  const widgetsDisabledDefault = localStorage.getItem("widgets_disabled_default_v2");
  if (!widgetsDisabledDefault) {
    config = {
      ...config,
      mostrarReloj: false,
      mostrarClima: false
    };
    localStorage.setItem("configuracion", JSON.stringify(config));
    localStorage.setItem("widgets_disabled_default_v2", "true");
  }
  return config;
};
