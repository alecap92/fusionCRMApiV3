import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Variables globales para la base de datos de pruebas
let mongoServer: MongoMemoryServer;

// Configuración antes de todas las pruebas
beforeAll(async () => {
  // Crear instancia de MongoDB en memoria
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Conectar a la base de datos de pruebas
  await mongoose.connect(mongoUri);
});

// Limpieza después de cada prueba
afterEach(async () => {
  // Limpiar todas las colecciones
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Limpieza después de todas las pruebas
afterAll(async () => {
  // Cerrar conexión a la base de datos
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  // Detener el servidor de MongoDB en memoria
  await mongoServer.stop();
});

// Mock de variables de entorno para pruebas
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/fusioncol-test";

// Mock de console.log para pruebas más limpias
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Helpers para las pruebas
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

export const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};
