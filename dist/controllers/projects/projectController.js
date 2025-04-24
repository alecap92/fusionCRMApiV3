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
exports.deleteProject = exports.updateProject = exports.searchProject = exports.getAllProjects = exports.getProjectById = exports.createProject = void 0;
const ProjectModel_1 = __importDefault(require("../../models/ProjectModel"));
const TaskModel_1 = __importDefault(require("../../models/TaskModel"));
// Crear un nuevo proyecto
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, description, startDate, endDate, budget } = req.body;
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const ownerId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        console.log(organizationId, ownerId);
        if (!organizationId || !ownerId) {
            return res.status(400).json({ message: "Usuario no autorizado" });
        }
        if (!name) {
            return res
                .status(400)
                .json({ message: "El nombre del proyecto es requerido" });
        }
        const newProject = new ProjectModel_1.default({
            name,
            description,
            startDate,
            endDate,
            budget,
            organizationId,
            ownerId,
        });
        const savedProject = yield newProject.save();
        return res.status(201).json(savedProject);
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ message: "Error al crear el proyecto", error });
    }
});
exports.createProject = createProject;
// Obtener un proyecto por su ID
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const project = yield ProjectModel_1.default.findById(id);
        if (!project) {
            return res.status(404).json({ message: "Proyecto no encontrado" });
        }
        const tasks = yield TaskModel_1.default.find({ projectId: id }).populate("responsibleId");
        return res.status(200).json({ project, tasks });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al obtener el proyecto", error });
    }
});
exports.getProjectById = getProjectById;
// Obtener todos los proyectos
const getAllProjects = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projects = yield ProjectModel_1.default.find();
        return res.status(200).json(projects);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al obtener los proyectos", error });
    }
});
exports.getAllProjects = getAllProjects;
const searchProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { q } = req.query;
        console.log(req.query);
        const projects = yield ProjectModel_1.default.find({
            name: { $regex: q, $options: "i" },
            organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
        });
        if (!projects) {
            return res.status(404).json({ message: "Proyectos no encontrados" });
        }
        return res.status(200).json(projects);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al buscar proyectos", error });
    }
});
exports.searchProject = searchProject;
// Actualizar un proyecto por su ID
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedProject = yield ProjectModel_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
        });
        if (!updatedProject) {
            return res.status(404).json({ message: "Proyecto no encontrado" });
        }
        return res.status(200).json(updatedProject);
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al actualizar el proyecto", error });
    }
});
exports.updateProject = updateProject;
// Eliminar un proyecto por su ID
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedProject = yield ProjectModel_1.default.findByIdAndDelete(id);
        // delete all tasks related to the project
        yield TaskModel_1.default.deleteMany({ projectId: id });
        if (!deletedProject) {
            return res.status(404).json({ message: "Proyecto no encontrado" });
        }
        return res.status(200).json({ message: "Proyecto eliminado exitosamente" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error al eliminar el proyecto", error });
    }
});
exports.deleteProject = deleteProject;
