import { SalesStatistics } from "./SalesStatistics";
import { SalesCharts } from "./SalesCharts";
import { exportSalesToPDF } from "../lib/pdfExport";
import { AddProductModal } from "./AddProductModal";
import { ProductCard } from "./ProductCard";
import { AdminAssistant } from "./AdminAssistant";
import { ImageGallerySelector } from "./ImageGallerySelector";
import { AnimatedCounter } from "./AnimatedCounter";
import { TicketPreviewModal } from "./TicketPreviewModal";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Product, Sale, ShopConfig } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import {
  Lock,
  Unlock,
  Plus,
  Minus,
  Trash2,
  TrendingUp,
  Settings,
  DollarSign,
  ShoppingBag,
  Package,
  Check,
  X,
  Search,
  Database,
  BarChart2,
  PieChart,
  RefreshCw,
  Pencil,
  Printer,
  Copy,
  LogOut,
  Send,
  Clock,
  CloudSun,
  Cloud,
  CloudOff,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Activity,
  Award,
  IceCream,
  Users,
  Frown,
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell as RechartsCell,
  AreaChart as RechartsAreaChart,
  Area as RechartsArea,
} from "recharts";

import { formatCOP, cn } from "../lib/utils";
import { CloudStatsView } from "./CloudStatsView";
import { CatalogPreviewContent } from "./CatalogPreviewContent";
import { AdminAuditoriaTab } from "./AdminAuditoriaTab";

interface AdminPanelProps {
  products: Product[];
  sales: Sale[];
  shopConfig: ShopConfig;
  onUpdateProducts: (newProducts: Product[]) => void;
  onUpdateSales: (newSales: Sale[]) => void;
  clearSalesData: () => void;
  onUpdateConfig: (newConfig: ShopConfig) => void;
  onExitAdmin?: () => void;
  onRefreshData?: () => Promise<void>;
}

