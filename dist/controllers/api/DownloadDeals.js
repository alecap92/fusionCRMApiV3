"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadDeals = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
// 📌 Función para verificar si el contacto está correctamente populado
const isPopulatedContact = (contact) => {
    return (contact && typeof contact === "object" && Array.isArray(contact.properties));
};
const downloadDeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deals = yield DealsModel_1.default.find().populate({
            path: "associatedContactId",
            model: ContactModel_1.default,
            select: "properties",
        });
        const contactHistory = {};
        deals.forEach((deal) => {
            var _a, _b, _c;
            const contact = deal.associatedContactId;
            let name = "Sin contacto";
            let phone = "N/A";
            if (isPopulatedContact(contact)) {
                const firstName = ((_a = contact.properties.find((prop) => prop.key === "firstName")) === null || _a === void 0 ? void 0 : _a.value) ||
                    "";
                const lastName = ((_b = contact.properties.find((prop) => prop.key === "lastName")) === null || _b === void 0 ? void 0 : _b.value) ||
                    "";
                phone =
                    ((_c = contact.properties.find((prop) => prop.key === "mobile")) === null || _c === void 0 ? void 0 : _c.value) ||
                        "N/A";
                name = `${firstName} ${lastName}`.trim() || "Sin contacto";
            }
            const contactId = contact ? String(contact._id) : "unknown";
            if (!contactHistory[contactId]) {
                contactHistory[contactId] = { name, phone, purchases: [] };
            }
            contactHistory[contactId].purchases.push(new Date(deal.closingDate));
        });
        // 🔥 Calcular la mediana de días entre compras para estimar futuras compras
        const allIntervals = [];
        Object.values(contactHistory).forEach((contact) => {
            contact.purchases.sort((a, b) => a.getTime() - b.getTime());
            for (let i = 1; i < contact.purchases.length; i++) {
                allIntervals.push((contact.purchases[i].getTime() -
                    contact.purchases[i - 1].getTime()) /
                    (1000 * 60 * 60 * 24));
            }
        });
        // Calcular la mediana de los intervalos
        const sortedIntervals = allIntervals.sort((a, b) => a - b);
        const medianInterval = sortedIntervals.length > 0
            ? sortedIntervals[Math.floor(sortedIntervals.length / 2)]
            : 30; // 🔥 Usar 30 días como intervalo por defecto
        // 🔥 Aplicar la lógica mejorada al cálculo de la próxima compra
        const finalData = Object.values(contactHistory).map((contact) => {
            contact.purchases.sort((a, b) => a.getTime() - b.getTime());
            let intervals = [];
            for (let i = 1; i < contact.purchases.length; i++) {
                intervals.push((contact.purchases[i].getTime() -
                    contact.purchases[i - 1].getTime()) /
                    (1000 * 60 * 60 * 24));
            }
            const avgInterval = intervals.length > 0
                ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
                : medianInterval; // 🔥 Usar la mediana como respaldo
            const lastPurchase = contact.purchases.length > 0
                ? new Date(contact.purchases[contact.purchases.length - 1])
                : null;
            let nextPurchase = lastPurchase !== null
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
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Deals");
        worksheet.columns = [
            { header: "Nombre", key: "Nombre", width: 30 },
            { header: "Celular", key: "Celular", width: 15 },
            { header: "Última Compra", key: "Última Compra", width: 20 },
            { header: "Próxima Compra", key: "Próxima Compra", width: 20 },
        ];
        worksheet.addRows(finalData);
        const filePath = path_1.default.join(__dirname, "../../../deals.xlsx");
        yield workbook.xlsx.writeFile(filePath);
        // Enviar el archivo como respuesta
        res.download(filePath, "deals.xlsx", () => {
            fs_1.default.unlinkSync(filePath);
        });
    }
    catch (error) {
        console.error("Error al generar el archivo:", error);
        res.status(500).send("Error al generar el archivo");
    }
});
exports.downloadDeals = downloadDeals;
