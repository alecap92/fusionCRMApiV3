import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IApiAuthRequest, IApiTokenPayload } from "../types/apiTypes";
import UserModel from "../models/UserModel";
import OrganizationModel from "../models/OrganizationModel";
import ApiTokenModel from "../models/ApiTokenModel";

dotenv.config();

const apiSecretKey = process.env.API_SECRET_KEY;
if (!apiSecretKey) {
  throw new Error("API_SECRET_KEY environment variable is required");
}

// Función para generar un token de API JWT
export const generateApiToken = (
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
  },
  tokenName: string,
  expiresIn: string = "365d" // Por defecto 1 año para tokens de API
): string => {
  const payload = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    organizationId: user.organizationId,
    tokenName,
    type: "api" as const,
  };

  const token = jwt.sign(payload, apiSecretKey);
  return token;
};

// Middleware para verificar tokens de API JWT
export const verifyApiToken = async (
  req: IApiAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("Authorization") || req.header("X-API-Key");

  if (!authHeader) {
    return res.status(401).json({
      message: "Token de API no proporcionado",
      code: "API_TOKEN_MISSING",
      details:
        "Proporcione el token en el header 'Authorization: Bearer <token>' o 'X-API-Key: <token>'",
    });
  }

  // Soportar tanto "Bearer token" como token directo
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token) {
    return res.status(401).json({
      message: "Formato de token de API incorrecto",
      code: "API_TOKEN_FORMAT_ERROR",
    });
  }

  try {
    // Verificar el token JWT
    const decoded = jwt.verify(token, apiSecretKey) as IApiTokenPayload;

    // Verificar que es un token de tipo API
    if (decoded.type !== "api") {
      return res.status(401).json({
        message: "Token no válido para API",
        code: "INVALID_API_TOKEN_TYPE",
      });
    }

    // Verificar si el token existe en la base de datos y está activo
    const apiTokenRecord = await ApiTokenModel.findOne({
      tokenHash: token, // Usaremos el hash del token para búsqueda
      userId: decoded._id,
      isActive: true,
    });

    if (!apiTokenRecord) {
      return res.status(401).json({
        message: "Token de API no encontrado o inactivo",
        code: "API_TOKEN_NOT_FOUND",
      });
    }

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
        message: "Token invalidado por logout global",
        code: "GLOBAL_LOGOUT",
      });
    }

    // Actualizar último uso del token
    await ApiTokenModel.findByIdAndUpdate(apiTokenRecord._id, {
      lastUsedAt: new Date(),
    });

    // Agregar información del usuario y organización a la request
    req.apiUser = {
      _id: decoded._id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      organizationId: decoded.organizationId,
      tokenName: decoded.tokenName,
    };

    req.apiToken = {
      id: apiTokenRecord._id.toString(),
      name: apiTokenRecord.name,
      permissions: apiTokenRecord.permissions,
    };

    next();
  } catch (error: any) {
    console.log("Error en verifyApiToken", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token de API expirado",
        code: "API_TOKEN_EXPIRED",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Token de API no válido",
        code: "API_TOKEN_INVALID",
      });
    }

    console.error("Error verifying API token: ", error.message);
    return res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Middleware para verificar permisos específicos del token de API
export const requireApiPermission = (permission: string) => {
  return (req: IApiAuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiToken) {
      return res.status(401).json({
        message: "Token de API no verificado",
        code: "API_TOKEN_NOT_VERIFIED",
      });
    }

    const hasPermission =
      req.apiToken.permissions.includes(permission) ||
      req.apiToken.permissions.includes("*");

    if (!hasPermission) {
      return res.status(403).json({
        message: `Permiso insuficiente. Se requiere: ${permission}`,
        code: "INSUFFICIENT_API_PERMISSIONS",
        requiredPermission: permission,
        availablePermissions: req.apiToken.permissions,
      });
    }

    next();
  };
};
