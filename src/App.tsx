import { AdminPanelSkeleton } from "./components/PanelSkeletons";
import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { Product, Sale, ShopConfig, SaleItem } from "./types";
import { SplashScreen } from "./components/SplashScreen";
import { ProductCard } from "./components/ProductCard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WeatherClockWidget } from "./components/WeatherClockWidget";
import { InteractiveOnboardingTutorial } from "./components/InteractiveOnboardingTutorial";
import { FlyToCartOverlay, FlyingParticle } from "./components/FlyToCartOverlay";
import { useSales } from "./hooks/useSales";
import {
  validateAndSanitizeProducts,
  validateAndSanitizeSales,
  validateAndSanitizeShopConfig,
  cleanOldSales,
  parseSaleDate,
  toLocalDateString,
} from "./lib/sanitization";

const CartPanel = lazy(() => import("./components/CartPanel").then(m => ({ default: m.CartPanel }))) as React.ComponentType<any>;
const AdminPanel = lazy(() => import("./components/AdminPanel").then(m => ({ default: m.AdminPanel }))) as React.ComponentType<any>;
import { motion, AnimatePresence } from "motion/react";
import { getSupabaseClient } from "./lib/supabaseClient";
import {
  Sun,
  Moon,
  ShoppingCart,
  Database,
  Store,
  IceCream,
  Sparkles,
  Snowflake,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

// Prepopulated high-quality default catalog from Cali
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
    stock: 0,
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
    stock: 3,
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
    nombre: "Helado Mango Biche",
    precio: 2200,
    costo: 920,
    stock: 0,
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
  metodoOrdenar: "Atención rápida y pedidos fáciles",
  cuentaNumero: "3184754263",
  cuentaTitular: "Alba Guaca",
  whatsappNumero: "3185074440",
  mostrarReloj: false,
  mostrarClima: false,
  syncEnabled: true,
  catalogSortOrder: "manual"
};

const isMobileApp = typeof window !== "undefined" && window.innerWidth < 768;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: isMobileApp ? 0.04 : 0.1,
      delayChildren: isMobileApp ? 0.05 : 0.1,
    }
  }
};

const heroVariants = {
  hidden: { opacity: 0, y: isMobileApp ? -10 : -25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: isMobileApp ? 0.4 : 0.8,
      ease: [0.16, 1, 0.3, 1] as const
    }
  }
};

const searchVariants = {
  hidden: { opacity: 0, y: isMobileApp ? 8 : 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: isMobileApp ? 0.3 : 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
      delay: isMobileApp ? 0.1 : 0.4
    }
  }
};

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: isMobileApp ? 0.03 : 0.08,
      delayChildren: isMobileApp ? 0.15 : 0.75
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: isMobileApp ? 15 : 30, scale: isMobileApp ? 1 : 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: (isMobileApp
      ? { duration: 0.25, ease: "easeOut" }
      : {
          type: "spring" as const,
          stiffness: 90,
          damping: 14
        }) as any
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: isMobileApp ? 8 : 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: (isMobileApp
      ? { duration: 0.2, ease: "easeOut" }
      : { type: "spring" as const, stiffness: 100, damping: 15 }) as any
  }
};

