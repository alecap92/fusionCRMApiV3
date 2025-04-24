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
exports.generateQuotationPdf = void 0;
const pdfmake_1 = __importDefault(require("pdfmake"));
const path_1 = __importDefault(require("path"));
const moment_1 = __importDefault(require("moment"));
const axios_1 = __importDefault(require("axios"));
// Función para obtener la imagen en base64 desde una URL
const getBase64ImageFromUrl = (imageUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(imageUrl, { responseType: "arraybuffer" });
        if (!response) {
            throw new Error("Error descargando la imagen, no hay respuesta del fetch de la imagen");
        }
        return `data:image/png;base64,${Buffer.from(response.data).toString("base64")}`;
    }
    catch (error) {
        console.error("Error descargando la imagen:", error);
        return null;
    }
});
const quotationPdfStyles = {
    header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 10, 0, 10],
        color: "#1d6094",
    },
    subheader: {
        fontSize: 14,
        bold: false,
        margin: [0, 10, 0, 5],
        color: "#404040",
    },
    total: {
        fontSize: 16,
        bold: true,
        color: "#bf0000",
        alignment: "right",
    },
    tableHeader: {
        bold: true,
        fillColor: "#bf0000",
        color: "white",
        alignment: "center",
    },
    tableExample: {
        marginBottom: 15,
        marginTop: 40,
        marginLeft: 350,
    },
    tableExample2: {
        marginTop: 30,
    },
};
const fonts = {
    Roboto: {
        normal: path_1.default.resolve(__dirname, "..", "..", "public", "fonts", "Roboto-Regular.ttf"),
        bold: path_1.default.resolve(__dirname, "..", "..", "public", "fonts", "Roboto-Bold.ttf"),
    },
};
// Instancia de PdfPrinter
const pdfPrinter = new pdfmake_1.default(fonts);
// Función para generar el PDF de cotización
const generateQuotationPdf = (quotation, logoUrl, bgImage, footerText) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        const logoBase64 = yield getBase64ImageFromUrl(logoUrl);
        const backgroundBase64 = yield getBase64ImageFromUrl(bgImage);
        // Definición del contenido del PDF
        const docDefinition = {
            background: backgroundBase64
                ? { image: backgroundBase64, width: 600 }
                : undefined,
            content: [
                { image: logoBase64 || "", width: 120, alignment: "left" },
                { text: `Cotización #CO${quotation.quotationNumber}`, style: "header" },
                {
                    text: [
                        {
                            text: "Fecha de cotización: ",
                            bold: true,
                        },
                        {
                            text: (0, moment_1.default)(quotation.creationDate).format("DD/MM/YYYY"),
                            style: "subheader",
                        },
                    ],
                    style: "subheader",
                },
                {
                    text: [
                        {
                            text: "Vencimiento: ",
                            bold: true,
                        },
                        {
                            text: (0, moment_1.default)(quotation.expirationDate).format("DD/MM/YYYY"),
                            style: "subheader",
                        },
                    ],
                    style: "subheader",
                },
                {
                    text: [
                        {
                            text: "Cliente: ",
                            bold: true,
                        },
                        { text: quotation.name, style: "subheader" },
                    ],
                    style: "subheader",
                },
                {
                    table: {
                        widths: ["40%", "15%", "15%", "15%", "15%"],
                        body: [
                            [
                                { text: "Descripción", style: "tableHeader" },
                                { text: "Cantidad", style: "tableHeader" },
                                { text: "Precio", style: "tableHeader" },
                                { text: "Impuestos", style: "tableHeader" },
                                { text: "Total", style: "tableHeader" },
                            ],
                            ...quotation.items.map((item) => [
                                { text: item.name, alignment: "left" },
                                { text: item.quantity, alignment: "center" },
                                {
                                    text: `$${item.unitPrice.toLocaleString("es-CO")}`,
                                    alignment: "right",
                                },
                                { text: `${item.taxes}%`, alignment: "right" },
                                {
                                    text: `$${item.total.toLocaleString("es-CO")}`,
                                    alignment: "right",
                                },
                            ]),
                        ],
                    },
                    style: "tableExample2",
                    layout: "lightHorizontalLines",
                },
                {
                    table: {
                        widths: ["35%", "65%"],
                        body: [
                            [
                                "Subtotal",
                                {
                                    text: `$${quotation.subtotal.toLocaleString("es-CO")}`,
                                    alignment: "right",
                                },
                            ],
                            [
                                "IVA",
                                {
                                    text: `$${quotation.taxes.toLocaleString("es-CO")}`,
                                    alignment: "right",
                                },
                            ],
                            [
                                {
                                    text: "Total",
                                    bold: true,
                                    fillColor: "#1d6094",
                                    color: "white",
                                },
                                {
                                    text: `$${quotation.total.toLocaleString("es-CO")}`,
                                    alignment: "right",
                                    bold: true,
                                    fillColor: "#1d6094",
                                    color: "white",
                                },
                            ],
                        ],
                    },
                    layout: "noBorders",
                    style: "tableExample",
                },
                { text: "\nCondiciones Comerciales:", style: "subheader", bold: true },
                { text: `Forma de pago: ${quotation.paymentTerms}` },
                { text: `Tiempo de entrega: ${quotation.shippingTerms}` },
                { text: "\nObservaciones:", style: "subheader", bold: true },
                { text: quotation.observaciones || "Sin observaciones" },
            ],
            footer: function (currentPage, pageCount) {
                return {
                    text: footerText,
                    alignment: "center",
                    fontSize: 11,
                    margin: [0, -15, 0, 0],
                    fontStyle: "italic",
                };
            },
            styles: quotationPdfStyles,
        };
        // Generar el PDF en memoria
        const pdfDoc = pdfPrinter.createPdfKitDocument(docDefinition);
        const chunks = [];
        pdfDoc.on("data", (chunk) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", (error) => reject(error));
        pdfDoc.end();
    }));
});
exports.generateQuotationPdf = generateQuotationPdf;
