// tests/controller-test.ts
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import request from "supertest";
import AutomationModel from "../models/AutomationModel";
import ExecutionLogModel from "../models/ExecutionLogModel";
// Importar el router correcto según tu estructura de archivos
import automationRouter from "../routes/automationRouter";
// Import the IAuthRequest interface that you're using in your auth middleware
import { IAuthRequest } from "../types/index";

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();
app.use(bodyParser.json());

// Simular middleware de autenticación
// Modify to use IAuthRequest instead of Request
app.use((req: IAuthRequest, res: Response, next: NextFunction) => {
  const userId = new mongoose.Types.ObjectId();
  const orgId = new mongoose.Types.ObjectId();

  req.user = {
    _id: userId.toString(),
    organizationId: orgId.toString(),
    email: "test@example.com",
    role: "admin",
  };
  next();
});

// Agregar las rutas de automatización
app.use("/api/v1/automations", automationRouter);

// Conectar a la base de datos
const mongoUri = process.env.MONGODB_CONNECTION;
if (!mongoUri) {
  console.error(
    "Error: MONGODB_CONNECTION no está definido en las variables de entorno"
  );
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => console.error("Error de MongoDB:", err));

// Función para ejecutar las pruebas de API
async function runApiTests() {
  try {
    console.log("1. Crear una nueva automatización");
    const createResponse = await request(app)
      .post("/api/v1/automations")
      .send({
        name: "Automatización API Test",
        description: "Creada a través de la API",
        nodes: [
          {
            id: "1",
            type: "trigger",
            module: "deals",
            event: "created",
            next: ["2"],
          },
          {
            id: "2",
            type: "http_request",
            method: "POST",
            url: "https://webhook.site/123456",
            body: {
              dealId: "{{deal._id}}",
              message: "Nuevo trato creado",
            },
            next: ["3"],
          },
          {
            id: "3",
            type: "transform",
            transformations: [
              {
                outputField: "notificationMessage",
                expression: "'Nuevo trato: ' + deal.name",
              },
            ],
            next: ["4"],
          },
          {
            id: "4",
            type: "send_email",
            to: "ventas@example.com",
            subject: "Nuevo trato creado",
            emailBody: "<p>{{notificationMessage}}</p>",
          },
        ],
      });

    console.log(
      "Respuesta de creación:",
      createResponse.status,
      createResponse.body
    );
    const automationId = createResponse.body._id;

    console.log("\n2. Obtener la automatización creada");
    const getResponse = await request(app).get(
      `/api/v1/automations/${automationId}`
    );

    console.log("Respuesta de obtención:", getResponse.status);

    console.log("\n3. Actualizar la automatización");
    const updateResponse = await request(app)
      .patch(`/api/v1/automations/${automationId}`)
      .send({
        name: "Automatización Actualizada",
        isActive: true,
      });

    console.log("Respuesta de actualización:", updateResponse.status, {
      name: updateResponse.body.name,
      isActive: updateResponse.body.isActive,
    });

    console.log("\n4. Ejecutar la automatización");
    const executeResponse = await request(app)
      .post(`/api/v1/automations/${automationId}/execute`)
      .send({
        testData: {
          deal: {
            _id: "ABC123",
            name: "Contrato con Cliente XYZ",
            value: 5000,
          },
        },
      });

    console.log(
      "Respuesta de ejecución:",
      executeResponse.status,
      executeResponse.body
    );

    // Esperar a que la ejecución termine
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verificar el log de ejecución
    const executionId = executeResponse.body.executionId;
    const executionLog = await ExecutionLogModel.findOne({ executionId });

    console.log("\nLog de ejecución:");
    console.log("Estado:", executionLog?.status);
    console.log("Tiempo de ejecución:", executionLog?.executionTime, "ms");

    console.log("\n5. Obtener todas las automatizaciones");
    const getAllResponse = await request(app).get("/api/v1/automations");

    console.log("Respuesta de obtener todas:", getAllResponse.status, {
      count: getAllResponse.body.length,
    });

    console.log("\n6. Eliminar la automatización");
    const deleteResponse = await request(app).delete(
      `/api/v1/automations/${automationId}`
    );

    console.log(
      "Respuesta de eliminación:",
      deleteResponse.status,
      deleteResponse.body
    );

    console.log("\nPruebas completadas con éxito");
  } catch (error) {
    console.error("Error en las pruebas de API:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar las pruebas
runApiTests();
