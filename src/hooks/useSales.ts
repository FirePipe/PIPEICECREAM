import { useState } from "react";
import { Sale } from "../types"; // Assuming Sale type exists in types.ts

export const useSales = (
  initialSales: Sale[],
  setToastMessage: (msg: string | null) => void
) => {
  const [sales, setSales] = useState<Sale[]>(initialSales);

  const submitSale = async (nuevaVenta: Sale) => {
    const snapshotAnterior = [...sales];

    // 1. Optimistic Update
    setSales((prev) => [...prev, nuevaVenta]);

    try {
      const response = await fetch("/api/db/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaVenta),
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }
      
      setToastMessage("✅ Venta sincronizada exitosamente.");
    } catch (error) {
      // 2. Reversión si falla
      setSales(snapshotAnterior);
      setToastMessage("❌ Error al sincronizar. Intentando de nuevo...");
      console.error("Error submitting sale:", error);
    }
  };

  return { sales, setSales, submitSale };
};
