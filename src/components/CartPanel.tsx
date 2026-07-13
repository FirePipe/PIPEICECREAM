import React, { useState, useEffect } from "react";
import { Product, SaleItem, Sale, ShopConfig } from "../types";
import { X, Trash2, Plus, Minus, ShoppingBag, IceCream, MessageCircle, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getBogotaDateTime = (date = new Date()) => {
  const formatterDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatterTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const partsDate = formatterDate.formatToParts(date);
  const partsTime = formatterTime.formatToParts(date);

  const year = partsDate.find(p => p.type === "year")?.value;
  const month = partsDate.find(p => p.type === "month")?.value;
  const day = partsDate.find(p => p.type === "day")?.value;

  const hour = partsTime.find(p => p.type === "hour")?.value;
  const minute = partsTime.find(p => p.type === "minute")?.value;

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;

  return { dateStr, timeStr };
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: { product: Product; cantidad: number }[];
  onUpdateCantidad: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onRegisterSale: (sale: Sale) => Promise<any> | void;
  shopConfig: ShopConfig;
  nextOrderId?: string;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateCantidad,
  onRemoveFromCart,
  onClearCart,
  onRegisterSale,
  shopConfig,
  nextOrderId,
}) => {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [rememberData, setRememberData] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia">("efectivo");
  const [paymentWithBill, setPaymentWithBill] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [waLink, setWaLink] = useState("");

  // Reset success state when closing or opening
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setIsOrderSuccess(false);
        setLastSale(null);
        setWaLink("");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Load saved customer data on mount
  useEffect(() => {
    const savedName = localStorage.getItem("customer_name");
    const savedPhone = localStorage.getItem("customer_phone");
    if (savedName) setClienteNombre(savedName);
    if (savedPhone) setClienteTelefono(savedPhone);
  }, []);


  // Calculate prices (each product uses its actual price)
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.precio * item.cantidad, 0);
  const total = subtotal;

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const validatePayment = (): boolean => {
    if (paymentMethod === "efectivo") {
      const billValue = Number(paymentWithBill);
      if (!paymentWithBill.trim()) {
        setErrorMessage("Por favor ingresa con cuánto vas a pagar.");
        return false;
      }
      if (isNaN(billValue) || billValue < total) {
        setErrorMessage(`El monto con el que pagas debe ser mayor o igual al total del pedido (${formatCOP(total)}).`);
        return false;
      }
    }
    setErrorMessage("");
    return true;
  };

  const generateWhatsAppMessage = (sale: Sale) => {
    const itemsText = sale.items
      .map(item => `* ${item.cantidad}x ${item.nombre} ($ ${formatCOP(item.precioUnitario)} c/u) — Subtotal: $ ${formatCOP(item.precioUnitario * item.cantidad)}`)
      .join("\n");

    const dateObj = new Date(`${sale.fecha}T00:00:00`);
    const day = dateObj.getDate();
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const formattedDate = `${day} de ${month} de ${year} (${sale.hora})`;

    let message = `🍧 NUEVO PEDIDO - PIPE ICE CREAM 🍧\n` +
      `--------------------------------------\n` +
      `👤 Cliente: ${sale.clienteNombre}\n` +
      `📱 Celular: ${sale.clienteTelefono}\n` +
      `📅 Fecha: ${formattedDate}\n` +
      `--------------------------------------\n` +
      `📦 Detalle del Pedido:\n${itemsText}\n\n` +
      `--------------------------------------\n` +
      `💰 TOTAL A PAGAR: $ ${formatCOP(sale.total)} COP\n\n` +
      `🆔 Código de Referencia: #${sale.id}\n` +
      `--------------------------------------\n`;

    if (sale.payment_method === "transferencia") {
      const bankAcc = shopConfig.cuentaNumero || "3184754263";
      const bankOwner = shopConfig.cuentaTitular || "Alba Guaca";
      message += `🏦 Datos de Transferencia:\n` +
        `Realiza tu transferencia a la cuenta llave de BRE-B: ${bankAcc} en Nequi, a la cual se le puede enviar dinero desde cualquier banco. La cuenta está a nombre de ${bankOwner}.\n` +
        `Por favor adjunta el comprobante de pago a este chat.`;
    } else {
      message += `💵 Método de Pago: Efectivo\n` +
        `Paga con: $ ${formatCOP(sale.payment_with_bill || 0)}\n` +
        `Cambio: $ ${formatCOP(sale.payment_change || 0)}`;
    }

    return message;
  };

  const handleSendOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0 || isSubmitting) return;

    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      setErrorMessage("Por favor ingresa tu nombre y número de celular.");
      return;
    }

    if (!validatePayment()) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    // Save data to localStorage if requested
    if (rememberData) {
      localStorage.setItem("customer_name", clienteNombre.trim());
      localStorage.setItem("customer_phone", clienteTelefono.trim());
    }

    // Generate unique ID
    const orderId = nextOrderId || "ORD-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const { dateStr, timeStr } = getBogotaDateTime(now);

    // Prepare Sale Items with cost
    const saleItems: SaleItem[] = cartItems.map((item) => ({
      productId: item.product.id,
      nombre: item.product.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.product.precio,
      costoUnitario: item.product.costo || (item.product.nombre.toLowerCase().includes("mango biche") ? 920 : 1140),
    }));

    const billAmount = paymentMethod === "efectivo" ? Number(paymentWithBill) : undefined;
    const changeAmount = paymentMethod === "efectivo" && billAmount ? Math.max(0, billAmount - total) : undefined;

    // Register Sale
    const saleNum = parseInt(orderId.replace("ORD-", ""), 10);
    const newSale: Sale = {
      id: orderId,
      numero_orden: isNaN(saleNum) ? undefined : saleNum,
      fecha: dateStr,
      hora: timeStr,
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim(),
      clienteDireccion: "",
      items: saleItems,
      total: total,
      estado: "Pendiente",
      payment_method: paymentMethod,
      payment_with_bill: billAmount,
      payment_change: changeAmount,
      payment_status: "Pendiente",
      clientRequestId: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };

    // Save data to localStorage if requested
    if (rememberData) {
      localStorage.setItem("customer_name", clienteNombre.trim());
      localStorage.setItem("customer_phone", clienteTelefono.trim());
    } else {
      localStorage.removeItem("customer_name");
      localStorage.removeItem("customer_phone");
    }

    // Register Sale
    Promise.resolve(onRegisterSale(newSale))
      .then(() => {
        // Construct WhatsApp Link
        const waNumber = shopConfig.whatsappNumero || shopConfig.cuentaNumero || "3184754263";
        const waMessage = generateWhatsAppMessage(newSale);
        const waLink = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`;
        
        // Create a temporary link to open WhatsApp
        const link = document.createElement("a");
        link.href = waLink;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
        
        // Clean cart and close
        onClearCart();
        if (!rememberData) {
          setClienteNombre("");
          setClienteTelefono("");
        }
        onClose();
      })
      .catch((err: any) => {
        setErrorMessage(err.message || "Lo sentimos, hubo un error al registrar el pedido.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs"
        >
          <div className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 flex max-w-full w-full sm:w-auto"
          >
            <form
          className="w-full sm:w-screen sm:max-w-md transform bg-white shadow-2xl transition-all duration-300 dark:bg-zinc-950 flex flex-col h-full overflow-hidden border-l border-slate-100 dark:border-zinc-800"
          noValidate
          onSubmit={handleSendOrder}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 p-4 sm:p-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-900">
                <ShoppingBag className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                Tu Pedido
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5 py-2 rounded-lg flex items-center gap-1 font-bold uppercase transition-all"
                  title="Vaciar Carrito"
                >
                  <Trash2 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Vaciar</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-500 dark:hover:bg-zinc-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar pb-32 sm:pb-6">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 dark:text-zinc-500 px-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full" />
                  <ShoppingBag className="h-16 w-16 stroke-[1] text-slate-300 dark:text-zinc-700 relative" />
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">Tu carrito está vacío</p>
                <p className="text-sm mt-2 text-slate-400 dark:text-zinc-500 max-w-[200px]">¡Anímate a probar nuestros deliciosos helados!</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-8 px-8 py-3 rounded-xl bg-brand-600 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-600/20 active:scale-95 transition-all"
                >
                  Ver Catálogo
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {cartItems.map((item) => (
                    <motion.div
                      variants={itemVariants}
                      key={item.product.id}
                      className="flex items-center gap-4 bg-slate-50/50 dark:bg-zinc-900/30 p-3 rounded-2xl border border-slate-100 dark:border-zinc-900/50"
                    >
                      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex-shrink-0">
                        {item.product.imagen ? (
                          <img 
                            src={item.product.imagen} 
                            alt={item.product.nombre} 
                            className="h-full w-full object-contain" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).onerror = null;
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1501446529957-6226bd447c46?auto=format&fit=crop&w=120&q=80";
                            }}
                          />
                        ) : (
                          <IceCream className="h-6 w-6 text-brand-500 opacity-50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.product.nombre}
                        </h4>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="font-mono text-[11px] sm:text-xs font-black text-brand-600 dark:text-brand-400">
                            {formatCOP(item.product.precio)}
                          </p>
                          {/* Compact Controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-0.5 shadow-sm">
                              <button
                                type="button"
                                onClick={() => onUpdateCantidad(item.product.id, -1)}
                                className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400 active:scale-90 transition-all"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-mono text-[11px] font-black px-1.5 min-w-[20px] text-center text-slate-800 dark:text-slate-200">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                disabled={item.cantidad >= item.product.stock}
                                onClick={() => onUpdateCantidad(item.product.id, 1)}
                                className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400 disabled:opacity-20 active:scale-90 transition-all"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveFromCart(item.product.id)}
                              className="h-7 w-7 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Shipping & Payment Fields inside scrollable area to prevent cut-off */}
                <div className="border-t border-slate-100 dark:border-zinc-900 pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📝</span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Datos de Envío y Pago
                    </h3>
                  </div>

                  {(!clienteNombre.trim() || !clienteTelefono.trim()) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-amber-850 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-1.5 shadow-sm animate-pulse">
                      <span className="text-sm select-none">💡</span>
                      <div>
                        <strong className="font-bold">Consejo:</strong> Debes completar tu <strong className="font-bold">Nombre</strong> y <strong className="font-bold">Número de Celular</strong> obligatoriamente para poder registrar tu orden.
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                      Nombre del Cliente <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clienteNombre || ""}
                      onChange={(e) => {
                        setClienteNombre(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Ej. Juan Pérez"
                      className={`w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:bg-zinc-900 dark:text-white dark:focus:border-brand-500 transition-colors ${
                        errorMessage && !clienteNombre.trim()
                          ? "border-rose-500 dark:border-rose-500 ring-1 ring-rose-500/25"
                          : "border-gray-200 dark:border-zinc-800"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                      Número de Celular <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={clienteTelefono || ""}
                      onChange={(e) => {
                        setClienteTelefono(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Ej. 315 123 4567"
                      className={`w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:bg-zinc-900 dark:text-white dark:focus:border-brand-500 transition-colors ${
                        errorMessage && !clienteTelefono.trim()
                          ? "border-rose-500 dark:border-rose-500 ring-1 ring-rose-500/25"
                          : "border-gray-200 dark:border-zinc-800"
                      }`}
                    />
                  </div>

                  {/* Remember Data Checkbox */}
                  <div className="flex items-center gap-2 px-1">
                    <input
                      type="checkbox"
                      id="rememberData"
                      checked={rememberData}
                      onChange={(e) => setRememberData(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <label htmlFor="rememberData" className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 cursor-pointer select-none">
                      ¿Recordar mis datos para la próxima compra?
                    </label>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Método de Pago
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod("efectivo");
                          setErrorMessage("");
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                          paymentMethod === "efectivo"
                            ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        💵 Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod("transferencia");
                          setErrorMessage("");
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                          paymentMethod === "transferencia"
                            ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        📲 Transferencia
                      </button>
                    </div>
                  </div>

                  {/* Conditional Cash Input */}
                  {paymentMethod === "efectivo" && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                        ¿Con cuánto vas a pagar? (Total: {formatCOP(total)})
                      </label>
                      <input
                        type="number"
                        value={paymentWithBill || ""}
                        onChange={(e) => {
                          setPaymentWithBill(e.target.value);
                          setErrorMessage("");
                        }}
                        placeholder={`Ej. ${total}`}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-brand-500 transition-colors font-mono"
                      />
                      {paymentWithBill.trim() && !isNaN(Number(paymentWithBill)) && Number(paymentWithBill) >= total && (
                        <div className="flex justify-between items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2.5 border border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">Tus vueltas (Cambio):</span>
                          <span className="text-sm text-emerald-900 dark:text-emerald-300 font-bold font-mono">
                            {formatCOP(Number(paymentWithBill) - total)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conditional Transfer Info Box */}
                  {paymentMethod === "transferencia" && (
                    <div className="rounded-xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 p-4 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 border-b border-blue-100 dark:border-blue-900/20 pb-1.5">
                        <span className="text-base">🏦</span>
                        <p className="text-xs font-black uppercase tracking-wider">Datos de Transferencia</p>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                        Realiza tu transferencia a la cuenta llave de BRE-B: <strong className="text-blue-950 dark:text-blue-100 underline font-extrabold select-all">{shopConfig.cuentaNumero || "3184754263"}</strong> en Nequi, la cual se le puede enviar dinero desde cualquier banco. La cuenta está a nombre de <strong className="text-blue-950 dark:text-blue-100 font-bold">{shopConfig.cuentaTitular || "Alba Guaca"}</strong>, el cual se debe realizar el pago y adjuntar comprobante en el whatapp para poder confirmar tu orden en nuestro pedido, y el pago del mismo, muchas gracias.
                      </p>
                    </div>
                  )}

                  {errorMessage && (
                    <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/10 p-2.5 rounded-lg border border-rose-100 dark:border-rose-950/30">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Checkout Footer (Slim, static and highly scannable) */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 p-4 sm:p-5 flex-shrink-0">
              {/* Subtotals */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-mono">{formatCOP(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white border-t border-dashed border-gray-200 dark:border-zinc-800 pt-2">
                  <span>Total Pedido (COP)</span>
                  <span className="font-mono text-base text-brand-600 dark:text-brand-400">{formatCOP(total)}</span>
                </div>
              </div>

              {/* Submit button */}
              <div className="grid grid-cols-1 gap-2 pt-3">
                <button
                  id="checkout-submit-button"
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white py-4 px-4 font-black uppercase tracking-widest text-[12px] hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-emerald-600/20 dark:shadow-emerald-500/10 cursor-pointer ${isSubmitting ? "opacity-65 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      <span>ENVIAR PEDIDO POR WHATSAPP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
