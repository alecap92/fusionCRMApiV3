import Quotation from "../../models/QuotationModel";
import OrganizationModel from "../../models/OrganizationModel";
import ContactModel from "../../models/ContactModel";
import ejs from "ejs";
import path from "path";
import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import axios from "axios";

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
 * Convierte una URL de imagen a base64
 * @param imageUrl - URL de la imagen
 * @param timeout - Timeout en milisegundos (por defecto 5000ms)
 * @returns Base64 string o null si falla
 */
const imageUrlToBase64 = async (
  imageUrl: string,
  timeout: number = 5000
): Promise<string | null> => {
  try {
    if (!imageUrl || imageUrl.trim() === "") {
      return null;
    }

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    // Detectar el tipo de contenido
    const contentType = response.headers["content-type"] || "image/jpeg";

    const base64 = Buffer.from(response.data, "binary").toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error: any) {
    console.warn(
      `[PDF] Error convirtiendo imagen a base64 (${imageUrl}):`,
      error.message
    );
    return null;
  }
};

/**
 * Carga múltiples imágenes en paralelo y las convierte a base64
 * @param imageUrls - Array de URLs de imágenes
 * @returns Array de base64 strings (null para las que fallaron)
 */
const loadImagesInParallel = async (
  imageUrls: string[]
): Promise<(string | null)[]> => {
  console.log(`[PDF] Cargando ${imageUrls.length} imágenes en paralelo...`);
  const startTime = Date.now();

  const promises = imageUrls.map((url) => imageUrlToBase64(url));
  const results = await Promise.all(promises);

  console.log(
    `[PDF] ${results.filter((r) => r !== null).length}/${imageUrls.length} imágenes cargadas en ${Date.now() - startTime}ms`
  );

  return results;
};

// Cache del navegador para reutilizarlo entre peticiones
let browserInstance: any = null;
let browserInitializing = false;

/**
 * Obtiene una instancia del navegador (reutiliza si existe, crea nueva si no)
 */