type AdminTab = "inventario" | "ventas" | "ajustes" | "estadisticas" | "auditoria" | "mantenimiento";

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  sales,
  shopConfig,
  onUpdateProducts,
  onUpdateSales,
  clearSalesData,
  onUpdateConfig,
  onExitAdmin,
  onRefreshData,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem("is_admin_authenticated") === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("inventario");
  const [ventasView, setVentasView] = useState<"historial" | "graficas" | "clientes" | "fidelidad">("historial");
  const [searchPhone, setSearchPhone] = useState("");
  const [dashboardTimeRange, setDashboardTimeRange] = useState<"hoy" | "semana" | "mes" | "todos">("todos");

  const [estadisticasView, setEstadisticasView] = useState<"cloud" | "graficas">("cloud");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Backup & Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<{
    type: "json" | "csv_products" | "csv_sales" | null;
    products: Product[];
    sales: Sale[];
    shopConfig?: ShopConfig;
    rawCount?: { products: number; sales: number; items?: number };
    warningMessage?: string;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | "idle" | "loading";
    message: string;
  }>({ type: "idle", message: "" });

  // Custom Modal States (to bypass iframe sandboxing confirm/alert blocks)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Form states for new Flavor
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newPrecio, setNewPrecio] = useState("");
  const [newCosto, setNewCosto] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newImagen, setNewImagen] = useState("");
  const [formError, setFormError] = useState("");

  // Form states for editing Flavor
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editCosto, setEditCosto] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editImagen, setEditImagen] = useState("");
  const [editError, setEditError] = useState("");

  // Form states for editing Order
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [captureSaleId, setCaptureSaleId] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [editSaleItems, setEditSaleItems] = useState<any[]>([]);
  const [editClienteNombre, setEditClienteNombre] = useState("");
  const [editClienteTelefono, setEditClienteTelefono] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"efectivo" | "transferencia">("efectivo");
  const [editPaymentWithBill, setEditPaymentWithBill] = useState("");
  const [editEstado, setEditEstado] = useState<Sale["estado"]>("Pendiente");
  const [editPaymentStatus, setEditPaymentStatus] = useState<Sale["payment_status"]>("Pendiente");
  const [editSaleError, setEditSaleError] = useState("");
  const [selectedProductToAdd, setSelectedProductToAdd] = useState("");
  const [selectedQtyToAdd, setSelectedQtyToAdd] = useState("1");

  // Adjusts shop config forms
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<"idle" | "success" | "error">("idle");
  const [tiendaNombre, setTiendaNombre] = useState(shopConfig?.tiendaNombre || "");
  const [contrasenaAdmin, setContrasenaAdmin] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("admin_password") || shopConfig?.contrasenaAdmin || "";
    }
    return shopConfig?.contrasenaAdmin || "";
  });
  const [metodoOrdenar, setMetodoOrdenar] = useState(shopConfig?.metodoOrdenar || "Pedido Directo por Telegram • Cali, CO");
  const [cuentaNumero, setCuentaNumero] = useState(shopConfig?.cuentaNumero || "3184754263");
  const [cuentaTitular, setCuentaTitular] = useState(shopConfig?.cuentaTitular || "Alba Guaca");
  const [whatsappNumero, setWhatsappNumero] = useState(shopConfig?.whatsappNumero || "3185074440");
  const [mostrarReloj, setMostrarReloj] = useState(!!shopConfig?.mostrarReloj);
  const [mostrarClima, setMostrarClima] = useState(!!shopConfig?.mostrarClima);
  const [catalogSortOrder, setCatalogSortOrder] = useState<"manual" | "stock_desc" | "stock_asc" | "alphabetical">(shopConfig?.catalogSortOrder || "manual");
  const [catalogModeEnabled, setCatalogModeEnabled] = useState(!!shopConfig?.catalogModeEnabled);
  const [catalogModeMessage, setCatalogModeMessage] = useState(shopConfig?.catalogModeMessage || "SABORIFICACIÓN EN MANTENIMIENTO (SÓLO CATÁLOGO)\nSincronización pausada por el Administrador.");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [sqlCopied, setSqlCopied] = useState(false);
  const [ticketModal, setTicketModal] = useState<{ isOpen: boolean; saleId: string | null }>({
    isOpen: false,
    saleId: null,
  });
  const [sendingTelegramId, setSendingTelegramId] = useState<string | null>(null);
  const [adminOrderTab, setAdminOrderTab] = useState<"edit" | "ticket">("edit");

  // Pagination and Sorting for Sales
  const [salesPage, setSalesPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(10);
  const [salesSortOrder, setSalesSortOrder] = useState<"asc" | "desc">("desc");
  const [salesFilterClient, setSalesFilterClient] = useState("");
  const [salesFilterStatus, setSalesFilterStatus] = useState("todos");
  const [salesFilterPaymentStatus, setSalesFilterPaymentStatus] = useState("todos");
  const [salesFilterDateStart, setSalesFilterDateStart] = useState("");
  const [salesFilterDateEnd, setSalesFilterDateEnd] = useState("");

  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    error: string | null;
  } | null>(null);
  const [isRetryingSupabase, setIsRetryingSupabase] = useState(false);

  const testSupabaseConnection = async (isManual = false) => {
    if (isManual) {
      setIsRetryingSupabase(true);
      setSupabaseStatus(null);
    }
    try {
      const res = await fetch("/api/supabase-status");
      const contentType = res.headers.get("content-type");
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error del servidor (${res.status}): ${errorText.slice(0, 100)}`);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        // If it's not JSON, it's likely index.html due to a routing fallback
        const bodyText = await res.text();
        console.error("Respuesta no-JSON recibida:", bodyText.slice(0, 200));
        throw new Error("El servidor no devolvió una respuesta JSON válida. Es posible que la ruta no exista o el servidor esté reiniciando.");
      }
      
      const data = await res.json();
      setSupabaseStatus(data);

      if (!data.connected || !data.configured) {
        console.warn(
          "%c⚠️ DIAGNÓSTICO DE CONEXIÓN SUPABASE %c\n\n" +
          `• Configurado en Servidor: ${data.configured ? "SÍ ✅" : "NO ❌"}\n` +
          `• Conexión Exitosa: ${data.connected ? "SÍ ✅" : "NO ❌"}\n` +
          `• Error de Diagnóstico: ${data.error || "Ninguno"}\n\n` +
          "💡 SUGERENCIA IMPORTANTE:\n" +
          "1. Si ya agregaste las variables de entorno en Vercel, debes hacer un REDEPLOY (Re-desplegar) en Vercel. Las variables de entorno agregadas no se aplican a despliegues pasados.\n" +
          "2. Si estás viendo esto en la vista previa de AI Studio, recuerda agregar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el menú de Configuración / Variables de Entorno de AI Studio.",
          "background: #fffbeb; color: #b45309; font-weight: bold; font-size: 11px; padding: 6px; border: 1px solid #fef3c7; border-radius: 4px;",
          "color: inherit; font-family: monospace;"
        );
      } else {
        console.log(
          "%c✅ CONECTADO EXITOSAMENTE A SUPABASE %c\n\n" +
          "La sincronización en tiempo real (Realtime) y la persistencia en la nube están listas.",
          "background: #ecfdf5; color: #047857; font-weight: bold; font-size: 11px; padding: 6px; border: 1px solid #d1fae5; border-radius: 4px;",
          "color: inherit;"
        );
      }
    } catch (err: any) {
      console.error("Error al diagnosticar conexión Supabase:", err);
      let errMsg = err.message || "Error de red";
      if (errMsg.includes("Failed to fetch") || errMsg.includes("fetch")) {
        errMsg = "El servidor local se está iniciando o reiniciando (Intente de nuevo en unos segundos)";
      }
      setSupabaseStatus({
        configured: false,
        connected: false,
        error: errMsg
      });
    } finally {
      if (isManual) {
        setIsRetryingSupabase(false);
      }
    }
  };

  useEffect(() => {
    testSupabaseConnection();
    
    const interval = setInterval(() => {
      testSupabaseConnection();
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setTiendaNombre(shopConfig.tiendaNombre);
    const sessionPass = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("admin_password") : null;
    setContrasenaAdmin(sessionPass || shopConfig.contrasenaAdmin || "");
    setMetodoOrdenar(shopConfig.metodoOrdenar || "Pedido Directo por Telegram • Cali, CO");
    setCuentaNumero(shopConfig.cuentaNumero || "3184754263");
    setCuentaTitular(shopConfig.cuentaTitular || "Alba Guaca");
    setWhatsappNumero(shopConfig.whatsappNumero || "3185074440");
    setMostrarReloj(!!shopConfig.mostrarReloj);
    setMostrarClima(!!shopConfig.mostrarClima);
    setCatalogSortOrder(shopConfig.catalogSortOrder || "manual");
    setCatalogModeEnabled(!!shopConfig.catalogModeEnabled);
    setCatalogModeMessage(shopConfig.catalogModeMessage || "SABORIFICACIÓN EN MANTENIMIENTO (SÓLO CATÁLOGO)\nSincronización pausada por el Administrador.");
  }, [shopConfig]);

  // Handling Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput, adminName: "admin" })
      });
      if (response.ok) {
        setIsAuthenticated(true);
        setLoginError("");
        setContrasenaAdmin(passwordInput);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("is_admin_authenticated", "true");
          sessionStorage.setItem("admin_password", passwordInput);
        }
        await onRefreshData?.();
      } else {
        const errData = await response.json().catch(() => ({}));
        setLoginError(errData.error || "Contraseña incorrecta. Inténtalo de nuevo.");
      }
    } catch (err) {
      // Fallback check if server endpoint is offline or not responsive
      const envAdminPass = (import.meta as any).env.VITE_ADMIN_PASSWORD;
      if (passwordInput === shopConfig.contrasenaAdmin || (envAdminPass && passwordInput === envAdminPass)) {
        setIsAuthenticated(true);
        setLoginError("");
        setContrasenaAdmin(passwordInput);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("is_admin_authenticated", "true");
          sessionStorage.setItem("admin_password", passwordInput);
        }
        await onRefreshData?.();
      } else {
        setLoginError("Error de conexión con el servidor o contraseña incorrecta.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": sessionStorage.getItem("admin_password") || ""
        },
        body: JSON.stringify({ adminName: "admin" })
      });
    } catch (err) {
      console.error("Failed to log logout event on server:", err);
    }

    setIsAuthenticated(false);
    setPasswordInput("");
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("is_admin_authenticated");
      sessionStorage.removeItem("admin_password");
    }
    onExitAdmin?.();
  };

  const copySqlToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  // Computed Sales (Filtered, Sorted and Paginated)
  const filteredSales = useMemo(() => {
    let result = [...sales];

    if (salesFilterClient) {
      const q = salesFilterClient.toLowerCase();
      result = result.filter(s => 
        s.clienteNombre.toLowerCase().includes(q) || 
        s.id.toLowerCase().includes(q) ||
        (s.numero_orden && String(s.numero_orden).includes(q))
      );
    }

    if (salesFilterStatus !== "todos") {
      result = result.filter(s => s.estado === salesFilterStatus);
    }

    if (salesFilterPaymentStatus !== "todos") {
      result = result.filter(s => s.payment_status === salesFilterPaymentStatus);
    }

    if (salesFilterDateStart) {
      result = result.filter(s => s.fecha >= salesFilterDateStart);
    }

    if (salesFilterDateEnd) {
      result = result.filter(s => s.fecha <= salesFilterDateEnd);
    }

    return result.sort((a, b) => {
      // Prioritize non-Entregado/non-Rechazado orders first
      const getStatusRank = (status: string) => {
        if (status === "Entregado" || status === "Rechazado" || status === "Eliminada") return 1;
        return 0;
      };

      const rankA = getStatusRank(a.estado);
      const rankB = getStatusRank(b.estado);

      if (rankA !== rankB) return rankA - rankB;

      const dateA = new Date(`${a.fecha}T${a.hora}`).getTime();
      const dateB = new Date(`${b.fecha}T${b.hora}`).getTime();
      return salesSortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [sales, salesSortOrder, salesFilterClient, salesFilterStatus, salesFilterPaymentStatus, salesFilterDateStart, salesFilterDateEnd]);

  const totalSalesPages = Math.ceil(filteredSales.length / salesPerPage) || 1;
  const paginatedSales = filteredSales.slice((salesPage - 1) * salesPerPage, salesPage * salesPerPage);

  // Helper for numeric sort (stable across Catalog and Admin)
  const getNumericId = (id: string): number => {
    const matched = id.match(/\d+/);
    return matched ? parseInt(matched[0], 10) : 0;
  };

  // Sorted products list based on shopConfig.catalogSortOrder
  const sortedAdminProducts = useMemo(() => {
    const list = [...products];
    const sortMode = shopConfig.catalogSortOrder || "manual";

    list.sort((a, b) => {
      // 1. Primary Sort (Mirroring App.tsx logic)
      if (sortMode === "stock_desc") {
        const aAgotado = a.stock === 0;
        const bAgotado = b.stock === 0;
        if (aAgotado !== bAgotado) return aAgotado ? 1 : -1;
        if (b.stock !== a.stock) return b.stock - a.stock;
      } else if (sortMode === "stock_asc") {
        const aAgotado = a.stock === 0;
        const bAgotado = b.stock === 0;
        if (aAgotado !== bAgotado) return aAgotado ? 1 : -1;
        if (a.stock !== b.stock) return a.stock - b.stock;
      } else if (sortMode === "alphabetical") {
        const nameComp = a.nombre.localeCompare(b.nombre);
        if (nameComp !== 0) return nameComp;
      }

      // 2. Secondary Sort / Tie-breaker (Manual/Numeric ID)
      if (a.orden_manual !== undefined && b.orden_manual !== undefined) {
        return a.orden_manual - b.orden_manual;
      }
      if (a.orden_manual !== undefined) return -1;
      if (b.orden_manual !== undefined) return 1;
      return getNumericId(a.id) - getNumericId(b.id);
    });

    return list;
  }, [products, shopConfig.catalogSortOrder]);

  useEffect(() => {
    // Reset page when sorting, filtering or items per page change
    setSalesPage(1);
  }, [salesSortOrder, salesPerPage, salesFilterClient, salesFilterStatus, salesFilterPaymentStatus, salesFilterDateStart, salesFilterDateEnd]);

  const autoManageSalesStatuses = (currentProducts: Product[], currentSales: Sale[]): Sale[] => {
    return currentSales;
  };

  // Wrapper to automatically check and update order waitlists when product stock changes
  const triggerAutoStatusCheck = (updatedProducts: Product[]) => {
    onUpdateProducts(updatedProducts);
  };

  // 1. INVENTARIO LOGIC
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newPrecio || !newStock) {
      setFormError("Por favor completa los campos requeridos.");
      return;
    }

    const priceNum = parseFloat(newPrecio);
    const stockNum = parseInt(newStock);
    const costNum = parseFloat(newCosto) || (newNombre.toLowerCase().includes("mango biche") ? 920 : 1140);

    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("El precio debe ser un número válido mayor a 0.");
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setFormError("El stock inicial no puede ser negativo.");
      return;
    }

    const maxId = products.reduce((max, p) => {
      const num = parseInt(p.id.replace('PROD-', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const maxOrden = products.reduce((max, p) => (p.orden_manual !== undefined && p.orden_manual > max ? p.orden_manual : max), 0);
    const newProd: Product = {
      id: `PROD-${maxId + 1}`,
      nombre: newNombre.trim(),
      precio: priceNum,
      costo: costNum,
      stock: stockNum,
      imagen: newImagen.trim(),
      orden_manual: maxOrden + 1,
    };

    triggerAutoStatusCheck([...products, newProd]);

    // Clear form
    setNewNombre("");
    setNewPrecio("");
    setNewCosto("");
    setNewStock("");
    setNewImagen("");
    setFormError("");
    setShowAddForm(false);
  };

  const handleDeleteProduct = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Sabor",
      message: "¿Estás seguro de que deseas eliminar este sabor del catálogo?",
      onConfirm: () => {
        const updated = products.filter((p) => p.id !== id);
        triggerAutoStatusCheck(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleResetSaborizacion = () => {
    setConfirmModal({
      isOpen: true,
      title: "Resetear Saborización",
      message: "¿Estás seguro de que deseas resetear todos los sabores del catálogo a un stock igual a 0? Esta acción actualizará la base de datos de manera inmediata.",
      onConfirm: () => {
        const zeroed = products.map((p) => ({ ...p, stock: 0 }));
        triggerAutoStatusCheck(zeroed);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setAlertModal({
          isOpen: true,
          title: "Saborización Reseteada",
          message: "Todos los sabores del catálogo han sido establecidos a stock 0 con éxito.",
        });
      },
    });
  };

  const handleAdjustStock = (id: string, amount: number) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        const newStock = Math.max(0, p.stock + amount);
        return { ...p, stock: newStock };
      }
      return p;
    });
    triggerAutoStatusCheck(updated);
  };

  const handleMoveProduct = (id: string, direction: 'up' | 'down') => {
    const currentSortedManual = [...sortedAdminProducts];
    const index = currentSortedManual.findIndex(p => p.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentSortedManual.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Create a copy to swap
    const reordered = [...currentSortedManual];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Map each product to its new manual order index
    const updatedProducts = products.map((p) => {
      const newPos = reordered.findIndex(rp => rp.id === p.id);
      if (newPos !== -1) {
        return { ...p, orden_manual: newPos };
      }
      return p;
    });

    triggerAutoStatusCheck(updatedProducts);
  };

  const handleEditPrice = (id: string, newPriceStr: string) => {
    const priceNum = parseFloat(newPriceStr);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const updated = products.map((p) => {
      if (p.id === id) {
        return { ...p, precio: priceNum };
      }
      return p;
    });
    triggerAutoStatusCheck(updated);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editNombre.trim() || !editPrecio || !editStock) {
      setEditError("Por favor completa todos los campos requeridos.");
      return;
    }
    const priceNum = parseFloat(editPrecio);
    const stockNum = parseInt(editStock);
    const costNum = parseFloat(editCosto) || (editNombre.toLowerCase().includes("mango biche") ? 920 : 1140);

    if (isNaN(priceNum) || priceNum <= 0) {
      setEditError("El precio debe ser un número de valor válido.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setEditError("El stock no puede ser un valor negativo.");
      return;
    }

    const updated = products.map((p) => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          nombre: editNombre.trim(),
          precio: priceNum,
          costo: costNum,
          stock: stockNum,
          imagen: editImagen.trim(),
        };
      }
      return p;
    });

    triggerAutoStatusCheck(updated);
    setEditingProduct(null);
    setEditError("");
  };

  // 2. VENTAS APPROVAL & STATUS MANAGEMENT LOGIC
  const handleUpdateSaleStatus = (saleId: string, newEstado: "Pendiente" | "Aprobado" | "Rechazado" | "En espera" | "Pre-Aprobado" | "Entregado" | "Eliminada") => {
    // 1. Find the sale
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    const oldEstado = sale.estado;
    if (oldEstado === newEstado) return;

    // 2. Adjust stock
    let updatedProducts = [...products];

    // Stock only discounts when transitioning from a non-deducted state (Rechazado, Eliminada)
    // to a deducted state (Pendiente, En espera, Pre-Aprobado, Aprobado, Entregado).
    const wasDeducted = oldEstado !== "Rechazado" && oldEstado !== "Eliminada";
    const isDeductedNow = newEstado !== "Rechazado" && newEstado !== "Eliminada";

    const isTransitioningToReserved = !wasDeducted && isDeductedNow;
    const isTransitioningOutFromReserved = wasDeducted && !isDeductedNow;

    if (isTransitioningToReserved) {
      // Check stock first
      let sufficientStock = true;
      const stockMap: { [key: string]: number } = {};
      products.forEach((p) => {
        stockMap[p.id] = p.stock;
      });

      for (const item of sale.items) {
        const currentStock = stockMap[item.productId] ?? 0;
        if (currentStock < item.cantidad) {
          sufficientStock = false;
          break;
        }
      }

      if (!sufficientStock) {
        setAlertModal({
          isOpen: true,
          title: "Stock Insuficiente",
          message: "No hay suficiente stock disponible de uno o más sabores para reservar esta orden. Por favor, recarga el stock primero.",
        });
        return;
      }

      // Discount stock
      updatedProducts = products.map((p) => {
        const soldItem = sale.items.find((item) => item.productId === p.id);
        if (soldItem) {
          return { ...p, stock: Math.max(0, p.stock - soldItem.cantidad) };
        }
        return p;
      });
    } else if (isTransitioningOutFromReserved) {
      // Restore stock
      updatedProducts = products.map((p) => {
        const soldItem = sale.items.find((item) => item.productId === p.id);
        if (soldItem) {
          return { ...p, stock: p.stock + soldItem.cantidad };
        }
        return p;
      });
    }

    // 3. Update status in sales array
    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        if (s.estado !== "Entregado" && newEstado === "Entregado") {
          // Send automatic image receipt to telegram
          handleDirectTelegramSend(saleId);
        }
        const updatedSale = { ...s, estado: newEstado as any };
        // Si la orden se aprueba o finaliza, y es efectivo, marcamos como pagado
        if ((newEstado === "Aprobado" || newEstado === "Entregado") && updatedSale.payment_method === "efectivo") {
          updatedSale.payment_status = "Pagado";
        }
        // Si se finaliza explícitamente, siempre marcamos como pagado
        if (newEstado === "Entregado") {
          updatedSale.payment_status = "Pagado";
        }
        // Si se anula o rechaza la orden, marcamos el pago como anulado
        if (newEstado === "Rechazado" || newEstado === "Eliminada") {
          updatedSale.payment_status = "Anulado";
        }
        return updatedSale;
      }
      return s;
    });

    onUpdateProducts(updatedProducts);
    onUpdateSales(updatedSales);
  };

  const handleAcceptOrder = (saleId: string) => {
    handleUpdateSaleStatus(saleId, "Aprobado");
    // Sync local editing state in modal
    setEditingSale(prev => prev && prev.id === saleId ? { ...prev, estado: "Aprobado" } : prev);
  };

  const handleFinalizeOrder = (saleId: string) => {
    handleUpdateSaleStatus(saleId, "Entregado");
    // Sync local editing state in modal
    setEditingSale(prev => prev && prev.id === saleId ? { ...prev, estado: "Entregado", payment_status: "Pagado" } : prev);
  };

  const handlePreApproveOrder = (saleId: string) => {
    handleUpdateSaleStatus(saleId, "Pre-Aprobado");
    // Sync local editing state in modal
    setEditingSale(prev => prev && prev.id === saleId ? { ...prev, estado: "Pre-Aprobado" } : prev);
  };

  const handleApprovePayment = (saleId: string) => {
    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        return { ...s, payment_status: "Pagado" as const };
      }
      return s;
    });
    onUpdateSales(updatedSales);
    // Sync local editing state in modal
    setEditingSale(prev => prev && prev.id === saleId ? { ...prev, payment_status: "Pagado" } : prev);
  };

  useEffect(() => {
    if (editingSale) {
      setEditSaleItems(editingSale.items.map(i => ({ ...i })));
      setEditClienteNombre(editingSale.clienteNombre);
      setEditClienteTelefono(editingSale.clienteTelefono || "");
      setEditPaymentMethod(editingSale.payment_method || "efectivo");
      setEditPaymentWithBill(editingSale.payment_with_bill ? String(editingSale.payment_with_bill) : "");
      setEditEstado(editingSale.estado);
      setEditPaymentStatus(editingSale.payment_status);
    }
  }, [editingSale]);

  const handleSaveSaleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    if (editSaleItems.length === 0) {
      setEditSaleError("La orden debe tener al menos un producto.");
      return;
    }

    const newTotal = editSaleItems.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);

    // Calc payment details
    const paymentWithBillNum = editPaymentMethod === "efectivo" ? parseFloat(editPaymentWithBill) || 0 : 0;
    const paymentChange = editPaymentMethod === "efectivo" ? Math.max(0, paymentWithBillNum - newTotal) : 0;

    // Prepare updated products list
    // 1. If old status was deducted (any state other than Rechazado or Eliminada), we restore old quantities to stock
    let updatedProducts = [...products];
    const wasDeducted = editingSale.estado !== "Rechazado" && editingSale.estado !== "Eliminada";
    if (wasDeducted) {
      updatedProducts = products.map((p) => {
        const oldItem = editingSale.items.find((item) => item.productId === p.id);
        if (oldItem) {
          return { ...p, stock: p.stock + oldItem.cantidad };
        }
        return p;
      });
    }

    // Use manually selected status and payment status
    const finalStatus = editEstado;
    let finalPaymentStatus = editPaymentStatus;

    // Si se anula o rechaza la orden, marcamos el pago como anulado automáticamente
    if (finalStatus === "Rechazado" || finalStatus === "Eliminada") {
      finalPaymentStatus = "Anulado";
    }

    const isDeductedNow = finalStatus !== "Rechazado" && finalStatus !== "Eliminada";

    // Now check if we have sufficient stock for the new edited list (only if it is deducted now)
    let sufficientStock = true;
    if (isDeductedNow) {
      for (const item of editSaleItems) {
        const prod = updatedProducts.find((p) => p.id === item.productId);
        const currentStock = prod ? prod.stock : 0;
        if (currentStock < item.cantidad) {
          sufficientStock = false;
          break;
        }
      }
    }

    if (!sufficientStock) {
      setEditSaleError("No hay suficiente stock disponible de uno o más sabores para guardar esta orden con estas cantidades.");
      return;
    }

    // Now subtract the stock for the new quantities if it's deducted now
    if (isDeductedNow) {
      updatedProducts = updatedProducts.map((p) => {
        const newItem = editSaleItems.find((item) => item.productId === p.id);
        if (newItem) {
          return { ...p, stock: Math.max(0, p.stock - newItem.cantidad) };
        }
        return p;
      });
    }

    // Update sales list
    const updatedSales = sales.map((s) => {
      if (s.id === editingSale.id) {
        return {
          ...s,
          clienteNombre: editClienteNombre,
          clienteTelefono: editClienteTelefono,
          payment_method: editPaymentMethod,
          payment_with_bill: paymentWithBillNum || undefined,
          payment_change: paymentChange || undefined,
          payment_status: finalPaymentStatus,
          items: editSaleItems,
          total: newTotal,
          estado: finalStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });

    onUpdateProducts(updatedProducts);
    onUpdateSales(updatedSales);
    setEditingSale(null);
    setEditSaleItems([]);
    setEditSaleError("");
  };

  const captureAdminReceiptAsImage = async (element: HTMLDivElement): Promise<string> => {
    // Ensure element is visible before capturing
    try {
      // Use slightly lower pixel ratio to avoid potential memory issues on large receipts
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: element.offsetWidth || 360,
        pixelRatio: 2.0,
        skipFonts: true,
        filter: (node) => !(node instanceof HTMLElement && node.classList?.contains('exclude-from-image')),
      });
      return dataUrl;
    } catch (error) {
      console.error("Error capturing receipt image:", error);
      throw error;
    }
  };

  const handleDirectTelegramSend = async (saleId: string) => {
    setSendingTelegramId(saleId);
    setCaptureSaleId(saleId);
  };

  const sendToTelegram = async (saleId: string, base64Image: string) => {
    try {
      // Enviar el Base64 a tu API
      const response = await fetch("/api/telegram/send-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": contrasenaAdmin,
        },
        body: JSON.stringify({
          saleId,
          imageBuffer: base64Image,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al enviar el recibo a Telegram.");
      }

      setSettingsSuccess("¡Ticket enviado a Telegram con éxito!");
      setTimeout(() => setSettingsSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error generating/sending receipt:", err);
      setAlertModal({ isOpen: true, title: "Error", message: err.message });
    } finally {
      setSendingTelegramId(null);
    }
  };

  // Poll for pending Telegram receipt requests
  useEffect(() => {
    if (!isAuthenticated) return;
    let isPolling = false;
    const interval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await fetch("/api/telegram/pending-receipts", {
          headers: {
            "X-Admin-Password": contrasenaAdmin
          }
        });
        if (res.ok) {
          const data = await res.json();
          const pending = data.pending || [];
          for (const orderId of pending) {
            const sale = sales.find((s: Sale) => s.id === orderId);
            if (sale) {
              await handleDirectTelegramSend(orderId);
              await fetch("/api/telegram/clear-pending", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Admin-Password": contrasenaAdmin
                },
                body: JSON.stringify({ saleId: orderId })
              });
            }
          }
        }
      } catch (e) {
        // Silent fail
      } finally {
        isPolling = false;
      }
    }, 2000); // 2 second polling interval
    return () => clearInterval(interval);
  }, [isAuthenticated, contrasenaAdmin, sales]);

  const handleClearSales = () => {
    setConfirmModal({
      isOpen: true,
      title: "Vaciar Registro de Ventas",
      message: "¿Estás seguro de que deseas vaciar todo el registro de ventas? Esta acción es irreversible y se borrará también en la base de datos.",
      onConfirm: async () => {
        try {
            const response = await fetch("/api/db/clear-sales", {
                method: "POST",
                headers: {
                    "X-Admin-Password": contrasenaAdmin
                }
            });
            if (!response.ok) throw new Error("Error al borrar ventas en el servidor.");
            
            // Trigger refresh to update local state from server
            if (onRefreshData) {
                await onRefreshData();
            }
        } catch (err: any) {
            setAlertModal({ isOpen: true, title: "Error", message: err.message });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };




  const handleDeleteSale = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    const label = sale.numero_orden ? `#${String(sale.numero_orden).padStart(6, '0')} (${sale.id})` : `#${sale.id}`;
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Orden",
      message: `¿Estás seguro de que deseas eliminar la orden ${label}? Esta acción cambiará su estado a 'Eliminada' y devolverá las unidades de stock al inventario.`,
      onConfirm: () => {
        let updatedProducts = [...products];
        const wasDeducted = sale.estado !== "Rechazado" && sale.estado !== "Eliminada";
        if (wasDeducted) {
          // Restore stock
          updatedProducts = products.map((p) => {
            const soldItem = sale.items.find((item) => item.productId === p.id);
            if (soldItem) {
              return { ...p, stock: p.stock + soldItem.cantidad };
            }
            return p;
          });
          onUpdateProducts(updatedProducts);
        }

        const updatedSales = sales.map((s) => {
          if (s.id === saleId) {
            return { ...s, estado: "Eliminada" as any };
          }
          return s;
        });
        onUpdateSales(updatedSales);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // METRICS COMPUTATIONS
  // Account for Pre-Aprobado, Entregado, and Aprobado orders in reports with time-range filtering
  const approvedSales = useMemo(() => {
    let base = sales.filter((s) => s.estado === "Aprobado" || s.estado === "Pre-Aprobado" || s.estado === "Entregado");
    
    if (dashboardTimeRange !== "todos") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      
      if (dashboardTimeRange === "hoy") {
        base = base.filter(s => s.fecha === todayStr);
      } else if (dashboardTimeRange === "semana") {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        const lastWeekStr = lastWeek.toISOString().split("T")[0];
        base = base.filter(s => s.fecha >= lastWeekStr);
      } else if (dashboardTimeRange === "mes") {
        const lastMonth = new Date();
        lastMonth.setDate(now.getDate() - 30);
        const lastMonthStr = lastMonth.toISOString().split("T")[0];
        base = base.filter(s => s.fecha >= lastMonthStr);
      }
    }
    
    return base;
  }, [sales, dashboardTimeRange]);

  const { totalRecaudado, totalCostoCompra, gananciaNeta, totalDespachados, bestSeller, worstSeller, flavorSalesArray } = useMemo(() => {
    try {
        const totalRecaudado = approvedSales.reduce((acc, curr) => acc + curr.total, 0);
        
        const totalCostoCompra = approvedSales.reduce(
            (acc, s) => acc + s.items.reduce((sum, item) => {
                // Look up product cost, fallback to sale item cost or hardcoded
                const product = products.find(p => p.id === item.productId);
                const costo = product?.costo || item.costoUnitario || (item.nombre.toLowerCase().includes("mango biche") ? 920 : 1140);
                return sum + (costo * item.cantidad);
            }, 0),
            0
        );

        const gananciaNeta = totalRecaudado - totalCostoCompra;

        const totalDespachados = approvedSales.reduce(
            (acc, s) => acc + s.items.reduce((sum, item) => sum + item.cantidad, 0),
            0
        );

        // Compute best and worst selling flavors
        const flavorSalesCount: { [name: string]: number } = {};
        products.forEach((p) => {
            flavorSalesCount[p.nombre] = 0;
        });

        approvedSales.forEach((s) => {
            s.items.forEach((item) => {
                flavorSalesCount[item.nombre] = (flavorSalesCount[item.nombre] || 0) + item.cantidad;
            });
        });

        const flavorSalesArray = Object.entries(flavorSalesCount).map(([nombre, totalUnits]) => ({
            nombre,
            totalUnits,
        }));

        const sortedBySales = [...flavorSalesArray].sort((a, b) => b.totalUnits - a.totalUnits);
        
        const bestSeller = sortedBySales.length > 0 && sortedBySales[0].totalUnits > 0 ? sortedBySales[0].nombre : "—";
        const worstSeller =
            sortedBySales.length > 0 && sortedBySales[sortedBySales.length - 1].totalUnits >= 0
            ? sortedBySales[sortedBySales.length - 1].nombre
            : "—";
        
        return { totalRecaudado, totalCostoCompra, gananciaNeta, totalDespachados, bestSeller, worstSeller, flavorSalesArray };
    } catch (e) {
        console.error("Error computing metrics:", e);
        return { totalRecaudado: 0, totalCostoCompra: 0, gananciaNeta: 0, totalDespachados: 0, bestSeller: "—", worstSeller: "—", flavorSalesArray: [] };
    }
  }, [approvedSales, products]);

  // Calculate Revenue per Flavor
  const flavorRevenue: { [name: string]: number } = {};
  products.forEach((p) => {
    flavorRevenue[p.nombre] = 0;
  });
  approvedSales.forEach((s) => {
    s.items.forEach((item) => {
      flavorRevenue[item.nombre] = (flavorRevenue[item.nombre] || 0) + item.cantidad * item.precioUnitario;
    });
  });

  const flavorRevenueArray = Object.entries(flavorRevenue).map(([nombre, cop]) => ({
    nombre,
    cop,
  }));

  // Recharts Data Computations
  const salesByDateMap: { [date: string]: { date: string; Recaudo: number; Ganancia: number; Pedidos: number; Unidades: number } } = {};
  approvedSales.forEach((s) => {
    const d = s.fecha; // YYYY-MM-DD
    if (!salesByDateMap[d]) {
      salesByDateMap[d] = { date: d, Recaudo: 0, Ganancia: 0, Pedidos: 0, Unidades: 0 };
    }
    salesByDateMap[d].Recaudo += s.total;
    salesByDateMap[d].Pedidos += 1;
    const qty = s.items.reduce((acc, curr) => acc + curr.cantidad, 0);
    salesByDateMap[d].Unidades += qty;
    
    const cost = s.items.reduce((sum, item) => sum + (item.costoUnitario || (item.nombre.toLowerCase().includes("mango biche") ? 920 : 1140)) * item.cantidad, 0);
    salesByDateMap[d].Ganancia += (s.total - cost);
  });

  const rechartsDailySalesData = Object.values(salesByDateMap).sort((a, b) => a.date.localeCompare(b.date));

  // 4. SETTINGS SAVE
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(tiendaNombre || "").trim() || !(contrasenaAdmin || "").trim()) {
      setSettingsSuccess("");
      setAlertModal({
        isOpen: true,
        title: "Faltan Ajustes",
        message: "Por favor completa todos los ajustes requeridos.",
      });
      return;
    }

    const activePass = sessionStorage.getItem("admin_password") || contrasenaAdmin || shopConfig.contrasenaAdmin || "PipeAdmin2026";

    const currentShopConfig = {
      tiendaNombre: (tiendaNombre || "").trim(),
      contrasenaAdmin: (contrasenaAdmin || "").trim(),
      metodoOrdenar: (metodoOrdenar || "").trim(),
      cuentaNumero: (cuentaNumero || "").trim(),
      cuentaTitular: (cuentaTitular || "").trim(),
      whatsappNumero: (whatsappNumero || "").trim(),
      mostrarReloj,
      mostrarClima,
      syncEnabled: shopConfig.syncEnabled !== false,
      catalogSortOrder,
      catalogModeEnabled,
      catalogModeMessage: (catalogModeMessage || "").trim()
    };

    try {
      setSettingsSuccess("Guardando ajustes...");
      const response = await fetch("/api/db/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": activePass
        },
        body: JSON.stringify({ shopConfig: currentShopConfig })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Fallo al guardar ajustes en la base de datos.");
      }

      onUpdateConfig(currentShopConfig);
      setSettingsSuccess("Ajustes guardados correctamente en la nube ✓");
      setTimeout(() => setSettingsSuccess(""), 4000);
    } catch (err: any) {
      console.error("[Settings] Error saving configuration:", err);
      setSettingsSuccess("");
      setAlertModal({
        isOpen: true,
        title: "Error al Guardar",
        message: err.message || "No se pudieron guardar los ajustes en el servidor.",
      });
    }
  };

  // Auth Layout
  if (!isAuthenticated) {
    return (
      <section className="flex min-h-[500px] items-center justify-center py-12 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-slate-50 dark:bg-zinc-800 p-4 text-slate-700 dark:text-brand-500">
              <Lock className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h2 className="font-sans text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Área de Control Protegida
            </h2>
            <p className="mt-2 text-xs text-slate-550 font-medium dark:text-zinc-400">
              Ingresa la contraseña de administrador para gestionar la tienda, esta pestaña es solo para el administrador.
            </p>

            {/* Serious unauthorized warning alert card */}
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-left text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-350">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-750 dark:text-rose-400 mb-1 flex items-center gap-1">
                ⚠️ ALERTA: ACCESO RESTRINGIDO
              </h4>
              <p className="text-[10.5px] leading-relaxed font-normal text-rose-700 dark:text-rose-300">
                Si eres un usuario o cliente regular, <strong>NO</strong> intentes ingresar a esta pestaña. Cualquier intento malicioso o de adivinación de clave resultará en que seas <strong>baneado de manera definitiva y restringido totalmente</strong> del uso de la página web. Se registran coordenadas del sistema para protección de seguridad.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <input
                type="password"
                required
                placeholder="Contraseña"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700"
              />
              {loginError && <p className="mt-2 text-xs text-rose-500 font-medium">{loginError}</p>}
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand-700 active:scale-95 transition-all duration-200"
            >
              <Unlock className="h-4 w-4" /> Desbloquear Panel
            </button>
          </form>

          {/* Database Status Indicator for Debugging */}
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-550">
                Estado de Conexión (Supabase)
              </span>
              <button
                type="button"
                onClick={() => testSupabaseConnection(true)}
                disabled={supabaseStatus === null || isRetryingSupabase}
                className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${isRetryingSupabase || supabaseStatus === null ? "animate-spin" : ""}`} />
                <span>Reintentar</span>
              </button>
            </div>
            {supabaseStatus === null ? (
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium bg-slate-50 dark:bg-zinc-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Verificando conexión en la nube...</span>
              </div>
            ) : !supabaseStatus.configured ? (
              <div className="rounded-lg bg-amber-50/50 p-2.5 border border-amber-200/50 dark:bg-amber-950/10 dark:border-amber-900/20 text-[10px] text-amber-850 dark:text-amber-400">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Base de datos local activa
                </p>
                <p className="text-[9px] leading-normal text-amber-700/80 dark:text-amber-450/80 font-medium">
                  Supabase no está configurado en el servidor. Las variables de entorno de Supabase no están definidas o cargadas aún.
                </p>
                <div className="mt-2 text-[8.5px] leading-relaxed border-t border-amber-200/30 pt-1.5 text-amber-700/90 dark:text-amber-400/90">
                  <strong>Nota Importante:</strong>
                  <ul className="list-disc pl-3 mt-1 space-y-0.5 font-sans">
                    <li>Si estás en <strong>AI Studio (Vista Previa)</strong>, agrega las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el menú de Configuración de AI Studio.</li>
                    <li>Si estás en <strong>Vercel (Producción)</strong>, haz un <strong>Redeploy</strong> en Vercel para aplicar las nuevas variables que configuraste.</li>
                  </ul>
                </div>
              </div>
            ) : supabaseStatus.connected ? (
              <div className="rounded-lg bg-emerald-50/50 p-2.5 border border-emerald-200/50 dark:bg-emerald-950/10 dark:border-emerald-900/20 text-[10px] text-emerald-850 dark:text-emerald-400">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado a Supabase en la nube
                </p>
                <p className="text-[9px] leading-normal text-emerald-750/85 dark:text-emerald-400/80 font-medium">
                  Sincronización en tiempo real activa. Todos los datos están asegurados en la base de datos externa de Supabase.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-rose-50/50 p-2.5 border border-rose-200/50 dark:bg-rose-950/10 dark:border-rose-900/20 text-[10px] text-rose-850 dark:text-rose-400">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-800 dark:text-rose-450">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Error de conexión a Supabase
                </p>
                <p className="text-[9px] font-mono leading-normal bg-rose-100/30 dark:bg-rose-950/30 p-1.5 rounded mt-1 overflow-x-auto text-rose-700 dark:text-rose-350">
                  {supabaseStatus.error || "No se pudo establecer la conexión."}
                </p>
                <p className="text-[8.5px] leading-normal text-rose-700/85 dark:text-rose-400/85 mt-2">
                  <strong>Sugerencia:</strong> Si ya agregaste las variables en Vercel, recuerda que debes hacer un <strong>Redeploy</strong> (re-despliegue) para que Vercel cargue los nuevos valores de entorno tanto en el servidor como en el cliente.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-container w-full max-w-[1600px] mx-auto py-4 sm:py-8 px-2 sm:px-6 animate-fade-in">
      
      {/* Admin Nav Bar and Title */}
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Módulo Operativo y de Control
          </span>
          <h2 className="font-sans text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-1">
            <Database className="h-6 w-6 text-brand-500 animate-pulse" />
            Panel de Administración PIPE CONTROL
          </h2>
        </div>

        {/* Live Supabase Status Badge & Refresh Control */}
        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              type="button"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshData();
                  setRefreshKey(prev => prev + 1);
                } catch (err) {
                  console.error("Refresh error:", err);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Cargando..." : "Refrescar"}</span>
            </button>
          )}

          {!supabaseStatus ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-650 dark:bg-zinc-800/40 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-slate-100/50 dark:border-zinc-800/30">
              <RefreshCw className="h-3 w-3 animate-spin text-brand-505" />
              <span>Verificando Nube</span>
            </div>
          ) : shopConfig.syncEnabled === false ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 text-[10px] font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-900/30">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <CloudOff className="h-3.5 w-3.5 text-rose-500" />
              <span>Off</span>
            </div>
          ) : supabaseStatus.connected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud className="h-3.5 w-3.5 text-emerald-500" />
              <span>En Línea</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 text-[10px] font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-900/30">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <CloudOff className="h-3.5 w-3.5 text-rose-500" />
              <span>Sin Conexión</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR NAVIGATION - REDESIGNED SECTIONS */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-2 lg:p-4 shadow-sm flex flex-row lg:flex-col items-center lg:items-stretch gap-2 lg:gap-5 overflow-x-auto lg:overflow-visible no-scrollbar animate-fade-in">
            
            {/* Sección: Gestión de Inventario */}
            <div className="flex-1 lg:flex-none space-y-1.5 min-w-[140px] lg:min-w-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-1 font-mono">
                📦 GESTIÓN DE INVENTARIO
              </span>
              <button
                onClick={() => setActiveTab("inventario")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "inventario"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4" />
                  <span className="truncate">Inventario</span>
                </div>
                <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${activeTab === 'inventario' ? 'bg-brand-700 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                  {products.length}
                </span>
              </button>
            </div>

            {/* Sección: Ventas */}
            <div className="flex-1 lg:flex-none space-y-1.5 pt-0 lg:pt-1 border-l lg:border-l-0 lg:border-t border-slate-100/60 dark:border-zinc-800/40 pl-4 lg:pl-0 min-w-[140px] lg:min-w-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-1 mt-2 font-mono">
                📊 SECCIÓN DE VENTAS
              </span>
              <button
                onClick={() => setActiveTab("ventas")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer relative ${
                  activeTab === "ventas"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="truncate">Ventas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {sales.filter((s) => s.estado === "Pendiente").length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  )}
                  <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${activeTab === 'ventas' ? 'bg-brand-700 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                    {sales.length}
                  </span>
                </div>
              </button>
            </div>

            {/* Sección: Estadísticas */}
            <div className="flex-1 lg:flex-none space-y-1.5 pt-0 lg:pt-1 border-l lg:border-l-0 lg:border-t border-slate-100/60 dark:border-zinc-800/40 pl-4 lg:pl-0 min-w-[140px] lg:min-w-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-1 mt-2 font-mono">
                📈 ANALÍTICA EN VIVO
              </span>
              <button
                onClick={() => setActiveTab("estadisticas")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "estadisticas"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="truncate">Cloud</span>
              </button>
            </div>

            {/* Sección: Configuración General */}
            <div className="flex-1 lg:flex-none space-y-1.5 pt-0 lg:pt-1 border-l lg:border-l-0 lg:border-t border-slate-100/60 dark:border-zinc-800/40 pl-4 lg:pl-0 min-w-[140px] lg:min-w-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-1 mt-2 font-mono">
                ⚙️ CONFIGURACIÓN GENERAL
              </span>
              <button
                onClick={() => setActiveTab("ajustes")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "ajustes"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="truncate">Ajustes</span>
              </button>
            </div>

            {/* Sección: Auditoría del Sistema */}
            <div className="flex-1 lg:flex-none space-y-1.5 pt-0 lg:pt-1 border-l lg:border-l-0 lg:border-t border-slate-100/60 dark:border-zinc-800/40 pl-4 lg:pl-0 min-w-[140px] lg:min-w-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-1 mt-2 font-mono">
                🛡️ SEGURIDAD Y CONTROL
              </span>
              <button
                onClick={() => setActiveTab("auditoria")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "auditoria"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                <Lock className="h-4 w-4" />
                <span className="truncate">Auditoría</span>
              </button>
            </div>
            
            {/* Sección: Mantenimiento y Backup */}
            <div className="flex-1 lg:flex-none space-y-1.5 pt-0 lg:pt-1 border-l lg:border-l-0 lg:border-t border-slate-100/60 dark:border-zinc-800/40 pl-4 lg:pl-0 min-w-[140px] lg:min-w-0">
              <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-1 mt-2 font-mono">
                🛠️ MANTENIMIENTO
              </span>
              <button
                onClick={() => setActiveTab("mantenimiento")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "mantenimiento"
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                <Database className="h-4 w-4" />
                <span className="truncate">Mantenimiento</span>
              </button>
            </div>

            {/* Sección: Motor Supabase */}
            <div className="space-y-2 pt-3 border-t border-slate-100/60 dark:border-zinc-800/40 font-sans">
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-mono">
                  ☁️ CONEXIÓN CLOUD
                </span>
                <button
                  type="button"
                  onClick={() => testSupabaseConnection(true)}
                  disabled={supabaseStatus === null || isRetryingSupabase}
                  className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Forzar diagnóstico de conexión"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isRetryingSupabase || supabaseStatus === null ? "animate-spin" : ""}`} />
                  <span>Reintentar</span>
                </button>
              </div>
              <div className="mx-1 p-3 rounded-xl border transition-all text-xs bg-slate-50 border-slate-100 dark:bg-zinc-950/20 dark:border-zinc-800/50">
                {!supabaseStatus ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    <span className="font-medium">Verificando...</span>
                  </div>
                ) : shopConfig.syncEnabled === false ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <CloudOff className="h-3.5 w-3.5 shrink-0" />
                      <span>ESTADO: OFF</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal font-medium">
                      Sincronización suspendida por el administrador.
                    </p>
                  </div>
                ) : supabaseStatus.connected ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Cloud className="h-3.5 w-3.5 shrink-0 animate-bounce" />
                      <span>SISTEMA EN LÍNEA</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal font-medium">
                      Base de datos sincronizada en tiempo real con Supabase.
                    </p>
                  </div>
                ) : !supabaseStatus.configured ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wide text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>LOCAL ACTIVO</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-450 leading-normal font-medium">
                      Supabase no configurado en el servidor.
                    </p>
                    <p className="text-[9px] text-amber-750 dark:text-amber-400 leading-normal border-t border-amber-250/20 pt-1 mt-1">
                      Si estás en Vercel, realiza un <strong>Redeploy</strong>. En AI Studio, agrega las variables en Configuración.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <CloudOff className="h-3.5 w-3.5 shrink-0" />
                      <span>SIN CONEXIÓN</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal font-medium">
                      No hay conexión. Error:
                    </p>
                    <p className="text-[9px] font-mono bg-rose-105/40 dark:bg-rose-950/20 p-1.5 rounded text-rose-750 dark:text-rose-400 overflow-x-auto max-w-full leading-tight">
                      {supabaseStatus.error || "Falla de autenticación"}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm font-sans">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* MAIN WORKSPACE - CONTENT AREA */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* TAB: MANTENIMIENTO Y BACKUP */}
            {activeTab === "mantenimiento" && (() => {
              // Internal helper handlers for import files
              const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportFile(file);
                setImportStatus({ type: "loading", message: "Procesando archivo..." });
                setImportData(null);

                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const text = event.target?.result as string;
                    if (file.name.endsWith(".json")) {
                      const parsed = JSON.parse(text);
                      
                      const hasProducts = Array.isArray(parsed.products);
                      const hasSales = Array.isArray(parsed.sales);
                      const hasConfig = typeof parsed.shopConfig === "object" && parsed.shopConfig !== null;
                      
                      if (!hasProducts && !hasSales) {
                        throw new Error("El archivo JSON no contiene productos ni ventas válidas para Pipe Ice Cream.");
                      }
                      
                      let totalItems = 0;
                      if (hasSales) {
                        parsed.sales.forEach((s: any) => {
                          if (Array.isArray(s.items)) {
                            totalItems += s.items.length;
                          }
                        });
                      }
                      
                      setImportData({
                        type: "json",
                        products: hasProducts ? parsed.products : [],
                        sales: hasSales ? parsed.sales : [],
                        shopConfig: hasConfig ? parsed.shopConfig : undefined,
                        rawCount: {
                          products: hasProducts ? parsed.products.length : 0,
                          sales: hasSales ? parsed.sales.length : 0,
                          items: totalItems
                        }
                      });
                      setImportStatus({ type: "idle", message: "" });
                    } else if (file.name.endsWith(".csv")) {
                      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
                      if (lines.length < 2) {
                        throw new Error("El archivo CSV no contiene suficientes líneas de datos.");
                      }
                      
                      const headers = lines[0].toLowerCase();
                      if (headers.includes("precio") || headers.includes("costo") || headers.includes("stock")) {
                        // Products CSV
                        const parsedProducts: Product[] = [];
                        for (let i = 1; i < lines.length; i++) {
                          const cols = lines[i].split(",");
                          if (cols.length >= 2) {
                            parsedProducts.push({
                              id: cols[0] || `PROD-IMP-${i}`,
                              nombre: cols[1]?.replace(/^"|"$/g, "") || "Producto Importado",
                              precio: Number(cols[2]) || 0,
                              costo: Number(cols[3]) || 0,
                              stock: Number(cols[4]) || 0,
                              imagen: cols[5] || ""
                            });
                          }
                        }
                        
                        setImportData({
                          type: "csv_products",
                          products: parsedProducts,
                          sales: [],
                          rawCount: {
                            products: parsedProducts.length,
                            sales: 0
                          }
                        });
                        setImportStatus({ type: "idle", message: "" });
                      } else if (headers.includes("fecha") || headers.includes("cliente") || headers.includes("total")) {
                        // Sales CSV
                        const parsedSales: Sale[] = [];
                        for (let i = 1; i < lines.length; i++) {
                          const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
                          if (cols.length >= 4) {
                            const cleanCol = (val: string) => val ? val.replace(/^"|"$/g, "").trim() : "";
                            parsedSales.push({
                              id: cleanCol(cols[0]) || `ORD-IMP-${i}`,
                              fecha: cleanCol(cols[1]) || new Date().toISOString().split("T")[0],
                              hora: cleanCol(cols[2]) || "12:00",
                              clienteNombre: cleanCol(cols[3]) || "Cliente Importado",
                              clienteTelefono: cleanCol(cols[4]) || "",
                              clienteDireccion: cleanCol(cols[5]) || "",
                              total: Number(cleanCol(cols[6])) || 0,
                              estado: (cleanCol(cols[7]) || "Pendiente") as any,
                              payment_method: (cleanCol(cols[8]) || "efectivo") as any,
                              payment_status: (cleanCol(cols[9]) || "Pendiente") as any,
                              items: [] // Empty items
                            });
                          }
                        }
                        
                        setImportData({
                          type: "csv_sales",
                          products: [],
                          sales: parsedSales,
                          rawCount: {
                            products: 0,
                            sales: parsedSales.length
                          },
                          warningMessage: "Atención Relacional: El archivo CSV es un formato plano de una sola tabla. No contiene los sabores específicos de helado vendidos en cada pedido (que corresponden a la tabla 'sale_items'). Si continúas, las ventas se importarán con desgloses vacíos. Para una importación completa y con total integridad de ambas tablas ('sales' y 'sale_items'), por favor sube un archivo de respaldo en formato JSON."
                        });
                        setImportStatus({ type: "idle", message: "" });
                      } else {
                        throw new Error("No se pudo detectar si el archivo es de Productos o de Ventas. Verifica que los encabezados del CSV sean correctos.");
                      }
                    } else {
                      throw new Error("Formato de archivo no soportado. Por favor, sube un archivo .json o .csv");
                    }
                  } catch (err: any) {
                    setImportStatus({ type: "error", message: err.message || "Error al procesar el archivo." });
                    setImportData(null);
                  }
                };
                reader.readAsText(file);
              };

              const handleExecuteImport = () => {
                if (!importData) return;
                setImportStatus({ type: "loading", message: "Escribiendo datos y sincronizando con el servidor..." });
                
                setTimeout(() => {
                  try {
                    if (importData.type === "json") {
                      if (importData.products.length > 0) {
                        onUpdateProducts(importData.products);
                      }
                      if (importData.sales.length > 0) {
                        onUpdateSales(importData.sales);
                      }
                      if (importData.shopConfig) {
                        onUpdateConfig(importData.shopConfig);
                      }
                      setImportStatus({
                        type: "success",
                        message: `¡Copia de seguridad restaurada con éxito! Se cargaron ${importData.rawCount?.products} productos, ${importData.rawCount?.sales} ventas y sus correspondientes ${importData.rawCount?.items} desgloses en la tabla 'sale_items' de forma íntegra.`
                      });
                    } else if (importData.type === "csv_products") {
                      onUpdateProducts(importData.products);
                      setImportStatus({
                        type: "success",
                        message: `¡Productos importados con éxito! Se cargaron ${importData.rawCount?.products} sabores de helado al inventario.`
                      });
                    } else if (importData.type === "csv_sales") {
                      onUpdateSales(importData.sales);
                      setImportStatus({
                        type: "success",
                        message: `¡Ventas importadas con éxito! Se registraron ${importData.rawCount?.sales} pedidos. Nota: Al ser una importación de CSV plano, los desgloses en la tabla 'sale_items' no se crearon debido a la naturaleza del formato.`
                      });
                    }
                    
                    setImportFile(null);
                    setImportData(null);
                  } catch (err: any) {
                    setImportStatus({ type: "error", message: err.message || "Ocurrió un error al guardar los datos." });
                  }
                }, 1000);
              };

              return (
                <motion.div
                  key="tab-mantenimiento"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Encabezado Principal */}
                  <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-brand-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black flex items-center gap-2">
                        <Database className="h-6 w-6" />
                        Centro de Respaldo y Recuperación
                      </h3>
                      <p className="text-sm text-brand-100 mt-1 max-w-xl">
                        Gestiona copias de seguridad de la base de datos de Pipe Ice Cream. Puedes descargar respaldos íntegros de tus catálogos, configuraciones e historial de ventas relacionales.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Panel Izquierdo: Exportar Respaldo */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-full">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <Download className="h-4 w-4 text-brand-500" />
                          Generar Copia de Seguridad (Exportar)
                        </h4>
                        
                        <div className="space-y-3 flex-1">
                          {/* Exportación JSON Recomendada */}
                          <button
                            onClick={() => {
                              const backupObj = {
                                products,
                                sales,
                                shopConfig,
                                lastUpdated: Date.now(),
                                version: "3.0"
                              };
                              const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupObj, null, 2))}`;
                              const link = document.createElement("a");
                              link.setAttribute("href", jsonString);
                              link.setAttribute("download", `pipe_ice_cream_backup_completo_${new Date().toISOString().split('T')[0]}.json`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="w-full text-left p-4 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/45 rounded-xl border border-emerald-100 dark:border-emerald-900/30 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-emerald-500 text-white rounded-lg group-hover:scale-105 transition-transform">
                                <FileJson className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="block text-sm font-black text-emerald-800 dark:text-emerald-400">Respaldo Completo de Base de Datos (JSON)</span>
                                <span className="block text-xs text-emerald-600 dark:text-emerald-500 mt-1">Recomendado. Guarda config, productos y ventas con desgloses relacionales (sales + sale_items).</span>
                              </div>
                            </div>
                          </button>

                          {/* Exportación CSV Productos */}
                          <button
                            onClick={() => {
                              const csvContent = "data:text/csv;charset=utf-8," + 
                                "ID,Nombre,Precio,Costo,Stock\n" +
                                products.map(p => `${p.id},${p.nombre},${p.precio},${p.costo},${p.stock}`).join("\n");
                              const encodedUri = encodeURI(csvContent);
                              const link = document.createElement("a");
                              link.setAttribute("href", encodedUri);
                              link.setAttribute("download", `productos_backup_${new Date().toISOString().split('T')[0]}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700/50 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-brand-500 text-white rounded-lg group-hover:scale-105 transition-transform">
                                <FileSpreadsheet className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="block text-sm font-black text-slate-800 dark:text-slate-200">Exportar Sabor de Helados a CSV</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">Genera un archivo plano con ID, nombre, precio, costo y cantidad en stock de tus productos.</span>
                              </div>
                            </div>
                          </button>

                          {/* Exportación CSV Ventas */}
                          <button
                            onClick={() => {
                              const csvContent = "data:text/csv;charset=utf-8," + 
                                "ID,Fecha,Hora,Cliente,Total,Estado,MetodoPago,EstadoPago\n" +
                                sales.map(s => `${s.id},${s.fecha},${s.hora},"${s.clienteNombre.replace(/"/g, '""')}",${s.total},${s.estado},${s.payment_method || 'efectivo'},${s.payment_status || 'Pendiente'}`).join("\n");
                              const encodedUri = encodeURI(csvContent);
                              const link = document.createElement("a");
                              link.setAttribute("href", encodedUri);
                              link.setAttribute("download", `ventas_backup_${new Date().toISOString().split('T')[0]}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="w-full text-left p-4 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-indigo-500 text-white rounded-lg group-hover:scale-105 transition-transform">
                                <FileSpreadsheet className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="block text-sm font-black text-indigo-900 dark:text-indigo-400">Exportar Historial de Ventas a CSV</span>
                                <span className="block text-xs text-indigo-700/70 dark:text-indigo-500 mt-1">Genera un archivo plano con cabeceras de ventas. No incluye el desglose de productos vendidos.</span>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Recordatorio Relacional Didáctico */}
                        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                          <h5 className="text-xs font-black text-amber-800 dark:text-amber-500 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5" />
                            Estructura de Base de Datos Relacional
                          </h5>
                          <p className="text-[11px] text-amber-700 dark:text-amber-600 mt-1 leading-relaxed">
                            Las ventas en Pipe Ice Cream están formadas por dos tablas: <strong>sales</strong> (cabecera con datos de cliente, fecha, total) y <strong>sale_items</strong> (detalle con sabor, cantidad, precio). El respaldo <strong>JSON</strong> incluye de forma integrada ambas tablas para garantizar una importación fiel.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Panel Derecho: Importar Respaldo */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <Upload className="h-4 w-4 text-brand-500" />
                          Restaurar Copia de Seguridad (Importar)
                        </h4>

                        {/* File Input Selector */}
                        <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-6 text-center transition-all relative">
                          <input
                            type="file"
                            accept=".json,.csv"
                            onChange={handleImportFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="backup-file-uploader"
                          />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-full text-slate-400 dark:text-slate-500">
                              <Upload className="h-6 w-6" />
                            </div>
                            <div>
                              <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                {importFile ? importFile.name : "Selecciona o arrastra tu archivo"}
                              </span>
                              <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1">
                                Soporta copias de seguridad de Pipe Ice Cream en formatos .json o .csv
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Message */}
                        {importStatus.type !== "idle" && (
                          <div className={`mt-4 p-4 rounded-xl text-sm font-medium border ${
                            importStatus.type === "success" 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                              : importStatus.type === "error"
                              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                              : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-zinc-800/50 dark:border-zinc-800 dark:text-slate-300 animate-pulse"
                          }`}>
                            <div className="flex items-center gap-2">
                              {importStatus.type === "success" && <Check className="h-5 w-5 text-emerald-500" />}
                              {importStatus.type === "error" && <AlertTriangle className="h-5 w-5 text-rose-500" />}
                              {importStatus.type === "loading" && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                              <span>{importStatus.message}</span>
                            </div>
                          </div>
                        )}

                        {/* Data Preview & Relational Checklist */}
                        {importData && (
                          <div className="mt-5 space-y-4 p-5 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800/50 animate-fadeIn">
                            <h5 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Vista previa de la copia a restaurar
                            </h5>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                                <span className="block text-xs text-slate-400 dark:text-slate-500">Productos / Sabores</span>
                                <span className="text-lg font-black text-slate-800 dark:text-white mt-1 block">
                                  {importData.rawCount?.products || 0}
                                </span>
                              </div>
                              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                                <span className="block text-xs text-slate-400 dark:text-slate-500">Ventas / Pedidos</span>
                                <span className="text-lg font-black text-slate-800 dark:text-white mt-1 block">
                                  {importData.rawCount?.sales || 0}
                                </span>
                              </div>
                            </div>

                            {/* Warning or Success Badges for Relational Integrity */}
                            {importData.type === "json" ? (
                              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-emerald-800 dark:text-emerald-400 text-xs">
                                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="block">Integridad Estricta Detectada</strong>
                                  <span className="block mt-0.5 leading-relaxed">
                                    Copia de respaldo en formato relacional (JSON). Se importarán de forma íntegra las cabeceras de venta y {importData.rawCount?.items || 0} registros individuales de productos vendidos para la tabla <strong>sale_items</strong>.
                                  </span>
                                </div>
                              </div>
                            ) : importData.warningMessage ? (
                              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-500 text-xs">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="block">Formato CSV Plano (Sin Desglose)</strong>
                                  <span className="block mt-0.5 leading-relaxed">
                                    {importData.warningMessage}
                                  </span>
                                </div>
                              </div>
                            ) : null}

                            {/* Execute Actions */}
                            <div className="flex items-center gap-3 pt-2">
                              <button
                                onClick={handleExecuteImport}
                                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-lg shadow-emerald-600/15"
                              >
                                Confirmar y Restaurar Todo
                              </button>
                              <button
                                onClick={() => {
                                  setImportFile(null);
                                  setImportData(null);
                                  setImportStatus({ type: "idle", message: "" });
                                }}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* TAB 1: INVENTARIO DE SABORES */}
            {activeTab === "inventario" && (
              <motion.div
                key="tab-inventario"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
              
              {/* Encabezado de la pestaña con título y botón de acción */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                <div>
                  <h3 className="font-sans text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Package className="h-5 w-5 text-brand-500" />
                    Gestión de Inventario de Sabores
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
                    Controla precios de venta, costos de adquisición, existencias y añade nuevos sabores a tu catálogo comercial.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetSaborizacion}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm bg-rose-600 hover:bg-rose-700 text-white hover:shadow-rose-600/15"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Resetear Saborización</span>
                  </button>

                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm ${
                      showAddForm
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-600/15 shadow-md"
                    }`}
                  >
                    {showAddForm ? (
                      <>
                        <X className="h-4 w-4" />
                        <span>Cerrar Formulario</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Añadir Nuevo Sabor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid adaptable según el estado del formulario */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Modal para Agregar Nuevo Sabor */}
                <AddProductModal
                  isOpen={showAddForm}
                  onClose={() => setShowAddForm(false)}
                  onSubmit={handleAddProduct}
                  newNombre={newNombre}
                  setNewNombre={setNewNombre}
                  newPrecio={newPrecio}
                  setNewPrecio={setNewPrecio}
                  newCosto={newCosto}
                  setNewCosto={setNewCosto}
                  newStock={newStock}
                  setNewStock={setNewStock}
                  newImagen={newImagen}
                  setNewImagen={setNewImagen}
                  formError={formError}
                  products={products}
                />

                {/* Tabla de Listado de Sabores (Ancho completo si el formulario está cerrado) */}
                <div className={`${showAddForm ? "lg:col-span-2" : "lg:col-span-3"} bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden transition-all duration-300`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-50 dark:border-zinc-800/50 pb-3">
                    <div>
                      <h3 className="font-sans text-base font-bold text-slate-800 dark:text-slate-100">
                        Sabores en Catálogo ({products.length})
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                        Administra las existencias, precios y costos de tus helados en tiempo real.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2.5 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/10 dark:border-brand-500/20 px-4 py-2 rounded-xl self-start sm:self-auto shadow-sm">
                      <IceCream className="h-4 w-4 text-brand-600 dark:text-brand-400 animate-pulse" />
                      <div className="text-left">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 leading-none mb-1">Stock Total Disponibles</span>
                        <strong className="text-xs font-mono font-black text-slate-800 dark:text-white leading-none flex items-center">
                          <AnimatedCounter value={products.reduce((acc, curr) => acc + curr.stock, 0)} suffix="UNID." />
                        </strong>
                      </div>
                    </div>
                  </div>

            {/* Low stock alert bar */}
            {products.some(p => p.stock <= 2) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400">
                  <span>⚠️ ALERTA: ¡SABORES AGOTADOS O CON STOCK BAJO!</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {products.filter(p => p.stock <= 2).map(p => (
                    <span key={p.id} className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase font-mono ${p.stock === 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50"}`}>
                      {p.nombre}: {p.stock === 0 ? "AGOTADO" : `${p.stock} Unid.`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600 dark:text-zinc-400">
                <thead className="bg-slate-50 text-slate-500 dark:bg-zinc-950 dark:text-zinc-500">
                  <tr>
                    <th className="p-4 font-semibold">Sabor</th>
                    <th className="p-4 font-semibold">Precio (COP)</th>
                    <th className="p-4 font-semibold">Stock</th>
                    <th className="p-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {sortedAdminProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          {p.imagen ? (
                            <img
                              src={p.imagen}
                              alt={p.nombre}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-100 dark:border-zinc-850 shadow-sm"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // If image fails to load, fallback to emoji/text
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-lg">
                              🍧
                            </div>
                          )}
                          <div>
                            <span className="font-semibold block">{p.nombre}</span>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-slate-400 font-mono">{p.id}</span>
                              {p.orden_manual !== undefined && (
                                <span className="bg-brand-50 text-brand-700 dark:bg-indigo-950/40 dark:text-brand-400 px-1.5 py-0.5 rounded text-[9px] font-black font-mono">
                                  Orden: {p.orden_manual}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-white text-xs">
                          Venta: <span className="text-brand-600 dark:text-brand-400">{formatCOP(p.precio)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Costo: <span className="font-mono font-medium text-amber-600 dark:text-amber-500">{formatCOP(p.costo || (p.nombre.toLowerCase().includes("mango biche") ? 920 : 1140))}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdjustStock(p.id, -1)}
                            className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <div className="flex flex-col items-center justify-center min-w-[3rem]">
                            <AnimatedCounter 
                              value={p.stock} 
                              className={`px-1.5 py-0.5 rounded text-xs ${
                                p.stock === 0 
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-black animate-pulse" 
                                  : p.stock <= 2 
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-extrabold" 
                                    : "text-slate-800 dark:text-slate-100"
                              }`}
                            />
                            {p.stock === 0 ? (
                              <span className="text-[8px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider mt-0.5">Agotado</span>
                            ) : p.stock <= 2 ? (
                              <span className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider mt-0.5">Bajo</span>
                            ) : null}
                          </div>
                          <button
                            onClick={() => handleAdjustStock(p.id, 1)}
                            className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(shopConfig.catalogSortOrder === "manual" || !shopConfig.catalogSortOrder) && (
                            <div className="flex items-center gap-0.5 mr-2">
                              <button
                                onClick={() => handleMoveProduct(p.id, "up")}
                                className="p-1 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-md dark:text-zinc-400 dark:hover:text-brand-400 dark:hover:bg-zinc-800 transition"
                                title="Mover Arriba"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMoveProduct(p.id, "down")}
                                className="p-1 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-md dark:text-zinc-400 dark:hover:text-brand-400 dark:hover:bg-zinc-800 transition"
                                title="Mover Abajo"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setEditNombre(p.nombre);
                              setEditPrecio(p.precio.toString());
                              setEditCosto((p.costo || (p.nombre.toLowerCase().includes("mango biche") ? 920 : 1140)).toString());
                              setEditStock(p.stock.toString());
                              setEditImagen(p.imagen || "");
                              setEditError("");
                            }}
                            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg dark:text-brand-400 dark:hover:bg-zinc-800"
                            title="Editar Sabor"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/20"
                            title="Eliminar Sabor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                        No hay sabores registrados en el catálogo aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Inventory Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {sortedAdminProducts.map((p) => (
                <div key={p.id} className="bg-slate-50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                      <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.nombre}</h4>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400 font-bold">{formatCOP(p.precio)}</span>
                        <span className="text-[10px] text-slate-400">ID: {p.id}</span>
                        {p.orden_manual !== undefined && (
                          <span className="bg-indigo-50 text-indigo-700 dark:bg-[#1f1e2e] dark:text-brand-400 px-1 py-0.5 rounded text-[9px] font-black font-mono">
                            Ord: {p.orden_manual}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <button onClick={() => handleAdjustStock(p.id, -1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                        <AnimatedCounter 
                          value={p.stock} 
                          className={`min-w-[1.5rem] text-center text-xs ${p.stock === 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-100"}`} 
                        />
                        <button onClick={() => handleAdjustStock(p.id, 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                      </div>
                      {p.stock === 0 && <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Agotado</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {(shopConfig.catalogSortOrder === "manual" || !shopConfig.catalogSortOrder) && (
                        <div className="flex items-center gap-1 mr-1">
                          <button
                            onClick={() => handleMoveProduct(p.id, "up")}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400"
                            title="Mover Arriba"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMoveProduct(p.id, "down")}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400"
                            title="Mover Abajo"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                       <button
                        onClick={() => {
                          setEditingProduct(p);
                          setEditNombre(p.nombre);
                          setEditPrecio(p.precio.toString());
                          setEditCosto((p.costo || (p.nombre.toLowerCase().includes("mango biche") ? 920 : 1140)).toString());
                          setEditStock(p.stock.toString());
                          setEditImagen(p.imagen || "");
                          setEditError("");
                        }}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-brand-600 dark:text-brand-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="p-8 text-center text-slate-400 dark:text-zinc-500">
                  No hay sabores registrados.
                </div>
              )}
            </div>
          </div>

        </div>
        </motion.div>
      )}

      {/* TAB 2: VENTAS Y REPORTES */}
      {activeTab === "ventas" && (
        <motion.div
          key="tab-ventas"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-8"
        >
          
          {/* Sub Tab Bar for Ventas */}
          <div className="flex border-b border-slate-100 dark:border-zinc-800 pb-px mb-6 gap-6 font-sans">
            <button
              onClick={() => setVentasView("historial")}
              className={`pb-3 text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                ventasView === "historial"
                  ? "text-brand-600 dark:text-brand-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
              }`}
            >
              📋 Historial de Órdenes
              {ventasView === "historial" && (
                <motion.div layoutId="ventasTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
            <button
              onClick={() => setVentasView("graficas")}
              className={`pb-3 text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                ventasView === "graficas"
                  ? "text-brand-600 dark:text-brand-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
              }`}
            >
              📈 Métricas & Gráficas de Rendimiento
              {ventasView === "graficas" && (
                <motion.div layoutId="ventasTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
            <button
              onClick={() => setVentasView("clientes")}
              className={`pb-3 text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                ventasView === "clientes"
                  ? "text-brand-600 dark:text-brand-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
              }`}
            >
              🔍 Buscar por Teléfono
              {ventasView === "clientes" && (
                <motion.div layoutId="ventasTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
            <button
              onClick={() => setVentasView("fidelidad")}
              className={`pb-3 text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                ventasView === "fidelidad"
                  ? "text-brand-600 dark:text-brand-400 font-extrabold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
              }`}
            >
              🏆 Tablero de Rangos
              {ventasView === "fidelidad" && (
                <motion.div layoutId="ventasTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
          </div>

          {ventasView === "historial" && (
            <div className="space-y-8">
              {/* KPI Summary Cards (Modern Bento Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8 items-stretch">
                {/* Ventas Entregadas */}
                <div id="kpi-ventas-entregadas" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                  <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <ShoppingBag className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ventas Entregadas
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{approvedSales.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Pedidos</span>
                  </div>
                </div>

                {/* Recaudado */}
                <div id="kpi-recaudado" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                  <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <DollarSign className="h-16 w-16 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    Recaudado (Ventas)
                  </div>
                  <div className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono leading-none">
                    {formatCOP(totalRecaudado)}
                  </div>
                </div>

                {/* Costo Compra */}
                <div id="kpi-costo-compra" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                  <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <Package className="h-16 w-16 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Costo Compra (Inversión)
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none">
                    {formatCOP(totalCostoCompra)}
                  </div>
                </div>

                {/* Ganancia Neta */}
                <div id="kpi-ganancia-neta" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                  <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <TrendingUp className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Ganancia Neta (Utilidad)
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono leading-none">
                    {formatCOP(gananciaNeta)}
                  </div>
                </div>

                {/* Despachados */}
                <div id="kpi-despachados" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                  <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <IceCream className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Despachados
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{totalDespachados}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Helados</span>
                  </div>
                </div>

                {/* Más Vendido */}
                <div id="kpi-mas-vendido" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                  <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <Award className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Más Vendido
                  </div>
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 truncate mt-1 uppercase leading-none tracking-tight">
                    {bestSeller}
                  </div>
                </div>
              </div>

              {/* Sales History List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
              <div className="space-y-1">
                <h3 className="font-sans text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Database className="h-5 w-5 text-brand-600" />
                  Historial de Ventas ({filteredSales.length})
                </h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Gestión de órdenes con filtros avanzados</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setSalesFilterClient("");
                    setSalesFilterStatus("todos");
                    setSalesFilterPaymentStatus("todos");
                    setSalesFilterDateStart("");
                    setSalesFilterDateEnd("");
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl transition-colors border border-slate-100 dark:border-zinc-800"
                >
                  Limpiar Filtros
                </button>

                <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-slate-200/50 dark:border-zinc-700/50">
                  <select 
                    value={salesSortOrder}
                    onChange={(e) => setSalesSortOrder(e.target.value as "asc" | "desc")}
                    className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 focus:outline-none px-2 cursor-pointer"
                  >
                    <option value="desc">Más Recientes</option>
                    <option value="asc">Más Antiguos</option>
                  </select>
                  <div className="w-px h-3 bg-slate-300 dark:bg-zinc-600 mx-1" />
                  <select 
                    value={salesPerPage}
                    onChange={(e) => setSalesPerPage(Number(e.target.value))}
                    className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 focus:outline-none px-2 cursor-pointer"
                  >
                    <option value={10}>10 filas</option>
                    <option value={25}>25 filas</option>
                    <option value={50}>50 filas</option>
                    <option value={100}>100 filas</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportSalesToPDF(filteredSales, tiendaNombre || "Pipe Ice Cream")}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-950 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer border border-slate-800 dark:border-slate-200"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Exportar PDF
                  </button>

                  {sales.length > 0 && (
                    <button
                      onClick={handleClearSales}
                      className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-2 rounded-xl transition-colors border border-rose-100 dark:border-rose-900/30"
                    >
                      Vaciar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 p-5 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-100 dark:border-zinc-800/50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Orden</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={salesFilterClient}
                    onChange={(e) => setSalesFilterClient(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Pedido</label>
                <select 
                  value={salesFilterStatus}
                  onChange={(e) => setSalesFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer appearance-none"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Rechazado">Rechazado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pago</label>
                <select 
                  value={salesFilterPaymentStatus}
                  onChange={(e) => setSalesFilterPaymentStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer appearance-none"
                >
                  <option value="todos">Todos los Pagos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                <input 
                  type="date"
                  value={salesFilterDateStart}
                  onChange={(e) => setSalesFilterDateStart(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                <input 
                  type="date"
                  value={salesFilterDateEnd}
                  onChange={(e) => setSalesFilterDateEnd(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600 dark:text-zinc-400">
                <thead className="bg-slate-50 text-slate-500 dark:bg-zinc-950 dark:text-zinc-500 border-y border-slate-100 dark:border-zinc-800">
                  <tr>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Orden / Fecha</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Cliente</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Detalle</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Total</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Estado</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {paginatedSales.map((s) => (
                    <tr key={s.id} className={`sale-row transition-colors ${
                      s.estado === "Rechazado" || s.estado === "Eliminada" 
                        ? "bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30" 
                        : "hover:bg-slate-50/50 dark:hover:bg-zinc-900/50"
                    }`}>
                      <td className="p-4 font-mono">
                        <span className={`font-bold block ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                          {s.numero_orden ? `#${String(s.numero_orden).padStart(6, '0')}` : s.id}
                        </span>
                        {s.numero_orden && (
                          <span className={`text-[10px] font-bold block leading-tight font-mono ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600/70 dark:text-rose-400/70" : "text-slate-400"}`}>
                            Código: {s.id}
                          </span>
                        )}
                        <span className={`text-xs block mt-0.5 ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600/70 dark:text-rose-400/70" : "text-slate-400"}`}>{s.fecha} {s.hora}</span>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold block text-sm ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600 dark:text-rose-200" : "text-slate-900 dark:text-white"}`}>{s.clienteNombre}</span>
                        {s.clienteTelefono && (
                          <span className={`text-xs font-semibold block mt-0.5 font-mono ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded inline-block" : "text-sky-600 dark:text-sky-400"}`}>
                            📱 {s.clienteTelefono}
                          </span>
                        )}
                        {s.clienteDireccion && (
                          <span className={`text-xs block mt-0.5 ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600/80 dark:text-rose-400/80" : "text-slate-400 dark:text-zinc-500"}`}>
                            📍 {s.clienteDireccion}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {s.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <span className={`font-semibold font-mono ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-300"}`}>
                                {item.cantidad}x
                              </span>{" "}
                              <span className={s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600/80 dark:text-rose-300/80" : ""}>
                                {item.nombre}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={`p-4 font-mono font-bold ${s.estado === "Rechazado" || s.estado === "Eliminada" ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-slate-100"}`}>
                        {formatCOP(s.total)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            s.estado === "Entregado"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/55"
                              : s.estado === "Aprobado"
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200"
                              : s.estado === "Rechazado" || s.estado === "Eliminada"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"
                              : s.estado === "En espera"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse"
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Button (Moving from Pendiente to Aprobado) */}
                          {s.estado === "Pendiente" && (
                            <button
                              onClick={() => handleUpdateSaleStatus(s.id, "Aprobado")}
                              title="Aprobar Pedido"
                              className="flex items-center justify-center h-7 w-7 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-sm cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Finalize Button (Moving from Aprobado to Entregado) */}
                          {s.estado === "Aprobado" && (
                            <button
                              onClick={() => handleUpdateSaleStatus(s.id, "Entregado")}
                              title="Entregar Pedido"
                              className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          
                          {/* Edit Order Button */}
                          <button
                            onClick={() => {
                              setEditingSale(s);
                              setEditSaleItems(s.items.map(item => ({ ...item })));
                              setEditSaleError("");
                            }}
                            title="Editar Productos de la Orden"
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Visual Ticket Preview */}
                          <button
                            onClick={() => setTicketModal({ isOpen: true, saleId: s.id })}
                            title="Ver Ticket Digital (Imagen)"
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-all shadow-sm cursor-pointer border border-emerald-200"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* Direct Telegram Send Button */}
                          <button
                            id={`tg-btn-${s.id}`}
                            onClick={() => handleDirectTelegramSend(s.id)}
                            disabled={sendingTelegramId === s.id}
                            title="Enviar Comprobante Directo al Admin (Telegram)"
                            className={`flex items-center justify-center h-7 w-7 rounded-lg transition-all shadow-sm cursor-pointer border ${
                              sendingTelegramId === s.id 
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                                : "bg-sky-500 hover:bg-sky-400 text-white border-sky-600"
                            }`}
                          >
                            <Send className={`h-3.5 w-3.5 ${sendingTelegramId === s.id ? "animate-pulse" : ""}`} />
                          </button>

                          {/* Reject Button */}
                          {s.estado !== "Rechazado" && s.estado !== "Entregado" && (
                            <button
                              onClick={() => handleUpdateSaleStatus(s.id, "Rechazado")}
                              title="Rechazar Pedido"
                              className="flex items-center justify-center h-7 w-7 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete Order Button */}
                          <button
                            onClick={() => handleDeleteSale(s.id)}
                            title="Eliminar Orden"
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-red-500 hover:bg-red-400 text-white transition-all shadow-sm cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedSales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                          <ShoppingBag className="h-10 w-10 text-slate-300" />
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            No se encontraron registros
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Sales Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4 mt-4">
              {paginatedSales.map((s) => (
                <div key={s.id} className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-colors ${
                  s.estado === "Rechazado" || s.estado === "Eliminada" 
                    ? "bg-rose-50/40 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30" 
                    : "bg-white dark:bg-zinc-950/40 border-slate-100 dark:border-zinc-800"
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white font-mono block">
                        #{s.numero_orden ? String(s.numero_orden).padStart(6, '0') : s.id.slice(0,8)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{s.fecha} • {s.hora}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border whitespace-nowrap ${
                        s.estado === "Entregado" ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50" :
                        s.estado === "Aprobado" ? "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800/50" :
                        (s.estado === "Rechazado" || s.estado === "Eliminada") ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50" :
                        "bg-amber-50 text-amber-700 border-amber-100 animate-pulse dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50"
                      }`}
                    >
                      {s.estado}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{s.clienteNombre}</p>
                    {s.clienteTelefono && <p className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">📱 {s.clienteTelefono}</p>}
                    {s.clienteDireccion && <p className="text-xs text-slate-400 truncate">📍 {s.clienteDireccion}</p>}
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-xl space-y-2">
                    {s.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-zinc-400">{item.cantidad}x {item.nombre}</span>
                        <span className="font-mono font-bold text-slate-400">{formatCOP(item.precioUnitario * item.cantidad)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                      <span className="text-sm font-black text-brand-600 dark:text-brand-400 font-mono">{formatCOP(s.total)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {s.estado === "Pendiente" ? (
                      <button onClick={() => handleUpdateSaleStatus(s.id, "Aprobado")} className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">
                        <Check className="h-3.5 w-3.5" /> Aprobar
                      </button>
                    ) : s.estado === "Aprobado" ? (
                      <button onClick={() => handleUpdateSaleStatus(s.id, "Entregado")} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                        <Check className="h-3.5 w-3.5" /> Finalizar
                      </button>
                    ) : null}
                    
                    <button 
                      onClick={() => setTicketModal({ isOpen: true, saleId: s.id })}
                      className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDirectTelegramSend(s.id)}
                      disabled={sendingTelegramId === s.id}
                      className={`p-2.5 rounded-xl border ${
                        sendingTelegramId === s.id 
                          ? "bg-slate-100 text-slate-400 border-slate-200" 
                          : "bg-sky-500 text-white border-sky-600"
                      }`}
                    >
                      <Send className={`h-4 w-4 ${sendingTelegramId === s.id ? "animate-pulse" : ""}`} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditingSale(s);
                        setEditSaleItems([...s.items]);
                        setEditSaleError("");
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Eliminar",
                          message: "¿Eliminar orden?",
                          onConfirm: () => handleDeleteSale(s.id),
                        });
                      }}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {paginatedSales.length === 0 && (
                <div className="p-12 text-center bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                   <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto mb-3 opacity-50" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin registros locales</p>
                </div>
              )}
            </div>

            {/* Pagination UI */}
            {totalSalesPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Página {salesPage} de {totalSalesPages} ({sales.length} registros)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSalesPage(prev => Math.max(1, prev - 1))}
                    disabled={salesPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(totalSalesPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSalesPage(i + 1)}
                        className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                          salesPage === i + 1 
                            ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" 
                            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {i + 1}
                      </button>
                    )).slice(Math.max(0, salesPage - 3), Math.min(totalSalesPages, salesPage + 2))}
                  </div>

                  <button
                    onClick={() => setSalesPage(prev => Math.min(totalSalesPages, prev + 1))}
                    disabled={salesPage === totalSalesPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
          )}

          {ventasView === "graficas" && (
            <div className="space-y-8">
              
              {/* Dashboard Time Range Filter */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-600" />
                  <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100">Panel de Rendimiento</h3>
                </div>
                
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 p-1 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <button
                    onClick={() => setDashboardTimeRange("hoy")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      dashboardTimeRange === "hoy"
                        ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setDashboardTimeRange("semana")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      dashboardTimeRange === "semana"
                        ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setDashboardTimeRange("mes")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      dashboardTimeRange === "mes"
                        ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setDashboardTimeRange("todos")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      dashboardTimeRange === "todos"
                        ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm border border-slate-100 dark:border-zinc-700"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Todo
                  </button>
                </div>
              </div>
          
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Recaudo Total</span>
                <h4 className="text-xl font-bold font-mono text-slate-800 dark:text-white mt-1">{formatCOP(totalRecaudado)}</h4>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Ganancia Neta</span>
                <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{formatCOP(gananciaNeta)}</h4>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Helados Vendidos</span>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{totalDespachados} <span className="text-xs font-normal text-slate-400">unidades</span></h4>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Pedidos Aprobados</span>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{approvedSales.length} <span className="text-xs font-normal text-slate-400">órdenes</span></h4>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chart 1: Daily Sales & Gains History */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
              <div className="mb-4">
                <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-indigo-500" />
                  Historial de Ventas Diarias
                </h3>
                <p className="text-xs text-slate-400">
                  Monitorea los ingresos y ganancias netas registradas día a día.
                </p>
              </div>

              {rechartsDailySalesData.length > 0 ? (
                <div className="h-72 w-full mt-2 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={rechartsDailySalesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                      <RechartsXAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        dy={8}
                      />
                      <RechartsYAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        tickFormatter={(val) => `$${Math.round(val/1000)}k`}
                        dx={-8}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "rgba(30, 41, 59, 0.95)",
                          borderRadius: "12px",
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                        }}
                        formatter={(value: any) => [formatCOP(Number(value)), ""]}
                        labelStyle={{ fontWeight: "bold", color: "#38bdf8", marginBottom: "4px" }}
                      />
                      <RechartsLegend verticalAlign="top" height={36} iconType="circle" />
                      <RechartsBar name="Recaudo Total" dataKey="Recaudo" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <RechartsBar name="Ganancia Neta" dataKey="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl dark:border-zinc-800 text-slate-400 my-auto">
                  <BarChart2 className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
                  <p className="text-sm">No hay datos de ventas aprobadas para graficar.</p>
                </div>
              )}
            </div>

            {/* Chart 2: Best Selling Flavors (Pie/Donut Chart) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
              <div className="mb-4">
                <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-amber-500" />
                  Sabores Más Vendidos
                </h3>
                <p className="text-xs text-slate-400">
                  Participación en unidades vendidas de cada sabor del catálogo.
                </p>
              </div>

              {flavorSalesArray.some(f => f.totalUnits > 0) ? (
                <div className="flex-1 w-full mt-4 flex flex-col gap-6">
                  <div className="h-48 w-full text-xs relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <RechartsPie
                          data={flavorSalesArray.filter(f => f.totalUnits > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={5}
                          dataKey="totalUnits"
                          nameKey="nombre"
                          stroke="none"
                        >
                          {flavorSalesArray.filter(f => f.totalUnits > 0).map((entry, index) => {
                            const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#14b8a6", "#f43f5e", "#8b5cf6"];
                            return <RechartsCell 
                              key={`cell-${index}`} 
                              fill={colors[index % colors.length]} 
                              className="transition-all duration-300 hover:opacity-80"
                            />;
                          })}
                        </RechartsPie>
                        <RechartsTooltip
                          allowEscapeViewBox={{ x: true, y: true }}
                          contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            borderRadius: "14px",
                            border: "none",
                            color: "#fff",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                            fontSize: "12px",
                            padding: "10px 14px"
                          }}
                          itemStyle={{ color: "#fff", fontWeight: "bold" }}
                          formatter={(value: any, name: any) => [
                            `${value} unidades`, 
                            <span className="text-white font-black uppercase tracking-widest text-[10px]">{name}</span>
                          ]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</span>
                      <span className="text-xl font-bold font-mono text-slate-700 dark:text-zinc-200">{totalDespachados}</span>
                    </div>
                  </div>

                  {/* Custom list legend */}
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar text-xs">
                    {flavorSalesArray.filter(f => f.totalUnits > 0).map((item, index) => {
                      const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#14b8a6", "#f43f5e", "#8b5cf6"];
                      const percent = totalDespachados > 0 ? (item.totalUnits / totalDespachados) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-3 w-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: colors[index % colors.length] }} />
                            <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">{item.nombre}</span>
                          </div>
                          <span className="font-mono text-slate-500 dark:text-zinc-400 shrink-0 font-bold ml-2">
                            {item.totalUnits} ud ({percent.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl dark:border-zinc-800 text-slate-400 my-auto">
                  <PieChart className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
                  <p className="text-sm">Aún no hay unidades vendidas aprobadas.</p>
                </div>
              )}
            </div>

          </div>

          {/* Chart 3: Net Profit Trend & Cumulative Revenue (Area Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
            <div className="mb-4">
              <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Curva de Rendimiento Financiero
              </h3>
              <p className="text-xs text-slate-400">
                Visualiza el crecimiento del recaudo y las ganancias netas acumuladas.
              </p>
            </div>

            {rechartsDailySalesData.length > 0 ? (
              <div className="h-72 w-full mt-2 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart
                    data={rechartsDailySalesData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRecaudo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <RechartsXAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      dy={8}
                    />
                    <RechartsYAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(val) => `$${Math.round(val/1000)}k`}
                      dx={-8}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        borderRadius: "12px",
                        border: "none",
                        color: "#fff",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                      }}
                      formatter={(value: any) => [formatCOP(Number(value)), ""]}
                      labelStyle={{ fontWeight: "bold", color: "#38bdf8", marginBottom: "4px" }}
                    />
                    <RechartsLegend verticalAlign="top" height={36} iconType="circle" />
                    <RechartsArea name="Recaudo Diario" type="monotone" dataKey="Recaudo" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecaudo)" />
                    <RechartsArea name="Ganancia Diaria" type="monotone" dataKey="Ganancia" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGanancia)" />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl dark:border-zinc-800 text-slate-400 my-auto">
                <TrendingUp className="h-10 w-10 text-slate-300 dark:text-zinc-700 mb-2" />
                <p className="text-sm">No hay datos financieros para trazar tendencias.</p>
              </div>
            )}
          </div>
          </div>
          )}

          {ventasView === "clientes" && (
            <div className="space-y-6">
              {/* Header de la sección */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
                <h3 className="font-sans text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500 animate-pulse" />
                  Buscador de Clientes Recurrentes y Fidelidad
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                  Ingresa el número de teléfono para analizar el historial de consumo, fidelización y preferencias de un cliente recurrente.
                </p>
              </div>

              {/* Layout de dos columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
                
                {/* COLUMNA IZQUIERDA: BUSCADOR Y POPULARES */}
                <div className="space-y-5">
                  {/* Caja de Búsqueda */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono block">
                      🔎 Buscar por Celular
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ej. 3185074440"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-white font-mono"
                      />
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                      {searchPhone && (
                        <button
                          onClick={() => setSearchPhone("")}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista de Clientes Populares (Acceso rápido) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2">
                      ⭐ Clientes Más Activos
                    </h4>
                    {(() => {
                      const clientMap = new Map<string, { nombre: string; telefono: string; pedidos: number; gastado: number }>();
                      sales.forEach((s) => {
                        if (s.estado === "Eliminada") return;
                        const tel = s.clienteTelefono?.trim();
                        if (!tel) return;
                        const current = clientMap.get(tel) || { nombre: s.clienteNombre, telefono: tel, pedidos: 0, gastado: 0 };
                        clientMap.set(tel, {
                          nombre: s.clienteNombre || current.nombre,
                          telefono: tel,
                          pedidos: current.pedidos + 1,
                          gastado: current.gastado + (s.estado !== "Rechazado" ? s.total : 0),
                        });
                      });

                      const popularClients = Array.from(clientMap.values())
                        .sort((a, b) => b.pedidos - a.pedidos)
                        .slice(0, 6);

                      if (popularClients.length === 0) {
                        return <p className="text-xs text-slate-400 text-center py-2">No hay clientes registrados aún.</p>;
                      }

                      return (
                        <div className="space-y-2.5">
                          {popularClients.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => setSearchPhone(c.telefono)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                searchPhone === c.telefono
                                  ? "bg-indigo-50 border-indigo-200/80 dark:bg-indigo-950/20 dark:border-indigo-800/60"
                                  : "bg-slate-50/50 hover:bg-slate-100/50 border-slate-100 dark:bg-zinc-950/30 dark:border-zinc-800/40 dark:hover:bg-zinc-850"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{c.nombre}</h5>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono block mt-0.5">{c.telefono}</span>
                              </div>
                              <div className="text-right ml-2 shrink-0">
                                <span className="inline-flex px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-md text-[9px] font-black font-mono">
                                  {c.pedidos} ords
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{formatCOP(c.gastado)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* COLUMNA DERECHA: FICHA DETALLADA DEL CLIENTE */}
                <div className="space-y-6">
                  {(() => {
                    if (!searchPhone) {
                      return (
                        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                          <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-full mb-4">
                            <Users className="h-10 w-10 text-slate-300 dark:text-zinc-700" />
                          </div>
                          <h4 className="font-sans text-base font-black text-slate-800 dark:text-white">Buscador Listo</h4>
                          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 max-w-sm leading-relaxed">
                            Por favor ingresa un número de teléfono a la izquierda o selecciona uno de nuestros clientes más activos para cargar su ficha.
                          </p>
                        </div>
                      );
                    }

                    const cleanSearch = searchPhone.replace(/\D/g, "");
                    const customerSales = sales
                      .filter((s) => s.clienteTelefono?.replace(/\D/g, "") === cleanSearch && s.estado !== "Eliminada")
                      .sort((a, b) => {
                        const dateA = `${a.fecha}T${a.hora}`;
                        const dateB = `${b.fecha}T${b.hora}`;
                        return dateB.localeCompare(dateA);
                      });

                    if (customerSales.length === 0) {
                      return (
                        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-full mb-4">
                            <Users className="h-10 w-10 text-rose-400 dark:text-rose-600" />
                          </div>
                          <h4 className="font-sans text-base font-black text-slate-800 dark:text-white">Cliente no Encontrado</h4>
                          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 max-w-sm leading-relaxed">
                            No se encontraron órdenes registradas en el sistema asociadas al número de teléfono <span className="font-bold text-slate-700 dark:text-zinc-300">{searchPhone}</span>.
                          </p>
                        </div>
                      );
                    }

                    // Calcular KPIs del cliente
                    const validSales = customerSales.filter((s) => s.estado !== "Rechazado");
                    const totalSpent = validSales.reduce((sum, s) => sum + s.total, 0);
                    const totalOrders = customerSales.length;
                    const ticketAverage = totalOrders > 0 ? totalSpent / totalOrders : 0;

                    // Filtrar compras del mes actual
                    const nowForRank = new Date();
                    const currentYearMonthForRank = `${nowForRank.getFullYear()}-${String(nowForRank.getMonth() + 1).padStart(2, "0")}`; // "YYYY-MM"
                    const ordersThisMonth = customerSales.filter(s => s.fecha && s.fecha.startsWith(currentYearMonthForRank)).length;

                    // Sabor Favorito
                    const flavorMap = new Map<string, number>();
                    customerSales.forEach((s) => {
                      s.items.forEach((item) => {
                        flavorMap.set(item.nombre, (flavorMap.get(item.nombre) || 0) + item.cantidad);
                      });
                    });
                    let favoriteFlavor = "Ninguno";
                    let maxFlavorQty = 0;
                    flavorMap.forEach((qty, name) => {
                      if (qty > maxFlavorQty) {
                        maxFlavorQty = qty;
                        favoriteFlavor = name;
                      }
                    });

                    // Insignias y Fidelización CoD Mobile
                    let badge = "Recluta";
                    let badgeDesc = "Cliente Nuevo";
                    let badgeBg = "from-slate-500 to-zinc-600";
                    let nextLevelMsg = "";
                    let badgeIcon = "🔰";

                    if (ordersThisMonth >= 12) {
                      badge = "Leyenda";
                      badgeDesc = "Estatus Supremo Mensual";
                      badgeBg = "from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/20";
                      badgeIcon = "👑";
                      nextLevelMsg = "¡Este cliente ha alcanzado el rango máximo absoluto de este mes!";
                    } else if (ordersThisMonth >= 8) {
                      badge = "Gran Maestro";
                      badgeDesc = "Cliente Élite Premium";
                      badgeBg = "from-purple-600 to-indigo-700 shadow-lg shadow-indigo-500/20";
                      badgeIcon = "💎";
                      nextLevelMsg = `Le faltan ${12 - ordersThisMonth} pedidos este mes para subir a Leyenda 👑.`;
                    } else if (ordersThisMonth >= 5) {
                      badge = "Maestro";
                      badgeDesc = "Frecuente Distinguido";
                      badgeBg = "from-pink-500 to-rose-600 shadow-lg shadow-rose-500/20";
                      badgeIcon = "🔮";
                      nextLevelMsg = `Le faltan ${8 - ordersThisMonth} pedidos este mes para subir a Gran Maestro 💎.`;
                    } else if (ordersThisMonth >= 3) {
                      badge = "Profesional";
                      badgeDesc = "Recurrente Activo";
                      badgeBg = "from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20";
                      badgeIcon = "🎖️";
                      nextLevelMsg = `Le faltan ${5 - ordersThisMonth} pedidos este mes para subir a Maestro 🔮.`;
                    } else if (ordersThisMonth >= 2) {
                      badge = "Élite";
                      badgeDesc = "Cliente Regular";
                      badgeBg = "from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20";
                      badgeIcon = "⚡";
                      nextLevelMsg = `Le faltan ${3 - ordersThisMonth} pedidos este mes para subir a Profesional 🎖️.`;
                    } else {
                      badge = "Recluta";
                      badgeDesc = "Cliente Nuevo";
                      badgeBg = "from-slate-500 to-zinc-600 shadow-lg shadow-slate-500/10";
                      badgeIcon = "🔰";
                      nextLevelMsg = `Le faltan ${2 - ordersThisMonth} pedidos este mes para subir a Élite ⚡.`;
                    }

                    return (
                      <div className="space-y-6">
                        {/* Ficha de Identidad del Cliente */}
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-zinc-950 flex items-center justify-center border border-indigo-100 dark:border-zinc-800 text-indigo-500 font-bold text-lg">
                              {customerSales[0].clienteNombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                {customerSales[0].clienteNombre}
                              </h3>
                              <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                                📱 Celular: <span className="font-bold text-slate-700 dark:text-zinc-300">{customerSales[0].clienteTelefono}</span>
                              </p>
                              <p className="text-[10px] text-brand-600 dark:text-brand-400 mt-1 font-bold">
                                🔄 Los rangos reinician al inicio de cada mes calendario.
                              </p>
                            </div>
                          </div>

                          <div className={`px-4 py-2.5 bg-gradient-to-r ${badgeBg} rounded-2xl text-white shrink-0 text-center min-w-[150px]`}>
                            <span className="text-sm font-black block flex items-center justify-center gap-1">
                              <span>{badgeIcon}</span> {badge}
                            </span>
                            <span className="text-[9px] font-bold text-white/85 uppercase tracking-widest mt-1 block leading-tight">{badgeDesc}</span>
                          </div>
                        </div>

                        {/* Bento de KPIs de Fidelidad */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Gastado */}
                          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block font-mono">Consumo Total (Aprobado)</span>
                            <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{formatCOP(totalSpent)}</h4>
                            <span className="text-[9px] text-slate-400 block mt-1">Excluye órdenes rechazadas</span>
                          </div>
                          
                          {/* Pedidos */}
                          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block font-mono">Pedidos este Mes</span>
                              <h4 className="text-xl font-black text-slate-800 dark:text-white mt-1">{ordersThisMonth} compras</h4>
                              <p className="text-[9px] text-slate-400 mt-1 leading-snug">{nextLevelMsg}</p>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-bold uppercase tracking-wider font-mono">Total Histórico</span>
                              <span className="font-extrabold text-slate-700 dark:text-zinc-300 font-mono">{totalOrders} ords</span>
                            </div>
                          </div>

                          {/* Ticket Promedio */}
                          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block font-mono">Gasto Promedio</span>
                            <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">{formatCOP(ticketAverage)}</h4>
                            <span className="text-[9px] text-slate-400 block mt-1">Ticket medio de compra</span>
                          </div>

                          {/* Favorito */}
                          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block font-mono">Sabor Favorito</span>
                            <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-1.5 truncate" title={favoriteFlavor}>{favoriteFlavor}</h4>
                            <span className="text-[9px] text-slate-400 block mt-1 font-semibold">Consumidas: <span className="font-bold text-slate-700 dark:text-zinc-300">{maxFlavorQty} unidades</span></span>
                          </div>
                        </div>

                        {/* Historial de Pedidos */}
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 sm:p-6 rounded-3xl shadow-sm">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-3 mb-4">
                            📜 Historial de Órdenes del Cliente ({customerSales.length})
                          </h4>
                          
                          <div className="space-y-4">
                            {customerSales.map((sale, i) => (
                              <div
                                key={i}
                                className="border border-slate-100 dark:border-zinc-800/80 p-4 rounded-2xl hover:border-slate-200 dark:hover:border-zinc-700 transition-all bg-slate-50/20 dark:bg-zinc-950/10"
                              >
                                {/* Encabezado de la orden */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/60 pb-2.5 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                                      Orden #{sale.numero_orden || sale.id.substring(4, 9)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 font-mono">
                                      {sale.fecha} • {sale.hora}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Badge Estado */}
                                    <span
                                      className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                                        sale.estado === "Aprobado" || sale.estado === "Entregado"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                          : sale.estado === "Rechazado" || sale.estado === "Eliminada"
                                          ? "bg-red-600 text-white dark:bg-red-700 shadow-sm"
                                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                      }`}
                                    >
                                      {sale.estado}
                                    </span>
                                    {/* Badge Pago */}
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                                      sale.payment_status === "Pagado"
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                                        : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                                    }`}>
                                      {sale.payment_status || "Pendiente"}
                                    </span>
                                  </div>
                                </div>

                                {/* Items de la Orden */}
                                <div className="space-y-2">
                                  {sale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs text-slate-600 dark:text-zinc-400">
                                      <div className="flex items-center gap-1.5 font-semibold">
                                        <span className="text-slate-400 font-mono">[{item.cantidad}x]</span>
                                        <span className="text-slate-800 dark:text-zinc-200">{item.nombre}</span>
                                      </div>
                                      <span className="font-mono text-slate-500 dark:text-zinc-500">{formatCOP(item.precioUnitario * item.cantidad)}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Total de la Orden */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/40 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">
                                    <span className="capitalize font-medium">Método: {sale.payment_method || "efectivo"}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">Total:</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white font-mono ml-1.5">{formatCOP(sale.total)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {ventasView === "fidelidad" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-sans text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500 animate-bounce" />
                    Tablero de Rangos de Fidelidad (Inspirado en CoD Mobile)
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                    Clasificación y estatus de fidelidad gamificada para motivar y premiar a nuestros clientes recurrentes. <span className="font-bold text-brand-600 dark:text-brand-400">¡Los rangos se reinician al iniciar cada mes!</span>
                  </p>
                </div>
              </div>

              {/* Ranks Cards (The Tiers Showcase) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { name: "Leyenda", icon: "👑", req: "12+ Pedidos", desc: "Cliente Supremo de la Casa" },
                  { name: "Gran Maestro", icon: "💎", req: "8-11 Pedidos", desc: "Cliente Élite Premium" },
                  { name: "Maestro", icon: "🔮", req: "5-7 Pedidos", desc: "Frecuente Distinguido" },
                  { name: "Profesional", icon: "🎖️", req: "3-4 Pedidos", desc: "Recurrente Activo" },
                  { name: "Élite", icon: "⚡", req: "2 Pedidos", desc: "Cliente Regular" },
                  { name: "Recluta", icon: "🔰", req: "0-1 Pedido", desc: "Cliente Nuevo" },
                ].map((tier, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center text-center justify-between shadow-xs relative overflow-hidden group">
                    <div className="text-3xl mb-2 filter drop-shadow-md transform group-hover:scale-110 transition-transform">{tier.icon}</div>
                    <div className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">{tier.name}</div>
                    <div className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 mt-1 font-mono">{tier.req}</div>
                    <p className="text-[9px] text-slate-400 mt-1 leading-snug">{tier.desc}</p>
                  </div>
                ))}
              </div>

              {/* Leaderboard Grid */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                {(() => {
                  const now = new Date();
                  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // "YYYY-MM"
                  const monthNames = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                  ];
                  const currentMonthName = monthNames[now.getMonth()];
                  const currentYear = now.getFullYear();

                  const clientMap = new Map<string, { nombre: string; telefono: string; pedidos: number; gastado: number }>();
                  sales.forEach((s) => {
                    if (s.estado === "Eliminada") return;
                    // Only count orders matching the current calendar month
                    if (!s.fecha || !s.fecha.startsWith(currentYearMonth)) return;
                    const tel = s.clienteTelefono?.trim();
                    if (!tel) return;
                    const current = clientMap.get(tel) || { nombre: s.clienteNombre, telefono: tel, pedidos: 0, gastado: 0 };
                    clientMap.set(tel, {
                      nombre: s.clienteNombre || current.nombre,
                      telefono: tel,
                      pedidos: current.pedidos + 1,
                      gastado: current.gastado + (s.estado !== "Rechazado" ? s.total : 0),
                    });
                  });

                  const leaderboard = Array.from(clientMap.values()).sort((a, b) => b.pedidos - a.pedidos);

                  const getCoDRank = (orders: number) => {
                    if (orders >= 12) return { name: "Leyenda", icon: "👑", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" };
                    if (orders >= 8) return { name: "Gran Maestro", icon: "💎", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" };
                    if (orders >= 5) return { name: "Maestro", icon: "🔮", badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20" };
                    if (orders >= 3) return { name: "Profesional", icon: "🎖️", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" };
                    if (orders >= 2) return { name: "Élite", icon: "⚡", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" };
                    return { name: "Recluta", icon: "🔰", badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20" };
                  };

                  return (
                    <>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <span className="flex items-center gap-2">🏆 Tabla de Estatus de Clientes Registrados</span>
                        <span className="text-xs bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 px-3 py-1 rounded-lg border border-brand-100 dark:border-brand-900/30">
                          Mes actual: {currentMonthName} {currentYear}
                        </span>
                      </h4>

                      {leaderboard.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                          <Users className="h-10 w-10 mx-auto opacity-30 mb-3" />
                          <p className="text-xs">No hay clientes con órdenes registradas en {currentMonthName} {currentYear} aún.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-zinc-850 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                <th className="py-3 px-4 w-12 text-center">Pos</th>
                                <th className="py-3 px-4">Cliente</th>
                                <th className="py-3 px-4">Teléfono</th>
                                <th className="py-3 px-4 text-center">Pedidos</th>
                                <th className="py-3 px-4 text-right">Inversión Total</th>
                                <th className="py-3 px-4 text-right">Rango Alcanzado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                              {leaderboard.map((client, idx) => {
                                const rank = getCoDRank(client.pedidos);
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                                    <td className="py-4 px-4 text-center text-xs font-black font-mono text-slate-400">
                                      {idx + 1 === 1 ? "🥇" : idx + 1 === 2 ? "🥈" : idx + 1 === 3 ? "🥉" : `${idx + 1}`}
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="font-extrabold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                                        {client.nombre}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-xs font-mono text-slate-500 dark:text-zinc-400">
                                      {client.telefono}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      <span className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 font-black font-mono text-xs rounded-md">
                                        {client.pedidos}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 text-right font-black font-mono text-xs text-brand-600 dark:text-brand-400">
                                      {formatCOP(client.gastado)}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${rank.badgeClass}`}>
                                        <span>{rank.icon}</span>
                                        <span>{rank.name}</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

        </motion.div>
      )}
      {activeTab === "estadisticas" && (
        <motion.div
          key="tab-estadisticas"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 space-y-8"
        >
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-5 mb-6">
            <h3 className="font-sans text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-brand-500" />
              Estadísticas
            </h3>
            
            {/* Sub Tab Bar */}
            <div className="flex border-b border-slate-100 dark:border-zinc-800 pt-6 pb-px gap-6 font-sans">
              <button
                onClick={() => setEstadisticasView("cloud")}
                className={`pb-3 text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                  estadisticasView === "cloud"
                    ? "text-brand-600 dark:text-brand-400 font-extrabold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
                }`}
              >
                ☁️ Cloud Analytics
                {estadisticasView === "cloud" && (
                  <motion.div layoutId="estTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
                )}
              </button>
              <button
                onClick={() => setEstadisticasView("graficas")}
                className={`pb-3 text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                  estadisticasView === "graficas"
                    ? "text-brand-600 dark:text-brand-400 font-extrabold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
                }`}
              >
                📊 Estadísticas
                {estadisticasView === "graficas" && (
                  <motion.div layoutId="estTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
                )}
              </button>
            </div>
          </div>

          {estadisticasView === "cloud" && <CloudStatsView key={refreshKey} contrasenaAdmin={contrasenaAdmin} />}
          {estadisticasView === "graficas" && (
            <div className="space-y-12">
              {/* DYNAMIC TITLE COMPONENT */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-8 rounded-3xl shadow-sm text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center justify-center gap-4">
                    <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                      <TrendingUp className="h-8 w-8 text-brand-600 dark:text-brand-400 animate-pulse" />
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      Transacciones Realizadas Efectivas
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="px-6 py-2.5 bg-brand-600 text-white rounded-2xl text-xl font-black shadow-lg shadow-brand-600/20 flex items-center gap-2.5">
                      <ShoppingBag className="h-6 w-6" />
                      {sales.filter(s => s.estado !== "Eliminada" && s.estado !== "Rechazado").length} pedidos totales
                    </span>
                    <span className="text-slate-400 dark:text-zinc-500 text-xs font-black uppercase tracking-widest bg-slate-50 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                      Actualizado en tiempo real
                    </span>
                  </div>
                </div>
              </div>

              <SalesStatistics sales={sales} />
              <SalesCharts sales={sales} />
            </div>
          )}
        </motion.div>
      )}
      {activeTab === "ajustes" && (
        <motion.div
          key="tab-ajustes"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm dark:bg-zinc-900 dark:border-zinc-800"
        >
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-5 mb-6">
            <h3 className="font-sans text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings className="h-6 w-6 text-indigo-500 animate-spin" style={{ animationDuration: "12s" }} />
              Configuración y Personalización del Establecimiento
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-400 mt-1">
              Personaliza la marca, ajusta las opciones visuales y controla la sincronización del sistema.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            
            {/* COLUMNA IZQUIERDA: CONFIGURACIÓN GENERAL */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IDENTIDAD Y ACCESOS */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 space-y-5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    📢 IDENTIDAD Y ACCESOS
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Nombre de la Tienda
                      </label>
                      <input
                        type="text"
                        required
                        value={tiendaNombre || ""}
                        onChange={(e) => setTiendaNombre(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Contraseña Administrador
                      </label>
                      <input
                        type="text"
                        required
                        value={contrasenaAdmin || ""}
                        onChange={(e) => setContrasenaAdmin(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ATENCIÓN Y CONFIGURACIÓN */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 space-y-5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    💬 ATENCIÓN Y CONFIGURACIÓN
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        Texto Cabecera
                      </label>
                      <input
                        type="text"
                        required
                        value={metodoOrdenar || ""}
                        onChange={(e) => setMetodoOrdenar(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RECAUDO */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    💳 RECAUDO (BRE-B)
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                        Número Cuenta / Nequi
                      </label>
                      <input
                        type="text"
                        required
                        value={cuentaNumero || ""}
                        onChange={(e) => setCuentaNumero(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                        Titular
                      </label>
                      <input
                        type="text"
                        required
                        value={cuentaTitular || ""}
                        onChange={(e) => setCuentaTitular(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                        WhatsApp para Pedidos
                      </label>
                      <input
                        type="text"
                        required
                        value={whatsappNumero || ""}
                        onChange={(e) => setWhatsappNumero(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* VISUALES */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    ✨ VISUALES
                  </h4>
                  <div className="space-y-2">
                    <div 
                      onClick={() => setMostrarReloj(!mostrarReloj)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        mostrarReloj 
                          ? "bg-brand-500/5 border-brand-500/30 text-brand-900 dark:text-brand-400" 
                          : "bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className={`h-3.5 w-3.5 ${mostrarReloj ? "text-brand-500" : "text-slate-400"}`} />
                        <strong className="text-[11px] font-bold uppercase">Reloj</strong>
                      </div>
                      <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-all duration-300 shrink-0 ${mostrarReloj ? 'bg-brand-600 justify-end' : 'bg-slate-300 dark:bg-zinc-700 justify-start'}`}>
                        <div className="bg-white w-3 h-3 rounded-full shadow-sm" />
                      </div>
                    </div>

                    <div 
                      onClick={() => setMostrarClima(!mostrarClima)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        mostrarClima 
                          ? "bg-sky-500/5 border-sky-500/30 text-sky-900 dark:text-sky-400" 
                          : "bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CloudSun className={`h-3.5 w-3.5 ${mostrarClima ? "text-sky-500" : "text-slate-400"}`} />
                        <strong className="text-[11px] font-bold uppercase">Clima</strong>
                      </div>
                      <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-all duration-300 shrink-0 ${mostrarClima ? 'bg-sky-500 justify-end' : 'bg-slate-300 dark:bg-zinc-700 justify-start'}`}>
                        <div className="bg-white w-3 h-3 rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="min-h-[20px]">
                  {settingsSuccess && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                      <span>✨</span> {settingsSuccess}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-10 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-95 duration-200"
                >
                  Guardar Todo
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: SISTEMA */}
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-500" />
                    MANTENIMIENTO Y SYNC
                  </h4>
                </div>

                <div className="p-5 space-y-6">
                  {/* AUTO SYNC */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
                    <div className="flex-1">
                      <span className={`text-xs font-bold block ${shopConfig?.syncEnabled !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {shopConfig?.syncEnabled !== false ? "MODO EN LÍNEA (CONECTADO)" : "SISTEMA DESCONECTADO (OFF)"}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                        {shopConfig?.syncEnabled !== false 
                          ? "Conectado y sincronizando en tiempo real con la nube." 
                          : "El sistema está desconectado y las compras públicas están suspendidas."}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={shopConfig?.syncEnabled !== false}
                        onChange={(e) => onUpdateConfig({ ...(shopConfig || {} as any), syncEnabled: e.target.checked })}
                      />
                      <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* CRITERIO DE ORDENAMIENTO */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 space-y-2">
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                        ORDEN DEL CATÁLOGO
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                        Selecciona el criterio de ordenamiento de helados en la página pública.
                      </p>
                    </div>
                    <select
                      value={catalogSortOrder}
                      onChange={(e) => setCatalogSortOrder(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    >
                      <option value="manual">Manual (Predeterminado)</option>
                      <option value="stock_desc">Mayor Stock (Existencias altas primero)</option>
                      <option value="stock_asc">Menor Stock (Por agotarse primero)</option>
                      <option value="alphabetical">Por Sabor (A-Z alfabético)</option>
                    </select>
                  </div>

                  {/* MODO MANTENIMIENTO */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className={`text-xs font-bold block ${catalogModeEnabled ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-slate-850 dark:text-slate-200'}`}>
                          MODO SÓLO CATÁLOGO
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                          Desactiva compras públicas (mantenimiento) pero mantiene visible el menú.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={catalogModeEnabled}
                          onChange={(e) => setCatalogModeEnabled(e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {catalogModeEnabled && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                          Mensaje de Advertencia
                        </label>
                        <textarea
                          rows={2}
                          value={catalogModeMessage}
                          onChange={(e) => setCatalogModeMessage(e.target.value)}
                          placeholder="Ej: SABORIFICACIÓN EN MANTENIMIENTO (SÓLO CATÁLOGO)..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* ACCIONES */}
                  <div className="space-y-2">
                    <button
                        type="button"
                        onClick={async () => {
                          const activePass = sessionStorage.getItem("admin_password") || contrasenaAdmin || shopConfig.contrasenaAdmin || "PipeAdmin2026";
                          
                          const currentShopConfig = {
                            tiendaNombre: (tiendaNombre || "").trim(),
                            contrasenaAdmin: (contrasenaAdmin || "").trim(),
                            metodoOrdenar: (metodoOrdenar || "").trim(),
                            cuentaNumero: (cuentaNumero || "").trim(),
                            cuentaTitular: (cuentaTitular || "").trim(),
                            whatsappNumero: (whatsappNumero || "").trim(),
                            mostrarReloj,
                            mostrarClima,
                            syncEnabled: shopConfig.syncEnabled !== false,
                            catalogSortOrder,
                            catalogModeEnabled,
                            catalogModeMessage: (catalogModeMessage || "").trim()
                          };

                          const safeFetch = (url: string, body: any) => 
                            fetch(url, { 
                              method: "POST", 
                              headers: { 
                                "Content-Type": "application/json", 
                                "X-Admin-Password": activePass
                              }, 
                              body: JSON.stringify(body)
                            }).then(r => { if(!r.ok) throw new Error("Sync fail"); return r; });

                          setIsSyncing(true);
                          setSyncResult("idle");
                          try {
                            await Promise.all([
                              safeFetch("/api/db/products", { products }),
                              safeFetch("/api/db/sales", { sales }),
                              safeFetch("/api/db/config", { shopConfig: currentShopConfig })
                            ]);
                            setSyncResult("success");
                            setAlertModal({
                              isOpen: true,
                              title: "✓ Sincronización Exitosa",
                              message: "La base de datos local (Sabores, Ventas e Historial) y la configuración de la tienda han sido sincronizadas y guardadas de manera efectiva en la base de datos de la nube."
                            });
                            setTimeout(() => setSyncResult("idle"), 4000);
                          } catch (err) {
                            console.error("[Force Sync] Error forcing synchronization:", err);
                            setSyncResult("error");
                            setAlertModal({
                              isOpen: true,
                              title: "✗ Error de Sincronización",
                              message: "Ocurrió un error al forzar la sincronización con el servidor. Asegúrese de que su conexión a internet esté activa o que el servidor local no esté caído."
                            });
                            setTimeout(() => setSyncResult("idle"), 4000);
                          } finally {
                            setIsSyncing(false);
                          }
                        }}
                        disabled={isSyncing}
                        className={`w-full py-2.5 rounded-xl text-white font-bold text-[10px] uppercase tracking-wider transition-all ${
                          isSyncing 
                            ? 'bg-amber-500 cursor-not-allowed' 
                            : syncResult === "success"
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25'
                            : syncResult === "error"
                            ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25'
                            : 'bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {isSyncing 
                          ? 'Sincronizando...' 
                          : syncResult === "success"
                          ? '¡Sincronizado con Éxito! ✓'
                          : syncResult === "error"
                          ? '¡Fallo de Sincronización! ✗'
                          : 'Forzar Sincronización'}
                      </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "¿BORRAR VENTAS?",
                          message: "Se eliminarán permanentemente.",
                          onConfirm: async () => {
                            try {
                              const activePass = sessionStorage.getItem("admin_password") || contrasenaAdmin || shopConfig.contrasenaAdmin || "PipeAdmin2026";
                              const res = await fetch("/api/db/clear-sales", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "X-Admin-Password": activePass }
                              });
                              if (res.ok) { clearSalesData(); window.location.reload(); }
                            } catch (err) {}
                            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/10 font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      Resetear Ventas
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "LIMPIEZA",
                          message: "¿Borrar caché local?",
                          onConfirm: () => { localStorage.clear(); window.location.reload(); }
                        });
                      }}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      Limpiar Caché
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === "auditoria" && (
        <AdminAuditoriaTab
          contrasenaAdmin={contrasenaAdmin}
          setConfirmModal={setConfirmModal}
          setAlertModal={setAlertModal}
        />
      )}
      </AnimatePresence>
        </div>
      </div>

      {/* EDIT FLAVOR MODAL OVERLAY */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-zinc-900 dark:border-zinc-800 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                Editar Sabor: {editingProduct.nombre}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                  Nombre del Sabor *
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700"
                />
              </div>

              {/* Prices Section */}
              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl space-y-4 border border-slate-100 dark:border-zinc-850">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Estructura de Costos y Precios
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-1">
                      Precio de Costo (Inversión) *
                    </label>
                    <input
                      type="number"
                      required
                      value={editCosto}
                      onChange={(e) => setEditCosto(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-700 font-mono"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block leading-tight">
                      Lo que cuesta fabricar o comprar la paleta.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">
                      Precio de Venta al Público *
                    </label>
                    <input
                      type="number"
                      required
                      value={editPrecio}
                      onChange={(e) => setEditPrecio(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-700 font-mono"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block leading-tight">
                      El precio cobrado al cliente.
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                  Unidades en Inventario (Stock) *
                </label>
                <input
                  type="number"
                  required
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-700 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Cantidad disponible actualmente para la venta.
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                <ImageGallerySelector
                  currentUrl={editImagen}
                  onSelectUrl={setEditImagen}
                  products={products}
                  placeholderName={editNombre}
                />
              </div>

              {editError && <p className="text-xs text-rose-500">{editError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all uppercase tracking-wider"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORDER MODAL OVERLAY */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div id="admin-edit-panel" className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-100 dark:bg-zinc-900 dark:border-zinc-800 my-auto max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="font-sans text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Editar Orden {editingSale.numero_orden ? `#${String(editingSale.numero_orden).padStart(6, '0')}` : `#${editingSale.id}`}
              </h3>
              <button
                onClick={() => {
                  setEditingSale(null);
                  setAdminOrderTab("edit");
                }}
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 dark:border-zinc-800 mb-6">
              <button
                onClick={() => setAdminOrderTab("edit")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                  adminOrderTab === "edit"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📝 Editar Datos
              </button>
              <button
                onClick={() => setAdminOrderTab("ticket")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                  adminOrderTab === "ticket"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🎫 Ver Ticket
              </button>
            </div>

            {adminOrderTab === "edit" ? (
              <>
            <div className="mb-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-100 dark:border-zinc-850 space-y-3.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase tracking-wider">Cliente</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{editingSale.clienteNombre}</span>
                  {editingSale.clienteTelefono && (
                    <span className="text-[10px] text-slate-500 font-mono block">Cel: {editingSale.clienteTelefono}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase tracking-wider">Método de Pago</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block capitalize">
                    {editingSale.payment_method === "transferencia" ? "📲 Transferencia" : "💵 Efectivo"}
                  </span>
                </div>
                {editingSale.payment_method !== "transferencia" ? (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase tracking-wider">Valor con el que paga</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block font-mono">
                        {formatCOP(editingSale.payment_with_bill ?? editingSale.total)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase tracking-wider">Cambio / Devueltas</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                        {formatCOP(editingSale.payment_change ?? 0)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase tracking-wider">Estado de Pago</span>
                    <span className={`text-xs font-bold uppercase block ${
                      editingSale.payment_status === "Pagado"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : editingSale.payment_status === "Anulado"
                        ? "text-red-600 dark:text-red-500 font-black"
                        : "text-amber-500 dark:text-amber-400 animate-pulse"
                    }`}>
                      {editingSale.payment_status || "Pendiente"}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Aceptar Orden & Aprobar Pago */}
              <div className="flex flex-wrap gap-2 pt-2.5 border-t border-dashed border-slate-200 dark:border-zinc-800">
                {editingSale.estado === "Pre-Aprobado" ? (
                  <button
                    type="button"
                    onClick={() => handleFinalizeOrder(editingSale.id)}
                    className="flex-1 min-w-[110px] py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer active:scale-95"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Entregar Pedido
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={editingSale.estado === "Entregado" || editingSale.estado === "Aprobado"}
                    onClick={() => handleAcceptOrder(editingSale.id)}
                    className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      editingSale.estado === "Entregado" || editingSale.estado === "Aprobado"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer active:scale-95"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {editingSale.estado === "Entregado" ? "Pedido Entregado" : editingSale.estado === "Aprobado" ? "Orden Aprobada" : "Aprobar Orden"}
                  </button>
                )}

                <button
                  type="button"
                  disabled={editingSale.estado === "Pre-Aprobado" || editingSale.estado === "Entregado" || editingSale.estado === "Aprobado"}
                  onClick={() => handlePreApproveOrder(editingSale.id)}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    editingSale.estado === "Pre-Aprobado" || editingSale.estado === "Entregado" || editingSale.estado === "Aprobado"
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer active:scale-95"
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  {editingSale.estado === "Pre-Aprobado" ? "Pre-Aprobado ✓" : "Pre-Aprobar"}
                </button>

                <button
                  type="button"
                  disabled={editingSale.payment_status === "Pagado"}
                  onClick={() => handleApprovePayment(editingSale.id)}
                  className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    editingSale.payment_status === "Pagado"
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm cursor-pointer active:scale-95"
                  }`}
                >
                  <span>💵 {editingSale.payment_status === "Pagado" ? "Pago Aprobado" : "Aprobar Pago"}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="space-y-4">
                {/* Product list editor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Nombre del Cliente</label>
                    <input
                      type="text"
                      value={editClienteNombre}
                      onChange={(e) => setEditClienteNombre(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                      placeholder="Nombre..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={editClienteTelefono}
                      onChange={(e) => setEditClienteTelefono(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                      placeholder="Teléfono..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Método de Pago</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditPaymentMethod("efectivo")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${editPaymentMethod === "efectivo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-200 dark:bg-zinc-950 dark:border-zinc-800"}`}
                      >
                        💵 Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPaymentMethod("transferencia")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${editPaymentMethod === "transferencia" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200 dark:bg-zinc-950 dark:border-zinc-800"}`}
                      >
                        📲 Transferencia
                      </button>
                    </div>
                  </div>
                  {editPaymentMethod === "efectivo" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">¿Con cuánto pagó?</label>
                      <input
                        type="number"
                        value={editPaymentWithBill}
                        onChange={(e) => setEditPaymentWithBill(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white font-mono"
                        placeholder="Monto recibido..."
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Estado de la Orden</label>
                    <select
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    >
                      <option value="Pendiente">⏳ Pendiente</option>
                      <option value="Aprobado">✅ Aprobado</option>
                      <option value="Entregado">🏁 Entregado</option>
                      <option value="Rechazado">❌ Rechazado</option>
                      <option value="Eliminada">🗑️ Eliminada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Estado de Pago</label>
                    <select
                      value={editPaymentStatus}
                      onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    >
                      <option value="Pendiente">🕒 Pendiente</option>
                      <option value="Pagado">💳 Pagado</option>
                      <option value="Anulado">🚫 Anulado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Productos en la Orden
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editSaleItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{formatCOP(item.precioUnitario)} c/u</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Minus */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditSaleItems(prev => prev.map((itm, i) => i === idx ? { ...itm, cantidad: Math.max(1, itm.cantidad - 1) } : itm));
                            }}
                            className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 w-6 text-center">
                            {item.cantidad}
                          </span>
                          {/* Plus */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditSaleItems(prev => prev.map((itm, i) => i === idx ? { ...itm, cantidad: itm.cantidad + 1 } : itm));
                            }}
                            className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditSaleItems(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 rounded-md bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Sabor form block inside the modal - Improved for mobile */}
                <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2">Añadir Sabor a la Orden</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => setSelectedProductToAdd(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white min-w-0"
                    >
                      <option value="">-- Seleccionar Sabor --</option>
                      {products.map(p => {
                        const isAgotado = p.stock === 0;
                        return (
                          <option 
                            key={p.id} 
                            value={p.id}
                            disabled={isAgotado}
                            className={isAgotado ? "text-gray-300 dark:text-zinc-600 line-through" : ""}
                          >
                            {p.nombre} — {formatCOP(p.precio)} (Stock: {p.stock})
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={selectedQtyToAdd}
                        onChange={(e) => setSelectedQtyToAdd(e.target.value)}
                        className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none text-center dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedProductToAdd) return;
                          const prod = products.find(p => p.id === selectedProductToAdd);
                          if (!prod) return;
                          const qty = parseInt(selectedQtyToAdd) || 1;
                          
                          setEditSaleItems(prev => {
                            const existing = prev.find(item => item.productId === selectedProductToAdd);
                            if (existing) {
                              return prev.map(item => item.productId === selectedProductToAdd ? { ...item, cantidad: item.cantidad + qty } : item);
                            }
                            return [...prev, {
                              productId: prod.id,
                              nombre: prod.nombre,
                              cantidad: qty,
                              precioUnitario: prod.precio,
                              costoUnitario: prod.costo || (prod.nombre.toLowerCase().includes("mango biche") ? 920 : 1140)
                            }];
                          });
                          setSelectedProductToAdd("");
                          setSelectedQtyToAdd("1");
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition active:scale-95 whitespace-nowrap shadow-sm"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order total info */}
                <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-3">
                  {editPaymentMethod === "efectivo" && editPaymentWithBill && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600">Cambio Estimado:</span>
                      <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCOP(Math.max(0, (parseFloat(editPaymentWithBill) || 0) - editSaleItems.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)))} COP
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Dinámico de la Orden:</span>
                    <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCOP(editSaleItems.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0))} COP
                    </span>
                  </div>
                </div>

                {editSaleError && <p className="text-xs text-rose-500 font-semibold">{editSaleError}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSale(null);
                      setCapturedImage(null);
                      setAdminOrderTab("edit");
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-wider"
                  >
                    Guardar Orden
                  </button>
                </div>
              </form>
              </>
            ) : (
              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center gap-4">
                  <TicketPreviewModal 
                    isOpen={true} 
                    saleId={editingSale.id} 
                    sale={editingSale}
                    onClose={() => {}}
                    onCapture={(base64) => setCapturedImage(base64)}
                    isInline={true}
                    adminPassword={contrasenaAdmin}
                    shopConfig={shopConfig}
                  />
                  <div className="w-full flex gap-2 mt-4">
                    <button
                      onClick={() => handleDirectTelegramSend(editingSale.id)}
                      disabled={sendingTelegramId === editingSale.id}
                      className="flex-1 bg-sky-500 hover:bg-sky-400 text-white py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                    >
                      <Send className={`h-4 w-4 ${sendingTelegramId === editingSale.id ? "animate-pulse" : ""}`} />
                      Enviar a Admin Telegram
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/15 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT MODAL */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {alertModal.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              {alertModal.message}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DEL CATALOGO MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-slate-900/40 backdrop-blur-md p-4">
          {/* Main Modal Wrapper */}
          <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 max-w-6xl w-full mx-auto md:rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <IceCream className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    Vista Previa del Catálogo Real
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                      Modo Simulación
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Así se verá tu tienda. Prueba buscando, filtrando o interactuando con los sabores.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inner Content with its own search and filter local state */}
            <CatalogPreviewContent 
              products={products} 
              shopConfig={shopConfig} 
            />
          </div>
        </div>
      )}

      {isAuthenticated && (
        <AdminAssistant products={products} shopConfig={shopConfig} />
      )}

      {/* TICKET PREVIEW MODAL (STANDALONE) */}
      <TicketPreviewModal
        isOpen={ticketModal.isOpen}
        saleId={ticketModal.saleId}
        sale={sales.find((s) => s.id === ticketModal.saleId)}
        onClose={() => setTicketModal({ isOpen: false, saleId: null })}
        adminPassword={contrasenaAdmin}
        shopConfig={shopConfig}
      />

      {captureSaleId && (
        <div className="absolute top-[-9999px] left-0">
          <TicketPreviewModal
            isOpen={true}
            onClose={() => setCaptureSaleId(null)}
            saleId={captureSaleId}
            sale={sales.find((s) => s.id === captureSaleId)}
            onCapture={(base64) => {
              sendToTelegram(captureSaleId, base64);
              setCaptureSaleId(null);
            }}
            adminPassword={contrasenaAdmin}
            shopConfig={shopConfig}
            isInline={true}
          />
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
// trigger vite reload
