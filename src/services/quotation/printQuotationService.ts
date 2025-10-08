import Quotation from "../../models/QuotationModel";
import OrganizationModel from "../../models/OrganizationModel";
import ContactModel from "../../models/ContactModel";
import ejs from "ejs";
import path from "path";
import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";

interface GeneratePdfOptions {
  headless?: boolean;
  format?: string;
  margin?: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
}

/**
 * Genera un PDF de una cotización
 * @param quotationNumber - Número de la cotización a generar
 * @param organizationId - ID de la organización
 * @param options - Opciones de configuración para el PDF
 * @returns Un objeto con el buffer del PDF y los datos utilizados
 */
export const generateQuotationPdf = async (
  quotationNumber: string | number,
  organizationId: string,
  options?: GeneratePdfOptions
) => {
  try {
    // Configuración por defecto
    const defaultOptions: GeneratePdfOptions = {
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
    const pdfOptions = { ...defaultOptions, ...options };

    // Buscar la cotización
    const quotation = await Quotation.findOne({ quotationNumber }).lean();
    if (!quotation) {
      throw new Error("Cotización no encontrada");
    }

    // Obtener datos de la organización
    const organization = await OrganizationModel.findById(
      organizationId || quotation.organizationId
    ).lean();
    if (!organization) {
      throw new Error("Organización no encontrada");
    }

    const { logoUrl, settings } = organization;
    const footerText = settings?.quotations?.footerText || "";

    // Obtener datos del contacto
    const contact = await ContactModel.findById(quotation.contactId).lean();
    const contactData: any = (contact?.properties || []).reduce(
      (acc: Record<string, string>, prop: any) => {
        acc[prop.key] = prop.value;
        return acc;
      },
      {}
    );

    // Asignar los datos de contacto a la cotización
    const quotationWithContactData = {
      ...quotation,
      contactId: contactData,
    };

    // Ruta a la plantilla EJS
    const templatePath = path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/PDF/quotation.ejs' : 'src/PDF/quotation.ejs');

    // Renderizar la plantilla HTML
    const html = await ejs.renderFile(templatePath, {
      quotation: quotationWithContactData,
      logoUrl,
      footerText,
    });

    // Configuración de Puppeteer para producción
    const puppeteerOptions: any = {
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
        } catch (error) {
          console.warn(`Path ${path} not accessible:`, error);
        }
      }

      // Si no se encontró ninguna ruta, usar configuración por defecto
      if (!puppeteerOptions.executablePath) {
        console.warn('No Chromium executable found, using default Puppeteer configuration');
      }
    }

    // Usar puppeteer-core en producción para mejor control
    const puppeteerInstance = process.env.NODE_ENV === 'production' ? puppeteerCore : puppeteer;
    
    // Iniciar puppeteer
    const browser = await puppeteerInstance.launch(puppeteerOptions);
    const page = await browser.newPage();

    // Configurar y generar el PDF
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: pdfOptions.format as any,
      printBackground: true,
      margin: pdfOptions.margin,
    });

    await browser.close();

    // Devolver el buffer del PDF y los datos utilizados
    return {
      pdfBuffer: Buffer.from(pdfBuffer),
      quotation: quotationWithContactData,
      organization,
      footerText,
    };
  } catch (error) {
    console.error("Error generando PDF de cotización:", error);
    throw error;
  }
};

/**
 * Convierte el buffer del PDF a base64
 * @param pdfBuffer - Buffer del PDF
 * @returns Cadena en formato base64
 */
export const getPdfAsBase64 = (pdfBuffer: Buffer): string => {
  return Buffer.from(pdfBuffer).toString("base64");
};

/**
 * Genera el nombre del archivo para el PDF de la cotización
 * @param quotationNumber - Número de la cotización
 * @param prefix - Prefijo opcional
 * @returns Nombre del archivo
 */
export const getQuotationPdfFilename = (
  quotationNumber: string | number,
  prefix?: string
): string => {
  return `${prefix || "cotizacion_"}${quotationNumber}.pdf`;
};
