import { Request, Response } from "express";
import UserModel from "../../models/UserModel";
import bcrypt from "bcrypt";

const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
};

// Crear usuario
export const createUser = async (req: Request, res: Response) => {
  try {
    const form = req.body;
    const newUser = new UserModel(form);
    const user = await newUser.save();
    res.status(201).json(user);
  } catch (error: unknown) {
    console.error("Error creando el usuario:", error);
    res.status(500).json({ error: handleError(error) });
  }
};

// Obtener todos los usuarios
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().exec();
    res.status(200).json(users);
  } catch (error: unknown) {
    console.error("Error obteniendo los usuarios:", error);
    res.status(500).json({ error: handleError(error) });
  }
};

// Obtener usuario por ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.params.id)
      .select("-password")
      .exec();
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    res.status(200).json(user);
  } catch (error: unknown) {
    console.error("Error obteniendo el usuario:", error);
    res.status(500).json({ error: handleError(error) });
  }
};

// Actualizar usuario
export const updateUser = async (req: Request, res: Response) => {
  const userId = req.user?._id;

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(userId, req.body, {
      new: true,
    }).exec();
    if (!updatedUser) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }
    res.status(200).json(updatedUser);
  } catch (error: unknown) {
    console.error("Error actualizando el usuario:", error);
    res.status(500).json({ error: handleError(error) });
  }
};

export const updateUserPassword = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { oldPassword, newPassword } = req.body;

  try {
    // Buscar al usuario en la base de datos
    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Comparar la contraseña anterior con la almacenada en la base de datos
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // Encriptar la nueva contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Guardar el usuario con la nueva contraseña
    await user.save();

    res.status(200).json({ message: "Contraseña actualizada con éxito" });
  } catch (error) {
    console.error("Error actualizando la contraseña del usuario:", error);
    res.status(500).json({ error: handleError(error) });
  }
};

// Eliminar usuario
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const deletedUser = await UserModel.findByIdAndDelete(req.params.id).exec();
    if (!deletedUser) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error: unknown) {
    console.error("Error eliminando el usuario:", error);
    res.status(500).json({ error: handleError(error) });
  }
};
