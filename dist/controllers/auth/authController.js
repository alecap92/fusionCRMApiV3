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
exports.firebaseRegister = exports.firebaseLogin = exports.logoutAllDevices = exports.refreshToken = exports.verifyToken = exports.register = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const OrganizationModel_1 = __importDefault(require("../../models/OrganizationModel"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const firebase_1 = require("../../config/firebase");
const LogModel_1 = __importDefault(require("../../models/LogModel"));
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
        // 3. Buscar la organización
        const organization = yield OrganizationModel_1.default.findOne({
            employees: user._id,
        }).populate("employees");
        if (!organization) {
            return res
                .status(401)
                .json({ message: "No tiene organización asociada" });
        }
        // 4. Agregar organizationId al objeto user
        const userObject = user.toObject();
        const { password: _pwd } = userObject, userWithoutPassword2 = __rest(userObject, ["password"]);
        const userWithOrganizationId2 = Object.assign(Object.assign({}, userWithoutPassword2), { organizationId: organization._id.toString() });
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
            user: userWithOrganizationId2,
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
            emailSettings: {
                emailAddress: form.email, // Usar el email del registro como emailAddress por defecto
                // Los demás campos usarán los valores por defecto del modelo
            },
        });
        yield newUser.save();
        // 4. Crear nueva organización asociada
        const newOrganization = new OrganizationModel_1.default({
            companyName: "", // Cambiar si quieres forzar un nombre
            employees: [newUser._id],
            phone: newUser.mobile,
            // Remover contactProperties para que use los valores por defecto del modelo
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
        // 6. Agregar organizationId al objeto user
        const newUserObject = newUser.toObject();
        const { password: _ } = newUserObject, userWithoutPassword = __rest(newUserObject, ["password"]);
        const userWithOrganizationId = Object.assign(Object.assign({}, userWithoutPassword), { organizationId: newOrganization._id.toString() });
        return res.status(201).json({
            message: "Usuario registrado exitosamente",
            user: userWithOrganizationId,
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
        const { email, _id, organizationId } = req.user;
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
        // Agregar organizationId al objeto user antes de devolverlo
        const userObject = user.toObject();
        const { password: _pwd } = userObject, userWithoutPassword2 = __rest(userObject, ["password"]);
        const userWithOrganizationId2 = Object.assign(Object.assign({}, userWithoutPassword2), { organizationId: organization._id.toString() });
        // Respuesta con datos del usuario (incluyendo organizationId) y organización
        return res.status(200).json({
            user: userWithOrganizationId2,
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
        const { _id, email, firstName, lastName, mobile, organizationId, role, rememberMe, } = req.user;
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
        // Agregar organizationId al objeto user antes de devolverlo
        const userWithOrganizationId = Object.assign(Object.assign({}, user.toObject()), { organizationId: organizationId || organization._id.toString() });
        // Generar un nuevo token manteniendo la configuración original de rememberMe
        const newToken = (0, authMiddleware_1.generateToken)({
            _id,
            email,
            firstName,
            lastName,
            mobile,
            organizationId,
            role: role || "",
            rememberMe: rememberMe || false, // Mantener la configuración original
        });
        // Respuesta con nuevo token, datos del usuario y organización
        return res.status(200).json({
            token: newToken,
            user: userWithOrganizationId,
            organization,
        });
    }
    catch (error) {
        console.error("Error en refreshToken:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.refreshToken = refreshToken;
const logoutAllDevices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        if (!userId || !organizationId) {
            return res.status(401).json({
                success: false,
                message: "Usuario no autenticado",
                summary: null,
            });
        }
        // Obtener la organización y sus empleados
        const organization = yield OrganizationModel_1.default.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organización no encontrada",
                summary: null,
            });
        }
        // Obtener todos los usuarios activos de la organización
        const users = yield UserModel_1.default.find({
            _id: { $in: organization.employees },
            lastLogoutAt: { $exists: false },
        });
        // Actualizar el timestamp de último logout para todos los empleados
        const currentTime = new Date();
        const updateResult = yield UserModel_1.default.updateMany({ _id: { $in: organization.employees } }, {
            lastLogoutAt: currentTime,
            pushToken: [], // Limpiar tokens de notificación push
        });
        // Registrar los resultados
        const logoutSummary = {
            totalEmployees: organization.employees.length,
            activeUsersBeforeLogout: users.length,
            usersUpdated: updateResult.modifiedCount,
            timestamp: currentTime,
            organizationId: organizationId.toString(),
        };
        // Guardar el registro de la operación
        yield LogModel_1.default.create({
            type: "LOGOUT_ALL",
            data: logoutSummary,
            userId: userId,
            organizationId: organizationId,
            timestamp: currentTime,
        });
        return res.status(200).json({
            success: true,
            message: "Sesión cerrada en todos los dispositivos para todos los empleados exitosamente",
            summary: logoutSummary,
        });
    }
    catch (error) {
        console.error("[LogoutAll] Error en logoutAllDevices:", error);
        return res.status(500).json({
            success: false,
            message: "Error en el servidor",
            summary: null,
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
});
exports.logoutAllDevices = logoutAllDevices;
// Método para LOGIN con Firebase (solo usuarios existentes)
const firebaseLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { idToken, provider } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: "Token de Firebase requerido" });
        }
        // Verificar el token con Firebase Admin
        const decodedToken = yield firebase_1.auth.verifyIdToken(idToken);
        const { uid, email, name, picture } = decodedToken;
        if (!email) {
            return res
                .status(400)
                .json({ message: "Email no disponible en el token de Firebase" });
        }
        // Buscar si el usuario ya existe
        const user = yield UserModel_1.default.findOne({ email });
        if (!user) {
            // Usuario NO existe - devolver error
            return res.status(404).json({
                message: "Usuario no encontrado. Por favor, regístrate primero.",
            });
        }
        // Usuario existe - hacer login
        const organization = yield OrganizationModel_1.default.findOne({
            employees: user._id,
        }).populate("employees");
        if (!organization) {
            return res
                .status(401)
                .json({ message: "No tiene organización asociada" });
        }
        // Actualizar avatar si viene de Firebase y no lo tiene
        if (picture && !user.avatar) {
            user.avatar = picture;
            yield user.save();
        }
        // Agregar organizationId al objeto user
        const userObject = user.toObject();
        const { password: _firebasePwd } = userObject, userWithoutPassword = __rest(userObject, ["password"]);
        const userWithOrganizationId = Object.assign(Object.assign({}, userWithoutPassword), { organizationId: organization._id.toString() });
        // Generar token JWT
        const token = (0, authMiddleware_1.generateToken)({
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            mobile: user.mobile,
            organizationId: organization._id.toString(),
        });
        return res.status(200).json({
            token: `${token}`,
            user: userWithOrganizationId,
            organization,
        });
    }
    catch (error) {
        console.error("Error en login Firebase:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.firebaseLogin = firebaseLogin;
// Método para REGISTRO con Firebase (crear nuevo usuario)
const firebaseRegister = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { idToken, provider } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: "Token de Firebase requerido" });
        }
        // Verificar el token con Firebase Admin
        const decodedToken = yield firebase_1.auth.verifyIdToken(idToken);
        const { uid, email, name, picture } = decodedToken;
        if (!email) {
            return res
                .status(400)
                .json({ message: "Email no disponible en el token de Firebase" });
        }
        // Verificar si el usuario ya existe
        const existingUser = yield UserModel_1.default.findOne({ email });
        if (existingUser) {
            // Usuario YA existe - devolver error
            return res.status(409).json({
                message: "El usuario ya existe. Por favor, inicia sesión.",
            });
        }
        // Usuario no existe - crear nuevo usuario
        const [firstName, ...lastNameParts] = (name || email.split("@")[0]).split(" ");
        const lastName = lastNameParts.join(" ") || "";
        const newUser = new UserModel_1.default({
            email,
            password: yield bcrypt_1.default.hash(uid, 10), // Usar UID como password hasheada
            firstName,
            lastName,
            mobile: "", // Firebase no siempre proporciona teléfono
            avatar: picture || "",
            emailSettings: {
                emailAddress: email,
            },
            firebaseUid: uid, // Guardar UID de Firebase para futuras referencias
        });
        yield newUser.save();
        // Crear nueva organización
        const newOrganization = new OrganizationModel_1.default({
            companyName: "",
            employees: [newUser._id],
            phone: "",
        });
        yield newOrganization.save();
        // Agregar organizationId al objeto user
        const userObject = newUser.toObject();
        const { password: _firebasePwd } = userObject, userWithoutPassword = __rest(userObject, ["password"]);
        const userWithOrganizationId = Object.assign(Object.assign({}, userWithoutPassword), { organizationId: newOrganization._id.toString() });
        // Generar token JWT
        const token = (0, authMiddleware_1.generateToken)({
            _id: newUser._id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            mobile: newUser.mobile,
            organizationId: newOrganization._id.toString(),
        });
        return res.status(201).json({
            message: "Usuario registrado exitosamente",
            token: `${token}`,
            user: userWithOrganizationId,
            organization: newOrganization,
        });
    }
    catch (error) {
        console.error("Error en registro Firebase:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.firebaseRegister = firebaseRegister;
