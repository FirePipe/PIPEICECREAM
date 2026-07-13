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

export const validateAndSanitizeSales = (saved: string | null): Sale[] => {
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const thirtyDaysAgoStr = `${year}-${month}-${day}`;
      
      const validated: Sale[] = [];
      for (const s of parsed) {
        if (!s || typeof s !== "object") continue;
        if (typeof s.id !== "string" || !s.id) continue;
        if (typeof s.fecha !== "string" || !s.fecha) continue;
        if (typeof s.hora !== "string" || !s.hora) continue;
        if (!Array.isArray(s.items)) continue;
        
        const validatedItems: SaleItem[] = [];
        for (const item of s.items) {
          if (!item || typeof item !== "object") continue;
          if (typeof item.productId !== "string" || !item.productId) continue;
          if (typeof item.nombre !== "string" || !item.nombre) continue;
          if (typeof item.cantidad !== "number" || isNaN(item.cantidad)) continue;
          if (typeof item.precioUnitario !== "number" || isNaN(item.precioUnitario)) continue;
          if (typeof item.costoUnitario !== "number" || isNaN(item.costoUnitario)) continue;
          
          validatedItems.push({
            productId: item.productId,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            costoUnitario: item.costoUnitario,
          });
        }
        
        // Normalize estado and payment_status to match DB constraints (CamelCase)
        let normalizedEstado = s.estado || "Pendiente";
        if (normalizedEstado === "ENTREGADO" || normalizedEstado === "Finalizado") {
          normalizedEstado = "Entregado";
        } else if (normalizedEstado === "pendiente") {
          normalizedEstado = "Pendiente";
        } else if (normalizedEstado === "aprobado") {
          normalizedEstado = "Aprobado";
        }

        let normalizedPaymentStatus = s.payment_status || "Pendiente";
        if (normalizedPaymentStatus === "pagado" || normalizedPaymentStatus === "PAGADO") {
          normalizedPaymentStatus = "Pagado";
        } else if (normalizedPaymentStatus === "pendiente" || normalizedPaymentStatus === "PENDIENTE") {
          normalizedPaymentStatus = "Pendiente";
        }

        validated.push({
          id: s.id,
          fecha: s.fecha,
          hora: s.hora,
          items: validatedItems,
          total: typeof s.total === "number" ? s.total : validatedItems.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0),
          clienteNombre: typeof s.clienteNombre === "string" ? s.clienteNombre : "Cliente",
          clienteTelefono: typeof s.clienteTelefono === "string" ? s.clienteTelefono : "",
          clienteDireccion: typeof s.clienteDireccion === "string" ? s.clienteDireccion : undefined,
          estado: normalizedEstado as any,
          numero_orden: typeof s.numero_orden === "number" ? s.numero_orden : undefined,
          payment_method: s.payment_method || "efectivo",
          payment_with_bill: typeof s.payment_with_bill === "number" ? s.payment_with_bill : undefined,
          payment_change: typeof s.payment_change === "number" ? s.payment_change : undefined,
          payment_status: normalizedPaymentStatus as any,
          updated_at: typeof s.updated_at === "string" ? s.updated_at : undefined,
        });
      }
      return validated.filter((sale: Sale) => sale.fecha >= thirtyDaysAgoStr);
    }
    return [];
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
            tiendaNombre: String(parsed.tiendaNombre),
            contrasenaAdmin: String(parsed.contrasenaAdmin || DEFAULT_CONFIG.contrasenaAdmin),
            metodoOrdenar: typeof parsed.metodoOrdenar === "string" ? parsed.metodoOrdenar : DEFAULT_CONFIG.metodoOrdenar,
            cuentaNumero: typeof parsed.cuentaNumero === "string" ? parsed.cuentaNumero : "",
            cuentaTitular: typeof parsed.cuentaTitular === "string" ? parsed.cuentaTitular : "",
            whatsappNumero: typeof parsed.whatsappNumero === "string" ? parsed.whatsappNumero : "3185074440",
            mostrarReloj: typeof parsed.mostrarReloj === "boolean" ? parsed.mostrarReloj : false,
            mostrarClima: typeof parsed.mostrarClima === "boolean" ? parsed.mostrarClima : false,
            syncEnabled: typeof parsed.syncEnabled === "boolean" ? parsed.syncEnabled : true,
            catalogSortOrder: (parsed.catalogSortOrder || "manual") as any
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
