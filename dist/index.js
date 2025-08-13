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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const db_1 = require("./config/db");
const socket_1 = require("./config/socket");
const routes_1 = __importDefault(require("./routes"));
const authMiddleware_1 = require("./middlewares/authMiddleware");
require("./config/cron");
const imapClient_1 = require("./utils/imapClient");
// Inicialización de servicios
const initializeServices = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, db_1.connect)();
    (0, imapClient_1.listenForNewEmails)();
});
// Configuración de middleware
const configureMiddleware = (app) => {
    // Configuración mejorada de CORS para Firebase Auth
    app.use((0, cors_1.default)({
        origin: [
            "http://localhost:3000",
            "http://localhost:5173", // Vite dev server
            "https://fusioncrm-86214.firebaseapp.com",
            "https://fusioncol.vercel.app", // Si usas Vercel
            "https://app.fusioncol.com", // Si usas Vercel
            // Agregar tu dominio de producción aquí
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
        ],
        exposedHeaders: ["Authorization"],
        optionsSuccessStatus: 200, // Para navegadores legacy
    }));
    // Headers adicionales para Firebase Auth popups
    app.use((req, res, next) => {
        res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
        res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
        next();
    });
    // Middleware condicional para parseo de body
    app.use((req, res, next) => {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("multipart/form-data")) {
            express_1.default.json()(req, res, next);
        }
        else {
            next();
        }
    });
    app.use((req, res, next) => {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("multipart/form-data")) {
            express_1.default.urlencoded({ extended: false })(req, res, next);
        }
        else {
            next();
        }
    });
};
console.log("routes", routes_1.default);
// Configuración de rutas
const configureRoutes = (app) => {
    // Rutas que requieren autenticación
    const protectedRoutes = [
        { path: "/api/v1/contacts", router: routes_1.default.contactsRouter },
        { path: "/api/v1/users", router: routes_1.default.userRouter },
        { path: "/api/v1/organizations", router: routes_1.default.organizationRouter },
        { path: "/api/v1/push-token", router: routes_1.default.pushTokenRouter },
        { path: "/api/v1/deals", router: routes_1.default.dealsRouter },
        { path: "/api/v1/status", router: routes_1.default.statusRouter },
        { path: "/api/v1/pipelines", router: routes_1.default.pipelinesRouter },
        { path: "/api/v1/deals-fields", router: routes_1.default.dealsFieldsRouter },
        { path: "/api/v1/activities", router: routes_1.default.activityRouter },
        { path: "/api/v1/quotations", router: routes_1.default.quotationRouter },
        { path: "/api/v1/lists", router: routes_1.default.listRouter },
        { path: "/api/v1/fragments", router: routes_1.default.fragmentRouter },
        { path: "/api/v1/products", router: routes_1.default.productRouter },
        { path: "/api/v1/notifications", router: routes_1.default.notificationRouter },
        { path: "/api/v1/import", router: routes_1.default.importRouter },
        { path: "/api/v1/advancedSearch", router: routes_1.default.advancedSearchRouter },
        { path: "/api/v1/projects", router: routes_1.default.projectRouter },
        { path: "/api/v1/tasks", router: routes_1.default.taskRouter },
        { path: "/api/v1/campanas", router: routes_1.default.campanasRouter },
        { path: "/api/v1/leads-generation", router: routes_1.default.leadsGenerationRouter },
        { path: "/api/v1/reports", router: routes_1.default.reportsRouter },
        { path: "/api/v1/purchases", router: routes_1.default.purchaseRouter },
        { path: "/api/v1/sendMasiveEmails", router: routes_1.default.sendMasiveEmailsRouter },
        { path: "/api/v1/email-marketing", router: routes_1.default.emailMarketing },
        { path: "/api/v1/email-templates", router: routes_1.default.emailTemplatesRouter },
        { path: "/api/v1/integrations", router: routes_1.default.integrationsRouter },
        { path: "/api/v1/automations", router: routes_1.default.automationRouter },
        {
            path: "/api/v1/automation-system",
            router: routes_1.default.automationSystemRouter,
        },
        { path: "/api/v1/execution-logs", router: routes_1.default.executionLogRouter },
        { path: "/api/v1/social/posts", router: routes_1.default.postRouter },
        { path: "/api/v1/social/accounts", router: routes_1.default.socialAccountRouter },
        { path: "/api/v1/invoices", router: routes_1.default.invoiceRouter },
        {
            path: "/api/v1/invoiceConfig",
            router: routes_1.default.invoiceConfigRouter,
        },
        {
            path: "/api/v1/notas-credito",
            router: routes_1.default.creditNoteRouter,
        },
        {
            path: "/api/v1/product-variants",
            router: routes_1.default.productVariantRouter,
        },
        {
            path: "/api/v1/product-acquisitions",
            router: routes_1.default.productAcquisitionRouter,
        },
        {
            path: "/api/v1/scoring-rules",
            router: routes_1.default.scoringRulesRouter,
        },
        {
            path: "/api/v1/analytics",
            router: routes_1.default.analyticsRouter,
        },
        {
            path: "/api/v1/strategies",
            router: routes_1.default.strategyRouter,
        },
    ];
    // Rutas especiales (con o sin autenticación)
    const specialRoutes = [
        { path: "/api/v1/webhook-endpoints", router: routes_1.default.webhookAdminRouter },
        { path: "/api/v1/webhooks", router: routes_1.default.webhookRouter },
    ];
    // Rutas públicas
    const publicRoutes = [
        { path: "/api/v1/auth", router: routes_1.default.authRouter },
        { path: "/api/auth", router: routes_1.default.authRouter },
        { path: "/api/v1/chat", router: routes_1.default.chatRouter },
        { path: "/api/v1/files", router: routes_1.default.fileRouter },
        { path: "/api/v1/forms", router: routes_1.default.formRouter },
        { path: "/api/v1/email", router: routes_1.default.emailrouter },
        { path: "/api/v1/contactsApi", router: routes_1.default.contactsApi },
        { path: "/api/v1/dealsApi", router: routes_1.default.dealsApi },
        { path: "/api/v1/download-deals", router: routes_1.default.downloadDealsRouter },
        {
            path: "/api/v1/documents",
            router: routes_1.default.documentRouter,
        },
        {
            path: "/api/v1/contact-files",
            router: routes_1.default.contactFilesRouter,
        },
        {
            path: "/api/v1/conversation",
            router: routes_1.default.conversationRouter,
        },
    ];
    // Registrar rutas protegidas
    protectedRoutes.forEach(({ path, router }) => {
        app.use(path, authMiddleware_1.verifyToken, router);
    });
    // Registrar rutas especiales
    specialRoutes.forEach(({ path, router }) => {
        app.use(path, router);
    });
    // Registrar rutas públicas
    publicRoutes.forEach(({ path, router }) => {
        app.use(path, router);
    });
    // Configurar directorio público
    const publicDirectoryPath = path_1.default.join(__dirname, "..", "public");
    app.use(express_1.default.static(publicDirectoryPath));
};
// Función principal para iniciar la aplicación
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Inicializar servicios
        yield initializeServices();
        // Crear aplicación Express
        const app = (0, express_1.default)();
        const server = (0, http_1.createServer)(app);
        // Inicializar Socket.IO
        const io = (0, socket_1.initializeSocket)(server);
        // Configurar middleware
        configureMiddleware(app);
        // Configurar rutas
        configureRoutes(app);
        // Iniciar servidor
        const PORT = parseInt(process.env.PORT || "3001", 10);
        server.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });
        return { app, server, io };
    }
    catch (error) {
        console.error("Error al iniciar el servidor:", error instanceof Error ? error.message : "Error desconocido");
        process.exit(1);
    }
});
// Iniciar la aplicación
if (require.main === module) {
    startServer().catch((error) => {
        console.error("Error fatal al iniciar la aplicación:", error instanceof Error ? error.message : "Error desconocido");
        process.exit(1);
    });
}
exports.default = startServer;
