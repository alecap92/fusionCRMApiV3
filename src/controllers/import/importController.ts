import { Request, Response } from "express";
import XLSX from "xlsx";
import ContactModel from "../../models/ContactModel";
export const importContacts = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;

  const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;

  if (!userId || !organizationId) {
    return res
      .status(400)
      .json({ message: "Usuario o organización no encontrado" });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ message: "No se ha proporcionado un archivo" });
  }

  if (!mapping) {
    return res
      .status(400)
      .json({ message: "No se ha proporcionado un mapeo de propiedades" });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    if (data.length < 2) {
      return res
        .status(400)
        .json({ message: "El archivo no contiene suficientes datos" });
    }

    const headers = data[0];

    const contacts = data.slice(1).map((row) => {
      const properties = headers
        .map((header, index) => {
          const mappedKey = mapping[header];

          if (!mappedKey) {
            return null;
          }

          let value = row[index];

          // Si el valor es undefined o nulo, asignar una cadena vacía
          if (value === undefined || value === null) {
            value = "";
          }

          if (mappedKey === "ignore") {
            return null;
          }

          if (mappedKey.startsWith("create:")) {
            const newProperty = mappedKey.split(":")[1];
            return {
              key: newProperty,
              value: value,
              isVisible: true,
            };
          }

          return {
            key: mappedKey,
            value: value,
            isVisible: true,
          };
        })
        .filter((property) => property !== null);

      return {
        properties,
        EmployeeOwner: [userId],
        source: "imported",
        organizationId,
      };
    });

    // Procesar en lotes
    const batchSize = 1000;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      await ContactModel.insertMany(batch);
    }

    res.status(201).json({
      message: "Contactos importados exitosamente",
      importedCount: contacts.length,
    });
  } catch (error: any) {
    console.error("Error al importar contactos:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
};
