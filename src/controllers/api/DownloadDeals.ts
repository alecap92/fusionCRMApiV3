import { Request, Response } from "express";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import DealsModel from "../../models/DealsModel";
import ContactModel from "../../models/ContactModel";

// 📌 Definir interfaz para contacto populado
interface PopulatedContact {
  _id: mongoose.Types.ObjectId;
  properties: { key: string; value: string }[];
}

// 📌 Función para verificar si el contacto está correctamente populado
const isPopulatedContact = (contact: any): contact is PopulatedContact => {
  return (
    contact && typeof contact === "object" && Array.isArray(contact.properties)
  );
};

export const downloadDeals = async (req: Request, res: Response) => {
  try {
    const deals = await DealsModel.find().populate({
      path: "associatedContactId",
      model: ContactModel,
      select: "properties",
    });

    const contactHistory: Record<
      string,
      { name: string; phone: string; purchases: Date[] }
    > = {};

    deals.forEach((deal) => {
      const contact = deal.associatedContactId;
      let name = "Sin contacto";
      let phone = "N/A";

      if (isPopulatedContact(contact)) {
        const firstName =
          contact.properties.find((prop) => prop.key === "firstName")?.value ||
          "";
        const lastName =
          contact.properties.find((prop) => prop.key === "lastName")?.value ||
          "";
        phone =
          contact.properties.find((prop) => prop.key === "mobile")?.value ||
          "N/A";
        name = `${firstName} ${lastName}`.trim() || "Sin contacto";
      }

      const contactId = contact ? String((contact as any)._id) : "unknown";

      if (!contactHistory[contactId]) {
        contactHistory[contactId] = { name, phone, purchases: [] };
      }
      contactHistory[contactId].purchases.push(new Date(deal.closingDate));
    });

    // 🔥 Calcular la mediana de días entre compras para estimar futuras compras
    const allIntervals: number[] = [];

    Object.values(contactHistory).forEach((contact) => {
      contact.purchases.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < contact.purchases.length; i++) {
        allIntervals.push(
          (contact.purchases[i].getTime() -
            contact.purchases[i - 1].getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }
    });

    // Calcular la mediana de los intervalos
    const sortedIntervals = allIntervals.sort((a, b) => a - b);
    const medianInterval =
      sortedIntervals.length > 0
        ? sortedIntervals[Math.floor(sortedIntervals.length / 2)]
        : 30; // 🔥 Usar 30 días como intervalo por defecto

    // 🔥 Aplicar la lógica mejorada al cálculo de la próxima compra
    const finalData = Object.values(contactHistory).map((contact) => {
      contact.purchases.sort((a, b) => a.getTime() - b.getTime());
      let intervals: number[] = [];

      for (let i = 1; i < contact.purchases.length; i++) {
        intervals.push(
          (contact.purchases[i].getTime() -
            contact.purchases[i - 1].getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }

      const avgInterval =
        intervals.length > 0
          ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
          : medianInterval; // 🔥 Usar la mediana como respaldo

      const lastPurchase =
        contact.purchases.length > 0
          ? new Date(contact.purchases[contact.purchases.length - 1])
          : null;

      let nextPurchase: Date | null =
        lastPurchase !== null
          ? new Date(lastPurchase.getTime() + avgInterval * 24 * 60 * 60 * 1000)
          : null;

      // 🔥 Corregir fechas futuras (No permitir fechas en el pasado)
      if (nextPurchase !== null && nextPurchase < new Date()) {
        nextPurchase = new Date();
      }

      return {
        Nombre: contact.name,
        Celular: contact.phone,
        "Última Compra": lastPurchase
          ? lastPurchase.toISOString().split("T")[0]
          : "No suficiente data",
        "Próxima Compra": nextPurchase
          ? nextPurchase.toISOString().split("T")[0]
          : "No suficiente data",
      };
    });

    // 📁 Generar archivo Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Deals");

    worksheet.columns = [
      { header: "Nombre", key: "Nombre", width: 30 },
      { header: "Celular", key: "Celular", width: 15 },
      { header: "Última Compra", key: "Última Compra", width: 20 },
      { header: "Próxima Compra", key: "Próxima Compra", width: 20 },
    ];

    worksheet.addRows(finalData);

    const filePath = path.join(__dirname, "../../../deals.xlsx");
    await workbook.xlsx.writeFile(filePath);

    // Enviar el archivo como respuesta
    res.download(filePath, "deals.xlsx", () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("Error al generar el archivo:", error);
    res.status(500).send("Error al generar el archivo");
  }
};
