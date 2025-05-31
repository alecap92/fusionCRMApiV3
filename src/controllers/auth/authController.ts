import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { IAuthRequest, RegisterForm } from "../../types/index";
import UserModel, { IUser } from "../../models/UserModel";
import OrganizationModel from "../../models/OrganizationModel";
import { generateToken } from "../../middlewares/authMiddleware";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    // 1. Buscar usuario por email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2. Comparar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Eliminar password del objeto user antes de enviarlo
    const userObject = user.toObject() as Partial<IUser>;
    delete userObject.password;

    // 4. Buscar la organización
    const organization = await OrganizationModel.findOne({
      employees: userObject._id,
    }).populate("employees");

    if (!organization) {
      return res
        .status(401)
        .json({ message: "No tiene organización asociada" });
    }

    // 5. Agregar organizationId al objeto user
    const userWithOrganizationId = {
      ...userObject,
      organizationId: organization._id.toString(),
    };

    // 6. Generar token
    const token = generateToken(
      {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        organizationId: organization._id.toString(),
      },
      rememberMe
    );

    return res.status(200).json({
      token: `${token}`,
      user: userWithOrganizationId,
      organization,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const form: RegisterForm = req.body;

    // 1. Verificar si usuario ya existe por email (no por firstName/lastName)
    const existingUser = await UserModel.findOne({ email: form.email });
    if (existingUser) {
      return res.status(401).json({ message: "Usuario ya existe" });
    }

    // 2. Hashear password
    const hashedPassword = await bcrypt.hash(form.password, 10);

    // 3. Crear nuevo usuario
    const newUser = new UserModel({
      email: form.email,
      password: hashedPassword,
      firstName: form.firstName,
      lastName: form.lastName,
      mobile: form.phone, // o unifica todo a "phone"
      emailSettings: {
        emailAddress: form.email, // Usar el email del registro como emailAddress por defecto
        // Los demás campos usarán los valores por defecto del modelo
      },
    });
    await newUser.save();

    // 4. Crear nueva organización asociada
    const newOrganization = new OrganizationModel({
      companyName: "", // Cambiar si quieres forzar un nombre
      employees: [newUser._id],
      phone: newUser.mobile,
      // Remover contactProperties para que use los valores por defecto del modelo
    });
    await newOrganization.save();

    // 5. Generar token
    const token = generateToken({
      _id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName || "",
      lastName: newUser.lastName || "",
      mobile: newUser.mobile || "",
      organizationId: newOrganization._id.toString(),
    });

    // 6. Agregar organizationId al objeto user
    const userWithOrganizationId: any = {
      ...newUser.toObject(),
      organizationId: newOrganization._id.toString(),
    };
    delete userWithOrganizationId.password; // Eliminar password del objeto

    return res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: userWithOrganizationId,
      token: `${token}`,
      organization: newOrganization,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const verifyToken = async (req: IAuthRequest, res: Response) => {
  try {
    // Validar si `req.user` está disponible (debería ser configurado en el middleware)
    if (!req.user) {
      return res.status(401).json({ message: "Token no válido o expirado" });
    }

    const { email, _id, organizationId } = req.user;

    // Buscar usuario por ID o email (excluir campos sensibles)
    const user = await UserModel.findById(_id, {
      password: 0,
      createdAt: 0,
      updatedAt: 0,
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Buscar organización asociada al usuario
    const organization = await OrganizationModel.findOne({
      employees: _id,
    }).populate("employees");

    if (!organization) {
      return res.status(404).json({ message: "Organización no encontrada" });
    }

    // Agregar organizationId al objeto user antes de devolverlo
    const userWithOrganizationId = {
      ...user.toObject(),
      organizationId: organizationId || organization._id.toString(),
    };

    // Respuesta con datos del usuario (incluyendo organizationId) y organización
    return res.status(200).json({
      user: userWithOrganizationId,
      organization,
    });
  } catch (error) {
    console.error("Error en verifyToken:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const refreshToken = async (req: IAuthRequest, res: Response) => {
  try {
    // Validar si req.user está disponible (configurado en el middleware)
    if (!req.user) {
      return res.status(401).json({ message: "Token no válido o expirado" });
    }

    const { _id, email, firstName, lastName, mobile, organizationId, role } =
      req.user;

    // Buscar usuario para confirmar que sigue existiendo
    const user = await UserModel.findById(_id, {
      password: 0,
      createdAt: 0,
      updatedAt: 0,
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Buscar organización asociada al usuario
    const organization = await OrganizationModel.findOne(
      { employees: _id },
      { employees: 0 } // Excluir lista completa de empleados para optimizar
    );

    if (!organization) {
      return res.status(404).json({ message: "Organización no encontrada" });
    }

    // Generar un nuevo token con los mismos datos pero nueva expiración
    const newToken = generateToken({
      _id,
      email,
      firstName,
      lastName,
      mobile,
      organizationId,
      role: role || "",
      rememberMe: true, // Mantener el token de larga duración
    });

    // Respuesta con nuevo token, datos del usuario y organización
    return res.status(200).json({
      token: newToken,
      user,
      organization,
    });
  } catch (error) {
    console.error("Error en refreshToken:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};
