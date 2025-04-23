import mongoose from "mongoose";
import dotenv from "dotenv";

// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Definir el tipo de la función connect
export const connect = async () => {
  const mongoUri = process.env.MONGODB_CONNECTION;

  if (!mongoUri) {
    console.error(
      "MONGODB_CONNECTION is not defined in the environment variables"
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Connection error:", error);
    process.exit(1);
  }
};
