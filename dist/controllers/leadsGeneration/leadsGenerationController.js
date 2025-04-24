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
exports.getGoogleMaps = void 0;
const axios_1 = __importDefault(require("axios"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const getGoogleMaps = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("googleMaps");
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const textQuery = req.query.textQuery;
        const limit = parseInt(req.query.limit) || 100; // Límite por defecto a 100
        // Verifica si la organización existe y tiene una API Key de Google Maps
        const organization = yield OrganizationModel_1.default.findOne({
            _id: organizationId,
        }).exec();
        if (!organization) {
            return res.status(400).json({ message: "Organization not found" });
        }
        if (!organization.settings.googleMaps.apiKey) {
            return res.status(400).json({ message: "Google Maps API Key not found" });
        }
        const googleMapsApiURL = process.env.GOOGLE_MAPS_API_URL || "";
        // Dividir textQuery por saltos de línea para manejar múltiples consultas
        const queries = textQuery.split("\n").filter((q) => q.trim() !== "");
        // Dividir el límite entre las consultas
        const queriesCount = queries.length;
        const limitPerQuery = Math.floor(limit / queriesCount);
        let contactsArray = []; // Array para almacenar los contactos obtenidos
        for (const query of queries) {
            let nextPageToken = null;
            let hasMorePages = true;
            // Mientras haya más páginas y no se exceda el límite por consulta
            while (hasMorePages && contactsArray.length < limit) {
                const body = { textQuery: query };
                if (nextPageToken) {
                    body.pageToken = nextPageToken;
                }
                const response = yield axios_1.default.post(googleMapsApiURL, body, {
                    headers: {
                        "X-Goog-Api-Key": organization.settings.googleMaps.apiKey,
                        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.internationalPhoneNumber,nextPageToken,places.primaryTypeDisplayName,places.shortFormattedAddress,places.types",
                    },
                });
                // Agregar resultados al array de contactos
                contactsArray.push(...response.data.places);
                // Verificar si hay un nextPageToken
                nextPageToken = response.data.nextPageToken || null;
                // Si no hay más token o alcanzamos el límite por consulta, detenemos el ciclo
                if (!nextPageToken ||
                    contactsArray.length >= limitPerQuery * queriesCount) {
                    hasMorePages = false;
                }
            }
            // Si alcanzamos el límite global, detenemos todas las consultas
            if (contactsArray.length >= limit) {
                break;
            }
        }
        // Enviamos la respuesta con el array de contactos, limitado a la cantidad solicitada
        res.status(200).json(contactsArray.slice(0, limit));
    }
    catch (error) {
        console.error("Error fetching Google Maps data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getGoogleMaps = getGoogleMaps;