export default function App() {
  // DB server state tracking refs to prevent redundant sync requests and avoid infinite loops
  const lastServerProductsRef = useRef<string>("");
  const lastServerSalesRef = useRef<string>("");
  const lastServerConfigRef = useRef<string>("");

  // DB States synchronized with LocalStorage & backend
  const [products, setProducts] = useState<Product[]>(() => {
    return validateAndSanitizeProducts(localStorage.getItem("productos"));
  });

  const clearSalesData = () => {
    localStorage.removeItem("ventas");
    setSales([]);
  };


  const [shopConfig, setShopConfig] = useState<ShopConfig>(() => {
    return validateAndSanitizeShopConfig(localStorage.getItem("configuracion"));
  });

  // UI States
  const [cart, setCart] = useState<{ product: Product; cantidad: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [flyingParticles, setFlyingParticles] = useState<FlyingParticle[]>([]);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<any>(() => getSupabaseClient());
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // Detect mobile/device system preference for light/dark mode
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Search and Category filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"todos" | "disponibles" | "agotados">("todos");

  // Validate filter state against config and product list upon refresh or state changes
  useEffect(() => {
    if (shopConfig?.hideOutOfStock && filterType === "agotados") {
      setFilterType("todos");
    } else if (filterType === "agotados" && products.length > 0) {
      const hasOutOfStock = products.some(p => p.stock === 0);
      if (!hasOutOfStock) {
        setFilterType("todos");
      }
    }
  }, [shopConfig?.hideOutOfStock, filterType, products]);

  // Connectivity and Sync queue states
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const [syncQueue, setSyncQueue] = useState<{ type: string; data: any; timestamp: number }[]>(() => {
    if (typeof localStorage === "undefined") return [];
    
    if (typeof sessionStorage === "undefined" || sessionStorage.getItem("is_admin_authenticated") !== "true") {
      try {
        localStorage.removeItem("sync_queue");
      } catch (e) {}
      return [];
    }
    const saved = localStorage.getItem("sync_queue");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const queueSyncItem = (type: "products" | "sales" | "config", data: any) => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("is_admin_authenticated") === "true") {
      setSyncQueue((prev) => {
        const filtered = prev.filter(item => item.type !== type);
        const updated = [...filtered, { id: ("crypto" in window && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2), type, data, timestamp: Date.now() }];
        localStorage.setItem("sync_queue", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Premium UI Micro-interactions states
  const [shakeCart, setShakeCart] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [elapsedSplash, setElapsedSplash] = useState(false);
  const [splashFadeActive, setSplashFadeActive] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // AI "Helado del Día" states
  const [heladoDelDia, setHeladoDelDia] = useState<string>("");
  const [loadingHelado, setLoadingHelado] = useState<boolean>(false);
  const heladoFetchedRef = useRef(false);

  // Verify and confirm that both AdminPanel component and API have loaded completely
  const [adminPanelAndApiLoaded, setAdminPanelAndApiLoaded] = useState(false);

  useEffect(() => {
    if (apiLoaded) {
      // Preload the AdminPanel code in the background so it's fully cached and ready,
      // confirming both the API data and the Admin component chunk are fully resolved.
      import("./components/AdminPanel")
        .then(() => {
          setAdminPanelAndApiLoaded(true);
        })
        .catch((err) => {
          console.warn("Failed to preload AdminPanel chunk:", err);
          // Fallback to true so application function isn't blocked by offline/network errors
          setAdminPanelAndApiLoaded(true);
        });
    }
  }, [apiLoaded]);

  const fetchHeladoDelDia = useCallback(async () => {
    setLoadingHelado(true);
    setHeladoDelDia(""); // Reset recommendation to force visual change
    try {
      const res = await fetch(`/api/ai/helado-del-dia?t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
      const data = await res.json();
      if (data.success && data.recommendation) {
        setHeladoDelDia(data.recommendation);
      }
    } catch (error) {
      console.error("Error fetching helado del dia:", error);
    } finally {
      setLoadingHelado(false);
    }
  }, []);

  useEffect(() => {
    if (adminPanelAndApiLoaded && !heladoFetchedRef.current) {
      heladoFetchedRef.current = true;
      fetchHeladoDelDia();
    }
  }, [adminPanelAndApiLoaded, fetchHeladoDelDia]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { sales, setSales, submitSale } = useSales(
    validateAndSanitizeSales(localStorage.getItem("ventas")),
    setToastMessage
  );
  const [showSnowEffect, setShowSnowEffect] = useState(false);

  // Onboarding Tutorial States
  const [showTutorial, setShowTutorial] = useState(false);
  const hasAutoPromptedTutorialRef = useRef(false);
  const hasSeenTutorialState = shopConfig?.hasSeenTutorial || localStorage.getItem("has_seen_tutorial") === "true";

  // Auto-detect new user after splash screen completes
  useEffect(() => {
    if (!showSplash && apiLoaded && !hasAutoPromptedTutorialRef.current) {
      hasAutoPromptedTutorialRef.current = true;
      if (!hasSeenTutorialState) {
        const timer = setTimeout(() => {
          setShowTutorial(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [showSplash, apiLoaded, hasSeenTutorialState]);

  // Preload images for fluid startup
  useEffect(() => {
    const imageUrls = products.map(p => p.imagen).filter(url => typeof url === 'string' && url.trim() !== '');
    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }
    
    let loadedCount = 0;
    let hasError = false;

    // Timeout for preloading in case some images are too slow (max 1.5s)
    const fallbackTimer = setTimeout(() => {
      setImagesLoaded(true);
    }, 1500);

    const handleImageLoad = () => {
      loadedCount++;
      if (loadedCount === imageUrls.length && !hasError) {
        clearTimeout(fallbackTimer);
        setImagesLoaded(true);
      }
    };
    
    const handleImageError = () => {
      hasError = true;
      clearTimeout(fallbackTimer);
      setImagesLoaded(true);
    };

    imageUrls.forEach(url => {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = url;
    });
    
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Progressive cooling splash timer
  useEffect(() => {
    const splashMinDuration = 800; // minimal duration for splash screen to ensure fast load (0.8s)
    const timer = setTimeout(() => {
      setElapsedSplash(true);
    }, splashMinDuration);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const ticksSpeed = 16; // 60 FPS
    const interval = setInterval(() => {
      setSplashProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }

        // If everything is loaded, animate quickly to 100
        if (apiLoaded && elapsedSplash && imagesLoaded) {
          return prev + 3;
        }

        if (prev < 95) {
          // Increment fluidly
          return prev + 1.2;
        } else {
          // Wait at 95%
          return 95;
        }
      });
    }, ticksSpeed);

    return () => clearInterval(interval);
  }, [apiLoaded, elapsedSplash, imagesLoaded]);

  // Handle splash completion fade-out when progress reaches 100%
  useEffect(() => {
    if (splashProgress >= 100) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 100); // Wait 100ms for user to see the 100% state, then trigger AnimatePresence exit
      return () => clearTimeout(timer);
    }
  }, [splashProgress]);

  // Trigger snow cascade effect after splash finishes
  useEffect(() => {
    if (!showSplash) {
      setShowSnowEffect(true);
      const timer = setTimeout(() => {
        setShowSnowEffect(false);
      }, 1000); // Snow falls during exactly 1 second
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const handleCloseTutorial = async () => {
    localStorage.setItem("has_seen_tutorial", "true");
    setShowTutorial(false);
    setShopConfig((prev) => ({ ...prev, hasSeenTutorial: true }));
    try {
      await fetch("/api/db/tutorial-seen", { method: "POST" });
    } catch (err) {
      console.warn("[Tutorial] Could not sync tutorial preference to server DB:", err);
    }
  };

  // Cart vibration listener
  useEffect(() => {
    const handleCartShake = () => {
      setShakeCart(true);
      setTimeout(() => setShakeCart(false), 600);
    };
    window.addEventListener("cart-shake", handleCartShake);
    return () => window.removeEventListener("cart-shake", handleCartShake);
  }, []);

  useEffect(() => {
    // Auto-approve pending sales older than 2 hours as a safety fallback
    const interval = setInterval(() => {
      const now = new Date();
      setSales(prevSales => {
        let changed = false;
        const nextSales = prevSales.map(sale => {
          if (sale.estado === 'Pendiente') {
            const saleTime = new Date(`${sale.fecha}T${sale.hora}`);
            const diffMs = now.getTime() - saleTime.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours >= 2) {
              changed = true;
              return { 
                ...sale, 
                estado: 'Aprobado' as const, 
                payment_status: sale.payment_method === 'efectivo' ? 'Pagado' as const : sale.payment_status,
                updated_at: now.toISOString()
              };
            }
          }
          return sale;
        });
        if (changed) {
          localStorage.setItem("ventas", JSON.stringify(nextSales));
          return nextSales;
        }
        return prevSales;
      });
    }, 1000 * 60 * 5); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Fetch data safely from server DB, loop-safely checking local state differences
  const fetchProductsAndSales = (forceFull = false, attempt = 0): Promise<void> => {
    const lastSync = forceFull ? null : localStorage.getItem("last_sync_timestamp");
    const url = lastSync ? `/api/db?since=${encodeURIComponent(lastSync)}` : "/api/db";

    const adminPassword = typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("admin_password") || "") : "";
    const headers: Record<string, string> = {};
    if (adminPassword) {
      headers["X-Admin-Password"] = adminPassword;
    }

    return fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then((data) => {
        const now = new Date().toISOString();
        
        if (data.products && Array.isArray(data.products)) {
          const currentProductsStr = localStorage.getItem("productos");
          const localProducts = currentProductsStr ? JSON.parse(currentProductsStr) : [];
          
          let mergedProducts;
          if (data.isPartial && !forceFull) {
            const productMap = new Map(localProducts.map((p: any) => [p.id, p]));
            data.products.forEach((p: any) => productMap.set(p.id, p));
            mergedProducts = Array.from(productMap.values());
          } else {
            mergedProducts = data.products;
          }

          const sortedServer = [...mergedProducts].sort((a: any, b: any) => a.id.localeCompare(b.id));
          const sortedLocal = [...localProducts].sort((a: any, b: any) => a.id.localeCompare(b.id));

          if (JSON.stringify(sortedServer) !== JSON.stringify(sortedLocal)) {
            setProducts(mergedProducts);
            localStorage.setItem("productos", JSON.stringify(mergedProducts));
          }
          lastServerProductsRef.current = JSON.stringify(mergedProducts);
        }
        if (data.sales && Array.isArray(data.sales)) {
          const currentSalesStr = localStorage.getItem("ventas");
          const localSales = currentSalesStr ? JSON.parse(currentSalesStr) : [];
          
          // Always ensure we have all sales, both server and local (for offline additions)
          const salesMap = new Map<string, Sale>();
          // 1. Add server sales
          data.sales.forEach((s: any) => salesMap.set(s.id, s));
          // 2. Add local sales ONLY if they do not exist on the server, OR if the local one has a newer updated_at timestamp
          localSales.forEach((s: any) => {
            const existing = salesMap.get(s.id);
            if (!existing) {
              salesMap.set(s.id, s);
            } else {
              const localTime = s.updated_at ? new Date(s.updated_at).getTime() : 0;
              const serverTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
              if (localTime > serverTime) {
                salesMap.set(s.id, s);
              }
            }
          });
          
          const mergedSales = Array.from(salesMap.values());

          const cleaned = cleanOldSales(mergedSales);
          const sortedServer = [...cleaned].sort((a: any, b: any) => a.id.localeCompare(b.id));
          const sortedLocal = [...localSales].sort((a: any, b: any) => a.id.localeCompare(b.id));

          if (JSON.stringify(sortedServer) !== JSON.stringify(sortedLocal)) {
            setSales(cleaned);
            localStorage.setItem("ventas", JSON.stringify(cleaned));
          }
          lastServerSalesRef.current = JSON.stringify(cleaned);
        }
        
        if (!forceFull) {
          localStorage.setItem("last_sync_timestamp", now);
        }
        if (data.shopConfig && data.shopConfig.tiendaNombre) {
          if (data.shopConfig.hasSeenTutorial) {
            localStorage.setItem("has_seen_tutorial", "true");
          }
          const currentConfigStr = localStorage.getItem("configuracion");
          if (currentConfigStr) {
            try {
              const localConfig = JSON.parse(currentConfigStr);
              if (
                data.shopConfig.tiendaNombre !== localConfig.tiendaNombre ||
                data.shopConfig.contrasenaAdmin !== localConfig.contrasenaAdmin ||
                data.shopConfig.tiendaNombre !== localConfig.tiendaNombre ||
                data.shopConfig.metodoOrdenar !== localConfig.metodoOrdenar ||
                data.shopConfig.cuentaNumero !== localConfig.cuentaNumero ||
                data.shopConfig.cuentaTitular !== localConfig.cuentaTitular ||
                !!data.shopConfig.mostrarReloj !== !!localConfig.mostrarReloj ||
                !!data.shopConfig.mostrarClima !== !!localConfig.mostrarClima
              ) {
                setShopConfig(data.shopConfig);
                localStorage.setItem("configuracion", JSON.stringify(data.shopConfig));
              }
            } catch {
              setShopConfig(data.shopConfig);
              localStorage.setItem("configuracion", JSON.stringify(data.shopConfig));
            }
          } else {
            setShopConfig(data.shopConfig);
            localStorage.setItem("configuracion", JSON.stringify(data.shopConfig));
          }
          lastServerConfigRef.current = JSON.stringify(data.shopConfig);
        }
        setApiLoaded(true);
        setIsOnline(true);
      })
      .catch((err) => {
        if (err.name !== 'TypeError' || !err.message.includes('fetch')) {
          console.warn(`Sync: Connection issue (Attempt ${attempt + 1}): ${err.message}`);
        }
        setIsOnline(false);

        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve(fetchProductsAndSales(forceFull, attempt + 1));
            }, delay);
          });
        } else {
          setApiLoaded(true);
          return Promise.resolve();
        }
      });
  };

  // Fetch Supabase configuration dynamically if not loaded statically
  useEffect(() => {
    const staticClient = getSupabaseClient();
    if (staticClient) {
      setSupabaseClient(staticClient);
    } else {
      console.log("[Client Setup] Local Supabase client not initialized statically. Fetching config from server...");
      fetch("/api/supabase-config")
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then((data) => {
          if (data.url && data.anonKey) {
            console.log("[Client Setup] Supabase config received from server. Initializing client...");
            const client = getSupabaseClient(data.url, data.anonKey);
            setSupabaseClient(client);
          } else {
            console.log("[Client Setup] Supabase config from server is empty.");
          }
        })
        .catch((err) => {
          console.warn("[Client Setup] Could not fetch Supabase config dynamically:", err.message);
        });
    }
  }, []);

  // Startup catalog order integrity checker comparing local order vs server state
  const verifyCatalogOrderIntegrity = async () => {
    try {
      const res = await fetch("/api/db");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.products || !Array.isArray(data.products)) return;

      const localProductsStr = localStorage.getItem("productos");
      const localProducts = localProductsStr ? JSON.parse(localProductsStr) : [];

      if (!Array.isArray(localProducts) || localProducts.length === 0) {
        console.warn("[Integrity Check] Local catalog empty or invalid. Syncing...");
        fetchProductsAndSales(true);
        return;
      }

      const getNumericIdLocal = (id: string): number => {
        const matched = id.match(/\d+/);
        return matched ? parseInt(matched[0], 10) : 0;
      };

      const sortProductsFn = (a: any, b: any) => {
        if (a.orden_manual !== undefined && b.orden_manual !== undefined) {
          return a.orden_manual - b.orden_manual;
        }
        if (a.orden_manual !== undefined) return -1;
        if (b.orden_manual !== undefined) return 1;
        return getNumericIdLocal(a.id) - getNumericIdLocal(b.id);
      };

      const orderedServerIds = [...data.products].sort(sortProductsFn).map(p => p.id);
      const orderedLocalIds = [...localProducts].sort(sortProductsFn).map(p => p.id);

      let discrepancyDetected = orderedServerIds.length !== orderedLocalIds.length;
      
      if (!discrepancyDetected) {
        for (let i = 0; i < orderedServerIds.length; i++) {
          if (orderedServerIds[i] !== orderedLocalIds[i]) {
            discrepancyDetected = true;
            break;
          }
          const serverP = data.products.find((p: any) => p.id === orderedServerIds[i]);
          const localP = localProducts.find((p: any) => p.id === orderedServerIds[i]);
          if (serverP?.orden_manual !== localP?.orden_manual || serverP?.stock !== localP?.stock) {
            discrepancyDetected = true;
            break;
          }
        }
      }

      if (discrepancyDetected) {
        console.warn("[Integrity Check] Discrepancy detected between server order and local cache. Forcing clean synchronization...");
        await fetchProductsAndSales(true);
      } else {
        console.log("[Integrity Check] Local catalog order is fully synchronized and valid.");
      }
    } catch (error) {
      console.error("[Integrity Check] Failed to run catalog verification:", error);
    }
  };

  // Load from Server DB on Mount
  useEffect(() => {
    fetchProductsAndSales();
    verifyCatalogOrderIntegrity();
  }, []);

  // Setup Supabase Realtime subscriptions when client is initialized
  useEffect(() => {
    if (!supabaseClient) return () => {};

    console.log("[Supabase Sync] Setting up real-time channels with client...");
    // Setup active real-time postgres listeners for real-time stock, orders and config updates
    const realtimeChannel = supabaseClient
      .channel("supabase-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload: any) => {
          console.log("[Supabase Realtime] Products change received:", payload);
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const row = payload.new;
            setProducts((prev) => {
              const mapped = {
                id: row.id,
                nombre: row.nombre,
                precio: Number(row.precio),
                costo: Number(row.costo),
                stock: Number(row.stock),
                imagen: row.imagen || "",
                updated_at: row.updated_at
              };
              const exists = prev.some((p) => p.id === mapped.id);
              if (exists) {
                return prev.map((p) => (p.id === mapped.id ? mapped : p));
              } else {
                return [...prev, mapped];
              }
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old;
            setProducts((prev) => prev.filter((p) => p.id !== row.id));
          }
          // Silent refresh of the full state to ensure integrity
          fetchProductsAndSales(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        (payload: any) => {
          console.log("[Supabase Realtime] Sales change received:", payload);
          // Refresh everything to get relational sales items
          fetchProductsAndSales(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_config" },
        (payload: any) => {
          console.log("[Supabase Realtime] Shop config change received:", payload);
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const row = payload.new;
            setShopConfig({
              tiendaNombre: row.tienda_nombre,
              contrasenaAdmin: row.contrasena_admin,
              metodoOrdenar: row.metodo_ordenar || "",
              cuentaNumero: row.cuenta_numero || "",
              cuentaTitular: row.cuenta_titular || "",
              whatsappNumero: row.whatsapp_numero || "3185074440",
              mostrarReloj: !!row.mostrar_reloj,
              mostrarClima: !!row.mostrar_clima,
              syncEnabled: row.sync_enabled !== false,
              catalogSortOrder: (row.catalog_sort_order || "manual") as any,
              catalogModeEnabled: !!row.catalog_mode_enabled,
              catalogModeMessage: row.catalog_mode_message || ""
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(realtimeChannel);
    };
  }, [supabaseClient]);

  // Keep LocalStorage and Server in sync safely with robust exponential backoff offline queue retry
  const triggerQueueSync = async (retryAttempt = 0) => {
    if (shopConfig.syncEnabled === false) return;

    if (typeof sessionStorage === "undefined" || sessionStorage.getItem("is_admin_authenticated") !== "true") {
      localStorage.removeItem("sync_queue");
      setSyncQueue([]);
      return;
    }

    const savedQueueStr = localStorage.getItem("sync_queue");
    const queue = savedQueueStr ? JSON.parse(savedQueueStr) : [];
    if (queue.length === 0) {
      setIsOnline(true);
      setSyncRetryCount(0);
      return;
    }
    
    console.log(`Syncing offline queue: ${queue.length} elements pending. Attempt #${retryAttempt}...`);
    
    try {
      const productsToSync = JSON.parse(localStorage.getItem("productos") || "[]");
      const salesToSync = JSON.parse(localStorage.getItem("ventas") || "[]");
      const configBase = validateAndSanitizeShopConfig(localStorage.getItem("configuracion"));
      const adminPassword = sessionStorage.getItem("admin_password") || configBase.contrasenaAdmin || shopConfig.contrasenaAdmin || "";
      const configToSync = { ...configBase, contrasenaAdmin: adminPassword };

      const res = await fetch("/api/db/products", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Password": adminPassword
        },
        body: JSON.stringify({ products: productsToSync })
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`Products sync failed: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const resSales = await fetch("/api/db/sales", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Password": adminPassword
        },
        body: JSON.stringify({ sales: salesToSync })
      });
      if (!resSales.ok) {
        const errorText = await resSales.text().catch(() => "Unknown error");
        throw new Error(`Sales sync failed: ${resSales.status} ${resSales.statusText} - ${errorText}`);
      }

        const resConfig = await fetch("/api/db/config", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Admin-Password": adminPassword
          },
          body: JSON.stringify({ shopConfig: configToSync })
        });
        if (!resConfig.ok) {
          const errorText = await resConfig.text().catch(() => "Unknown error");
          throw new Error(`Config sync failed: ${resConfig.status} ${resConfig.statusText} - ${errorText}`);
        }

      setSyncQueue([]);
      localStorage.removeItem("sync_queue");
      setIsOnline(true);
      setSyncRetryCount(0);
      lastServerProductsRef.current = JSON.stringify(productsToSync);
      lastServerSalesRef.current = JSON.stringify(salesToSync);
      lastServerConfigRef.current = JSON.stringify(configToSync);
      if (sessionStorage.getItem("admin_password")) {
        setToastMessage("🔄 ¡Conexión restablecida! Datos sincronizados con éxito.");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: any) {
      const isFetchErr = err instanceof TypeError || (err && err.message && err.message.includes("fetch"));
      if (isFetchErr) {
        console.warn("Sync queue offline, retrying with exponential backoff:", err.message);
      } else {
        console.error("Failed to sync queue, applying exponential backoff delay:", err);
      }
      setIsOnline(false);
      
      const nextAttempt = retryAttempt + 1;
      setSyncRetryCount(nextAttempt);
      
      // Calculate delay: min 2s, max 60s
      const delay = Math.min(2000 * Math.pow(2, retryAttempt), 60000);
      console.log(`Scheduling offline queue sync retry in ${delay / 1000}s (attempt #${nextAttempt})...`);
      
      setTimeout(() => {
        if (navigator.onLine) {
          triggerQueueSync(nextAttempt);
        }
      }, delay);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerQueueSync(0);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic ping to verify if server is actually reachable (self-healing)
    const pingInterval = setInterval(() => {
      if (navigator.onLine) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        fetch("/api/db", { signal: controller.signal })
          .then((res) => {
            clearTimeout(timeoutId);
            if (res.ok) {
              if (!isOnline) {
                setIsOnline(true);
                triggerQueueSync(0);
              }
            } else {
              if (isOnline) setIsOnline(false);
            }
          })
          .catch(() => {
            clearTimeout(timeoutId);
            if (isOnline) setIsOnline(false);
          });
      } else {
        if (isOnline) setIsOnline(false);
      }
    }, 45000); // Check every 45 seconds (less aggressive)

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(pingInterval);
    };
  }, [isOnline, shopConfig.contrasenaAdmin]);

  // Debounced Sync Effects
  useEffect(() => {
    if (!apiLoaded) return;
    const now = Date.now();
    const currentProductsStr = JSON.stringify(products);
    localStorage.setItem("productos", currentProductsStr);
    localStorage.setItem("db_last_updated", String(now));
    
    // Skip redundant syncs if state matches last loaded server state
    if (currentProductsStr === lastServerProductsRef.current) {
      return;
    }

    // Only synchronize with server if user is authenticated as admin
    const isAdmin = typeof sessionStorage !== "undefined" && sessionStorage.getItem("is_admin_authenticated") === "true";
    if (!isAdmin) return;

    const timeoutId = setTimeout(() => {
      const adminPassword = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "";
      if (isOnline && shopConfig.syncEnabled !== false) {
        fetch("/api/db/products", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Admin-Password": adminPassword
          },
          body: JSON.stringify({ products }),
        })
        .then((res) => {
          if (!res.ok) throw new Error();
          setIsOnline(true);
          lastServerProductsRef.current = currentProductsStr;
        })
        .catch(() => {
          // Silent failure for periodic background sync to avoid console spam
          setIsOnline(false);
          queueSyncItem("products", products);
        });
      } else {
        queueSyncItem("products", products);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [products, apiLoaded, shopConfig.contrasenaAdmin, isOnline]);

  useEffect(() => {
    if (!apiLoaded) return;
    const now = Date.now();
    const currentSalesStr = JSON.stringify(sales);
    localStorage.setItem("ventas", currentSalesStr);
    localStorage.setItem("db_last_updated", String(now));
    
    // Skip redundant syncs if state matches last loaded server state
    if (currentSalesStr === lastServerSalesRef.current) {
      return;
    }

    // Only synchronize with server if user is authenticated as admin
    const isAdmin = typeof sessionStorage !== "undefined" && sessionStorage.getItem("is_admin_authenticated") === "true";
    if (!isAdmin) return;

    const timeoutId = setTimeout(() => {
      const adminPassword = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "";
      if (isOnline && shopConfig.syncEnabled !== false) {
        fetch("/api/db/sales", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Admin-Password": adminPassword
          },
          body: JSON.stringify({ sales }),
        })
        .then(async (res) => {
          if (!res.ok) throw new Error();
          setIsOnline(true);
          lastServerSalesRef.current = currentSalesStr;
          // Only re-fetch if this was triggered by a sale that lacks numero_orden
          // or we just want to ensure we get the updated IDs from DB
          const hasUnsynced = sales.some(s => s.numero_orden === undefined);
          if (hasUnsynced) {
            try {
               fetchProductsAndSales();
            } catch(e) {}
          }
        })
        .catch(() => {
          // Silent failure for periodic background sync to avoid console spam
          setIsOnline(false);
          queueSyncItem("sales", sales);
        });
      } else {
        queueSyncItem("sales", sales);
      }
    }, 2500); // 2.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [sales, apiLoaded, shopConfig.contrasenaAdmin, isOnline]);

  useEffect(() => {
    if (!apiLoaded) return;
    const now = Date.now();
    const currentConfigStr = JSON.stringify(shopConfig);
    localStorage.setItem("configuracion", currentConfigStr);
    localStorage.setItem("db_last_updated", String(now));
    
    // Skip redundant syncs if state matches last loaded server state
    if (currentConfigStr === lastServerConfigRef.current) {
      return;
    }

    // Only synchronize with server if user is authenticated as admin
    const isAdmin = typeof sessionStorage !== "undefined" && sessionStorage.getItem("is_admin_authenticated") === "true";
    if (!isAdmin) return;

    const adminPassword = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "";
    const configToSync = { ...shopConfig, contrasenaAdmin: adminPassword };

    // Config sync always happens if online to persist syncEnabled state toggle
    if (isOnline) {
      fetch("/api/db/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Password": adminPassword
        },
        body: JSON.stringify({ shopConfig: configToSync }),
      })
      .then((res) => {
        if (!res.ok) throw new Error();
        setIsOnline(true);
        lastServerConfigRef.current = currentConfigStr;
      })
      .catch(() => {
        // Silent failure for periodic background sync to avoid console spam
        setIsOnline(false);
        queueSyncItem("config", configToSync);
      });
    } else {
      queueSyncItem("config", configToSync);
    }
  }, [shopConfig, apiLoaded, isOnline]);

  // Handle Dark mode class injection
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Helper for numeric sort (stable across Catalog and Admin)
  const getNumericId = (id: string): number => {
    const matched = id.match(/\d+/);
    return matched ? parseInt(matched[0], 10) : 0;
  };

  // Dynamic sorting of catalog based on shopConfig.catalogSortOrder (memoized)
  const sortedProducts = useMemo(() => {
    const sortMode = shopConfig.catalogSortOrder || "manual";
    let initialSorted = [...products];

    initialSorted.sort((a, b) => {
      // 1. Primary Sort
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

    return initialSorted;
  }, [products, shopConfig.catalogSortOrder]);

  // Base visibility (memoized)
  const visibleProducts = useMemo(() => {
    return shopConfig?.hideOutOfStock 
      ? sortedProducts.filter(p => p.stock > 0)
      : sortedProducts;
  }, [sortedProducts, shopConfig?.hideOutOfStock]);

  // Filter products by search and select option (memoized)
  const filteredProducts = useMemo(() => {
    return visibleProducts.filter((product) => {
      const matchesSearch = product.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!shopConfig?.hideOutOfStock) {
        if (filterType === "disponibles") {
          return matchesSearch && product.stock > 0;
        }
        if (filterType === "agotados") {
          return matchesSearch && product.stock === 0;
        }
      }
      return matchesSearch;
    });
  }, [visibleProducts, searchQuery, filterType, shopConfig?.hideOutOfStock]);

  // Particle Fly-To-Cart handler
  const handleParticleComplete = (id: string) => {
    setFlyingParticles((prev) => prev.filter((p) => p.id !== id));
    // Elastic Squash & Stretch feedback on target impact
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 650);
  };

  // Cart operations with Fly-To-Cart support
  const handleAddToCart = useCallback((
    product: Product,
    cantidad: number,
    startRect?: DOMRect,
    imageUrl?: string
  ) => {
    if (product.stock === 0) return;

    // Trigger Fly-To-Cart animation if startRect is provided
    if (startRect) {
      const targetElement =
        document.getElementById("cart-icon-target") ||
        document.getElementById("cart-icon-target-mobile");

      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const particle: FlyingParticle = {
          id: `fly-${Date.now()}-${Math.random()}`,
          startX: startRect.left + startRect.width / 2,
          startY: startRect.top + startRect.height / 2,
          endX: targetRect.left + targetRect.width / 2,
          endY: targetRect.top + targetRect.height / 2,
          imageUrl: imageUrl || product.imagen,
          nombre: product.nombre,
        };
        // Throttle particles to max 2 active elements to prevent lag on low-end devices
        setFlyingParticles((prev) => [...prev.slice(-1), particle]);
      }
    }

    let limitReached = false;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // Guard against adding more than available stock
        const newQty = Math.min(product.stock, existing.cantidad + cantidad);
        if (existing.cantidad + cantidad > product.stock) {
          limitReached = true;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, cantidad: newQty } : item
        );
      }
      return [...prevCart, { product, cantidad }];
    });

    // Trigger elastic bounce feedback
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 700);

    // Trigger cart shake animation on header icon
    window.dispatchEvent(new CustomEvent("cart-shake"));

    if (limitReached) {
      setToastMessage(`⚠️ No hay suficiente stock de ${product.nombre} (Máx: ${product.stock})`);
    } else {
      setToastMessage(`🍧 ¡${product.nombre} (${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}) agregado correctamente!`);
    }
    
    // Auto-dismiss the toast in 2.5 seconds
    setTimeout(() => {
      setToastMessage((curr) => (curr?.includes(product.nombre) ? null : curr));
    }, 2500);
  }, []);

  const handleUpdateCantidad = useCallback((productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const productRef = products.find((p) => p.id === productId);
            const maxStock = productRef ? productRef.stock : 99;
            const newQty = Math.max(1, Math.min(maxStock, item.cantidad + delta));
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  }, [products]);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleRegisterSale = async (newSale: Sale) => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sale: newSale })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Error al procesar el pedido.");
      }

      // Venta persistida correctamente
      const data = await response.json();
      const saleWithTime = data.sale || {
        ...newSale,
        updated_at: new Date().toISOString()
      };

      // Refresh products to reflect stock changes
      fetchProductsAndSales(true);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Nueva Orden en Pipe Ice Cream", {
          body: `Has recibido una nueva orden de ${saleWithTime.clienteNombre || "Cliente"} por ${saleWithTime.total} COP`,
          icon: "/vite.svg"
        });
      }

      // Update state AFTER server confirmation
      setSales((prevSales) => [saleWithTime, ...prevSales]);
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        // Persist updated products to localStorage only after confirmed
        localStorage.setItem("productos", JSON.stringify(data.products));
      } else {
        // Fallback
        setProducts((prevProducts) => {
          const updated = prevProducts.map((p) => {
            const orderedItem = saleWithTime.items.find((item) => item.productId === p.id);
            if (orderedItem) {
              return { 
                ...p, 
                stock: Math.max(0, p.stock - orderedItem.cantidad),
                updated_at: new Date().toISOString()
              };
            }
            return p;
          });
          localStorage.setItem("productos", JSON.stringify(updated));
          return updated;
        });
      }
      return saleWithTime;
    } catch (err: any) {
      console.error("[Checkout Error] Failed to register sale via API:", err);
      throw err;
    }
  };

  const handleUpdateProducts = async (newProducts: Product[], actionType?: string) => {
    setProducts(newProducts);
    try {
      const activePass = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "PipeAdmin2026";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-Admin-Password": activePass
      };
      if (actionType) {
        headers["X-Action-Type"] = actionType;
      }

      const response = await fetch("/api/db/products", {
        method: "POST",
        headers,
        body: JSON.stringify({ products: newProducts })
      });
      if (!response.ok) {
        console.warn("[Products AutoSync] Failed to persist products (Response not OK)");
      }
    } catch (err: any) {
      const isFetchErr = err instanceof TypeError || (err && err.message && err.message.includes("fetch"));
      if (isFetchErr) {
        console.warn("[Products AutoSync] Network offline/unreachable:", err.message);
      } else {
        console.error("[Products AutoSync] Network error:", err);
      }
    }
  };

  const handleUpdateSales = async (newSales: Sale[]) => {
    setSales(newSales);
    try {
      const activePass = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "PipeAdmin2026";
      const response = await fetch("/api/db/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": activePass
        },
        body: JSON.stringify({ sales: newSales })
      });
      if (!response.ok) {
        console.warn("[Sales AutoSync] Failed to persist sales (Response not OK)");
      }
    } catch (err: any) {
      const isFetchErr = err instanceof TypeError || (err && err.message && err.message.includes("fetch"));
      if (isFetchErr) {
        console.warn("[Sales AutoSync] Network offline/unreachable:", err.message);
      } else {
        console.error("[Sales AutoSync] Network error:", err);
      }
    }
  };

  const handleUpdateConfig = async (newConfig: ShopConfig) => {
    setShopConfig(newConfig);
    try {
      const activePass = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "PipeAdmin2026";
      const response = await fetch("/api/db/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": activePass
        },
        body: JSON.stringify({ shopConfig: newConfig })
      });
      if (!response.ok) {
        console.warn("[Config AutoSync] Failed to persist shop config (Response not OK)");
      }
    } catch (err: any) {
      const isFetchErr = err instanceof TypeError || (err && err.message && err.message.includes("fetch"));
      if (isFetchErr) {
        console.warn("[Config AutoSync] Network offline/unreachable:", err.message);
      } else {
        console.error("[Config AutoSync] Network error:", err);
      }
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="min-h-screen text-gray-900 transition-all duration-700 dark:text-zinc-100 flex flex-col bg-[#f9fafc] dark:bg-[#090a0f] relative overflow-x-hidden">
      
      <SplashScreen 
        showSplash={showSplash}
        splashProgress={splashProgress}
        showSnowEffect={showSnowEffect}
      />
      
      {/* Seamless Wallpaper Ice Cream Pattern with fine-line neon glow and soft focus blur */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-ice-cream-pattern opacity-[0.35] dark:opacity-[0.2] filter blur-[1px] md:blur-[1.5px] transition-all duration-700" />
      
      {/* Light falling snow particle overlay shower (triggers for 3 seconds after loading completes) */}
      {showSnowEffect && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => {
            const size = Math.random() * 5 + 3; // 3px to 8px particles
            const left = Math.random() * 100; // 0% to 100% width
            const duration = Math.random() * 1.5 + 1.2; // 1.2s to 2.7s fall time
            const delay = Math.random() * 0.4; // staggered start delay
            const opacity = Math.random() * 0.6 + 0.4; // varied opacity for depth
            return (
              <motion.div
                key={i}
                className="absolute bg-sky-200/60 dark:bg-sky-100/70 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{
                  width: size,
                  height: size,
                  left: `${left}%`,
                  top: -20,
                  opacity: opacity,
                }}
                animate={{
                  y: "105vh",
                  x: [0, Math.random() * 40 - 20, Math.random() * 40 - 20],
                }}
                transition={{
                  duration: duration,
                  delay: delay,
                  ease: "linear",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Dynamic Navbar */}
      <nav id="app-navbar" className="sticky top-0 z-30 border-b border-gray-100 bg-white dark:border-zinc-900 dark:bg-[#121212] transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2 sm:py-3">
          
          {/* Logo & Shop Name */}
          <div className="flex items-center gap-2 sm:gap-3 select-none">
            <motion.div
              className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-400 via-brand-500 to-indigo-600 text-white shadow-md relative overflow-hidden cursor-pointer"
              whileHover={{ scale: 1.15, rotate: [0, -10, 10, -10, 0] }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                <IceCream className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.5]" />
              </motion.div>
              <motion.span 
                className="absolute top-0.5 right-0.5 text-[6px] sm:text-[8px]"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                ✨
              </motion.span>
            </motion.div>
            <div>
              <div className="flex items-center gap-1">
                <motion.h1 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="font-sans text-sm sm:text-base font-black tracking-widest text-gray-900 dark:text-white uppercase leading-none"
                >
                  PIPE <span className="font-medium text-[9px] sm:text-[11px] tracking-wider text-gray-400 dark:text-zinc-500 ml-0.5">ICE CREAM</span>
                </motion.h1>
              </div>
              {isAdminMode ? (
                <span className="text-[7px] sm:text-[8px] text-brand-600 dark:text-brand-400 font-bold tracking-widest uppercase block mt-0.5 sm:mt-1 animate-pulse">
                  SISTEMA DE GESTIÓN
                </span>
              ) : (
                <span className="text-[8px] sm:text-[9px] text-brand-600 dark:text-brand-400 font-extrabold tracking-wide uppercase block mt-0.5">
                  Catálogo en tiempo real
                </span>
              )}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Connection Status Indicator - Minimalist Dots */}
            {shopConfig.syncEnabled === false ? (
              <div className="inline-flex items-center gap-0.5 px-2 py-1 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-900/30">
                <span className="h-1 w-1 sm:h-1 sm:w-1 rounded-full bg-rose-500 animate-pulse" />
              </div>
            ) : isOnline ? (
              <div className="inline-flex items-center gap-0.5 px-2 py-1 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30">
                <span className="h-1 w-1 sm:h-1 sm:w-1 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-0.5 px-2 py-1 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-900/30 animate-pulse">
                <span className="h-1 w-1 sm:h-1 sm:w-1 rounded-full bg-amber-500" />
              </div>
            )}
            
            {/* Mode Switcher - Accessible on all screen sizes with smooth micro-interactions */}
            <motion.button
              id="mode-toggle-btn"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`items-center gap-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-850 transition-all shadow-sm cursor-pointer ${isAdminMode ? 'inline-flex' : 'hidden lg:inline-flex'}`}
              title={isAdminMode ? "Volver al Catálogo" : "Control de Administrador"}
            >
              {isAdminMode ? (
                <>
                  <Store className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  <span className="hidden xs:inline">Catálogo</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  <span className="hidden xs:inline">Admin</span>
                </>
              )}
            </motion.button>

            {/* Dark/Light Mode toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-all"
              title="Cambiar Tema"
            >
              {darkMode ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3" />}
            </button>

          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main id="main-catalog" className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {isAdminMode ? (
            /* ADMIN DASHBOARD VIEW */
            <motion.div
              key="admin-dashboard-view"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ErrorBoundary>
                <Suspense fallback={<AdminPanelSkeleton />}>
                  <AdminPanel
                    products={products}
                    sales={sales}
                    shopConfig={shopConfig}
                    onUpdateProducts={handleUpdateProducts}
                    onUpdateSales={handleUpdateSales}
                    clearSalesData={clearSalesData}
                    onUpdateConfig={handleUpdateConfig}
                    onExitAdmin={() => setIsAdminMode(false)}
                    onRefreshData={() => fetchProductsAndSales(true)}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          ) : (
            /* CLIENT CATALOG VIEW WITH COMPACT HERO & STAGGER ANIMATIONS */
            <motion.div 
              key="client-catalog-view"
              className="mx-auto max-w-7xl px-6 py-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
            {/* Real-time Weather & Clock Widget */}
            <WeatherClockWidget shopConfig={shopConfig} />
            
            {/* Elegant Hero Welcome with Beautiful High-Fidelity Animations */}
            <motion.div 
              className="text-center max-w-3xl mx-auto mb-8 relative p-6 rounded-3xl bg-white dark:bg-[#121212] border border-gray-100/80 dark:border-zinc-800/80 shadow-md overflow-hidden"
              variants={heroVariants}
            >
              {/* Floating decorative elements (animated only on desktop/tablets to prevent battery drain and scroll lag on mobile) */}
              <div className="absolute top-2 left-6 text-2xl opacity-20 md:animate-pulse select-none">🍧</div>
              <div className="absolute bottom-4 right-8 text-2xl opacity-20 md:animate-bounce select-none" style={{ animationDuration: '3s' }}>🍦</div>
              <div className="absolute top-4 right-12 text-xl opacity-30 md:animate-spin select-none" style={{ animationDuration: '8s' }}>❄️</div>
 
              <motion.div 
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 dark:bg-zinc-950 px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-brand-800 dark:text-brand-400 mb-4 border border-brand-200 dark:border-zinc-850 shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500 md:animate-spin" style={{ animationDuration: '4s' }} />
                <span>
                  {(shopConfig.metodoOrdenar || "")
                    .replace(/distribuidor oficial pureza & calidad/gi, "")
                    .replace(/Distribuidor oficial Pureza & Calidad/gi, "")
                    .replace(/• Cali, CO/gi, "")
                    .replace(/• Cali/gi, "")
                    .replace(/•/gi, "")
                    .trim() || "Atención rápida y pedidos sencillos"}
                </span>
              </motion.div>
 
              <motion.h2 
                className="font-sans text-xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Sabor Puro y <span className="bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-amber-400">Frescura Excepcional</span> ✨
              </motion.h2>
 
              <motion.p 
                className="mt-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Descubre tus sabores favoritos y realiza tu pedido de forma rápida y sencilla.
              </motion.p>

              {/* Helado del Día (Galleta de la suerte) - Ultra-minimalist and integrated */}
              {(heladoDelDia || loadingHelado) && (
                <motion.div
                  className="mt-3 mx-auto max-w-lg bg-amber-500/[0.04] dark:bg-amber-500/[0.03] border border-amber-500/15 dark:border-amber-500/10 rounded-xl px-3 py-1.5 relative flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left transition-all"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 120 }}
                >
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start w-full sm:w-auto">
                    <span className="text-xs shrink-0">🥠</span>
                    {loadingHelado ? (
                      <div className="flex items-center gap-1 py-0.5">
                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    ) : (
                      <p className="text-[10px] font-medium italic text-amber-850 dark:text-amber-200 leading-relaxed">
                        “{heladoDelDia}”
                      </p>
                    )}
                  </div>
                  
                  {!loadingHelado && (
                    <button
                      onClick={fetchHeladoDelDia}
                      className="text-[8px] shrink-0 font-extrabold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80 hover:text-amber-950 dark:hover:text-amber-200 transition-colors cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded-md"
                      title="Abrir otra galleta"
                    >
                      Abrir otra
                    </button>
                  )}
                </motion.div>
              )}
 
              <motion.div 
                className="mt-5 flex justify-center gap-4 text-[9px] font-extrabold text-gray-400 dark:text-zinc-500 tracking-wider uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span>🧊 Siempre Frescos</span>
                <span>•</span>
                <span>🍦 Amplia variedad de sabores</span>
                <span>•</span>
                <span>💬 Atención Directa</span>
              </motion.div>
            </motion.div>

            {/* Minimalist Search & Filter Panel (Solid 100% Opaque Block) */}
            <motion.div 
              className="mb-4 flex flex-col gap-1 bg-white dark:bg-[#121212] p-1.5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-sm"
              variants={searchVariants}
            >
              {/* Search input */}
              <div className="w-full relative">
                <input
                  type="text"
                  placeholder="Buscar sabor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-16 py-2 rounded-xl border border-gray-200 dark:border-zinc-850 bg-gray-50 dark:bg-zinc-950 text-sm outline-none focus:border-brand-500 dark:focus:border-brand-500 transition-all dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wide px-2 py-1"
                  >
                    Borrar
                  </button>
                )}
              </div>

              {/* Filter Chips & Tutorial Button */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                {!shopConfig?.hideOutOfStock && (
                  <>
                    <button
                      onClick={() => setFilterType("todos")}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-center ${
                        filterType === "todos"
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750"
                      }`}
                    >
                      Todos ({products.length})
                    </button>
                    <button
                      onClick={() => setFilterType("disponibles")}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-center ${
                        filterType === "disponibles"
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750"
                      }`}
                    >
                      Disponibles ({products.filter((p) => p.stock > 0).length})
                    </button>
                    <button
                      onClick={() => setFilterType("agotados")}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-center ${
                        filterType === "agotados"
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750"
                      }`}
                    >
                      Agotados ({products.filter((p) => p.stock === 0).length})
                    </button>
                  </>
                )}

                {/* Quick Guide Button - Only visible if tutorial has NOT been completed */}
                {!hasSeenTutorialState && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowTutorial(true);
                    }}
                    className="flex items-center justify-center p-2 rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 dark:bg-zinc-900 dark:text-sky-400 dark:border-zinc-800 transition-all cursor-pointer shadow-sm"
                    title="¿Cómo realizar un pedido?"
                  >
                    <HelpCircle className="h-4 w-4 text-sky-500" />
                    <span className="ml-1.5">Guía</span>
                  </button>
                )}
              </div>
            </motion.div>
 
            {shopConfig.catalogModeEnabled && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-400 flex flex-col sm:flex-row items-center gap-4 shadow-sm"
              >
                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="h-6 w-6 stroke-[1.75] animate-bounce" />
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="font-sans font-black text-sm uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    SABORIFICACIÓN EN MANTENIMIENTO (SÓLO CATÁLOGO)
                  </h4>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium leading-relaxed">
                    {shopConfig.catalogModeMessage || "SABORIFICACIÓN EN MANTENIMIENTO (SÓLO CATÁLOGO)\nSincronización pausada por el Administrador."}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Product Cards Grid - Refined columns for better responsive fit */}
            {filteredProducts.length === 0 ? (
              <motion.div 
                className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-8"
                variants={cardVariants}
              >
                <p className="text-sm text-gray-400 dark:text-zinc-500 font-bold uppercase">No se encontraron sabores</p>
                <button
                  onClick={() => { setSearchQuery(""); setFilterType("todos"); }}
                  className="mt-4 px-6 py-2.5 text-xs font-bold uppercase tracking-widest bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
                >
                  Restablecer
                </button>
              </motion.div>
            ) : (
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8"
                variants={gridContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        cartQty={cart.find((c) => c.product.id === product.id)?.cantidad || 0}
                        catalogModeEnabled={shopConfig.catalogModeEnabled}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-6 pb-12 md:pb-8 text-center text-[10px] font-medium tracking-wide uppercase text-gray-400 dark:border-zinc-900 dark:bg-zinc-950">
        <p>© 2026 {shopConfig.tiendaNombre} — Todos los derechos reservados.</p>
        <p className="mt-1.5 text-[10px] text-brand-600 dark:text-brand-400 font-extrabold tracking-wide">
          Catálogo sincronizado en tiempo real
        </p>
      </footer>

      {/* Cart Panel Sidebar Drawer */}
      <Suspense fallback={null}>
        <CartPanel
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cart}
          onUpdateCantidad={handleUpdateCantidad}
          onRemoveFromCart={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onRegisterSale={handleRegisterSale}
          shopConfig={shopConfig}
          products={products}
          nextOrderId={`ORD-${String(sales.reduce((max, s) => {
            let num = 0;
            if (s.id && s.id.startsWith("ORD-")) {
              num = parseInt(s.id.split("-")[1], 10);
              if (isNaN(num)) num = 0;
            }
            if (s.numero_orden) num = Math.max(num, s.numero_orden);
            return Math.max(max, num);
          }, 0) + 1).padStart(6, '0')}`}
        />
      </Suspense>

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="flex items-center gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.15)] pointer-events-auto"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-zinc-100 pr-2">
              {toastMessage}
            </p>
          </motion.div>
        </div>
      )}

      {/* Onboarding Tutorial Modal */}
      <InteractiveOnboardingTutorial
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
        shopName={shopConfig.tiendaNombre}
        whatsappNumber={shopConfig.whatsappNumero}
      />

      {/* Fly-To-Cart Parabolic Trajectory Animation Overlay */}
      <FlyToCartOverlay
        particles={flyingParticles}
        onParticleComplete={handleParticleComplete}
      />

      {/* FLOATING BOTTOM CART BAR (GLASSMORPHISM BOTTOM SHEET) */}
      {!showSplash && !isAdminMode && (
        <div id="app-navbar" className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md pointer-events-none">
          <motion.div 
            initial={{ y: 80, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 16, stiffness: 120, mass: 1.1 }}
            className="mx-auto bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md rounded-3xl sm:rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.18)] border border-white/40 dark:border-zinc-800/80 p-2 sm:p-2.5 flex items-center justify-between pointer-events-auto ring-1 ring-black/5 gap-2 transform-gpu"
          >
            {/* Target Cart Icon with Squash & Stretch elastic spring animation */}
            <div className="flex items-center gap-2.5 pl-1.5 sm:pl-2">
              <motion.button
                id="cart-icon-target"
                type="button"
                onClick={() => setIsCartOpen(true)}
                animate={
                  isCartBouncing || shakeCart
                    ? {
                        scale: [1, 1.45, 0.75, 1.25, 0.9, 1],
                        rotate: [0, -16, 16, -8, 4, 0],
                      }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.6, ease: "easeInOut" }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.08 }}
                className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30 cursor-pointer shrink-0"
              >
                <ShoppingCart className="h-6 w-6 text-white stroke-[2.2]" />

                {/* Pop-up Animated Product Count Badge */}
                <AnimatePresence mode="popLayout">
                  {totalCartCount > 0 && (
                    <motion.span 
                      key={`cart-badge-${totalCartCount}`}
                      initial={{ scale: 0.3 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full min-w-[22px] h-[22px] text-[10px] flex items-center justify-center font-black font-sans ring-2 ring-white dark:ring-zinc-950 shadow-md px-1"
                    >
                      {totalCartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Cart Summary Details */}
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-zinc-500">
                  {totalCartCount === 1 ? "1 Helado" : `${totalCartCount} Helados`}
                </span>
                <motion.span
                  key={cart.reduce((sum, item) => sum + item.product.precio * item.cantidad, 0)}
                  initial={{ opacity: 0.7, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight"
                >
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(cart.reduce((sum, item) => sum + item.product.precio * item.cantidad, 0))}
                </motion.span>
              </div>
            </div>

            {/* Action Buttons: Guía + Ver Carrito */}
            <div className="flex items-center gap-1.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowTutorial(true)}
                className="hidden xs:flex items-center justify-center h-10 w-10 rounded-2xl bg-gray-100 dark:bg-zinc-850 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Guía de pedido"
              >
                <HelpCircle className="h-4 w-4" />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => setIsCartOpen(true)}
                className="px-4 sm:px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-black text-[11px] uppercase tracking-wider shadow-md shadow-brand-600/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Ver Carrito</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Layout Bottom Padding (Avoid overlap) */}
      {!isAdminMode && <div className="h-28" />}
      
    </div>
  );
}
