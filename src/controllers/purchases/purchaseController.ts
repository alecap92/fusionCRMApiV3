import { Request, Response } from "express";
import PurchaseOrder from "../../models/PurchaseModel";

// Obtener todas las órdenes de compra
export const getPurchaseOrders = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  try {
    const purchaseOrders = await PurchaseOrder.find({ organizationId })
      .populate("supplierId")
      .populate("organizationId")
      .populate("userId");
    res.status(200).json(purchaseOrders);

    if (!purchaseOrders) {
      return res.status(404).json({ message: "Purchase orders not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching purchase orders", error });
  }
};

// Obtener una orden de compra por ID
export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("supplierId")
      .populate("organizationId")
      .populate("userId");

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    res.status(200).json(purchaseOrder);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching the purchase order", error });
  }
};

// Crear una nueva orden de compra
export const createPurchaseOrder = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;
  const userId = req.user?._id;

  console.log(req.body);

  try {
    const newPurchaseOrder = new PurchaseOrder({
      ...req.body,
      organizationId,
      userId,
    });
    const savedPurchaseOrder = await newPurchaseOrder.save();

    res.status(201).json(savedPurchaseOrder);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Error creating purchase order", error });
  }
};

// Actualizar una orden de compra existente
export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedPurchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    res.status(200).json(updatedPurchaseOrder);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating the purchase order", error });
  }
};

// Eliminar una orden de compra
export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedPurchaseOrder = await PurchaseOrder.findByIdAndDelete(id);

    if (!deletedPurchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    res.status(200).json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting the purchase order", error });
  }
};
