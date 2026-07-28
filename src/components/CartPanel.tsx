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
  products?: Product[];
  nextOrderId?: string;
}

export const CartPanel: React.FC<CartPanelProps> = React.memo(({
  isOpen,
  onClose,
  cartItems,
  onUpdateCantidad,
  onRemoveFromCart,
  onClearCart,
  onRegisterSale,
  shopConfig,
  products,
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

  // Lock background body scroll when cart panel is open
  useEffect(() => {
    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [isOpen]);

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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          {/* Clickable backdrop */}
          <div className="fixed inset-0" onClick={onClose} />

          {/* Centered Floating Modal Card */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-zinc-950 rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-200/80 dark:border-zinc-800/80 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden my-auto z-10"
          >
            <form
              className="flex flex-col h-full overflow-hidden"
              noValidate
              onSubmit={handleSendOrder}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 px-5 py-4 sm:px-6 sm:py-5 flex-shrink-0 bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-100/60 dark:border-brand-900/40">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <h2 className="font-sans text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Tu Pedido
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                      title="Vaciar Carrito"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar overscroll-contain">
                {cartItems.length === 0 ? (
                  <div className="flex py-12 flex-col items-center justify-center text-center text-slate-400 dark:text-zinc-500 px-6">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full" />
                      <ShoppingBag className="h-16 w-16 stroke-[1.2] text-slate-300 dark:text-zinc-700 relative" />
                    </div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">Tu carrito está vacío</p>
                    <p className="text-xs mt-2 text-slate-400 dark:text-zinc-500 max-w-[220px]">¡Anímate a probar nuestros deliciosos helados artesanos!</p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-6 px-7 py-3 rounded-2xl bg-brand-600 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      Ver Catálogo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Items List */}
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {cartItems.map((item) => (
                        <motion.div
                          variants={itemVariants}
                          key={item.product.id}
                          className="flex items-center gap-3.5 bg-slate-50/80 dark:bg-zinc-900/50 p-3 sm:p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800/80 shadow-2xs"
                        >
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1 shadow-2xs overflow-hidden flex-shrink-0">
                            {item.product.imagen ? (
                              <img 
                                src={item.product.imagen} 
                                alt={item.product.nombre} 
                                loading="lazy"
                                className="h-full w-full object-contain pointer-events-none" 
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
                            <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.product.nombre}
                            </h4>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="font-mono text-xs sm:text-sm font-black text-brand-600 dark:text-brand-400">
                                {formatCOP(item.product.precio)}
                              </p>
                              {/* Quantity Control Pill */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-0.5 shadow-2xs">
                                  <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.85 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => onUpdateCantidad(item.product.id, -1)}
                                    className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400 cursor-pointer"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </motion.button>
                                  <span className="font-mono text-[11px] font-black px-2 min-w-[20px] text-center text-slate-800 dark:text-slate-200">
                                    {item.cantidad}
                                  </span>
                                  <motion.button
                                    type="button"
                                    disabled={item.cantidad >= item.product.stock}
                                    whileTap={{ scale: 0.85 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => onUpdateCantidad(item.product.id, 1)}
                                    className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400 disabled:opacity-20 cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </motion.button>
                                </div>
                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.85, rotate: -15 }}
                                  whileHover={{ scale: 1.15 }}
                                  onClick={() => onRemoveFromCart(item.product.id)}
                                  className="h-7 w-7 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Shipping & Payment Fields */}
                    <div className="border-t border-slate-100 dark:border-zinc-900 pt-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">📝</span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          DATOS DE ENVÍO Y PAGO
                        </h3>
                      </div>

                      {(!clienteNombre.trim() || !clienteTelefono.trim()) && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-amber-850 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2 shadow-2xs">
                          <span className="text-sm select-none">💡</span>
                          <div>
                            <strong className="font-bold">Nota:</strong> Completa tu <strong className="font-bold">Nombre</strong> y <strong className="font-bold">Número de Celular</strong> para continuar con el pedido.
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
                          NOMBRE DEL CLIENTE <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={clienteNombre || ""}
                          onChange={(e) => {
                            setClienteNombre(e.target.value);
                            setErrorMessage("");
                          }}
                          placeholder="Ej. Juan Pérez"
                          className={`w-full rounded-2xl border bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:bg-zinc-900 dark:text-white transition-all ${
                            errorMessage && !clienteNombre.trim()
                              ? "border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/25"
                              : "border-slate-200/90 dark:border-zinc-800"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
                          NÚMERO DE CELULAR <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={clienteTelefono || ""}
                          onChange={(e) => {
                            setClienteTelefono(e.target.value);
                            setErrorMessage("");
                          }}
                          placeholder="Ej. 315 123 4567"
                          className={`w-full rounded-2xl border bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:bg-zinc-900 dark:text-white transition-all ${
                            errorMessage && !clienteTelefono.trim()
                              ? "border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/25"
                              : "border-slate-200/90 dark:border-zinc-800"
                          }`}
                        />
                      </div>

                      {/* Remember Data Checkbox */}
                      <div className="flex items-center gap-2.5 px-0.5">
                        <input
                          type="checkbox"
                          id="rememberData"
                          checked={rememberData}
                          onChange={(e) => setRememberData(e.target.checked)}
                          className="h-4 w-4 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer"
                        />
                        <label htmlFor="rememberData" className="text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
                          ¿Recordar mis datos para la próxima compra?
                        </label>
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          Método de Pago
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod("efectivo");
                              setErrorMessage("");
                            }}
                            className={`py-2.5 px-3 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                              paymentMethod === "efectivo"
                                ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 shadow-2xs"
                                : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
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
                            className={`py-2.5 px-3 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                              paymentMethod === "transferencia"
                                ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 shadow-2xs"
                                : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
                            }`}
                          >
                            📲 Transferencia
                          </button>
                        </div>
                      </div>

                      {/* Cash Bill Input */}
                      {paymentMethod === "efectivo" && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
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
                            className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white transition-colors font-mono"
                          />
                          {paymentWithBill.trim() && !isNaN(Number(paymentWithBill)) && Number(paymentWithBill) >= total && (
                            <div className="flex justify-between items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-2.5 border border-emerald-100 dark:border-emerald-900/30">
                              <span className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">Tus vueltas (Cambio):</span>
                              <span className="text-sm text-emerald-900 dark:text-emerald-300 font-bold font-mono">
                                {formatCOP(Number(paymentWithBill) - total)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Transfer Info */}
                      {paymentMethod === "transferencia" && (
                        <div className="rounded-2xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 p-4 space-y-2 animate-fadeIn">
                          <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 border-b border-blue-100 dark:border-blue-900/20 pb-1.5">
                            <span className="text-base">🏦</span>
                            <p className="text-xs font-black uppercase tracking-wider">Datos de Transferencia</p>
                          </div>
                          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                            Realiza tu transferencia a la cuenta llave de BRE-B: <strong className="text-blue-950 dark:text-blue-100 underline font-extrabold select-all">{shopConfig.cuentaNumero || "3184754263"}</strong> en Nequi. Titular: <strong className="text-blue-950 dark:text-blue-100 font-bold">{shopConfig.cuentaTitular || "Alba Guaca"}</strong>.
                          </p>
                        </div>
                      )}

                      {errorMessage && (
                        <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                          {errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Footer */}
              {cartItems.length > 0 && (
                <div className="border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/40 p-4 sm:p-5 flex-shrink-0 space-y-3">
                  {/* Totals */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-mono">{formatCOP(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">Total Pedido (COP)</span>
                      <span className="font-mono text-lg font-black text-brand-600 dark:text-brand-400">{formatCOP(total)}</span>
                    </div>
                  </div>

                  {/* WhatsApp Action Button */}
                  <button
                    id="checkout-submit-button"
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#00a884] hover:bg-[#008f70] text-white py-3.5 px-4 font-black uppercase tracking-wider text-[12px] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-emerald-600/20 cursor-pointer ${isSubmitting ? "opacity-65 cursor-not-allowed" : ""}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-5 w-5 fill-white text-[#00a884]" />
                        <span>ENVIAR PEDIDO POR WHATSAPP</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
