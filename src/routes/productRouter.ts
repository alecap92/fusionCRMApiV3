import { Router } from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} from "../controllers/Products/productController";
import { productVariantController } from "../controllers/productVariantController";
import { productAcquisitionController } from "../controllers/productAcquisitionController";
import { verifyToken } from "../middlewares/authMiddleware";

const router: Router = Router();

// Rutas básicas de productos
router.get("/", verifyToken, getProducts);
router.get("/search", verifyToken, searchProducts);
router.get("/:id", verifyToken, getProduct);
router.post("/", verifyToken, createProduct);
router.put("/:id", verifyToken, updateProduct);
router.delete("/:id", verifyToken, deleteProduct);

// Rutas de variantes
router.get("/:productId/variants", verifyToken, productVariantController.getProductVariants);
router.post("/:productId/variants", verifyToken, productVariantController.createVariant);
router.post("/:productId/variants/bulk", verifyToken, productVariantController.createVariantBulk);
router.put("/variants/:variantId", verifyToken, productVariantController.updateVariant);
router.delete("/variants/:variantId", verifyToken, productVariantController.deleteVariant);

// Rutas de adquisiciones
router.post("/acquisitions", verifyToken, productAcquisitionController.createAcquisition);
router.get("/clients/:clientId/acquisitions", verifyToken, productAcquisitionController.getClientAcquisitions);
router.get("/acquisitions/stats", verifyToken, productAcquisitionController.getAcquisitionStats);

export default router;
