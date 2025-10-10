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
exports.getQuotationPdfFilename = exports.getPdfAsBase64 = exports.generateQuotationPdf = void 0;
const QuotationModel_1 = __importDefault(require("../../models/QuotationModel"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
/**
 * Genera un PDF de una cotización
 * @param quotationNumber - Número de la cotización a generar
 * @param organizationId - ID de la organización
 * @param options - Opciones de configuración para el PDF
 * @returns Un objeto con el buffer del PDF y los datos utilizados
 */
const generateQuotationPdf = (quotationNumber, organizationId, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Configuración por defecto
        const defaultOptions = {
            headless: true,
            format: "letter",
            margin: {
                top: "5mm",
                bottom: "10mm",
                left: "10mm",
                right: "10mm",
            },
        };
        // Combinar opciones por defecto con las proporcionadas
        const pdfOptions = Object.assign(Object.assign({}, defaultOptions), options);
        // Buscar la cotización
        const quotation = yield QuotationModel_1.default.findOne({ quotationNumber }).lean();
        if (!quotation) {
            throw new Error("Cotización no encontrada");
        }
        // Obtener datos de la organización
        const organization = yield OrganizationModel_1.default.findById(organizationId || quotation.organizationId).lean();
        if (!organization) {
            throw new Error("Organización no encontrada");
        }
        const { logoUrl, settings } = organization;
        const footerText = ((_a = settings === null || settings === void 0 ? void 0 : settings.quotations) === null || _a === void 0 ? void 0 : _a.footerText) || "";
        // Obtener datos del contacto
        const contact = yield ContactModel_1.default.findById(quotation.contactId).lean();
        const contactData = ((contact === null || contact === void 0 ? void 0 : contact.properties) || []).reduce((acc, prop) => {
            acc[prop.key] = prop.value;
            return acc;
        }, {});
        // Asignar los datos de contacto a la cotización
        const quotationWithContactData = Object.assign(Object.assign({}, quotation), { contactId: contactData });
        // Ruta a la plantilla EJS
        const templatePath = path_1.default.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/PDF/quotation.ejs' : 'src/PDF/quotation.ejs');
        // Renderizar la plantilla HTML
        const html = yield ejs_1.default.renderFile(templatePath, {
            quotation: quotationWithContactData,
            logoUrl,
            footerText,
        });
        // Configuración de Puppeteer para producción
        const puppeteerOptions = {
            headless: pdfOptions.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        };
        // Configurar ruta del ejecutable de Chromium
        if (process.env.NODE_ENV === 'production') {
            // Intentar diferentes rutas posibles de Chromium
            const possiblePaths = [
                process.env.PUPPETEER_EXECUTABLE_PATH,
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable'
            ].filter(Boolean);
            for (const path of possiblePaths) {
                try {
                    const fs = require('fs');
                    if (fs.existsSync(path)) {
                        puppeteerOptions.executablePath = path;
                        console.log(`Using Chromium at: ${path}`);
                        break;
                    }
                }
                catch (error) {
                    console.warn(`Path ${path} not accessible:`, error);
                }
            }
            // Si no se encontró ninguna ruta, usar configuración por defecto
            if (!puppeteerOptions.executablePath) {
                console.warn('No Chromium executable found, using default Puppeteer configuration');
            }
        }
        // Usar puppeteer-core en producción para mejor control
        const puppeteerInstance = process.env.NODE_ENV === 'production' ? puppeteer_core_1.default : puppeteer_1.default;
        // Iniciar puppeteer
        const browser = yield puppeteerInstance.launch(puppeteerOptions);
        const page = yield browser.newPage();
        // Configurar y generar el PDF
        yield page.setContent(html, { waitUntil: "networkidle0" });
        yield page.emulateMediaType("screen");
        const pdfBuffer = yield page.pdf({
            format: pdfOptions.format,
            printBackground: true,
            margin: pdfOptions.margin,
        });
        yield browser.close();
        // Devolver el buffer del PDF y los datos utilizados
        return {
            pdfBuffer: Buffer.from(pdfBuffer),
            quotation: quotationWithContactData,
            organization,
            footerText,
        };
    }
    catch (error) {
        console.error("Error generando PDF de cotización:", error);
        throw error;
    }
});
exports.generateQuotationPdf = generateQuotationPdf;
/**
 * Convierte el buffer del PDF a base64
 * @param pdfBuffer - Buffer del PDF
 * @returns Cadena en formato base64
 */
const getPdfAsBase64 = (pdfBuffer) => {
    return Buffer.from(pdfBuffer).toString("base64");
};
exports.getPdfAsBase64 = getPdfAsBase64;
/**
 * Genera el nombre del archivo para el PDF de la cotización
 * @param quotationNumber - Número de la cotización
 * @param prefix - Prefijo opcional
 * @returns Nombre del archivo
 */
const getQuotationPdfFilename = (quotationNumber, prefix) => {
    return `${prefix || "cotizacion_"}${quotationNumber}.pdf`;
};
exports.getQuotationPdfFilename = getQuotationPdfFilename;
