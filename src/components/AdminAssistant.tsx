import React, { useState, useRef, useEffect } from "react";
import { Product, ShopConfig, ChatMessage } from "../types";
import { X, Send, Brain, TrendingUp, AlertTriangle, Lightbulb, BarChart3, RotateCcw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface AdminAssistantProps {
  products: Product[];
  shopConfig: ShopConfig;
}

export const AdminAssistant: React.FC<AdminAssistantProps> = ({ products, shopConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "admin-welcome",
      role: "model",
      text: `💼 **Centro de Análisis de Negocios IA**

Bienvenido al Panel de Control Inteligente de **${shopConfig.tiendaNombre}**. Como tu Analista de Negocio, tengo acceso en tiempo real a tu inventario, costos, ventas registradas y métricas de rentabilidad.

¿En qué área del negocio deseas enfocar nuestro análisis hoy? Puedes hacerme preguntas libres o seleccionar uno de los diagnósticos predeterminados.`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: "admin-user-" + Date.now(),
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => m.id !== "admin-welcome")
        .slice(-8)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const adminPassword = sessionStorage.getItem("admin_password") || shopConfig.contrasenaAdmin || "";

      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": adminPassword,
        },
        body: JSON.stringify({
          message: userMsg.text,
          history: chatHistory,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No autorizado: La contraseña de administrador en caché es inválida.");
        }
        throw new Error("El servidor de análisis no responde.");
      }

      const data = await response.json();

      const botMsg: ChatMessage = {
        id: "admin-bot-" + Date.now(),
        role: "model",
        text: data.text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error("Admin Assistant Error:", error);
      const errorMsg: ChatMessage = {
        id: "admin-error-" + Date.now(),
        role: "model",
        text: `❌ **Error de Conexión o Autorización**\n\nNo se pudo completar el análisis estratégico.\n\n*Detalle del inconveniente:* ${error.message || "Error desconocido en el servidor de IA"}.\n\nPor favor, verifica que tu sesión de administrador continúe activa o inténtalo de nuevo en unos momentos.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const handleSuggestionClick = (queryText: string) => {
    handleSendMessage(queryText);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "admin-welcome",
        role: "model",
        text: `💼 **Centro de Análisis de Negocios IA**\n\nHistorial restablecido. Estoy listo para una nueva sesión de diagnóstico estratégico para **${shopConfig.tiendaNombre}**. ¿Qué aspecto de la operación deseas que auditemos?`,
        timestamp: new Date(),
      },
    ]);
  };

  const suggestions = [
    {
      label: "Bases Leche vs Agua",
      icon: <Sparkles className="h-3.5 w-3.5 text-pink-400" />,
      text: "Dame un informe detallado sobre los sabores más vendidos. Clasifícalos por su base (leche o agua), analiza cuál base es más popular y más rentable, y qué sugerencias operativas tienes al respecto.",
      desc: "Análisis de preferencia y rentabilidad entre helados cremosos y frutales refrescantes.",
      color: "from-pink-500/10 to-transparent border-pink-500/20 text-pink-300 hover:border-pink-500/40 hover:shadow-pink-500/5",
    },
    {
      label: "Márgenes & Utilidad",
      icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />,
      text: "Dame un informe analítico sobre la rentabilidad del negocio, márgenes de ganancia por producto y áreas de optimización.",
      desc: "Auditoría de rentabilidad de neveras, costos de producción y rentabilidad neta.",
      color: "from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-300 hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    },
    {
      label: "Auditoría de Stock",
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
      text: "Analiza el stock actual. ¿Cuáles sabores corren riesgo de agotarse y cuántas unidades recomiendas reabastecer?",
      desc: "Detección de productos de baja existencia en nevera y órdenes de producción sugeridas.",
      color: "from-amber-500/10 to-transparent border-amber-500/20 text-amber-300 hover:border-amber-500/40 hover:shadow-amber-500/5",
    },
    {
      label: "Estrategia de Precios",
      icon: <Lightbulb className="h-3.5 w-3.5 text-sky-400" />,
      text: "Basado en los costos de producción y precios de venta actuales, ¿qué ajustes de precios o combos estratégicos sugieres?",
      desc: "Ideas de combos estratégicos, promociones del mes y optimización de tarifas de salida.",
      color: "from-sky-500/10 to-transparent border-sky-500/20 text-sky-300 hover:border-sky-500/40 hover:shadow-sky-500/5",
    },
    {
      label: "Desempeño de Ventas",
      icon: <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />,
      text: "Haz un resumen ejecutivo del desempeño de ventas, volumen de pedidos y métodos de pago más rentables.",
      desc: "Resumen gerencial de facturación real, medios de pago preferidos y volúmenes.",
      color: "from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-300 hover:border-indigo-500/40 hover:shadow-indigo-500/5",
    },
  ];

  // Helper to format text with standard bold/italic/newlines since we want it readable without full markdown renderer
  const formatMessageText = (text: string) => {
    return text.split("\n").map((line, i) => {
      let formattedLine = line;
      
      // Replace headings (e.g. ### Title or **Title**)
      if (formattedLine.startsWith("###")) {
        return <h4 key={i} className="font-sans font-black text-xs uppercase tracking-wider text-slate-100 mt-3 mb-1.5">{formattedLine.replace(/###/g, "").trim()}</h4>;
      }
      
      // Bullet list items
      const isBullet = formattedLine.startsWith("-") || formattedLine.startsWith("*");
      if (isBullet) {
        const cleanContent = formattedLine.replace(/^[-*]\s*/, "");
        return (
          <li key={i} className="ml-4 list-disc text-[11px] text-slate-300 leading-relaxed py-0.5">
            {parseInlineMarkdown(cleanContent)}
          </li>
        );
      }

      return (
        <p key={i} className={`text-[11.5px] leading-relaxed text-slate-300 ${line.trim() === "" ? "h-2" : "mb-2"}`}>
          {parseInlineMarkdown(formattedLine)}
        </p>
      );
    });
  };

  // Safe inline regex-free parser for bold text (**bold**)
  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      // Handle simple italic (*italic*)
      const italicParts = part.split(/(\*.*?\*)/g);
      return italicParts.map((subPart, subIndex) => {
        if (subPart.startsWith("*") && subPart.endsWith("*")) {
          return <em key={subIndex} className="italic text-slate-400">{subPart.slice(1, -1)}</em>;
        }
        return subPart;
      });
    });
  };

  return (
    <>
      {/* PROFESSIONAL ADMIN FLOATING BUTTON */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 flex flex-col items-center justify-center rounded-full bg-slate-900 hover:bg-slate-850 text-white shadow-2xl hover:scale-105 active:scale-95 border border-slate-700 transition-all duration-200 cursor-pointer relative group"
            title="Analista IA de Negocio"
          >
            <Brain className="h-6 w-6 text-emerald-400 animate-pulse group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="absolute right-16 bg-slate-950 text-[8px] font-bold uppercase tracking-wider text-slate-300 px-2 py-1 rounded border border-slate-800 shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Analista IA de Negocio
            </div>
          </button>
        </div>
      )}

      {/* CHAT INTERFACE WINDOW */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-[420px] h-[580px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-sans font-black text-xs uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                  Analista Administrativo IA
                  <span className="text-[7px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Online
                  </span>
                </h3>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono mt-0.5">
                  PIPE ICE CREAM • Cali, CO
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Limpiar Conversación"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Cerrar Analista"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Logs Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gradient-to-b from-slate-950 to-slate-900">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-xs shadow-sm font-sans leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-none border border-emerald-500"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-[11.5px] leading-relaxed break-words font-semibold">{m.text}</p>
                  ) : (
                    <div className="space-y-1">{formatMessageText(m.text)}</div>
                  )}
                  <span className="block text-[8px] text-slate-500 font-mono mt-2 text-right">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 rounded-xl rounded-bl-none px-4 py-3 shadow-sm max-w-[85%] flex items-center gap-3">
                  <div className="flex space-x-1">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    IA Analizando base de datos...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Panel de Consultas Rápidas Desplegable */}
          <div className="border-t border-slate-850 bg-slate-950/80 backdrop-blur-md px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
              className="flex items-center justify-between w-full text-left py-0.5 hover:text-white text-slate-400 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-300">
                  Panel de Consultas IA
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 hover:bg-slate-850 transition-colors">
                <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">
                  {isSuggestionsExpanded ? "Ocultar" : "Mostrar Consultas"}
                </span>
                {isSuggestionsExpanded ? (
                  <ChevronUp className="h-3 w-3 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                )}
              </div>
            </button>

            {isSuggestionsExpanded && (
              <div className="grid grid-cols-1 gap-2 mt-2.5 max-h-[160px] overflow-y-auto no-scrollbar pt-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.text)}
                    disabled={isLoading}
                    className={`group text-left p-2.5 rounded-xl border bg-gradient-to-br ${s.color} hover:bg-slate-900/40 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] flex flex-col gap-0.5 shadow-sm hover:-translate-y-[0.5px]`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-slate-950 border border-slate-850 group-hover:bg-slate-900 transition-colors">
                        {s.icon}
                      </div>
                      <span className="font-sans font-extrabold text-[10px] uppercase tracking-wider text-slate-200 group-hover:text-white transition-colors">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[9px] leading-snug text-slate-400 group-hover:text-slate-300 transition-colors pl-0.5">
                      {s.desc}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Form Bar */}
          <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder="Pregúntale al Analista IA sobre el negocio..."
              className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none placeholder-slate-500 transition-all font-sans disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl px-3.5 flex items-center justify-center border border-emerald-500/50 disabled:border-transparent transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