async function getBrowserInstance(): Promise<any> {
  // Si ya tenemos una instancia activa, verificar que esté conectada
  if (browserInstance) {
    try {
      // Verificar que el navegador sigue activo
      await browserInstance.version();
      console.log("Reutilizando instancia de navegador existente");
      return browserInstance;
    } catch (error) {
      console.log("Instancia de navegador no válida, creando nueva...");
      browserInstance = null;
    }
  }

  // Evitar inicializaciones concurrentes
  if (browserInitializing) {
    console.log("Esperando inicialización de navegador en curso...");
    // Esperar hasta 10 segundos por la inicialización
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
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

    const puppeteerOptions: any = {
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
        } catch (error) {
          console.warn(`Ruta ${path} no accesible:`, error);
        }
      }

      if (!puppeteerOptions.executablePath) {
        console.warn(
          "No se encontró ejecutable de Chromium, usando configuración por defecto"
        );
      }
    }

    const puppeteerInstance =
      process.env.NODE_ENV === "production" ? puppeteerCore : puppeteer;

    browserInstance = await puppeteerInstance.launch(puppeteerOptions);

    const initTime = Date.now() - startTime;
    console.log(`Navegador inicializado en ${initTime}ms`);

    // Cerrar el navegador después de 5 minutos de inactividad
    const inactivityTimeout = 5 * 60 * 1000; // 5 minutos
    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        if (browserInstance) {
          console.log("Cerrando navegador por inactividad");
          try {
            await browserInstance.close();
          } catch (error) {
            console.warn("Error cerrando navegador por inactividad:", error);
          }
          browserInstance = null;
        }
      }, inactivityTimeout);
    };

    resetInactivityTimer();

    browserInstance.on("disconnected", () => {
      console.log("Navegador desconectado");
      browserInstance = null;
      if (inactivityTimer) clearTimeout(inactivityTimer);
    });

    return browserInstance;
  } finally {
    browserInitializing = false;
  }
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
  const startTime = Date.now();
  console.log(
    `[PDF] Iniciando generación de PDF para cotización ${quotationNumber}`
  );

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
    console.log(`[PDF] Buscando cotización ${quotationNumber}...`);
    const quotation = await Quotation.findOne({ quotationNumber }).lean();
    if (!quotation) {
      throw new Error("Cotización no encontrada");
    }
    console.log(`[PDF] Cotización encontrada en ${Date.now() - startTime}ms`);

    // Obtener datos de la organización
    console.log(`[PDF] Buscando organización ${organizationId}...`);
    const organization = await OrganizationModel.findById(
      organizationId || quotation.organizationId
    ).lean();
    if (!organization) {
      throw new Error("Organización no encontrada");
    }
    console.log(`[PDF] Organización encontrada en ${Date.now() - startTime}ms`);

    const { logoUrl, settings } = organization;
    const footerText = settings?.quotations?.footerText || "";

    // Obtener datos del contacto
    console.log(`[PDF] Buscando contacto...`);
    const contact = await ContactModel.findById(quotation.contactId).lean();
    const contactData: any = (contact?.properties || []).reduce(
      (acc: Record<string, string>, prop: any) => {
        acc[prop.key] = prop.value;
        return acc;
      },
      {}
    );
    console.log(`[PDF] Contacto obtenido en ${Date.now() - startTime}ms`);

    // Asignar los datos de contacto a la cotización
    const quotationWithContactData = {
      ...quotation,
      contactId: contactData,
    };

    // Pre-cargar todas las imágenes en paralelo
    console.log(`[PDF] Pre-cargando imágenes...`);
    const imageLoadStart = Date.now();

    // Recopilar todas las URLs de imágenes
    const imageUrls: string[] = [];
    const imageMap: { [key: string]: number } = {};

    // Logo de la organización
    if (logoUrl) {
      imageMap["logo"] = imageUrls.length;
      imageUrls.push(logoUrl);
    }

    // Imagen de fondo
    const bgImageUrl =
      "https://fusioncrmbucket.s3.us-east-1.amazonaws.com/bg.jpg";
    imageMap["background"] = imageUrls.length;
    imageUrls.push(bgImageUrl);

    // Imágenes de productos
    const itemImageMap: { [key: number]: number } = {};
    quotationWithContactData.items?.forEach((item: any, index: number) => {
      if (item.imageUrl) {
        itemImageMap[index] = imageUrls.length;
        imageUrls.push(item.imageUrl);
      }
    });

    // Cargar todas las imágenes en paralelo
    const base64Images = await loadImagesInParallel(imageUrls);

    // Asignar las imágenes base64 a los objetos correspondientes
    const logoBase64 =
      imageMap["logo"] !== undefined ? base64Images[imageMap["logo"]] : null;
    const bgBase64 =
      imageMap["background"] !== undefined
        ? base64Images[imageMap["background"]]
        : null;

    // Asignar imágenes base64 a los items
    const itemsWithBase64Images = quotationWithContactData.items?.map(
      (item: any, index: number) => {
        if (itemImageMap[index] !== undefined) {
          return {
            ...item,
            imageBase64:
              base64Images[itemImageMap[index]] ||
              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5TaW4gaW1hZ2VuPC90ZXh0Pjwvc3ZnPg==",
          };
        }
        return {
          ...item,
          imageBase64:
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5TaW4gaW1hZ2VuPC90ZXh0Pjwvc3ZnPg==",
        };
      }
    );

    const quotationWithImages = {
      ...quotationWithContactData,
      items: itemsWithBase64Images,
    };

    console.log(
      `[PDF] Imágenes pre-cargadas en ${Date.now() - imageLoadStart}ms`
    );

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
      throw new Error(`Template file not found: ${templatePath}`);
    }

    // Renderizar la plantilla HTML con imágenes en base64
    console.log(`[PDF] Renderizando plantilla HTML...`);
    const html = await ejs.renderFile(templatePath, {
      quotation: quotationWithImages,
      logoBase64: logoBase64 || logoUrl, // Fallback a URL si falla la conversión
      bgBase64: bgBase64,
      footerText,
    });
    console.log(`[PDF] HTML renderizado en ${Date.now() - startTime}ms`);

    // Obtener instancia del navegador (reutilizada o nueva)
    console.log(`[PDF] Obteniendo instancia de navegador...`);
    const browser = await getBrowserInstance();
    console.log(`[PDF] Navegador obtenido en ${Date.now() - startTime}ms`);

    // Crear una nueva página
    console.log(`[PDF] Creando nueva página...`);
    const page = await browser.newPage();

    try {
      // Configurar timeouts de página
      page.setDefaultTimeout(10000); // 10 segundos (reducido)
      page.setDefaultNavigationTimeout(10000);

      // Configurar y generar el PDF
      console.log(`[PDF] Cargando contenido HTML en la página...`);
      await page.setContent(html, {
        waitUntil: "domcontentloaded", // No esperar recursos de red ya que todo está en base64
        timeout: 8000, // 8 segundos
      });
      console.log(
        `[PDF] Contenido HTML cargado en ${Date.now() - startTime}ms`
      );

      // Ya no necesitamos esperar imágenes porque están todas embebidas en base64
      // Pequeña espera para asegurar que el DOM se haya renderizado
      await page.waitForTimeout(500);

      await page.emulateMediaType("screen");

      console.log(`[PDF] Generando PDF...`);
      const pdfBuffer = await page.pdf({
        format: pdfOptions.format as any,
        printBackground: true,
        margin: pdfOptions.margin,
        timeout: 10000, // 10 segundos
      });
      console.log(
        `[PDF] PDF generado exitosamente en ${Date.now() - startTime}ms`
      );

      // Cerrar la página (no el navegador, para reutilizarlo)
      await page.close();

      // Devolver el buffer del PDF y los datos utilizados
      return {
        pdfBuffer: Buffer.from(pdfBuffer),
        quotation: quotationWithContactData,
        organization,
        footerText,
      };
    } catch (error) {
      // Asegurar que la página se cierre en caso de error
      try {
        await page.close();
      } catch (closeError) {
        console.warn("[PDF] Error cerrando página:", closeError);
      }
      throw error;
    }
  } catch (error) {
    console.error(
      `[PDF] Error generando PDF de cotización (${Date.now() - startTime}ms):`,
      error
    );
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
