export interface Product {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  imagen: string;
  costo: number; // Costo de compra para calcular ganancias netas
  updated_at?: string;
  reserved?: boolean;
  orden_manual?: number;
}

export interface SaleItem {
  productId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number; // Costo de compra histórico
}

export interface Sale {
  id: string;
  numero_orden?: number;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  clienteNombre: string;
  clienteTelefono: string; // Número de celular del cliente
  clienteDireccion?: string; // Opcional, ya no se solicita en Checkout
  items: SaleItem[];
  total: number;
  estado: "Pendiente" | "Aprobado" | "Rechazado" | "En espera" | "Pre-Aprobado" | "Entregado" | "Eliminada";
  payment_method?: 'efectivo' | 'transferencia';
  payment_with_bill?: number;
  payment_change?: number;
  payment_status?: 'Pendiente' | 'Pagado' | 'Anulado';
  clientRequestId?: string;
  updated_at?: string;
}

export interface ShopConfig {
  tiendaNombre: string;
  contrasenaAdmin: string;
  metodoOrdenar?: string; // Manera de ordenar (ej. "Pedido Directo • Cali, CO")
  cuentaNumero?: string;
  cuentaTitular?: string;
  whatsappNumero?: string; // Teléfono de WhatsApp para recibir pedidos
  mostrarReloj?: boolean;
  mostrarClima?: boolean;
  syncEnabled?: boolean;
  catalogSortOrder?: "manual" | "stock_desc" | "stock_asc" | "alphabetical";
  catalogModeEnabled?: boolean;
  catalogModeMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}
