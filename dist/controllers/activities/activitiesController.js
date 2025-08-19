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
exports.deleteActivity = exports.updateActivity = exports.getActivity = exports.getActivities = exports.createActivity = void 0;
const ActivityModel_1 = __importDefault(require("../../models/ActivityModel"));
// Crear actividad
const createActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const form = {
            activityType: req.body.activityType,
            title: req.body.title,
            date: req.body.date,
            notes: req.body.notes,
            status: req.body.status,
            organizationId: organizationId,
            ownerId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
            contactId: req.body.contactId,
            reminder: req.body.reminder,
        };
        const newActivity = new ActivityModel_1.default(form);
        const savedActivity = yield newActivity.save();
        res.status(201).json(savedActivity);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear la actividad" });
    }
});
exports.createActivity = createActivity;
// Obtener actividades
const getActivities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activities = yield ActivityModel_1.default.find({
            contactId: req.params.contactId,
        })
            .populate("contactId")
            .populate("ownerId")
            .populate("organizationId")
            .sort({
            createdAt: "desc",
        });
        res.json(activities);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener las actividades" });
    }
});
exports.getActivities = getActivities;
// Obtener actividad por ID
const getActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activity = yield ActivityModel_1.default.findOne({
            _id: req.params.id,
        });
        if (!activity) {
            return res.status(404).json({ message: "Actividad no encontrada" });
        }
        res.json(activity);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener la actividad" });
    }
});
exports.getActivity = getActivity;
// Actualizar actividad
const updateActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedActivity = yield ActivityModel_1.default.findOneAndUpdate({ _id: req.body._id }, { $set: req.body }, { new: true });
        if (!updatedActivity) {
            return res.status(404).json({ message: "Actividad no encontrada" });
        }
        res.json(updatedActivity);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar la actividad" });
    }
});
exports.updateActivity = updateActivity;
// Eliminar actividad
const deleteActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(401).json({ message: "No tienes permisos para eliminar esta actividad" });
        }
        const deletedActivity = yield ActivityModel_1.default.findOneAndDelete({
            _id: req.params.id,
            organizationId: organizationId,
        });
        if (!deletedActivity) {
            return res.status(404).json({ message: "Actividad no encontrada" });
        }
        res.json({ message: "Actividad eliminada con éxito" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al eliminar la actividad" });
    }
});
exports.deleteActivity = deleteActivity;
