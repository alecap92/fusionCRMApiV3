import { Request, Response } from "express";
import UserModel from "../../models/UserModel";

export const createPushToken = async (req: Request, res: Response) => {
  try {
    const headers = req.headers;
    console.log("Headers:", headers);
    console.log("Body:", req.body);
    const { token } = req.body;
    const user = req.user;
    console.log(user, token);
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!token) {
      return res.status(400).json({ error: "Push token is required" });
    }

    // Buscar al usuario en la base de datos
    const userRecord = await UserModel.findById(user._id);

    if (!userRecord) {
      return res.status(404).json({ error: "User not found" });
    }

    // Si el token ya existe, no lo agregamos
    if (userRecord.pushToken.includes(token)) {
      return res.status(200).json({ message: "Push token already exists" });
    }
    console.log("userRecord", userRecord);
    // Agregar el nuevo token
    userRecord.pushToken.push(token);
    await userRecord.save();

    console.log("Push token saved:", token);
    return res.status(200).json({ message: "Push token saved successfully" });
  } catch (error) {
    console.error("Error saving push token:", error);
    return res
      .status(500)
      .json({
        error: "An unexpected error occurred while saving the push token",
      });
  }
};

export const deletePushToken = async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Usar $pull para remover el token específico del array
    const result = await UserModel.updateOne(
      { _id: user._id },
      { $pull: { pushToken: token } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "Token not found or already removed" });
    }

    console.log("[PUSH] Token eliminado para usuario:", user._id);
    return res.status(200).json({ message: "Push token deleted successfully" });
  } catch (error) {
    console.error("[PUSH] Error eliminando token:", error);
    return res
      .status(500)
      .json({
        error: "An unexpected error occurred while deleting the push token",
      });
  }
};
