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
exports.deleteTask = exports.updateTask = exports.searchTask = exports.getAllTasks = exports.getTaskById = exports.createTask = void 0;
const TaskModel_1 = __importDefault(require("../../models/TaskModel"));
// Crear una nueva tarea
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { title, status, dueDate, timeline, budget, notes, priority, projectId, responsibleId, description, } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const newTask = new TaskModel_1.default({
            title,
            status,
            dueDate,
            timeline,
            budget,
            notes,
            priority,
            projectId,
            responsibleId,
            organizationId,
            ownerId: userId,
            description,
        });
        const savedTask = yield newTask.save();
        return res.status(201).json(savedTask);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error al crear la tarea", error });
    }
});
exports.createTask = createTask;
// Obtener una tarea por su ID
const getTaskById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const task = yield TaskModel_1.default.find({
            _id: id,
            organizationId: organizationId,
        });
        if (!task) {
            return res.status(404).json({ message: "Tarea no encontrada" });
        }
        return res.status(200).json(task);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al obtener la tarea", error });
    }
});
exports.getTaskById = getTaskById;
// Obtener todas las tareas
const getAllTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const tasks = yield TaskModel_1.default.find({
            organizationId: organizationId,
        });
        return res.status(200).json(tasks);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al obtener las tareas", error });
    }
});
exports.getAllTasks = getAllTasks;
const searchTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(req.query);
    try {
        const title = req.query.q;
        const tasks = yield TaskModel_1.default.find({
            title: { $regex: title, $options: "i" },
            organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
        });
        console.log(tasks);
        return res.status(200).json(tasks);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al buscar las tareas", error });
    }
});
exports.searchTask = searchTask;
// Actualizar una tarea por su ID
const updateTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedTask = yield TaskModel_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
        });
        if (!updatedTask) {
            return res.status(404).json({ message: "Tarea no encontrada" });
        }
        return res.status(200).json(updatedTask);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al actualizar la tarea", error });
    }
});
exports.updateTask = updateTask;
// Eliminar una tarea por su ID
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedTask = yield TaskModel_1.default.findByIdAndDelete(id);
        if (!deletedTask) {
            return res.status(404).json({ message: "Tarea no encontrada" });
        }
        return res.status(200).json({ message: "Tarea eliminada exitosamente" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al eliminar la tarea", error });
    }
});
exports.deleteTask = deleteTask;
