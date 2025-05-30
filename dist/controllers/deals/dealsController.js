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
exports.deleteDeal = exports.editDeal = exports.changeDealStatus = exports.getDealDetails = exports.createDeal = exports.getContactDeals = exports.searchDeals = exports.getDeals = void 0;
const DealsFieldsValuesModel_1 = __importDefault(require("../../models/DealsFieldsValuesModel"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const date_fns_1 = require("date-fns");
const automation_listener_1 = require("../../automation/automation.listener");
const ProductAcquisitionModel_1 = __importDefault(require("../../models/ProductAcquisitionModel"));
// Obtener tratos
/**
 * Handles the retrieval of deals filtered by specified criteria.
 * This function checks if the user making the request is authenticated and retrieves deals data
 * associated with the user's organization within the given date range and other optional filters.
 * The data is prepared and sent back as a response.
 *
 * @param {Request} req - The HTTP request object, containing user information, query parameters for filtering,
 * and an optional date range for filtering deals.
 * @param {Response} res - The HTTP response object, used to send status codes and the resulting deal data.
 *
 * @throws {Error} If there is any issue retrieving or processing data, responds with a status code 500 and an error message.
 */
const getDeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
    }
    const { organizationId } = req.user;
    const { pipelineId, name } = req.query;
    const filterDates = req.query.filterDates;
    const startDate = filterDates ? filterDates.startDate : "";
    const endDate = filterDates ? filterDates.endDate : "";
    try {
        let start, end;
        if (!startDate || !endDate) {
            const now = new Date();
            start = (0, date_fns_1.subDays)(now, 30); // Últimos 30 días desde hoy
            end = now;
        }
        else {
            start = new Date(startDate);
            end = new Date(endDate);
        }
        const query = {
            organizationId,
            pipeline: pipelineId,
            closingDate: {
                $gte: start,
                $lte: end,
            },
        };
        if (name) {
            query.title = { $regex: name, $options: "i" };
        }
        const deals = yield DealsModel_1.default.find(query)
            .populate("associatedContactId")
            .populate("status")
            .sort({ closingDate: -1 })
            .exec();
        const dealsFields = yield DealsFieldsValuesModel_1.default.find({
            deal: { $in: deals.map((deal) => deal._id) },
        })
            .populate("field")
            .exec();
        const dealProducts = yield ProductAcquisitionModel_1.default.find({
            dealId: { $in: deals.map((deal) => deal._id) },
        })
            .populate("productId")
            .populate("variantId")
            .exec();
        const dealsToSend = deals.map((deal) => {
            const fields = dealsFields.filter((field) => field.deal.toString() === deal._id.toString());
            const dealProductsFiltered = dealProducts.filter((product) => product.dealId && product.dealId.toString() === deal._id.toString());
            return Object.assign(Object.assign({}, deal.toObject()), { fields, dealProducts: dealProductsFiltered });
        });
        res.status(200).json(dealsToSend);
    }
    catch (error) {
        console.error("Error obteniendo los tratos:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getDeals = getDeals;
const searchDeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
    }
    const { organizationId } = req.user;
    const { search } = req.query;
    try {
        const deals = yield DealsModel_1.default.find({
            organizationId,
            title: { $regex: search, $options: "i" },
        })
            .populate("associatedContactId")
            .populate("pipeline")
            .populate("status")
            .exec();
        res.status(200).json(deals);
    }
    catch (error) {
        console.error("Error obteniendo los tratos:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.searchDeals = searchDeals;
/**
 * Asynchronous function that retrieves and returns a list of deals associated with a specific contact
 * for an authenticated user within an organization.
 *
 * The function validates the authentication of the user from the request object. If the user is not
 * authenticated, it responds with a 401 status and an error message. Otherwise, it retrieves the deals
 * associated with the specified contact ID from the database, populates related fields, and includes
 * additional field values associated with each deal. The deals are sorted in descending order by their
 * closing date and limited to a maximum of 100 results. If an error occurs during the database operations,
 * it sends a 500 status response along with an error message.
 *
 * @param {Request} req - The incoming request object from the client. It includes user authentication
 *                        information and request parameters such as the contact ID.
 * @param {Response} res - The response object used to send the results or error messages back to the client.
 */
const getContactDeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ message: "Usuario no autenticado" });
        return;
    }
    const { organizationId } = req.user;
    const { id } = req.params;
    const limit = 100;
    try {
        const deals = yield DealsModel_1.default.find({
            organizationId,
            associatedContactId: id,
        })
            .populate("associatedContactId")
            .populate("pipeline")
            .populate("status")
            .limit(limit)
            .sort({ closingDate: -1 })
            .exec();
        const dealsFields = yield DealsFieldsValuesModel_1.default.find({
            deal: { $in: deals.map((deal) => deal._id) },
        })
            .populate("field")
            .exec();
        const dealsToSend = deals.map((deal) => {
            const fields = dealsFields.filter((field) => field.deal.toString() === deal._id.toString());
            return Object.assign(Object.assign({}, deal.toObject()), { fields });
        });
        res.status(200).json(dealsToSend);
    }
    catch (error) {
        console.error("Error obteniendo los tratos:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getContactDeals = getContactDeals;
// Crear trato
// Crear trato
/**
 * Asynchronously creates a new deal and saves it to the database.
 *
 * This function handles deal creation by validating the request body, checking required fields,
 * and storing the deal information along with its associated fields into the database.
 * It also ensures that the user is authenticated before proceeding with the operation.
 *
 * @param {Request} req - The HTTP request object containing the deal data and user information.
 * @param {Response} res - The HTTP response object used to send the response back to the client.
 * @returns {Promise<Response>} A promise that resolves with the HTTP response containing the operation's result.
 *
 * @throws {Error} Throws an error if there is an issue while creating the deal or saving data to the database.
 */
const createDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, amount, closingDate, associatedContactId, status, pipeline, fields, products, } = req.body;
        if (!title ||
            !amount ||
            !closingDate ||
            !pipeline ||
            !status ||
            !associatedContactId) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }
        if (!req.user) {
            return res.status(401).json({ message: "Usuario no autenticado" });
        }
        // Crear el deal con los campos correctos
        const newDeal = yield DealsModel_1.default.create({
            title: title, // Mapea name a title
            amount: amount, // Mapea value a amount
            closingDate: closingDate, // Mapea expectedCloseDate a closingDate
            pipeline: pipeline,
            status: status, // Mapea stage a status
            associatedContactId: associatedContactId, // Usar contact.id
            organizationId: req.user.organizationId,
        });
        // Procesar campos personalizados (esto está bien)
        const dealFields = fields
            .filter((field) => field.value !== "")
            .map((field) => ({
            deal: newDeal._id,
            field: field.field,
            value: field.value,
        }));
        if (dealFields.length > 0) {
            yield DealsFieldsValuesModel_1.default.insertMany(dealFields);
        }
        console.log(products);
        // Procesar productos y crear adquisiciones
        if (products && products.length > 0) {
            const acquisitions = products.map((product) => {
                var _a, _b;
                return ({
                    organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
                    clientId: associatedContactId,
                    productId: product.id,
                    variantId: product.variantId || undefined,
                    dealId: newDeal._id,
                    quantity: parseInt(product.quantity) || 1, // Convertir a número porque viene como string
                    priceAtAcquisition: parseFloat(product.priceAtAcquisition) || 0, // Convertir a número
                    acquisitionDate: new Date(closingDate),
                    status: "active",
                    userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
                });
            });
            // Crear todas las adquisiciones en una sola operación
            yield ProductAcquisitionModel_1.default.insertMany(acquisitions);
        }
        return res.status(201).json({ message: "Deal created", deal: newDeal });
    }
    catch (error) {
        console.error("Error creando el trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.createDeal = createDeal;
// Obtener detalles del trato
/**
 * Asynchronously retrieves the details of a specific deal based on the provided deal ID, along with its associated fields.
 *
 * This function extracts the `id` parameter from the request, fetches the corresponding deal from the database, and populates
 * its related data, such as associated contacts, pipeline, organization, and status. It also retrieves all fields associated with the deal.
 * If the deal is not found, it returns a 404 status with a message. If an error occurs during execution, it handles the error
 * and returns a 500 status with an appropriate error message.
 *
 * @param {Request} req - The HTTP request object, which contains the deal's ID in the URL parameters.
 * @param {Response} res - The HTTP response object used to send back the result or error response.
 * @returns {Promise<Response>} - A Promise that resolves to an HTTP response containing the deal details and associated fields, or an error message in case of failure.
 */
const getDealDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealId = req.params.id;
        console.log(dealId, 1);
        const deal = yield DealsModel_1.default.findOne({ _id: dealId })
            .populate("associatedContactId")
            .populate("pipeline")
            .populate("organizationId")
            .populate("status")
            .exec();
        if (!deal) {
            return res.status(404).json({ message: "Trato no encontrado" });
        }
        const fields = yield DealsFieldsValuesModel_1.default.find({ deal: dealId })
            .populate("field")
            .exec();
        return res.status(200).json({
            deal,
            fields,
        });
    }
    catch (error) {
        console.error("Error obteniendo los detalles del trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.getDealDetails = getDealDetails;
// Cambiar el estado del trato con drag
/**
 * Updates the status of a deal based on the given deal ID and new status.
 *
 * This function handles an incoming HTTP request to update the status of a specified deal.
 * It retrieves the deal ID from the request parameters and the new status from the request body.
 * The corresponding deal status is updated in the database, and the updated deal details are returned as a response.
 *
 * If the deal is not found, a 404 status code with an error message is returned.
 * In the case of a server error during the operation, a 500 status code with an error message is returned.
 *
 * @param {Request} req - The HTTP request object containing the deal ID in `req.params` and the new status in `req.body`.
 * @param {Response} res - The HTTP response object used to send the status and data back to the client.
 * @throws Will handle exceptions occurring during the database operation, logging the error and responding with a server error status.
 */
const changeDealStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealId = req.params.id;
        const { status } = req.body;
        const dealAntes = yield DealsModel_1.default.findById(dealId).exec();
        if (!dealAntes) {
            return res.status(404).json({ message: "Trato no encontrado" });
        }
        const deal = yield DealsModel_1.default.findByIdAndUpdate(dealId, { status }, { new: true }).exec();
        // Emitir evento solo si el estado cambió
        if (deal && dealAntes.status !== status) {
            automation_listener_1.eventEmitter.emit("deals.status_changed", {
                dealId,
                fromStatus: dealAntes.status,
                toStatus: status,
                status, // estado actual
                contact: dealAntes, // asumiendo que tiene el email/whatsapp
                deal: dealAntes.toObject(),
            });
        }
        return res.status(200).json(deal);
    }
    catch (error) {
        console.error("Error cambiando el estado del trato:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.changeDealStatus = changeDealStatus;
// Editar trato
/**
 * Updates an existing deal and its associated fields in the database.
 *
 * This asynchronous function retrieves a deal by its ID and updates its
 * details along with associated custom fields. It validates the required
 * fields before performing the update operation. If the deal is not found,
 * a 404 status is returned. If any required fields are missing, a 400 status
 * is returned. In case of any server error, a 500 status is returned.
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object containing deal data in the body and the deal ID in the request parameters.
 * @param {Response} res - The HTTP response object used to send the status and response message.
 * @returns {Promise<Response>} A promise that resolves to the HTTP response with the status and message.
 */
const editDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealId = req.params.id;
        const deal = req.body;
        console.log(deal, 1);
        if (!deal.title || !deal.amount || !deal.closingDate || !deal.status) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }
        const updatedDeal = yield DealsModel_1.default.findByIdAndUpdate(dealId, deal, {
            new: true,
        }).exec();
        if (!updatedDeal) {
            return res.status(404).json({ message: "Trato no encontrado" });
        }
        // Actualizar campos personalizados
        yield DealsFieldsValuesModel_1.default.deleteMany({ deal: dealId }).exec();
        const dealFields = deal.fields.map((field) => ({
            deal: dealId,
            field: field.field,
            value: field.value,
        }));
        yield DealsFieldsValuesModel_1.default.insertMany(dealFields);
        // Manejar actualización de productos
        if (deal.dealProducts && deal.dealProducts.length > 0) {
            // Eliminar productos anteriores asociados a este trato
            yield ProductAcquisitionModel_1.default.deleteMany({ dealId }).exec();
            // Crear nuevas adquisiciones de productos
            const acquisitions = deal.dealProducts.map((product) => {
                var _a, _b;
                return ({
                    organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId,
                    clientId: deal.associatedContactId,
                    productId: product.id,
                    variantId: product.variantId || undefined,
                    dealId: dealId,
                    quantity: parseInt(product.quantity) || 1,
                    priceAtAcquisition: parseFloat(product.priceAtAcquisition) || 0,
                    acquisitionDate: new Date(deal.closingDate),
                    status: "active",
                    userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
                });
            });
            console.log(acquisitions, 2);
            // Insertar las nuevas adquisiciones
            yield ProductAcquisitionModel_1.default.insertMany(acquisitions);
        }
        return res.status(200).json({ message: "Deal updated" });
    }
    catch (error) {
        console.error("Error editando el trato:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.editDeal = editDeal;
/**
 * Deletes a deal from the database based on the provided deal ID.
 *
 * This function is asynchronous and handles the deletion of a deal document
 * identified by its unique ID. If the `dealId` is not provided or invalid,
 * a response with status code 400 is returned. If the deletion is successful,
 * a response with status code 200 and a success message is returned. If an
 * error occurs during the process, a response with status code 500 and an
 * error message is sent.
 *
 * @param {Request} req - The HTTP request object, containing parameters including the deal ID.
 * @param {Response} res - The HTTP response object, used to send back responses to the client.
 * @returns {Promise<void>} - A Promise representing the completion of the deletion operation.
 */
const deleteDeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealId = req.params.id;
        if (!dealId) {
            return res.status(400).json({ message: "Falta el id del trato" });
        }
        yield ProductAcquisitionModel_1.default.deleteMany({ dealId }).exec();
        yield DealsModel_1.default.deleteOne({ _id: dealId }).exec();
        return res.status(200).json({ message: "Deal deleted" });
    }
    catch (error) {
        console.error("Error eliminando el trato:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});
exports.deleteDeal = deleteDeal;
