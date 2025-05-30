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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnalyticsReport = void 0;
const googleapis_1 = require("googleapis");
/**
 * Crea una instancia del cliente de Google Analytics
 * @param credentials - Credenciales de la cuenta de servicio
 * @returns Cliente JWT autorizado
 */
const createAnalyticsClient = (credentials) => __awaiter(void 0, void 0, void 0, function* () {
    const jwtClient = new googleapis_1.google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    yield jwtClient.authorize();
    return jwtClient;
});
/**
 * Ejecuta un reporte contra la API de Google Analytics Data
 * @param credentials - Credenciales de la cuenta de servicio
 * @param request - Parámetros de la solicitud del reporte
 * @returns Datos de respuesta de la API
 * @throws Error si la solicitud a la API falla
 */
const runAnalyticsReport = (credentials, request) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jwtClient = yield createAnalyticsClient(credentials);
        const response = yield googleapis_1.google.analyticsdata("v1beta").properties.runReport({
            auth: jwtClient,
            property: `properties/${request.propertyId}`,
            requestBody: {
                dateRanges: request.dateRanges,
                dimensions: request.dimensions,
                metrics: request.metrics,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error("Error ejecutando reporte GA4:", error);
        throw new Error(`Error al ejecutar reporte GA4: ${error.message}`);
    }
});
exports.runAnalyticsReport = runAnalyticsReport;
