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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCreditNote = void 0;
const invoiceService_1 = require("../../services/invoice/invoiceService");
const createCreditNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" });
        }
        const creditNote = req.body;
        const response = yield (0, invoiceService_1.createCreditNoteInApi)(creditNote, organizationId);
        if (response.success === false) {
            return res.status(400).json({ message: response.message });
        }
        return res.status(200).json({ message: "Nota de crédito creada correctamente" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error al crear la nota de crédito", error: error });
    }
});
exports.createCreditNote = createCreditNote;
