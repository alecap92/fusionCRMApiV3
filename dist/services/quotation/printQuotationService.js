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
// Cache del navegador para reutilizarlo entre peticiones
let browserInstance = null;
let browserInitializing = false;
/**
 * Obtiene una instancia del navegador (reutiliza si existe, crea nueva si no)
 */
function getBrowserInstance() {
    return __awaiter(this, void 0, void 0, function* () {
        // Si ya tenemos una instancia activa, verificar que esté conectada
        if (browserInstance) {
            try {
                // Verificar que el navegador sigue activo
                yield browserInstance.version();
                console.log("Reutilizando instancia de navegador existente");
                return browserInstance;
            }
            catch (error) {
                console.log("Instancia de navegador no válida, creando nueva...");
                browserInstance = null;
            }
        }
        // Evitar inicializaciones concurrentes
        if (browserInitializing) {
            console.log("Esperando inicialización de navegador en curso...");
            // Esperar hasta 10 segundos por la inicialización
            for (let i = 0; i < 40; i++) {
                yield new Promise((resolve) => setTimeout(resolve, 250));
                if (browserInstance) {
                    return browserInstance;
                }
            }
            throw new Error("Timeout esperando inicialización de navegador");
        }
        browserInitializing = true;
        try {
            console.log("Inicializando nueva instancia de navegador...");
            const startTime = Date.now();
            const puppeteerOptions = {
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-web-security",
                    "--disable-software-rasterizer",
                    "--disable-extensions",
                    "--disable-background-networking",
                    "--disable-default-apps",
                    "--disable-sync",
                    "--mute-audio",
                ],
                timeout: 60000, // 60 segundos para inicializar
            };
            // Configurar ruta del ejecutable de Chromium en producción
            if (process.env.NODE_ENV === "production") {
                const possiblePaths = [
                    process.env.PUPPETEER_EXECUTABLE_PATH,
                    "/usr/bin/chromium",
                    "/usr/bin/chromium-browser",
                    "/usr/bin/google-chrome",
                    "/usr/bin/google-chrome-stable",
                ].filter(Boolean);
                for (const path of possiblePaths) {
                    try {
                        const fs = require("fs");
                        if (fs.existsSync(path)) {
                            puppeteerOptions.executablePath = path;
                            console.log(`Usando Chromium en: ${path}`);
                            break;
                        }
                    }
                    catch (error) {
                        console.warn(`Ruta ${path} no accesible:`, error);
                    }
                }
                if (!puppeteerOptions.executablePath) {
                    console.warn("No se encontró ejecutable de Chromium, usando configuración por defecto");
                }
            }
            const puppeteerInstance = process.env.NODE_ENV === "production" ? puppeteer_core_1.default : puppeteer_1.default;
            browserInstance = yield puppeteerInstance.launch(puppeteerOptions);
            const initTime = Date.now() - startTime;
            console.log(`Navegador inicializado en ${initTime}ms`);
            // Cerrar el navegador después de 5 minutos de inactividad
            const inactivityTimeout = 5 * 60 * 1000; // 5 minutos
            let inactivityTimer;
            const resetInactivityTimer = () => {
                if (inactivityTimer)
                    clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    if (browserInstance) {
                        console.log("Cerrando navegador por inactividad");
                        try {
                            yield browserInstance.close();
                        }
                        catch (error) {
                            console.warn("Error cerrando navegador por inactividad:", error);
                        }
                        browserInstance = null;
                    }
                }), inactivityTimeout);
            };
            resetInactivityTimer();
            browserInstance.on("disconnected", () => {
                console.log("Navegador desconectado");
                browserInstance = null;
                if (inactivityTimer)
                    clearTimeout(inactivityTimer);
            });
            return browserInstance;
        }
        finally {
            browserInitializing = false;
        }
    });
}
/**
 * Genera un PDF de una cotización
 * @param quotationNumber - Número de la cotización a generar
 * @param organizationId - ID de la organización
 * @param options - Opciones de configuración para el PDF
 * @returns Un objeto con el buffer del PDF y los datos utilizados
 */
