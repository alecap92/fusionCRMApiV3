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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const ProductModel_1 = __importDefault(require("../../models/ProductModel"));
const ProductVariantModel_1 = __importDefault(require("../../models/ProductVariantModel"));
// Get all products
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        if (!organizationId)
            return res
                .status(400)
                .json({ message: "Missing user or organization ID" });
        const products = yield ProductModel_1.default.find({
            organizationId,
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
        const totalProducts = yield ProductModel_1.default.countDocuments({
            organizationId,
        });
        const totalPages = Math.ceil(totalProducts / limit);
        res.status(200).json({
            totalProducts,
            totalPages,
            currentPage: page,
            products,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.getProducts = getProducts;
// Get a single product by ID
const getProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield ProductModel_1.default.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: "Server error getProduct" });
    }
});
exports.getProduct = getProduct;
// Create a new product
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
    if (!userId || !organizationId)
        return res.status(400).json({ message: "Missing user or organization ID" });
    try {
        // 1. Extraer los datos del producto y las variantes
        const _c = req.body, { attributes, variants } = _c, productData = __rest(_c, ["attributes", "variants"]);
        // 2. Crear y guardar el producto base
        const newProduct = new ProductModel_1.default(Object.assign(Object.assign({}, productData), { userId,
            organizationId }));
        yield newProduct.save();
        // 3. Si el producto tiene variantes, crearlas automáticamente
        if (newProduct.hasVariants && attributes && attributes.length > 0) {
            // Crear variantes directamente desde los atributos proporcionados
            const variantsToInsert = attributes.map((attr) => ({
                organizationId,
                productId: newProduct._id,
                attributeValues: [{
                        attributeName: attr.attributeName,
                        valueId: attr.id,
                        value: attr.value,
                        displayName: `${attr.attributeName}: ${attr.value}`,
                        price: attr.price,
                        imageUrl: attr.imageUrl
                    }],
                sku: `${newProduct._id}-${attr.id}`,
                price: attr.price || newProduct.unitPrice,
                imageUrl: attr.imageUrl || newProduct.imageUrl,
                isActive: true,
                userId
            }));
            // Insertar todas las variantes
            if (variantsToInsert.length > 0) {
                yield ProductVariantModel_1.default.insertMany(variantsToInsert);
            }
        }
        // 4. Devolver el producto creado
        res.status(201).json(newProduct);
    }
    catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});
exports.createProduct = createProduct;
// Update a product by ID
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
    if (!userId || !organizationId)
        return res.status(400).json({ message: "Missing user or organization ID" });
    try {
        // 1. Extraer los datos del producto y las variantes
        const _c = req.body, { attributes, variants } = _c, productData = __rest(_c, ["attributes", "variants"]);
        // 2. Actualizar el producto base
        const updatedProduct = yield ProductModel_1.default.findOneAndUpdate({ _id: req.params.id, organizationId }, productData, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        // 3. Si el producto tiene variantes, actualizarlas
        if (updatedProduct.hasVariants && attributes && attributes.length > 0) {
            // Eliminar variantes existentes para este producto
            yield ProductVariantModel_1.default.deleteMany({
                productId: updatedProduct._id,
                organizationId
            });
            // Crear nuevas variantes desde los atributos proporcionados
            const variantsToInsert = attributes.map((attr) => ({
                organizationId,
                productId: updatedProduct._id,
                attributeValues: [{
                        attributeName: attr.attributeName,
                        valueId: attr.id,
                        value: attr.value,
                        displayName: `${attr.attributeName}: ${attr.value}`,
                        price: attr.price || updatedProduct.unitPrice,
                        imageUrl: attr.imageUrl || updatedProduct.imageUrl
                    }],
                sku: `${updatedProduct._id}-${attr.id}`,
                price: attr.price || updatedProduct.unitPrice,
                imageUrl: attr.imageUrl || updatedProduct.imageUrl,
                isActive: true,
                userId
            }));
            // Insertar todas las variantes nuevas
            if (variantsToInsert.length > 0) {
                yield ProductVariantModel_1.default.insertMany(variantsToInsert);
            }
        }
        // 4. Devolver el producto actualizado
        res.status(200).json(updatedProduct);
    }
    catch (error) {
        console.error("Error actualizando producto:", error);
        res.status(500).json({ message: "Error del servidor", error: error.message });
    }
});
exports.updateProduct = updateProduct;
// Delete a product by ID
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedProduct = yield ProductModel_1.default.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteProduct = deleteProduct;
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log("searchProducts");
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        const searchValue = req.query.term;
        if (!userId || !organizationId)
            return res
                .status(400)
                .json({ message: "Missing user or organization ID" });
        const products = yield ProductModel_1.default.find({
            userId,
            organizationId,
            $or: [
                { name: { $regex: searchValue, $options: "i" } },
                { description: { $regex: searchValue, $options: "i" } },
            ],
        });
        return res.status(200).json(products);
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.searchProducts = searchProducts;
