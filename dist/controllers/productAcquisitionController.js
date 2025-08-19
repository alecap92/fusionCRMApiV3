"use strict";
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
exports.productAcquisitionController = void 0;
const ProductAcquisitionModel_1 = __importDefault(require("../models/ProductAcquisitionModel"));
const mongoose_1 = require("mongoose");
exports.productAcquisitionController = {
    // Registrar nueva adquisición
    createAcquisition(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { organizationId, userId } = req.user;
                const { clientId, productId, variantId, dealId, quotationId, invoiceId, quantity, priceAtAcquisition, acquisitionDate, notes, tags } = req.body;
                // Convertir variantId a ObjectId solo si no es un string vacío
                const processedVariantId = variantId && variantId !== ""
                    ? new mongoose_1.Types.ObjectId(variantId)
                    : "";
                const acquisition = new ProductAcquisitionModel_1.default({
                    organizationId: new mongoose_1.Types.ObjectId(organizationId),
                    clientId: new mongoose_1.Types.ObjectId(clientId),
                    productId: new mongoose_1.Types.ObjectId(productId),
                    variantId: processedVariantId,
                    dealId: dealId ? new mongoose_1.Types.ObjectId(dealId) : undefined,
                    quotationId: quotationId ? new mongoose_1.Types.ObjectId(quotationId) : undefined,
                    invoiceId: invoiceId ? new mongoose_1.Types.ObjectId(invoiceId) : undefined,
                    quantity,
                    priceAtAcquisition,
                    acquisitionDate: new Date(acquisitionDate),
                    notes,
                    tags,
                    userId: new mongoose_1.Types.ObjectId(userId)
                });
                yield acquisition.save();
                res.status(201).json(acquisition);
            }
            catch (error) {
                console.error('Error al registrar la adquisición:', error);
                res.status(500).json({ error: 'Error al registrar la adquisición' });
            }
        });
    },
    // Listar adquisiciones por cliente
    getClientAcquisitions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { clientId, organizationId } = req.params;
                const { startDate, endDate, status } = req.query;
                const query = {
                    clientId,
                    organizationId
                };
                if (startDate && endDate) {
                    query.acquisitionDate = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    };
                }
                if (status) {
                    query.status = status;
                }
                const acquisitions = yield ProductAcquisitionModel_1.default.find(query)
                    .populate('productId')
                    .populate('variantId')
                    .sort({ acquisitionDate: -1 });
                res.json(acquisitions);
            }
            catch (error) {
                console.error('Error al obtener las adquisiciones del cliente:', error);
                res.status(500).json({ error: 'Error al obtener las adquisiciones del cliente' });
            }
        });
    },
    // Obtener estadísticas de adquisiciones
    getAcquisitionStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { organizationId } = req.user;
                const { startDate, endDate } = req.query;
                const matchStage = {
                    organizationId: new mongoose_1.Types.ObjectId(organizationId)
                };
                if (startDate && endDate) {
                    matchStage.acquisitionDate = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    };
                }
                // Productos más vendidos
                const topProducts = yield ProductAcquisitionModel_1.default.aggregate([
                    { $match: matchStage },
                    {
                        $group: {
                            _id: '$productId',
                            totalQuantity: { $sum: '$quantity' },
                            totalRevenue: { $sum: { $multiply: ['$quantity', '$priceAtAcquisition'] } }
                        }
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 }
                ]);
                // Tendencias temporales
                const temporalTrends = yield ProductAcquisitionModel_1.default.aggregate([
                    { $match: matchStage },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$acquisitionDate' },
                                month: { $month: '$acquisitionDate' }
                            },
                            totalQuantity: { $sum: '$quantity' },
                            totalRevenue: { $sum: { $multiply: ['$quantity', '$priceAtAcquisition'] } }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ]);
                // Desglose por variante (solo para adquisiciones con variante)
                const variantBreakdown = yield ProductAcquisitionModel_1.default.aggregate([
                    {
                        $match: Object.assign(Object.assign({}, matchStage), { variantId: { $ne: "" } // Solo incluir adquisiciones con variante
                         })
                    },
                    {
                        $group: {
                            _id: '$variantId',
                            totalQuantity: { $sum: '$quantity' }
                        }
                    },
                    { $sort: { totalQuantity: -1 } }
                ]);
                res.json({
                    topProducts,
                    temporalTrends,
                    variantBreakdown
                });
            }
            catch (error) {
                console.error('Error al obtener estadísticas de adquisiciones:', error);
                res.status(500).json({ error: 'Error al obtener estadísticas de adquisiciones' });
            }
        });
    }
};
