import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { createServer, Server as HttpServer } from "http";
import { connect } from "./config/db";
import { initializeSocket, SocketIOInstance } from "./config/socket";
import routes from "./routes";
import { verifyToken } from "./middlewares/authMiddleware";
import "./config/cron";
import { listenForNewEmails } from "./utils/imapClient";

// Interfaces
interface RouteConfig {
  path: string;
  router: express.Router;
}

interface ServerInstance {
  app: Application;
  server: HttpServer;
  io: SocketIOInstance;
}

// Inicialización de servicios
const initializeServices = async (): Promise<void> => {
  await connect();
  listenForNewEmails();
};

// Configuración de middleware
const configureMiddleware = (app: Application): void => {
  app.use(cors());

  // Middleware condicional para parseo de body
  app.use((req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      express.urlencoded({ extended: false })(req, res, next);
    } else {
      next();
    }
  });
};

// Configuración de rutas
const configureRoutes = (app: Application): void => {
  // Rutas que requieren autenticación
  const protectedRoutes: RouteConfig[] = [
    { path: "/api/v1/contacts", router: routes.contactsRouter },
    { path: "/api/v1/users", router: routes.userRouter },
    { path: "/api/v1/organizations", router: routes.organizationRouter },
    { path: "/api/v1/push-token", router: routes.pushTokenRouter },
    { path: "/api/v1/deals", router: routes.dealsRouter },
    { path: "/api/v1/status", router: routes.statusRouter },
    { path: "/api/v1/pipelines", router: routes.pipelinesRouter },
    { path: "/api/v1/deals-fields", router: routes.dealsFieldsRouter },
    { path: "/api/v1/activities", router: routes.activityRouter },
    { path: "/api/v1/quotations", router: routes.quotationRouter },
    { path: "/api/v1/lists", router: routes.listRouter },
    { path: "/api/v1/fragments", router: routes.fragmentRouter },
    { path: "/api/v1/products", router: routes.productRouter },
    { path: "/api/v1/notifications", router: routes.notificationRouter },
    { path: "/api/v1/import", router: routes.importRouter },
    { path: "/api/v1/advancedSearch", router: routes.advancedSearchRouter },
    { path: "/api/v1/projects", router: routes.projectRouter },
    { path: "/api/v1/tasks", router: routes.taskRouter },
    { path: "/api/v1/campanas", router: routes.campanasRouter },
    { path: "/api/v1/leads-generation", router: routes.leadsGenerationRouter },
    { path: "/api/v1/reports", router: routes.reportsRouter },
    { path: "/api/v1/purchases", router: routes.purchaseRouter },
    { path: "/api/v1/sendMasiveEmails", router: routes.sendMasiveEmailsRouter },
    { path: "/api/v1/email-marketing", router: routes.emailMarketing },
    { path: "/api/v1/email-templates", router: routes.emailTemplatesRouter },
    { path: "/api/v1/integrations", router: routes.integrationsRouter },
    { path: "/api/v1/automations", router: routes.automationRouter },
    { path: "/api/v1/execution-logs", router: routes.executionLogRouter },
    { path: "/api/v1/social/posts", router: routes.postRouter },
    { path: "/api/v1/social/accounts", router: routes.socialAccountRouter },
    { path: "/api/v1/invoices", router: routes.invoiceRouter },
    {
      path: "/api/v1/invoiceConfig",
      router: routes.invoiceConfigRouter,
    },
    {
      path: "/api/v1/notas-credito",
      router: routes.creditNoteRouter,
    },
    {
      path: "/api/v1/product-variants",
      router: routes.productVariantRouter,
    },
    {
      path: "/api/v1/product-acquisitions",
      router: routes.productAcquisitionRouter,
    },
    {
      path: "/api/v1/scoring-rules",
      router: routes.scoringRulesRouter,
    },
    {
      path: "/api/v1/analytics",
      router: routes.analyticsRouter,
    },
    {
      path: "/api/v1/strategies",
      router: routes.strategyRouter,
    },
  ];

  // Rutas especiales (con o sin autenticación)
  const specialRoutes: RouteConfig[] = [
    { path: "/api/v1/webhook-endpoints", router: routes.webhookAdminRouter },
    { path: "/api/v1/webhooks", router: routes.webhookRouter },
  ];

  // Rutas públicas
  const publicRoutes: RouteConfig[] = [
    { path: "/api/v1/auth", router: routes.authRouter },
    { path: "/api/v1/chat", router: routes.chatRouter },
    { path: "/api/v1/files", router: routes.fileRouter },
    { path: "/api/v1/forms", router: routes.formRouter },
    { path: "/api/v1/email", router: routes.emailrouter },
    { path: "/api/v1/contactsApi", router: routes.contactsApi },
    { path: "/api/v1/dealsApi", router: routes.dealsApi },
    { path: "/api/v1/download-deals", router: routes.downloadDealsRouter },
    {
      path: "/api/v1/documents",
      router: routes.documentRouter,
    },
    {
      path: "/api/v1/contact-files",
      router: routes.contactFilesRouter,
    },
  ];

  // Registrar rutas protegidas
  protectedRoutes.forEach(({ path, router }) => {
    app.use(path, verifyToken, router);
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
  const publicDirectoryPath = path.join(__dirname, "..", "public");
  app.use(express.static(publicDirectoryPath));
};

// Función principal para iniciar la aplicación
const startServer = async (): Promise<ServerInstance> => {
  try {
    // Inicializar servicios
    await initializeServices();

    // Crear aplicación Express
    const app: Application = express();
    const server: HttpServer = createServer(app);

    // Inicializar Socket.IO
    const io: SocketIOInstance = initializeSocket(server);

    // Configurar middleware
    configureMiddleware(app);

    // Configurar rutas
    configureRoutes(app);

    // Iniciar servidor
    const PORT: number = parseInt(process.env.PORT || "3001", 10);
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });

    return { app, server, io };
  } catch (error) {
    console.error(
      "Error al iniciar el servidor:",
      error instanceof Error ? error.message : "Error desconocido"
    );
    process.exit(1);
  }
};

// Iniciar la aplicación
if (require.main === module) {
  startServer().catch((error: unknown) => {
    console.error(
      "Error fatal al iniciar la aplicación:",
      error instanceof Error ? error.message : "Error desconocido"
    );
    process.exit(1);
  });
}

export default startServer;
