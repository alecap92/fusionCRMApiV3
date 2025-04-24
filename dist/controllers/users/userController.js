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
exports.deleteUser = exports.updateUserPassword = exports.updateUser = exports.getUserById = exports.getUsers = exports.createUser = void 0;
const UserModel_1 = __importDefault(require("../../models/UserModel"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const handleError = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
};
// Crear usuario
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = req.body;
        const newUser = new UserModel_1.default(form);
        const user = yield newUser.save();
        res.status(201).json(user);
    }
    catch (error) {
        console.error("Error creando el usuario:", error);
        res.status(500).json({ error: handleError(error) });
    }
});
exports.createUser = createUser;
// Obtener todos los usuarios
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield UserModel_1.default.find().exec();
        res.status(200).json(users);
    }
    catch (error) {
        console.error("Error obteniendo los usuarios:", error);
        res.status(500).json({ error: handleError(error) });
    }
});
exports.getUsers = getUsers;
// Obtener usuario por ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield UserModel_1.default.findById(req.params.id)
            .select("-password")
            .exec();
        if (!user) {
            res.status(404).json({ message: "Usuario no encontrado" });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error("Error obteniendo el usuario:", error);
        res.status(500).json({ error: handleError(error) });
    }
});
exports.getUserById = getUserById;
// Actualizar usuario
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const updatedUser = yield UserModel_1.default.findByIdAndUpdate(userId, req.body, {
            new: true,
        }).exec();
        if (!updatedUser) {
            res.status(404).json({ message: "Usuario no encontrado" });
            return;
        }
        res.status(200).json(updatedUser);
    }
    catch (error) {
        console.error("Error actualizando el usuario:", error);
        res.status(500).json({ error: handleError(error) });
    }
});
exports.updateUser = updateUser;
const updateUserPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { oldPassword, newPassword } = req.body;
    try {
        // Buscar al usuario en la base de datos
        const user = yield UserModel_1.default.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        // Comparar la contraseña anterior con la almacenada en la base de datos
        const isPasswordValid = yield bcrypt_1.default.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }
        // Encriptar la nueva contraseña antes de guardarla
        const salt = yield bcrypt_1.default.genSalt(10);
        user.password = yield bcrypt_1.default.hash(newPassword, salt);
        // Guardar el usuario con la nueva contraseña
        yield user.save();
        res.status(200).json({ message: "Contraseña actualizada con éxito" });
    }
    catch (error) {
        console.error("Error actualizando la contraseña del usuario:", error);
        res.status(500).json({ error: handleError(error) });
    }
});
exports.updateUserPassword = updateUserPassword;
// Eliminar usuario
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedUser = yield UserModel_1.default.findByIdAndDelete(req.params.id).exec();
        if (!deletedUser) {
            res.status(404).json({ message: "Usuario no encontrado" });
            return;
        }
        res.status(200).json({ message: "Usuario eliminado correctamente" });
    }
    catch (error) {
        console.error("Error eliminando el usuario:", error);
        res.status(500).json({ error: handleError(error) });
    }
});
exports.deleteUser = deleteUser;
