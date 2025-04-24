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
exports.refreshToken = exports.verifyToken = exports.register = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, rememberMe } = req.body;
        // 1. Buscar usuario por email
        const user = yield UserModel_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // 2. Comparar contraseña
        const validPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // 3. Eliminar password del objeto user antes de enviarlo
        const userObject = user.toObject();
        delete userObject.password;
        // 4. Buscar la organización
        const organization = yield OrganizationModel_1.default.findOne({
            employees: userObject._id,
        }).populate("employees");
        if (!organization) {
            return res
                .status(401)
                .json({ message: "No tiene organización asociada" });
        }
        // 5. Generar token
        const token = (0, authMiddleware_1.generateToken)({
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            mobile: user.mobile,
            organizationId: organization._id.toString(),
        }, rememberMe);
        return res.status(200).json({
            token: `${token}`,
            user: userObject,
            organization,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.login = login;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = req.body;
        // 1. Verificar si usuario ya existe por email (no por firstName/lastName)
        const existingUser = yield UserModel_1.default.findOne({ email: form.email });
        if (existingUser) {
            return res.status(401).json({ message: "Usuario ya existe" });
        }
        // 2. Hashear password
        const hashedPassword = yield bcrypt_1.default.hash(form.password, 10);
        // 3. Crear nuevo usuario
        const newUser = new UserModel_1.default({
            email: form.email,
            password: hashedPassword,
            firstName: form.firstName,
            lastName: form.lastName,
            mobile: form.phone, // o unifica todo a "phone"
        });
        yield newUser.save();
        // 4. Crear nueva organización asociada
        const newOrganization = new OrganizationModel_1.default({
            companyName: "", // Cambiar si quieres forzar un nombre
            employees: [newUser._id],
            phone: newUser.mobile,
            contactProperties: {
                properties: {},
                columnas: {},
            },
        });
        yield newOrganization.save();
        // 5. Generar token
        const token = (0, authMiddleware_1.generateToken)({
            _id: newUser._id,
            email: newUser.email,
            firstName: newUser.firstName || "",
            lastName: newUser.lastName || "",
            mobile: newUser.mobile || "",
            organizationId: newOrganization._id.toString(),
        });
        return res.status(201).json({
            message: "Usuario registrado exitosamente",
            user: newUser,
            token: `${token}`,
            organization: newOrganization,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.register = register;
const verifyToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validar si `req.user` está disponible (debería ser configurado en el middleware)
        if (!req.user) {
            return res.status(401).json({ message: "Token no válido o expirado" });
        }
        const { email, _id } = req.user;
        // Buscar usuario por ID o email (excluir campos sensibles)
        const user = yield UserModel_1.default.findById(_id, {
            password: 0,
            createdAt: 0,
            updatedAt: 0,
        });
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        // Buscar organización asociada al usuario
        const organization = yield OrganizationModel_1.default.findOne({
            employees: _id,
        }).populate("employees");
        if (!organization) {
            return res.status(404).json({ message: "Organización no encontrada" });
        }
        // Respuesta con datos del usuario y organización
        return res.status(200).json({
            user,
            organization,
        });
    }
    catch (error) {
        console.error("Error en verifyToken:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.verifyToken = verifyToken;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validar si req.user está disponible (configurado en el middleware)
        if (!req.user) {
            return res.status(401).json({ message: "Token no válido o expirado" });
        }
        const { _id, email, firstName, lastName, mobile, organizationId, role } = req.user;
        // Buscar usuario para confirmar que sigue existiendo
        const user = yield UserModel_1.default.findById(_id, {
            password: 0,
            createdAt: 0,
            updatedAt: 0,
        });
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        // Buscar organización asociada al usuario
        const organization = yield OrganizationModel_1.default.findOne({ employees: _id }, { employees: 0 } // Excluir lista completa de empleados para optimizar
        );
        if (!organization) {
            return res.status(404).json({ message: "Organización no encontrada" });
        }
        // Generar un nuevo token con los mismos datos pero nueva expiración
        const newToken = (0, authMiddleware_1.generateToken)({
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
    }
    catch (error) {
        console.error("Error en refreshToken:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.refreshToken = refreshToken;
