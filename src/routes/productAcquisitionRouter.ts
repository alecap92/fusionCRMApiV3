import { Router } from "express";
import { productAcquisitionController } from "../controllers/productAcquisitionController";
import { verifyToken } from "../middlewares/authMiddleware";

const router: Router = Router();

// Rutas de adquisiciones de productos
router.post("/", verifyToken, productAcquisitionController.createAcquisition);
router.get("/client/:clientId/organizationId/:organizationId", verifyToken, productAcquisitionController.getClientAcquisitions);
router.get("/stats", verifyToken, productAcquisitionController.getAcquisitionStats);

export default router;