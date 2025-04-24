"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/Products/productController");
const productVariantController_1 = require("../controllers/productVariantController");
const productAcquisitionController_1 = require("../controllers/productAcquisitionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Rutas básicas de productos
router.get("/", authMiddleware_1.verifyToken, productController_1.getProducts);
router.get("/search", authMiddleware_1.verifyToken, productController_1.searchProducts);
router.get("/:id", authMiddleware_1.verifyToken, productController_1.getProduct);
router.post("/", authMiddleware_1.verifyToken, productController_1.createProduct);
router.put("/:id", authMiddleware_1.verifyToken, productController_1.updateProduct);
router.delete("/:id", authMiddleware_1.verifyToken, productController_1.deleteProduct);
// Rutas de variantes
router.get("/:productId/variants", authMiddleware_1.verifyToken, productVariantController_1.productVariantController.getProductVariants);
router.post("/:productId/variants", authMiddleware_1.verifyToken, productVariantController_1.productVariantController.createVariant);
router.post("/:productId/variants/bulk", authMiddleware_1.verifyToken, productVariantController_1.productVariantController.createVariantBulk);
router.put("/variants/:variantId", authMiddleware_1.verifyToken, productVariantController_1.productVariantController.updateVariant);
router.delete("/variants/:variantId", authMiddleware_1.verifyToken, productVariantController_1.productVariantController.deleteVariant);
// Rutas de adquisiciones
router.post("/acquisitions", authMiddleware_1.verifyToken, productAcquisitionController_1.productAcquisitionController.createAcquisition);
router.get("/clients/:clientId/acquisitions", authMiddleware_1.verifyToken, productAcquisitionController_1.productAcquisitionController.getClientAcquisitions);
router.get("/acquisitions/stats", authMiddleware_1.verifyToken, productAcquisitionController_1.productAcquisitionController.getAcquisitionStats);
exports.default = router;
