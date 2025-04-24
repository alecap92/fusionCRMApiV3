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
exports.productVariantController = void 0;
const ProductVariantModel_1 = __importDefault(require("../models/ProductVariantModel"));
const mongoose_1 = require("mongoose");
exports.productVariantController = {
    // Listar variantes de un producto
    getProductVariants(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const { organizationId } = req.user;
                const variants = yield ProductVariantModel_1.default.find({
                    productId: new mongoose_1.Types.ObjectId(productId),
                    organizationId: new mongoose_1.Types.ObjectId(organizationId)
                });
                res.json(variants);
            }
            catch (error) {
                res.status(500).json({ error: 'Error al obtener las variantes del producto' });
            }
        });
    },
    // Crear nueva variante
    createVariant(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { organizationId, userId } = req.user;
                const { productId, attributeValues, sku, price, imageUrl, stock } = req.body;
                const variant = new ProductVariantModel_1.default({
                    organizationId: new mongoose_1.Types.ObjectId(organizationId),
                    productId: new mongoose_1.Types.ObjectId(productId),
                    attributeValues,
                    sku,
                    price,
                    imageUrl,
                    stock,
                    userId: new mongoose_1.Types.ObjectId(userId)
                });
                yield variant.save();
                res.status(201).json(variant);
            }
            catch (error) {
                res.status(500).json({ error: 'Error al crear la variante' });
            }
        });
    },
    // Crear varias variantes en lote
    createVariantBulk(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { organizationId, userId } = req.user;
                const { productId } = req.params;
                const { variants } = req.body;
                if (!Array.isArray(variants) || variants.length === 0) {
                    return res.status(400).json({ error: 'Se requiere un array de variantes' });
                }
                // Preparar todas las variantes para inserción
                const variantsToInsert = variants.map(variant => ({
                    organizationId: new mongoose_1.Types.ObjectId(organizationId),
                    productId: new mongoose_1.Types.ObjectId(productId),
                    attributeValues: variant.attributeValues,
                    sku: variant.sku,
                    price: variant.price,
                    imageUrl: variant.imageUrl || null,
                    stock: variant.stock || 0,
                    isActive: variant.isActive !== undefined ? variant.isActive : true,
                    userId: new mongoose_1.Types.ObjectId(userId),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }));
                // Insertar todas las variantes en una sola operación
                const result = yield ProductVariantModel_1.default.insertMany(variantsToInsert);
                res.status(201).json({
                    success: true,
                    message: `${result.length} variantes creadas correctamente`,
                    variants: result
                });
            }
            catch (error) {
                console.error('Error al crear variantes en lote:', error);
                // Manejar error de SKU duplicado
                if (error.code === 11000) {
                    return res.status(400).json({
                        error: 'Error de duplicación',
                        message: 'Una o más variantes tienen SKUs duplicados'
                    });
                }
                res.status(500).json({
                    error: 'Error al crear las variantes en lote',
                    message: error.message
                });
            }
        });
    },
    // Actualizar variante existente
    updateVariant(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { variantId } = req.params;
                const { organizationId } = req.user;
                const updateData = req.body;
                const variant = yield ProductVariantModel_1.default.findOneAndUpdate({
                    _id: new mongoose_1.Types.ObjectId(variantId),
                    organizationId: new mongoose_1.Types.ObjectId(organizationId)
                }, { $set: updateData }, { new: true });
                if (!variant) {
                    return res.status(404).json({ error: 'Variante no encontrada' });
                }
                res.json(variant);
            }
            catch (error) {
                res.status(500).json({ error: 'Error al actualizar la variante' });
            }
        });
    },
    // Eliminar variante
    deleteVariant(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { variantId } = req.params;
                const { organizationId } = req.user;
                const result = yield ProductVariantModel_1.default.findOneAndDelete({
                    _id: new mongoose_1.Types.ObjectId(variantId),
                    organizationId: new mongoose_1.Types.ObjectId(organizationId)
                });
                if (!result) {
                    return res.status(404).json({ error: 'Variante no encontrada' });
                }
                res.json({ message: 'Variante eliminada correctamente' });
            }
            catch (error) {
                res.status(500).json({ error: 'Error al eliminar la variante' });
            }
        });
    }
};
