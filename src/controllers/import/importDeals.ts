import { Request, Response } from "express";
import XLSX from "xlsx";
import Deals from "../../models/DealsModel";
import DealsFieldsValues from "../../models/DealsFieldsValuesModel";
import DealsFields from "../../models/DealsFieldsModel";
import Status from "../../models/StatusModel";
import Contact from "../../models/ContactModel"; // Importa el modelo de Contact

export const importDeals = async (req: Request, res: Response) => {
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

    // Consulta inicial de todos los fields del pipeline
    const pipelineId = data[1][headers.indexOf("pipeline")]; // Ejemplo de cómo obtener el pipelineId
    const fieldsDict: Record<string, any> = {};
    const pipelineFields = await DealsFields.find({
      pipeline: pipelineId,
    }).exec();
    pipelineFields.forEach((field) => {
      fieldsDict[field.key] = field._id;
    });

    const excelDateToJSDate = (excelDate: number) => {
      const startDate = new Date(1899, 11, 30); // Excel's epoch starts on 30th December 1899
      const days = Math.floor(excelDate);
      const ms = (excelDate - days) * 86400 * 1000;
      const date = new Date(startDate.getTime() + days * 86400 * 1000 + ms);
      return date;
    };

    const deals = await Promise.all(
      data.slice(1).map(async (row) => {
        const dealData: any = {
          title: "",
          amount: 0,
          closingDate: new Date(), // Valor por defecto
          pipeline: pipelineId,
          status: null,
          organizationId,
          associatedContactId: null,
        };

        const fieldsValues = [];

        let firstName = "";
        let lastName = "";

        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          const value = row[i] || "";

          const mappedKey = mapping[header];

          if (mappedKey === "ignore" || !mappedKey) continue;

          if (mappedKey === "status") {
            const status = await Status.findOne(
              { name: value },
              organizationId
            ).exec();
            if (status) {
              dealData.status = status._id;
            } else {
              console.warn(`Status no encontrado: ${value}`);
            }
          } else if (mappedKey === "firstName") {
            firstName = value;
          } else if (mappedKey === "lastName") {
            lastName = value;
          } else if (mappedKey === "closingDate") {
            // Convertir el valor numérico de Excel a una fecha JavaScript
            const closingDate = excelDateToJSDate(Number(value));
            if (!isNaN(closingDate.getTime())) {
              dealData.closingDate = closingDate;
            } else {
              console.warn(`Fecha inválida para closingDate: ${value}`);
            }
          } else if (mappedKey in dealData) {
            dealData[mappedKey] = value;
          } else if (fieldsDict[mappedKey]) {
            fieldsValues.push({
              field: fieldsDict[mappedKey],
              value,
            });
          } else {
            console.warn(`Campo personalizado no encontrado: ${mappedKey}`);
          }
        }

        // Buscar el contacto usando firstName y lastName
        if (firstName && lastName) {
          const contact = await Contact.findOne({
            organizationId,
            $and: [
              { "properties.key": "firstName", "properties.value": firstName },
              { "properties.key": "lastName", "properties.value": lastName },
            ],
          }).exec();

          if (contact) {
            dealData.associatedContactId = contact._id;
          } else {
            dealData.associatedContactId = null;
            console.warn(`Contacto no encontrado: ${firstName} ${lastName}`);
          }
        }

        if (
          !dealData.title ||
          !dealData.amount ||
          isNaN(dealData.closingDate.getTime())
        ) {
          console.warn(
            `Datos faltantes o inválidos para el deal en fila: ${row}`
          );
          return null; // No procesar este deal
        }

        const newDeal = await Deals.create(dealData);

        if (fieldsValues.length > 0) {
          const dealFieldsValues = fieldsValues.map((fieldValue) => ({
            deal: newDeal._id,
            field: fieldValue.field,
            value: fieldValue.value,
          }));

          await DealsFieldsValues.insertMany(dealFieldsValues);
        }

        return newDeal;
      })
    );

    res.status(201).json({
      message: "Deals importados exitosamente",
      importedCount: deals.filter(Boolean).length, // Filtra nulls
    });
  } catch (error: any) {
    console.error("Error al importar deals:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
};
