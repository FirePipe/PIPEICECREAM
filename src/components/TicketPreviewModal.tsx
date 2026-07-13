import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Printer, Loader2, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatCOP } from '../lib/utils';
import { Sale } from '../types';

interface TicketPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture?: (base64: string) => void;
  saleId: string | null;
  sale?: Sale | null; // Venta completa opcional para renderizado inmediato
  adminPassword?: string;
  isInline?: boolean;
  shopConfig?: any;
}

export const TicketPreviewModal: React.FC<TicketPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  onCapture,
  saleId,
  sale: propSale,
  adminPassword,
  isInline = false,
  shopConfig
}) => {
  const [loadingImage, setLoadingImage] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [currentSale, setCurrentSale] = React.useState<Sale | null>(propSale || null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const ticketRef = React.useRef<HTMLDivElement>(null);

  // Sincronizar la prop de venta si cambia
  React.useEffect(() => {
    if (propSale) {
      setCurrentSale(propSale);
    }
  }, [propSale]);

  // Si no se pasó la venta por prop pero tenemos saleId, podemos intentar buscarla en el backend o de manera local
  React.useEffect(() => {
    if (isOpen && saleId) {
      if (!currentSale) {
        fetchSaleData();
      }
    } else {
      if (imageUrl) {
        setImageUrl(null);
      }
      setLoadingImage(false);
      setImageError(null);
    }
  }, [isOpen, saleId]);

  // Regenerar o generar la imagen del ticket en el cliente cuando los datos estén listos
  React.useEffect(() => {
    if (isOpen && currentSale) {
      // Pequeño delay para asegurar que el DOM del ticket se renderizó por completo
      const timer = setTimeout(() => {
        triggerClientSideImageGeneration();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentSale]);

  const fetchSaleData = async () => {
    try {
      const response = await fetch('/api/db', {
        headers: {
          'x-admin-password': adminPassword || ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        const found = data.sales?.find((s: any) => s.id === saleId);
        if (found) {
          setCurrentSale(found);
        }
      }
    } catch (err) {
      console.error('Error fetching sale data for ticket:', err);
    }
  };

  const triggerClientSideImageGeneration = async () => {
    const node = ticketRef.current;
    if (!node) {
      console.warn('Elemento ticketRef no se encuentra en el DOM aún.');
      return;
    }
    try {
      setLoadingImage(true);
      setImageError(null);

      // Generar un PNG de alta definición (2x pixel ratio para que sea súper nítido)
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          borderRadius: '0',
        },
        pixelRatio: 1.5,
        cacheBust: true,
        skipFonts: true,
        styleSheetFilter: (sheet) => {
          try {
            return !sheet.href || sheet.href.startsWith(window.location.origin);
          } catch (e) {
            return false;
          }
        },
      } as any);

      setImageUrl(dataUrl);
      if (onCapture) {
        onCapture(dataUrl);
      }
    } catch (err: any) {
      console.warn('Error al generar la imagen del ticket en el cliente:', err);
      setImageError('No se pudo preprocesar la imagen del ticket en el navegador.');
    } finally {
      setLoadingImage(false);
    }
  };

  const handleDownload = async () => {
    let activeUrl = imageUrl;
    
    // Si la imagen de caché del cliente aún no se ha generado, la generamos bajo demanda
    if (!activeUrl) {
      try {
        setIsDownloading(true);
        const node = ticketRef.current;
        if (node) {
          activeUrl = await toPng(node, {
            backgroundColor: '#ffffff',
            style: { transform: 'scale(1)', borderRadius: '0' },
            pixelRatio: 2,
            cacheBust: true,
            skipFonts: true,
            styleSheetFilter: (sheet) => {
              try {
                return !sheet.href || sheet.href.startsWith(window.location.origin);
              } catch (e) {
                return false;
              }
            },
          } as any);
          setImageUrl(activeUrl);
        }
      } catch (err) {
        console.error('Error generando descarga directa:', err);
      } finally {
        setIsDownloading(false);
      }
    }

    if (activeUrl) {
      const link = document.createElement('a');
      link.href = activeUrl;
      link.download = `ticket-${saleId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('La imagen del ticket se está construyendo. Por favor intente en un segundo.');
    }
  };

  const handleShare = async () => {
    let activeUrl = imageUrl;

    if (!activeUrl) {
      // Intentar generar de inmediato
      const node = ticketRef.current;
      if (node) {
        try {
          activeUrl = await toPng(node, {
            backgroundColor: '#ffffff',
            style: { transform: 'scale(1)', borderRadius: '0' },
            pixelRatio: 2,
            cacheBust: true,
            skipFonts: true,
            styleSheetFilter: (sheet) => {
              try {
                return !sheet.href || sheet.href.startsWith(window.location.origin);
              } catch (e) {
                return false;
              }
            },
          } as any);
          setImageUrl(activeUrl);
        } catch (err) {
          console.error(err);
        }
      }
    }

    if (!activeUrl) {
      handleDownload();
      return;
    }

    try {
      const response = await fetch(activeUrl);
      const blob = await response.blob();
      const file = new File([blob], `ticket-${saleId}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Ticket Digital Pipe Ice Cream',
          text: `Ticket de la orden #${saleId?.replace('ORD-', '')}`
        });
      } else {
        handleDownload();
      }
    } catch (err) {
      console.error('Error sharing:', err);
      handleDownload();
    }
  };

  // Función de impresión impecable nativa
  const handlePrint = () => {
    if (!currentSale) return;
    
    const ticketHtml = document.getElementById('ticket-print-source')?.innerHTML;
    if (!ticketHtml) return;

    const printWindow = window.open('', '', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket #${currentSale.id.replace('ORD-', '')}</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Roboto Mono', monospace;
                padding: 20px;
                background-color: white;
                color: black;
              }
              .ticket-card {
                max-width: 400px;
                margin: 0 auto;
                padding: 15px;
              }
              .header { text-align: center; margin-bottom: 15px; }
              .brand { font-size: 18px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
              .slogan { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
              .phone-line { font-size: 11px; margin-top: 4px; }
              .divider-dashed { border-top: 1px dashed #000; margin: 12px 0; }
              .divider-solid { border-top: 2px solid #000; margin: 12px 0; }
              .data-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; }
              .label { color: #555; font-weight: 500; }
              .value { font-weight: 700; text-align: right; }
              .badge { border: 1px solid #000; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
              .section-title { font-size: 11px; font-weight: 700; text-align: center; margin: 15px 0 8px 0; text-transform: uppercase; }
              .item-line { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
              .item-qty-name { font-weight: 500; }
              .item-total { font-weight: 700; }
              .total-box { text-align: center; margin: 18px 0; }
              .total-label { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; }
              .total-val { font-size: 26px; font-weight: 700; margin-top: 4px; }
              .footer { text-align: center; margin-top: 18px; font-size: 10px; color: #555; line-height: 1.4; }
              @media print {
                body { padding: 0; }
                .ticket-card { border: none; max-width: 100%; margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="ticket-card">
              ${ticketHtml}
            </div>
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Mapeo dinámico de colores para estado de orden según Directriz 3 (Pendiente, Aprobado, Entregado, Rechazado, Eliminada)
  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'entregado' || s === 'aprobado') {
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' };
    } else if (s === 'rechazado' || s === 'eliminada') {
      return { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30' };
    }
    return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' };
  };

  // Mapeo dinámico de colores para estado de pago según Directriz 3 (Pendiente, Pagado, Anulado, Rechazado)
  const getPaymentStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'pagado' || s === 'pago aprobado') {
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' };
    } else if (s === 'anulado' || s === 'rechazado') {
      return { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30' };
    }
    return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' };
  };

  const idString = currentSale ? (currentSale.id || '').replace('ORD-', '') || '000000' : '000000';
  const fechaHora = currentSale ? `${currentSale.fecha || 'N/A'} ${currentSale.hora || 'N/A'}` : 'N/A';
  const displayStatusColor = currentSale ? getStatusColor(currentSale.estado || 'Pendiente') : { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };
  const displayPaymentStatusColor = currentSale ? getPaymentStatusColor(currentSale.payment_status || 'Pendiente') : { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };

  // Render del ticket nativo para visualización instantánea y copia para impresión
  const renderInteractiveTicket = () => {
    if (!currentSale) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-4" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Cargando Información del Pedido...
          </p>
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col items-center">
        {/* Ticket Físico/Digital Estilizado (Estilo Papel Térmico) */}
        <div 
          ref={ticketRef}
          id={isInline ? "inline-ticket-view-card" : "modal-ticket-view-card"}
          className="w-full max-w-sm bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-md font-mono text-xs relative overflow-hidden"
        >
          {/* Top decorative jagged edge effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%)] dark:bg-[linear-gradient(45deg,transparent_33.333%,#09090b_33.333%,#09090b_66.667%,transparent_66.667%)] bg-[size:10px_10px]" />
          
          {/* Impresión de contenido crudo (utilizado por el método printWindow) */}
          <div id="ticket-print-source" className="hidden">
            <div className="header">
              <div className="brand">🍦 PIPE ICE CREAM 🍦</div>
              <div className="slogan">Sabor que refresca tu día</div>
              <div className="phone-line">📞 Cel/WhatsApp: +57 318 507 4440</div>
            </div>
            
            <div className="divider-dashed"></div>
            
            <div className="data-row">
              <div className="label">ID PEDIDO:</div>
              <div className="value">#{idString}</div>
            </div>
            <div className="data-row">
              <div className="label">FECHA/HORA:</div>
              <div className="value">{fechaHora}</div>
            </div>
            <div className="data-row">
              <div className="label">ESTADO ORDEN:</div>
              <div className="value">
                <span className="badge">{currentSale.estado || 'PENDIENTE'}</span>
              </div>
            </div>
            
            <div className="divider-dashed"></div>
            
            <div className="data-row">
              <div className="label">CLIENTE:</div>
              <div className="value">{currentSale.clienteNombre || 'N/A'}</div>
            </div>
            <div className="data-row">
              <div className="label">CONTACTO:</div>
              <div className="value">{currentSale.clienteTelefono || 'N/A'}</div>
            </div>
            
            <div className="divider-dashed"></div>
            
            <div className="section-title">🛒 DETALLE DEL PEDIDO:</div>
            {(currentSale.items || []).map((item, index) => (
              <div key={index} className="item-line">
                <div className="item-qty-name">{item.cantidad}x {item.nombre}</div>
                <div className="item-total">{formatCOP(item.precioUnitario * item.cantidad)}</div>
              </div>
            ))}
            
            <div className="divider-dashed"></div>
            
            <div className="data-row">
              <div className="label">MÉTODO DE PAGO:</div>
              <div className="value">{(currentSale.payment_method || 'efectivo').toUpperCase()}</div>
            </div>
            <div className="data-row">
              <div className="label">ESTADO DE PAGO:</div>
              <div className="value">
                <span className="badge">{currentSale.payment_status || 'PENDIENTE'}</span>
              </div>
            </div>
            
            <div className="divider-solid"></div>
            
            <div className="total-box">
              <div className="total-label">TOTAL A PAGAR:</div>
              <div className="total-val">{formatCOP(currentSale.total)} COP</div>
            </div>
            
            <div className="divider-dashed"></div>
            
            <div className="footer">
              <div>¡Gracias por refrescar tu día!</div>
              <div>Refrescando momentos, creando sonrisas.</div>
            </div>
          </div>

          {/* Visualización Interactiva en Pantalla */}
          <div className="text-center space-y-1">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <span>🍦</span> PIPE ICE CREAM <span>🍦</span>
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Sabor que refresca tu día</p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">Cel/WhatsApp: +57 318 507 4440</p>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 my-4" />

          {/* Info del Pedido */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">ID PEDIDO:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">#{idString}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">FECHA:</span>
              <span className="font-mono text-slate-700 dark:text-zinc-300">{fechaHora}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">ESTADO PEDIDO:</span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${displayStatusColor.bg} ${displayStatusColor.text} ${displayStatusColor.border}`}>
                {currentSale.estado || 'PENDIENTE'}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 my-4" />

          {/* Info del Cliente */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-4">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold shrink-0">CLIENTE:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{currentSale.clienteNombre || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">CONTACTO:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">{currentSale.clienteTelefono || 'N/A'}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 my-4" />

          {/* Detalle de Productos */}
          <div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold block mb-2 text-center">🛒 DETALLE DEL PEDIDO</span>
            <div className="space-y-2.5">
              {(currentSale.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.cantidad}x {item.nombre}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {formatCOP(item.precioUnitario)} c/u
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono shrink-0">
                    {formatCOP(item.precioUnitario * item.cantidad)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 my-4" />

          {/* Métodos de Pago */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">MÉTODO PAGO:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {currentSale.payment_method === 'transferencia' ? '💳 Transferencia' : '💵 Efectivo'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">ESTADO PAGO:</span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${displayPaymentStatusColor.bg} ${displayPaymentStatusColor.text} ${displayPaymentStatusColor.border}`}>
                {currentSale.payment_status || 'Pendiente'}
              </span>
            </div>
            {currentSale.payment_method === 'efectivo' && currentSale.payment_with_bill && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">PAGA CON:</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300">{formatCOP(currentSale.payment_with_bill)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase tracking-wider font-bold">CAMBIO:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(currentSale.payment_change || 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t-2 border-slate-300 dark:border-zinc-700 my-4" />

          {/* TOTAL */}
          <div className="text-center py-2 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-inner">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-black block">TOTAL A PAGAR</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-1">
              {formatCOP(currentSale.total)} COP
            </span>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 my-4" />

          {/* Pie de página */}
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">¡Gracias por refrescar tu día!</p>
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 italic">Refrescando momentos, creando sonrisas.</p>
          </div>
        </div>

        {/* Acciones del Ticket */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-5">
          <button
            onClick={handlePrint}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200 dark:border-zinc-700"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200 dark:border-zinc-700"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
        </div>
      </div>
    );
  };

  if (isInline) {
    return renderInteractiveTicket();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🎫</span> Ticket Digital de Compra
              </h3>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col items-center justify-center max-h-[80vh] overflow-y-auto">
              {renderInteractiveTicket()}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-950/50 border-t border-slate-100 dark:border-zinc-800 text-center">
              <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                Pipe Ice Cream • Cali, CO
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
