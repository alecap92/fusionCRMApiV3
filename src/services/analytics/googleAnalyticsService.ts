import { JWT } from "google-auth-library";
import { google } from "googleapis";

interface GoogleAnalyticsDataRequest {
  propertyId: string;
  dateRanges: { startDate: string; endDate: string; name?: string }[];
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
}

export interface GoogleAnalyticsCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

/**
 * Crea una instancia del cliente de Google Analytics
 * @param credentials - Credenciales de la cuenta de servicio
 * @returns Cliente JWT autorizado
 */
const createAnalyticsClient = async (
  credentials: GoogleAnalyticsCredentials
) => {
  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  await jwtClient.authorize();
  return jwtClient;
};

/**
 * Ejecuta un reporte contra la API de Google Analytics Data
 * @param credentials - Credenciales de la cuenta de servicio
 * @param request - Parámetros de la solicitud del reporte
 * @returns Datos de respuesta de la API
 * @throws Error si la solicitud a la API falla
 */
export const runAnalyticsReport = async (
  credentials: GoogleAnalyticsCredentials,
  request: GoogleAnalyticsDataRequest
): Promise<any> => {
  try {
    const jwtClient = await createAnalyticsClient(credentials);

    const response = await google.analyticsdata("v1beta").properties.runReport({
      auth: jwtClient,
      property: `properties/${request.propertyId}`,
      requestBody: {
        dateRanges: request.dateRanges,
        dimensions: request.dimensions,
        metrics: request.metrics,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Error ejecutando reporte GA4:", error);
    throw new Error(`Error al ejecutar reporte GA4: ${error.message}`);
  }
};
