import React, { useState, useRef, useEffect } from "react";
import { Product, ChatMessage, ShopConfig } from "../types";
import { MessageSquare, X, Send, Sparkles, HelpCircle, Heart } from "lucide-react";

interface AiChatbotProps {
  products: Product[];
  shopConfig: ShopConfig;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export const AiChatbot: React.FC<AiChatbotProps> = ({ 
  products, 
  shopConfig,
  isOpen: externalIsOpen,
  onToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onToggle) onToggle(val);
    else setInternalIsOpen(val);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: `¡Hola! Soy el asistente inteligente de ${shopConfig.tiendaNombre}. 🍧 ¿En qué heladito estás interesado hoy? Puedo indicarte los precios, la disponibilidad y los sabores en stock.`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMsg.text,
          history: chatHistory,
          catalog: products,
          config: shopConfig,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat server unreachable");
      }

      const data = await response.json();
      
      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        role: "model",
        text: data.text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      // Fallback response with beautiful, non-technical support text
      const errorMsg: ChatMessage = {
        id: "error-" + Date.now(),
        role: "model",
        text: "¡Hola! Para brindarte la respuesta más rápida y directa sobre existencias y pedidos, te invitamos a escribirnos por nuestros canales de contacto. ¡Estamos listos para atenderte!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    {
      id: "catalog",
      label: "🍧 Sabores y Stock",
      icon: <Sparkles className="h-3 w-3" />,
      queries: [
        { label: "Sabores disponibles hoy", text: "¿Qué sabores hay disponibles hoy?" },
        { label: "Diferencia Agua vs Leche", text: "¿Cuáles sabores son base Leche y cuáles son base Agua?" },
        { label: "Todos los sabores", text: "Muéstrame la lista completa de sabores que vendes" }
      ]
    },
    {
      id: "payments",
      label: "💳 Pagos y Precios",
      icon: <HelpCircle className="h-3 w-3" />,
      queries: [
        { label: "Precios actuales", text: "¿Cuáles son los precios?" },
        { label: "Datos de Pago (Nequi)", text: "¿Cómo puedo pagar mi pedido y cuáles son los datos de transferencia?" },
        { label: "¿Por qué no hay tarjetas?", text: "¿Por qué no tienes pasarela de pago?" }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // FULL-STACK SERVER CHATBOT INTERACTIVE VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end md:flex">
      {isOpen && (
        <div className="mb-4 flex h-[500px] max-h-[80vh] w-[320px] max-w-[calc(100vw-2rem)] sm:w-[400px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 dark:bg-zinc-950 dark:border-zinc-900 transition-all duration-300 transform scale-100 origin-bottom-right">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-600 px-6 py-5 text-white dark:bg-zinc-900 border-b border-brand-700/20 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <Sparkles className="h-5 w-5 text-brand-100" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-brand-600 dark:border-zinc-900 animate-pulse"></div>
              </div>
              <div>
                <h4 className="font-sans text-xs font-black uppercase tracking-widest leading-none mb-1">Asistente de Sabores</h4>
                <span className="text-[10px] text-brand-100 dark:text-zinc-500 font-medium tracking-tight">Inteligencia Ice Cream • En línea</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-2 text-brand-200 hover:bg-brand-700 hover:text-white dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-5 dark:bg-zinc-900/40 space-y-5 scrollbar-none">
            {messages.map((m) => {
              const isUser = m.role === "user";

              return (
                <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-[11px] font-medium leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-white border border-gray-200 text-slate-800 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 rounded-tr-none self-end"
                        : "bg-brand-50 text-brand-900 dark:bg-zinc-800/80 dark:text-zinc-100 rounded-tl-none border border-brand-100/50 dark:border-zinc-700/50"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1.5 px-2 font-mono uppercase tracking-tighter opacity-60">
                    {m.timestamp.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-tl-none bg-brand-50/50 border border-brand-100/30 px-5 py-4 dark:bg-zinc-800/50 dark:border-zinc-800 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Collapsible Bento Menu */}
          <div className="border-t border-gray-100 bg-white dark:bg-zinc-950 dark:border-zinc-900 flex flex-col shrink-0">
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Consultas Frecuentes</span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="text-[10px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 hover:opacity-80 transition-opacity"
                >
                  {showSuggestions ? "Ocultar menú ▾" : "Ver menú ▴"}
                </button>
              </div>

              {showSuggestions && (
                <div className="grid grid-cols-2 gap-1.5 pb-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="border border-slate-100 dark:border-zinc-900 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                          activeCategory === cat.id 
                            ? "bg-brand-50 text-brand-700 dark:bg-zinc-900 dark:text-brand-400" 
                            : "bg-slate-50 text-slate-600 dark:bg-zinc-900/40 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {cat.icon}
                          {cat.label}
                        </div>
                      </button>
                      
                      {activeCategory === cat.id && (
                        <div className="bg-white dark:bg-zinc-950 p-2 grid grid-cols-1 gap-1 border-t border-slate-100 dark:border-zinc-900 w-full shadow-lg rounded-t-xl">
                          {cat.queries.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                handleSendMessage(q.text);
                                if (window.innerWidth < 640) setShowSuggestions(false);
                                setActiveCategory(null);
                              }}
                              className="w-full text-left px-3 py-2 text-[10px] text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg transition-colors flex items-center gap-2 group"
                            >
                              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 group-hover:bg-brand-500 transition-colors"></div>
                              {q.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input Form Footer */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-3 border-t border-gray-100 bg-white px-5 py-4 dark:bg-zinc-950 dark:border-zinc-900"
          >
            <div className="flex-1 flex items-center bg-slate-100 dark:bg-zinc-900 rounded-2xl px-4 py-2.5 focus-within:ring-2 ring-brand-500/20 transition-all">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Hazme una pregunta..."
                className="flex-1 text-[11px] bg-transparent outline-none text-slate-600 dark:text-gray-300 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>

        </div>
      )}

      {/* Toggle button - Visible on all devices */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:scale-105 active:scale-95 dark:bg-brand-600 dark:text-white transition-all duration-200"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
};
