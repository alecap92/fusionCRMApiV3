"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.reportsOverview = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const DealsFieldsModel_1 = __importDefault(require("../../models/DealsFieldsModel"));
const DealsFieldsValuesModel_1 = __importDefault(require("../../models/DealsFieldsValuesModel"));
const reportsOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "OrganizationId is required" });
        }
        const organizationObjectId = new mongoose_1.Types.ObjectId(organizationId);
        // Rango personalizado para métricas
        const { fromDate, toDate } = req.query;
        if (!fromDate || !toDate) {
            return res
                .status(400)
                .json({ error: "fromDate and toDate are required" });
        }
        const summaryStartDate = new Date(fromDate);
        const summaryEndDate = new Date(toDate);
        // Rango extendido para gráfica (13 meses)
        const chartEndDate = new Date();
        const chartStartDate = new Date();
        chartStartDate.setMonth(chartStartDate.getMonth() - 13);
        // 1. Obtener deals para métricas (basado en closingDate)
        const deals = yield DealsModel_1.default.find({
            organizationId: organizationObjectId,
            closingDate: { $gte: summaryStartDate, $lte: summaryEndDate },
        }).select("_id associatedContactId amount closingDate");
        const dealIds = deals.map((deal) => deal._id);
        // 2. Contactos únicos
        const uniqueContacts = new Set();
        for (const deal of deals) {
            const contactId = (_b = deal.associatedContactId) === null || _b === void 0 ? void 0 : _b.toString();
            if (contactId && mongoose_1.default.isValidObjectId(contactId)) {
                uniqueContacts.add(contactId);
            }
        }
        // 3. Total ventas y ticket promedio
        const totalSales = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
        const averageTicket = deals.length > 0 ? totalSales / deals.length : 0;
        // 4. Productos vendidos
        const productField = yield DealsFieldsModel_1.default.findOne({
            key: "cantidad_de_manillas",
        }).select("_id");
        let totalProductsSold = 0;
        if (productField) {
            const values = yield DealsFieldsValuesModel_1.default.find({
                deal: { $in: dealIds },
                field: productField._id,
            });
            totalProductsSold = values.reduce((sum, val) => {
                const parsed = parseInt(val.value, 10);
                return sum + (isNaN(parsed) ? 0 : parsed);
            }, 0);
        }
        // 5. Ventas por mes (últimos 13 meses)
        const monthlySales = yield DealsModel_1.default.aggregate([
            {
                $match: {
                    organizationId: organizationObjectId,
                    closingDate: { $gte: chartStartDate, $lte: chartEndDate },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$closingDate" },
                        month: { $month: "$closingDate" },
                    },
                    total: { $sum: "$amount" },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);
        const monthNames = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
        ];
        const months = [];
        const tempDate = new Date(chartStartDate);
        while (tempDate <= chartEndDate) {
            months.push({
                year: tempDate.getFullYear(),
                month: tempDate.getMonth() + 1,
            });
            tempDate.setMonth(tempDate.getMonth() + 1);
        }
        const salesMap = new Map();
        monthlySales.forEach((item) => {
            const key = `${item._id.year}-${item._id.month}`;
            salesMap.set(key, item.total);
        });
        const salesByMonth = months.map(({ year, month }) => {
            const key = `${year}-${month}`;
            return {
                month: `${monthNames[month - 1]} ${year}`,
                ventas: salesMap.get(key) || 0,
            };
        });
        // 6. Top clientes (últimos 3 meses)
        const topCustomerStartDate = new Date();
        topCustomerStartDate.setMonth(topCustomerStartDate.getMonth() - 3);
        const topCustomers = yield DealsModel_1.default.aggregate([
            {
                $match: {
                    organizationId: organizationObjectId,
                    closingDate: { $gte: topCustomerStartDate, $lte: summaryEndDate },
                },
            },
            {
                $group: {
                    _id: "$associatedContactId",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { total: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "contacts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "contact",
                },
            },
            { $unwind: "$contact" },
            {
                $project: {
                    _id: 1,
                    total: 1,
                    count: 1,
                    contactProperties: "$contact.properties",
                },
            },
        ]);
        const topCustomersWithDetails = topCustomers.map((customer) => customer.contactProperties.reduce((acc, prop) => {
            acc[prop.key] = prop.value;
            return acc;
        }, { total: customer.total, count: customer.count }));
        // 7. Respuesta final
        return res.status(200).json({
            summary: {
                totalSales,
                averageTicket,
                products: totalProductsSold,
                newCustomers: uniqueContacts.size,
                fromDate: summaryStartDate.toISOString(),
                toDate: summaryEndDate.toISOString(),
            },
            salesByMonth,
            topCustomersWithDetails,
        });
    }
    catch (error) {
        console.error("Error in reportsOverview:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error.message,
        });
    }
});
exports.reportsOverview = reportsOverview;
