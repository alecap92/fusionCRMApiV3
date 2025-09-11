import { Response } from "express";
import crypto from "crypto";
import { IAuthRequest } from "../../types/index";
import {
  ICreateApiTokenRequest,
  ICreateApiTokenResponse,
  API_PERMISSIONS,
  PERMISSION_GROUPS,
} from "../../types/apiTypes";
import { generateApiToken } from "../../middlewares/authApiMiddleware";
import ApiTokenModel, { IApiToken } from "../../models/ApiTokenModel";

// Crear un nuevo token de API
export const createApiToken = async (req: IAuthRequest, res: Response) => {
  try {
    const {
      name,
      permissions,
      expiresIn = "365d",
      description,
    }: ICreateApiTokenRequest = req.body;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        message: "Usuario no autenticado",
        code: "USER_NOT_AUTHENTICATED",
      });
    }

    // Validaciones básicas
    if (!name || !permissions || permissions.length === 0) {
      return res.status(400).json({
        message: "Nombre y permisos son requeridos",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Validar que los permisos son válidos
    const validPermissions = Object.values(API_PERMISSIONS);
    const invalidPermissions = permissions.filter(
      (p) => !validPermissions.includes(p as any)
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        message: "Permisos inválidos",
        code: "INVALID_PERMISSIONS",
        invalidPermissions,
      });
    }

    // Verificar si ya existe un token con el mismo nombre para este usuario
    const existingToken = await ApiTokenModel.findOne({
      userId,
      organizationId,
      name,
      isActive: true,
    });

    if (existingToken) {
      return res.status(400).json({
        message: "Ya existe un token activo con ese nombre",
        code: "TOKEN_NAME_EXISTS",
      });
    }

    // Generar el token JWT
    const token = generateApiToken(
      {
        _id: userId,
        email: req.user!.email,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        organizationId,
      },
      name,
      expiresIn
    );

    // Calcular fecha de expiración
    let expiresAt: Date | null = null;
    if (expiresIn !== "never") {
      const duration = parseDuration(expiresIn);
      if (duration) {
        expiresAt = new Date(Date.now() + duration);
      }
    }

    // Guardar el token en la base de datos
    const apiToken = new ApiTokenModel({
      userId,
      organizationId,
      name,
      description,
      tokenHash: token, // En producción, considera usar hash del token
      permissions,
      isActive: true,
      expiresAt,
      createdBy: userId,
    });

    await apiToken.save();

    const response: ICreateApiTokenResponse = {
      token,
      tokenId: apiToken._id.toString(),
      name: apiToken.name,
      permissions: apiToken.permissions,
      expiresAt: apiToken.expiresAt || null,
      createdAt: apiToken.createdAt,
    };

    res.status(201).json({
      message: "Token de API creado exitosamente",
      data: response,
      warning: "Guarde este token de forma segura. No podrá verlo nuevamente.",
    });
  } catch (error) {
    console.error("Error creating API token:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Listar tokens de API del usuario
export const listApiTokens = async (req: IAuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        message: "Usuario no autenticado",
        code: "USER_NOT_AUTHENTICATED",
      });
    }

    const tokens = await ApiTokenModel.find({
      userId,
      organizationId,
    })
      .sort({ createdAt: -1 })
      .select("-tokenHash"); // Excluir el hash del token

    res.json({
      message: "Tokens de API obtenidos exitosamente",
      data: tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error("Error listing API tokens:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Revocar/desactivar un token de API
export const revokeApiToken = async (req: IAuthRequest, res: Response) => {
  try {
    const { tokenId } = req.params;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        message: "Usuario no autenticado",
        code: "USER_NOT_AUTHENTICATED",
      });
    }

    const token = await ApiTokenModel.findOne({
      _id: tokenId,
      userId,
      organizationId,
    });

    if (!token) {
      return res.status(404).json({
        message: "Token no encontrado",
        code: "TOKEN_NOT_FOUND",
      });
    }

    await (token as any).deactivate();

    res.json({
      message: "Token de API revocado exitosamente",
      data: { tokenId: token._id },
    });
  } catch (error) {
    console.error("Error revoking API token:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Obtener permisos disponibles y grupos predefinidos
export const getApiPermissions = async (req: IAuthRequest, res: Response) => {
  try {
    res.json({
      message: "Permisos de API obtenidos exitosamente",
      data: {
        permissions: API_PERMISSIONS,
        groups: PERMISSION_GROUPS,
      },
    });
  } catch (error) {
    console.error("Error getting API permissions:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Renovar un token de API (crear uno nuevo y desactivar el anterior)
export const renewApiToken = async (req: IAuthRequest, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { expiresIn = "365d" } = req.body;
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        message: "Usuario no autenticado",
        code: "USER_NOT_AUTHENTICATED",
      });
    }

    const oldToken = await ApiTokenModel.findOne({
      _id: tokenId,
      userId,
      organizationId,
      isActive: true,
    });

    if (!oldToken) {
      return res.status(404).json({
        message: "Token no encontrado o inactivo",
        code: "TOKEN_NOT_FOUND",
      });
    }

    // Crear nuevo token con la misma configuración
    const newToken = generateApiToken(
      {
        _id: userId,
        email: req.user!.email,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        organizationId,
      },
      oldToken.name,
      expiresIn
    );

    // Calcular nueva fecha de expiración
    let expiresAt: Date | null = null;
    if (expiresIn !== "never") {
      const duration = parseDuration(expiresIn);
      if (duration) {
        expiresAt = new Date(Date.now() + duration);
      }
    }

    // Crear nuevo registro de token
    const newApiToken = new ApiTokenModel({
      userId,
      organizationId,
      name: oldToken.name,
      description: oldToken.description,
      tokenHash: newToken,
      permissions: oldToken.permissions,
      isActive: true,
      expiresAt,
      createdBy: userId,
    });

    await newApiToken.save();

    // Desactivar el token anterior
    await (oldToken as any).deactivate();

    const response: ICreateApiTokenResponse = {
      token: newToken,
      tokenId: newApiToken._id.toString(),
      name: newApiToken.name,
      permissions: newApiToken.permissions,
      expiresAt: newApiToken.expiresAt || null,
      createdAt: newApiToken.createdAt,
    };

    res.json({
      message: "Token de API renovado exitosamente",
      data: response,
      warning:
        "Guarde este nuevo token de forma segura. El token anterior ha sido revocado.",
    });
  } catch (error) {
    console.error("Error renewing API token:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

// Función helper para parsear duración
function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) return null;

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case "m":
      return num * 60 * 1000; // minutos
    case "h":
      return num * 60 * 60 * 1000; // horas
    case "d":
      return num * 24 * 60 * 60 * 1000; // días
    default:
      return null;
  }
}
