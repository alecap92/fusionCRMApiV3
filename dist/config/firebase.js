"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// Configuración de Firebase Admin
const firebaseConfig = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};
// Verificar configuración
const requiredFields = ["project_id", "private_key", "client_email"];
const missingFields = requiredFields.filter((field) => !firebaseConfig[field]);
if (missingFields.length > 0) {
    console.error("❌ Firebase Admin: Faltan variables de entorno:", missingFields);
    console.error("🔧 Asegúrate de configurar estas variables en el .env del backend");
}
// Inicializar Firebase Admin solo si no está ya inicializado
if (!firebase_admin_1.default.apps.length) {
    try {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(firebaseConfig),
        });
    }
    catch (error) {
        console.error("❌ Error inicializando Firebase Admin:", error);
    }
}
exports.auth = firebase_admin_1.default.auth();
exports.default = firebase_admin_1.default;
