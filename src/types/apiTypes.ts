import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

// Interface para el payload del token de API
export interface IApiTokenPayload extends JwtPayload {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  tokenName: string;
  type: "api";
}

// Interface para la información del usuario en API requests
export interface IApiUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  tokenName: string;
}

// Interface para la información del token de API
export interface IApiTokenInfo {
  id: string;
  name: string;
  permissions: string[];
}

// Interface extendida de Request para API authentication
export interface IApiAuthRequest extends Request {
  apiUser?: IApiUser;
  apiToken?: IApiTokenInfo;
}

// Tipos para crear tokens de API
export interface ICreateApiTokenRequest {
  name: string;
  permissions: string[];
  expiresIn?: string; // "365d", "30d", "never", etc.
  description?: string;
}

export interface ICreateApiTokenResponse {
  token: string;
  tokenId: string;
  name: string;
  permissions: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

// Permisos disponibles para tokens de API
export const API_PERMISSIONS = {
  // Contactos
  CONTACTS_READ: "contacts:read",
  CONTACTS_WRITE: "contacts:write",
  CONTACTS_DELETE: "contacts:delete",

  // Deals
  DEALS_READ: "deals:read",
  DEALS_WRITE: "deals:write",
  DEALS_DELETE: "deals:delete",

  // Cotizaciones
  QUOTATIONS_READ: "quotations:read",
  QUOTATIONS_WRITE: "quotations:write",
  QUOTATIONS_DELETE: "quotations:delete",

  // WhatsApp
  WHATSAPP_SEND: "whatsapp:send",
  WHATSAPP_READ: "whatsapp:read",

  // Productos
  PRODUCTS_READ: "products:read",
  PRODUCTS_WRITE: "products:write",

  // Facturas
  INVOICES_READ: "invoices:read",
  INVOICES_WRITE: "invoices:write",

  // Administración
  ADMIN_ALL: "*", // Acceso completo
} as const;

export type ApiPermission =
  (typeof API_PERMISSIONS)[keyof typeof API_PERMISSIONS];

// Grupos de permisos predefinidos
export const PERMISSION_GROUPS = {
  READ_ONLY: [
    API_PERMISSIONS.CONTACTS_READ,
    API_PERMISSIONS.DEALS_READ,
    API_PERMISSIONS.QUOTATIONS_READ,
    API_PERMISSIONS.PRODUCTS_READ,
    API_PERMISSIONS.INVOICES_READ,
  ],

  SALES: [
    API_PERMISSIONS.CONTACTS_READ,
    API_PERMISSIONS.CONTACTS_WRITE,
    API_PERMISSIONS.DEALS_READ,
    API_PERMISSIONS.DEALS_WRITE,
    API_PERMISSIONS.QUOTATIONS_READ,
    API_PERMISSIONS.QUOTATIONS_WRITE,
    API_PERMISSIONS.PRODUCTS_READ,
  ],

  FULL_ACCESS: [API_PERMISSIONS.ADMIN_ALL],

  WHATSAPP_BOT: [
    API_PERMISSIONS.WHATSAPP_SEND,
    API_PERMISSIONS.WHATSAPP_READ,
    API_PERMISSIONS.CONTACTS_READ,
    API_PERMISSIONS.CONTACTS_WRITE,
  ],
} as const;
