import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale } from '../types';

export const exportSalesToPDF = (sales: Sale[], shopName: string) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const dateStr = new Date().toLocaleDateString('es-CO');
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName.toUpperCase(), 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Reporte Detallado de Ventas • Generado el ${dateStr}`, 14, 28);
    
    let totalAcumulado = 0;
    
    const tableData = sales.map(sale => {
      if (sale.estado !== 'Eliminada') {
        totalAcumulado += sale.total;
      }
      
      const orderLabel = sale.numero_orden ? `#${String(sale.numero_orden).padStart(6, '0')}` : sale.id.substring(0, 8);
      const totalStr = sale.estado === 'Eliminada' ? 'ANULADA' : `$${sale.total.toLocaleString('es-CO')}`;
      
      return [
        orderLabel,
        `${sale.fecha} ${sale.hora}`,
        sale.clienteNombre,
        sale.payment_method || 'N/A',
        totalStr
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Orden', 'Fecha', 'Cliente', 'Método', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        // Change text color for ANULADA
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'ANULADA') {
            data.cell.styles.textColor = [239, 68, 68]; // Red
          } else {
            data.cell.styles.textColor = [15, 23, 42]; // Slate 900
          }
        }
      },
      margin: { top: 35 },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 35;
    
    // Total Footer
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Total Generado (Válidas):', 120, finalY + 15, { align: 'right' });
    
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text(`$${totalAcumulado.toLocaleString('es-CO')}`, 196, finalY + 15, { align: 'right' });
    
    doc.save(`Reporte_Ventas_${dateStr.replace(/\//g, '-')}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Hubo un error al generar el PDF.");
  }
};
