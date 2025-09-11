"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_GROUPS = exports.API_PERMISSIONS = void 0;
// Permisos disponibles para tokens de API
exports.API_PERMISSIONS = {
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
};
// Grupos de permisos predefinidos
exports.PERMISSION_GROUPS = {
    READ_ONLY: [
        exports.API_PERMISSIONS.CONTACTS_READ,
        exports.API_PERMISSIONS.DEALS_READ,
        exports.API_PERMISSIONS.QUOTATIONS_READ,
        exports.API_PERMISSIONS.PRODUCTS_READ,
        exports.API_PERMISSIONS.INVOICES_READ,
    ],
    SALES: [
        exports.API_PERMISSIONS.CONTACTS_READ,
        exports.API_PERMISSIONS.CONTACTS_WRITE,
        exports.API_PERMISSIONS.DEALS_READ,
        exports.API_PERMISSIONS.DEALS_WRITE,
        exports.API_PERMISSIONS.QUOTATIONS_READ,
        exports.API_PERMISSIONS.QUOTATIONS_WRITE,
        exports.API_PERMISSIONS.PRODUCTS_READ,
    ],
    FULL_ACCESS: [exports.API_PERMISSIONS.ADMIN_ALL],
    WHATSAPP_BOT: [
        exports.API_PERMISSIONS.WHATSAPP_SEND,
        exports.API_PERMISSIONS.WHATSAPP_READ,
        exports.API_PERMISSIONS.CONTACTS_READ,
        exports.API_PERMISSIONS.CONTACTS_WRITE,
    ],
};
