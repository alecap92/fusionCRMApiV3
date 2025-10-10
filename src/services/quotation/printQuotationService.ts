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
    const templatePath = path.resolve(
      process.cwd(),
      process.env.NODE_ENV === "production"
        ? "dist/PDF/quotation.ejs"
        : "src/PDF/quotation.ejs"
    );

    // Verificar que el archivo de plantilla existe
    const fs = require("fs");
    if (!fs.existsSync(templatePath)) {
      console.error(`Template file not found at: ${templatePath}`);
      console.log(
        "Available files in dist/PDF:",
        fs.existsSync("dist/PDF")
          ? fs.readdirSync("dist/PDF")
          : "dist/PDF does not exist"
      );
      console.log(
        "Available files in src/PDF:",
        fs.existsSync("src/PDF")
          ? fs.readdirSync("src/PDF")
          : "src/PDF does not exist"
      );
      throw new Error(`Template file not found: ${templatePath}`);
    }

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
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--metrics-recording-only",
        "--mute-audio",
        "--safebrowsing-disable-auto-update",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
        "--enable-features=NetworkService",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-first-run",
        "--disable-extensions",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
      ],
      timeout: 30000, // 30 segundos timeout
      protocolTimeout: 30000,
    };

    // Configurar ruta del ejecutable de Chromium
    if (process.env.NODE_ENV === "production") {
      // Intentar diferentes rutas posibles de Chromium
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
            console.log(`Using Chromium at: ${path}`);
            break;
          }
        } catch (error) {
          console.warn(`Path ${path} not accessible:`, error);
        }
      }

      // Si no se encontró ninguna ruta, usar configuración por defecto
      if (!puppeteerOptions.executablePath) {
        console.warn(
          "No Chromium executable found, using default Puppeteer configuration"
        );
      }
    }

    // Usar puppeteer-core en producción para mejor control
    const puppeteerInstance =
      process.env.NODE_ENV === "production" ? puppeteerCore : puppeteer;

    // Implementar retry logic (3 intentos)
    let browser: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    let pdfBuffer: Buffer | undefined;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `Intento ${retryCount + 1} de ${maxRetries} para generar PDF`
        );

        // Iniciar puppeteer
        browser = await puppeteerInstance.launch(puppeteerOptions);
        const page = await browser.newPage();

        // Configurar timeouts de página
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        // Configurar y generar el PDF
        await page.setContent(html, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Esperar a que las imágenes se carguen completamente con mejor manejo
        try {
          await page.waitForFunction(
            () => {
              const images = document.querySelectorAll("img");
              if (images.length === 0) return true;

              return Array.from(images).every((img) => {
                return (
                  img.complete &&
                  img.naturalHeight !== 0 &&
                  img.naturalWidth !== 0
                );
              });
            },
            { timeout: 15000 }
          );
          console.log("Todas las imágenes cargadas correctamente");
        } catch (error) {
          console.warn(
            "Algunas imágenes no se cargaron completamente, continuando..."
          );
          // Intentar cargar imágenes que fallaron
          await page.evaluate(() => {
            const images = document.querySelectorAll("img");
            images.forEach((img) => {
              if (!img.complete || img.naturalHeight === 0) {
                img.src = img.src; // Forzar recarga
              }
            });
          });
          // Esperar un poco más para que se recarguen
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        await page.emulateMediaType("screen");

        pdfBuffer = await page.pdf({
          format: pdfOptions.format as any,
          printBackground: true,
          margin: pdfOptions.margin,
          timeout: 30000,
        });

        await browser.close();
        browser = null;

        // Si llegamos aquí, el PDF se generó exitosamente
        break;
      } catch (error) {
        console.error(`Error en intento ${retryCount + 1}:`, error);

        // Asegurar que el browser se cierre en caso de error
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.warn("Error cerrando browser:", closeError);
          }
          browser = null;
        }

        retryCount++;

        if (retryCount >= maxRetries) {
          throw new Error(
            `Error generando PDF después de ${maxRetries} intentos: ${error instanceof Error ? error.message : "Error desconocido"}`
          );
        }

        // Esperar un poco antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Verificar que el PDF se generó correctamente
    if (!pdfBuffer) {
      throw new Error(
        "No se pudo generar el PDF después de todos los intentos"
      );
    }

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
