import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Sale } from '../types';

export const exportSalesToPDF = async (sales: Sale[], shopName: string) => {
  try {
    // We create a temporary hidden div with the sales data styled with Tailwind classes
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '40px';
    container.style.fontFamily = 'sans-serif';
    
    let rowsHtml = '';
    let totalAcumulado = 0;
    
    sales.forEach(sale => {
      if (sale.estado !== 'Eliminada') {
        totalAcumulado += sale.total;
      }
      const orderLabel = sale.numero_orden ? `#${String(sale.numero_orden).padStart(6, '0')}` : sale.id;
      const estadoColor = sale.estado === 'Eliminada' ? '#ef4444' : '#0f172a';
      const isEliminada = sale.estado === 'Eliminada';
      rowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9; ${isEliminada ? 'opacity: 0.5;' : ''}">
          <td style="padding: 12px 8px; font-family: monospace; font-size: 12px; color: ${estadoColor}; font-weight: bold;">${orderLabel}</td>
          <td style="padding: 12px 8px; font-size: 12px; color: #475569;">${sale.fecha} ${sale.hora}</td>
          <td style="padding: 12px 8px; font-size: 12px; color: #0f172a;">${sale.clienteNombre}</td>
          <td style="padding: 12px 8px; font-size: 12px; color: #475569; text-transform: capitalize;">${sale.payment_method || 'N/A'}</td>
          <td style="padding: 12px 8px; font-size: 12px; font-weight: bold; color: ${estadoColor}; text-align: right;">${isEliminada ? 'ANULADA' : '$' + sale.total.toLocaleString('es-CO')}</td>
        </tr>
      `;
    });

    const dateStr = new Date().toLocaleDateString('es-CO');

    container.innerHTML = `
      <div style="margin-bottom: 30px; border-bottom: 2px solid #0f172a; padding-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">${shopName}</h1>
        <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Reporte de Ventas • Generado el ${dateStr}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 12px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Orden</th>
            <th style="padding: 12px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Fecha</th>
            <th style="padding: 12px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Cliente</th>
            <th style="padding: 12px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Método</th>
            <th style="padding: 12px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding: 20px 8px 12px; font-size: 14px; font-weight: bold; color: #0f172a; text-align: right;">Total Generado (Válidas):</td>
            <td style="padding: 20px 8px 12px; font-size: 16px; font-weight: 900; color: #10b981; text-align: right;">$${totalAcumulado.toLocaleString('es-CO')}</td>
          </tr>
        </tfoot>
      </table>
    `;

    document.body.appendChild(container);
    
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    
    document.body.removeChild(container);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Reporte_Ventas_${dateStr.replace(/\//g, '-')}.pdf`);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Hubo un error al generar el PDF.");
  }
};