const generateQuotationPdf = (quotationNumber, organizationId, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const startTime = Date.now();
    console.log(`[PDF] Iniciando generación de PDF para cotización ${quotationNumber}`);
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
        console.log(`[PDF] Buscando cotización ${quotationNumber}...`);
        const quotation = yield QuotationModel_1.default.findOne({ quotationNumber }).lean();
        if (!quotation) {
            throw new Error("Cotización no encontrada");
        }
        console.log(`[PDF] Cotización encontrada en ${Date.now() - startTime}ms`);
        // Obtener datos de la organización
        console.log(`[PDF] Buscando organización ${organizationId}...`);
        const organization = yield OrganizationModel_1.default.findById(organizationId || quotation.organizationId).lean();
        if (!organization) {
            throw new Error("Organización no encontrada");
        }
        console.log(`[PDF] Organización encontrada en ${Date.now() - startTime}ms`);
        const { logoUrl, settings } = organization;
        const footerText = ((_a = settings === null || settings === void 0 ? void 0 : settings.quotations) === null || _a === void 0 ? void 0 : _a.footerText) || "";
        // Obtener datos del contacto
        console.log(`[PDF] Buscando contacto...`);
        const contact = yield ContactModel_1.default.findById(quotation.contactId).lean();
        const contactData = ((contact === null || contact === void 0 ? void 0 : contact.properties) || []).reduce((acc, prop) => {
            acc[prop.key] = prop.value;
            return acc;
        }, {});
        console.log(`[PDF] Contacto obtenido en ${Date.now() - startTime}ms`);
        // Asignar los datos de contacto a la cotización
        const quotationWithContactData = Object.assign(Object.assign({}, quotation), { contactId: contactData });
        // Ruta a la plantilla EJS
        const templatePath = path_1.default.resolve(process.cwd(), process.env.NODE_ENV === "production"
            ? "dist/PDF/quotation.ejs"
            : "src/PDF/quotation.ejs");
        // Verificar que el archivo de plantilla existe
        const fs = require("fs");
        if (!fs.existsSync(templatePath)) {
            console.error(`Template file not found at: ${templatePath}`);
            throw new Error(`Template file not found: ${templatePath}`);
        }
        // Renderizar la plantilla HTML
        console.log(`[PDF] Renderizando plantilla HTML...`);
        const html = yield ejs_1.default.renderFile(templatePath, {
            quotation: quotationWithContactData,
            logoUrl,
            footerText,
        });
        console.log(`[PDF] HTML renderizado en ${Date.now() - startTime}ms`);
        // Obtener instancia del navegador (reutilizada o nueva)
        console.log(`[PDF] Obteniendo instancia de navegador...`);
        const browser = yield getBrowserInstance();
        console.log(`[PDF] Navegador obtenido en ${Date.now() - startTime}ms`);
        // Crear una nueva página
        console.log(`[PDF] Creando nueva página...`);
        const page = yield browser.newPage();
        try {
            // Configurar timeouts de página (reducidos)
            page.setDefaultTimeout(20000); // 20 segundos
            page.setDefaultNavigationTimeout(20000);
            // Configurar y generar el PDF
            console.log(`[PDF] Cargando contenido HTML en la página...`);
            yield page.setContent(html, {
                waitUntil: "domcontentloaded", // Cambiado de networkidle0 para ser más rápido
                timeout: 15000, // Reducido a 15 segundos
            });
            console.log(`[PDF] Contenido HTML cargado en ${Date.now() - startTime}ms`);
            // Esperar a que las imágenes se carguen (timeout más corto)
            try {
                console.log(`[PDF] Esperando carga de imágenes...`);
                yield page.waitForFunction(() => {
                    const images = document.querySelectorAll("img");
                    if (images.length === 0)
                        return true;
                    return Array.from(images).every((img) => {
                        return (img.complete &&
                            img.naturalHeight !== 0 &&
                            img.naturalWidth !== 0);
                    });
                }, { timeout: 8000 } // Reducido a 8 segundos
                );
                console.log(`[PDF] Imágenes cargadas en ${Date.now() - startTime}ms`);
            }
            catch (error) {
                console.warn(`[PDF] Algunas imágenes no se cargaron completamente (${Date.now() - startTime}ms), continuando...`);
            }
            yield page.emulateMediaType("screen");
            console.log(`[PDF] Generando PDF...`);
            const pdfBuffer = yield page.pdf({
                format: pdfOptions.format,
                printBackground: true,
                margin: pdfOptions.margin,
                timeout: 15000, // Reducido a 15 segundos
            });
            console.log(`[PDF] PDF generado exitosamente en ${Date.now() - startTime}ms`);
            // Cerrar la página (no el navegador, para reutilizarlo)
            yield page.close();
            // Devolver el buffer del PDF y los datos utilizados
            return {
                pdfBuffer: Buffer.from(pdfBuffer),
                quotation: quotationWithContactData,
                organization,
                footerText,
            };
        }
        catch (error) {
            // Asegurar que la página se cierre en caso de error
            try {
                yield page.close();
            }
            catch (closeError) {
                console.warn("[PDF] Error cerrando página:", closeError);
            }
            throw error;
        }
    }
    catch (error) {
        console.error(`[PDF] Error generando PDF de cotización (${Date.now() - startTime}ms):`, error);
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
