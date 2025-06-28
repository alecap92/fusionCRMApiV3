import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IAuthRequest } from "../types/index";
import { IUserPayload } from "../models/UserModel";
import UserModel from "../models/UserModel";
import OrganizationModel from "../models/OrganizationModel";

dotenv.config();

const secretKey = process.env.SECRET_KEY as string;

// Función para generar un token JWT
export const generateToken = (
  user: IUserPayload,
  rememberMe = false
): string => {
  const payload: IUserPayload = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobile: user.mobile,
    organizationId: user.organizationId,
    rememberMe,
    role: user.role || "",
    iat: Math.floor(Date.now() / 1000), // Añadir timestamp de emisión
  };

  // Ajustar la expiración según "rememberMe"
  // Si rememberMe es true: 30 días
  // Si rememberMe es false: 24 horas
  const expiresIn = rememberMe ? "30d" : "24h";
  const token = jwt.sign(payload, secretKey, { expiresIn });

  return token;
};

// Middleware para verificar el token JWT
export const verifyToken = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Formato de token incorrecto" });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as IUserPayload;

    // Verificar si el usuario existe y sigue activo
    const user = await UserModel.findById(decoded._id);
    if (!user) {
      return res.status(401).json({
        message: "Usuario no encontrado",
        code: "USER_NOT_FOUND",
      });
    }

    // Verificar si el usuario sigue siendo parte de la organización
    const organization = await OrganizationModel.findById(
      decoded.organizationId
    );
    if (
      !organization ||
      !organization.employees.includes(user._id.toString())
    ) {
      return res.status(401).json({
        message: "Usuario no pertenece a la organización",
        code: "USER_NOT_IN_ORGANIZATION",
      });
    }

    // Verificar si el token fue emitido antes del último logout global
    if (
      user.lastLogoutAt &&
      decoded.iat &&
      decoded.iat * 1000 < user.lastLogoutAt.getTime()
    ) {
      return res.status(401).json({
        message: "Sesión cerrada globalmente",
        code: "GLOBAL_LOGOUT",
      });
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    console.log("error en verifyToken", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token no válido" });
    }
    console.error("Error verifying token: ", error.message);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Middleware para verificar y extraer información del token JWT (similar a verifyToken, si lo quieres separado)
export const verifySession = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Formato de token incorrecto" });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as IUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error verifying session:", error);
    res.status(401).json({ message: "Token no válido" });
  }
};
