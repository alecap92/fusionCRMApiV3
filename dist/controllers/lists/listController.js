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
exports.exportList = exports.deleteList = exports.updateList = exports.getAllLists = exports.getDynamicListContacts = exports.createDynamicList = exports.createStaticList = void 0;
const ListModel_1 = __importDefault(require("../../models/ListModel"));
const ContactModel_1 = __importDefault(require("../../models/ContactModel"));
const DealsModel_1 = __importDefault(require("../../models/DealsModel"));
const exceljs_1 = __importDefault(require("exceljs"));
// Crear Lista Estática
const createStaticList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const startTime = Date.now();
        console.log("=== INICIO CREACIÓN DE LISTA ESTÁTICA ===");
        const { name, description, filters, Deals } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
        console.log("Datos recibidos:", {
            name,
            description,
            filters: filters ? "Filtros presentes" : "Sin filtros",
        });
        if (!filters) {
            console.error("Error: No se recibieron filtros");
            return res
                .status(400)
                .json({ message: "Se requieren filtros para crear la lista" });
        }
        const operatorMap = {
            contains: (value) => ({ $regex: value, $options: "i" }),
            equals: (value) => value,
            "starts with": (value) => ({
                $regex: `^${value}`,
                $options: "i",
            }),
            "ends with": (value) => ({ $regex: `${value}$`, $options: "i" }),
            "is empty": () => ({ $in: ["", null] }),
            "is not empty": () => ({ $nin: ["", null] }),
            greater_than: (value) => ({ $gt: Number(value) }),
            less_than: (value) => ({ $lt: Number(value) }),
        };
        console.log("Construyendo consulta de contactos...");
        // Verificar estructura de filtros para consulta MongoDB
        if (!Array.isArray(filters)) {
            console.error("Error: filters no es un array para la consulta de contactos");
            return res.status(400).json({
                message: "Formato de filtros incorrecto. Se espera un array.",
            });
        }
        // Separar filtros de leadScore
        const leadScoreFilter = filters.find((filter) => filter.key === "leadScore");
        const regularFilters = filters.filter((filter) => filter.key !== "leadScore");
        const onlyLeadScoreFilter = leadScoreFilter && regularFilters.length === 0;
        // Construir consulta para todos los filtros usando el enfoque $elemMatch
        let contactQuery = { organizationId };
        let andConditions = [];
        // Añadir condición de leadScore directamente a la consulta principal si existe
        if (leadScoreFilter) {
            let leadScoreCondition;
            switch (leadScoreFilter.operator) {
                case "greater_than":
                    leadScoreCondition = {
                        leadScore: { $gt: Number(leadScoreFilter.value) },
                    };
                    break;
                case "less_than":
                    leadScoreCondition = {
                        leadScore: { $lt: Number(leadScoreFilter.value) },
                    };
                    break;
                case "equals":
                    leadScoreCondition = { leadScore: Number(leadScoreFilter.value) };
                    break;
                default:
                    console.warn(`Operador de leadScore no soportado: ${leadScoreFilter.operator}, se usará $gt por defecto`);
                    leadScoreCondition = {
                        leadScore: { $gt: Number(leadScoreFilter.value) },
                    };
            }
            andConditions.push(leadScoreCondition);
        }
        // Añadir filtros regulares a la consulta usando $elemMatch
        if (regularFilters.length > 0) {
            for (const filter of regularFilters) {
                if (!filter.key || !filter.operator) {
                    console.warn("Filtro incompleto:", filter);
                    continue;
                }
                const operatorFn = operatorMap[filter.operator];
                if (!operatorFn) {
                    console.warn(`Operador desconocido: ${filter.operator}`);
                    continue;
                }
                const elemMatchCondition = {
                    properties: {
                        $elemMatch: {
                            key: filter.key,
                            value: operatorFn(filter.value),
                        },
                    },
                };
                andConditions.push(elemMatchCondition);
            }
        }
        // Añadir todas las condiciones a la consulta principal
        if (andConditions.length > 0) {
            contactQuery.$and = andConditions;
        }
        // Verificar primero cuántos contactos coinciden antes de obtener IDs
        const contactCount = yield ContactModel_1.default.countDocuments(contactQuery).exec();
        console.log(`Coinciden ${contactCount} contactos con los filtros`);
        // Verificar si la lista inicial es demasiado grande
        if (contactCount > 5000) {
            console.log(`Lista demasiado grande: ${contactCount} contactos coinciden con los filtros básicos`);
            return res.status(400).json({
                message: "La consulta devuelve demasiados contactos (más de 5000), por favor añada más filtros específicos",
                contactCount: contactCount,
            });
        }
        // Get contact IDs
        console.log("Buscando contactos con la consulta generada...");
        let contactIds = yield ContactModel_1.default.find(contactQuery)
            .select("_id")
            .lean()
            .exec()
            .then((contacts) => {
            return contacts.map((contact) => contact._id);
        });
        console.log(`Encontrados ${contactIds.length} contactos en ${Date.now() - startTime}ms`);
        // Verificar si la lista es demasiado grande (más de 2000 contactos)
        if (contactIds.length > 2000) {
            console.log(`Lista demasiado grande: ${contactIds.length} contactos`);
            const executionTime = Date.now() - startTime;
            return res.status(400).json({
                message: "La lista es muy grande, por favor añada más filtros para reducir el número de contactos",
                contactCount: contactIds.length,
                executionTime: `${executionTime}ms`,
            });
        }
        // Process deals filters if they exist
        if (Array.isArray(Deals) && Deals.length > 0) {
            console.log("Procesando filtros de deals");
            const hasDealsFilter = Deals.find((filter) => filter.field === "hasDeals");
            if (contactIds.length === 0) {
                console.log("No hay contactIds para filtrar por deals, se omitirá este paso");
            }
            else {
                // Build deals query
                const dealsQuery = Object.assign({ associatedContactId: { $in: contactIds } }, Deals.reduce((acc, filter) => {
                    if (filter.field === "hasDeals")
                        return acc;
                    const conditions = {
                        equals: (val) => val,
                        not_equals: (val) => ({ $ne: val }),
                        greater_than: (val) => ({ $gt: val }),
                        less_than: (val) => ({ $lt: val }),
                        contains: (val) => ({ $regex: val, $options: "i" }),
                        not_contains: (val) => ({
                            $not: { $regex: val, $options: "i" },
                        }),
                    };
                    const conditionFn = conditions[filter.condition];
                    if (!conditionFn) {
                        console.warn(`Condición de deal desconocida: ${filter.condition}`);
                    }
                    return {
                        [filter.field]: conditionFn === null || conditionFn === void 0 ? void 0 : conditionFn(filter.value),
                    };
                }, {}));
                console.log("Buscando deals asociados a los contactos...");
                const deals = yield DealsModel_1.default.distinct("associatedContactId", dealsQuery);
                console.log(`Encontrados ${deals.length} deals asociados`);
                const dealsSet = new Set(deals.map((id) => id.toString()));
                console.log("Contactos con deals:", dealsSet.size);
                if (hasDealsFilter) {
                    const contactIdsBeforeFilter = contactIds.length;
                    // Asegurarse de que hasDealsFilter.value sea booleano
                    const hasDealsValue = hasDealsFilter.value === true || hasDealsFilter.value === "true";
                    // Si no hay deals en absoluto, el comportamiento depende del valor de hasDealsValue
                    if (dealsSet.size === 0) {
                        console.log("No se encontraron deals asociados a ningún contacto");
                        // Si hasDealsValue es true, no debería haber contactos (porque ninguno tiene deals)
                        // Si hasDealsValue es false, deberían mantenerse todos los contactos (porque ninguno tiene deals)
                        if (hasDealsValue) {
                            console.log("Se solicitan contactos CON deals, pero no hay deals, retornando lista vacía");
                            contactIds = [];
                        }
                        else {
                            console.log("Se solicitan contactos SIN deals, todos los contactos cumplen esta condición");
                            // Mantener todos los contactos ya que ninguno tiene deals
                        }
                    }
                    else {
                        // Caso normal cuando hay algunos deals
                        console.log(`Se encontraron ${dealsSet.size} contactos con deals`);
                        // Si hasDealsValue es true: mantener solo contactos CON deals
                        // Si hasDealsValue es false: mantener solo contactos SIN deals
                        const filteredIds = [];
                        for (const id of contactIds) {
                            const idStr = id.toString();
                            const hasDeals = dealsSet.has(idStr);
                            const keepContact = hasDealsValue === hasDeals;
                            if (keepContact) {
                                filteredIds.push(id);
                            }
                        }
                        contactIds = filteredIds;
                    }
                    console.log(`Filtro hasDeals aplicado: ${contactIdsBeforeFilter} → ${contactIds.length} contactos`);
                    // Verificar nuevamente si la lista sigue siendo demasiado grande después de filtrar por deals
                    if (contactIds.length > 2000) {
                        console.log(`Lista sigue siendo demasiado grande después de filtrar por deals: ${contactIds.length} contactos`);
                        const executionTime = Date.now() - startTime;
                        return res.status(400).json({
                            message: "La lista es muy grande, por favor añada más filtros para reducir el número de contactos",
                            contactCount: contactIds.length,
                            executionTime: `${executionTime}ms`,
                        });
                    }
                }
            }
        }
        // Create and save list
        console.log("Creando nueva lista con", contactIds.length, "contactos");
        const list = new ListModel_1.default({
            name,
            description,
            filters: filters,
            contactIds,
            isDynamic: false,
            userId,
            organizationId,
        });
        console.log("Guardando lista en la base de datos...");
        yield list.save();
        const executionTime = Date.now() - startTime;
        console.log(`Lista guardada exitosamente. Tiempo total de ejecución: ${executionTime}ms`);
        console.log("=== FIN CREACIÓN DE LISTA ESTÁTICA ===");
        res.status(201).json(Object.assign(Object.assign({}, list.toObject()), { executionTime: `${executionTime}ms`, contactCount: contactIds.length }));
    }
    catch (error) {
        console.error("=== ERROR EN CREACIÓN DE LISTA ESTÁTICA ===");
        console.error("Detalles del error:", error);
        if (error instanceof Error) {
            console.error("Mensaje:", error.message);
            console.error("Stack:", error.stack);
        }
        res.status(500).json({
            message: "Error creando la lista estática",
            error,
            errorMessage: error instanceof Error ? error.message : "Error desconocido",
        });
    }
});
exports.createStaticList = createStaticList;
// Crear Lista Dinámica
const createDynamicList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log("=== INICIO CREACIÓN DE LISTA DINÁMICA ===");
    const { name, description } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
    console.log("Datos recibidos:", {
        name,
        description,
        userId,
        organizationId,
        filtros: req.body.filters
            ? JSON.stringify(req.body.filters).substring(0, 200) +
                (JSON.stringify(req.body.filters).length > 200 ? "..." : "")
            : "No hay filtros",
    });
    if (!req.body.filters) {
        console.error("Error: No se recibieron filtros");
        return res
            .status(400)
            .json({ message: "Se requieren filtros para crear la lista dinámica" });
    }
    // Verificar estructura de filtros
    console.log("Tipo de filtros recibidos:", typeof req.body.filters, Array.isArray(req.body.filters));
    try {
        console.log("Tipo de filtros recibidos:", typeof req.body.filters, Array.isArray(req.body.filters));
        // No convertimos los filtros a string
        const filters = req.body.filters;
        console.log("Filtros a guardar:", filters);
        // Verificar que los filtros de leadScore tengan operadores válidos
        if (Array.isArray(filters)) {
            const leadScoreFilter = filters.find((filter) => filter.key === "leadScore");
            if (leadScoreFilter) {
                console.log("Filtro de leadScore en lista dinámica:", leadScoreFilter);
                // Validar que el operador es compatible
                const validOperators = ["greater_than", "less_than", "equals"];
                if (!validOperators.includes(leadScoreFilter.operator)) {
                    console.warn(`Operador de leadScore '${leadScoreFilter.operator}' no soportado. Se usará 'greater_than'.`);
                    leadScoreFilter.operator = "greater_than";
                }
                // Asegurar que el valor es numérico
                if (isNaN(Number(leadScoreFilter.value))) {
                    console.warn(`Valor de leadScore '${leadScoreFilter.value}' no es numérico. Se usará 0.`);
                    leadScoreFilter.value = "0";
                }
            }
        }
        console.log("Creando nueva lista dinámica...");
        const list = new ListModel_1.default({
            name,
            description,
            filters, // No usar JSON.stringify aquí
            isDynamic: true,
            userId,
            organizationId,
        });
        console.log("Guardando lista en la base de datos...");
        yield list.save();
        console.log("Lista dinámica guardada exitosamente");
        console.log("=== FIN CREACIÓN DE LISTA DINÁMICA ===");
        res.status(201).json(list);
    }
    catch (error) {
        console.error("=== ERROR EN CREACIÓN DE LISTA DINÁMICA ===");
        console.error("Detalles del error:", error);
        if (error instanceof Error) {
            console.error("Mensaje:", error.message);
            console.error("Stack:", error.stack);
        }
        res.status(500).json({ message: "Error creando la lista dinámica", error });
    }
});
exports.createDynamicList = createDynamicList;
// Obtener Contactos de una Lista Dinámica
const getDynamicListContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const startTime = Date.now();
    console.log("=== INICIO OBTENCIÓN DE CONTACTOS DE LISTA ===");
    const { id, page = 1, limit = 10 } = req.query;
    console.log("Parámetros recibidos:", { id, page, limit });
    try {
        console.log(`Buscando lista con ID: ${id}`);
        const list = yield ListModel_1.default.findById(id).exec();
        if (!list) {
            console.error(`Lista con ID ${id} no encontrada`);
            res.status(404).json({ message: "Lista no encontrada" });
            return;
        }
        let contacts, totalContacts = 0;
        if (list.isDynamic) {
            console.log("Obteniendo contactos de lista dinámica");
            try {
                console.log("Filtros de la lista:", JSON.stringify(list.filters));
                // Construir la consulta de filtros para MongoDB basada en los filtros almacenados
                let filterQuery = { organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId };
                // Variable para almacenar si hay filtro de leadScore
                let hasLeadScoreFilter = false;
                let leadScoreFilters = [];
                let onlyLeadScoreFilter = false;
                if (Array.isArray(list.filters) && list.filters.length > 0) {
                    // Separar filtros de leadScore
                    const leadScoreFilter = list.filters.find((filter) => filter.key === "leadScore");
                    const regularFilters = list.filters.filter((filter) => filter.key !== "leadScore");
                    hasLeadScoreFilter = !!leadScoreFilter;
                    onlyLeadScoreFilter =
                        hasLeadScoreFilter && regularFilters.length === 0;
                    console.log(`Filtros de leadScore: ${hasLeadScoreFilter ? 1 : 0}, Filtros regulares: ${regularFilters.length}`);
                    console.log("¿Solo filtros de leadScore?", onlyLeadScoreFilter);
                    if (hasLeadScoreFilter) {
                        console.log(`Filtro leadScore:`, leadScoreFilter);
                    }
                    // Añadir condiciones de leadScore directamente a la consulta
                    if (leadScoreFilter) {
                        console.log("Añadiendo filtro de leadScore a la consulta principal:", leadScoreFilter);
                        if (!filterQuery.$and) {
                            filterQuery.$and = [];
                        }
                        let leadScoreCondition;
                        switch (leadScoreFilter.operator) {
                            case "greater_than":
                                leadScoreCondition = {
                                    leadScore: { $gt: Number(leadScoreFilter.value) },
                                };
                                break;
                            case "less_than":
                                leadScoreCondition = {
                                    leadScore: { $lt: Number(leadScoreFilter.value) },
                                };
                                break;
                            case "equals":
                                leadScoreCondition = {
                                    leadScore: Number(leadScoreFilter.value),
                                };
                                break;
                            default:
                                console.warn(`Operador de leadScore no soportado: ${leadScoreFilter.operator}, se usará $gt por defecto`);
                                leadScoreCondition = {
                                    leadScore: { $gt: Number(leadScoreFilter.value) },
                                };
                        }
                        filterQuery.$and.push(leadScoreCondition);
                    }
                    // Procesar la lista de filtros regulares
                    if (regularFilters.length > 0) {
                        if (!filterQuery.$and) {
                            filterQuery.$and = [];
                        }
                        const filtersConditions = regularFilters.map((filter) => {
                            let valueCondition;
                            switch (filter.operator) {
                                case "contains":
                                    valueCondition = { $regex: filter.value, $options: "i" };
                                    break;
                                case "equals":
                                    valueCondition = filter.value;
                                    break;
                                case "starts with":
                                    valueCondition = {
                                        $regex: `^${filter.value}`,
                                        $options: "i",
                                    };
                                    break;
                                case "ends with":
                                    valueCondition = {
                                        $regex: `${filter.value}$`,
                                        $options: "i",
                                    };
                                    break;
                                case "is empty":
                                    valueCondition = { $in: ["", null] };
                                    break;
                                case "is not empty":
                                    valueCondition = { $nin: ["", null] };
                                    break;
                                default:
                                    valueCondition = { $regex: filter.value, $options: "i" };
                            }
                            return {
                                $and: [
                                    { "properties.key": filter.key },
                                    { "properties.value": valueCondition },
                                ],
                            };
                        });
                        filterQuery.$and.push(...filtersConditions);
                    }
                    console.log("Consulta generada para lista dinámica:", JSON.stringify(filterQuery));
                }
                else {
                    console.log("No hay filtros o no están en formato array");
                }
                console.time("contar_contactos");
                // Contar el total de contactos sin paginación para verificar tamaño
                totalContacts = yield ContactModel_1.default.countDocuments(filterQuery).exec();
                console.log(`Total contactos: ${totalContacts} (${Date.now() - startTime}ms)`);
                // Verificar si la lista es demasiado grande (más de 2000 contactos)
                if (totalContacts > 2000) {
                    console.log(`Lista dinámica demasiado grande: ${totalContacts} contactos`);
                    const executionTime = Date.now() - startTime;
                    return res.status(400).json({
                        message: "La lista es muy grande, por favor añada más filtros para reducir el número de contactos",
                        contactCount: totalContacts,
                        executionTime: `${executionTime}ms`,
                    });
                }
                console.time("obtener_contactos_paginados");
                console.log("Buscando contactos que coincidan con los filtros...");
                contacts = yield ContactModel_1.default.find(filterQuery)
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit))
                    .exec();
                console.timeEnd("obtener_contactos_paginados");
                console.log(`Contactos encontrados: ${contacts.length}`);
                console.timeEnd("contar_contactos");
            }
            catch (error) {
                console.error("Error al procesar filtros de lista dinámica:", error);
                if (error instanceof Error) {
                    console.error("Mensaje:", error.message);
                }
                throw error;
            }
        }
        else {
            console.log("Obteniendo contactos de lista estática");
            console.log(`Total de IDs de contactos en la lista: ${list.contactIds.length}`);
            // Verificar si la lista estática es demasiado grande
            if (list.contactIds.length > 2000) {
                console.log(`Lista estática demasiado grande: ${list.contactIds.length} contactos`);
                const executionTime = Date.now() - startTime;
                return res.status(400).json({
                    message: "La lista es muy grande, por favor añada más filtros para reducir el número de contactos",
                    contactCount: list.contactIds.length,
                    executionTime: `${executionTime}ms`,
                });
            }
            console.time("obtener_contactos_estatica");
            contacts = yield ContactModel_1.default.find({ _id: { $in: list.contactIds } })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit))
                .exec();
            console.timeEnd("obtener_contactos_estatica");
            console.log(`Contactos encontrados: ${contacts.length}`);
            totalContacts = list.contactIds.length;
        }
        const executionTime = Date.now() - startTime;
        console.log(`=== FIN OBTENCIÓN DE CONTACTOS DE LISTA (${executionTime}ms) ===`);
        res.status(200).json({
            totalContacts,
            totalPages: Math.ceil(totalContacts || 0 / Number(limit)),
            currentPage: Number(page),
            contacts,
            executionTime: `${executionTime}ms`,
        });
    }
    catch (error) {
        console.error("=== ERROR EN OBTENCIÓN DE CONTACTOS DE LISTA ===");
        console.error("Detalles del error:", error);
        if (error instanceof Error) {
            console.error("Mensaje:", error.message);
            console.error("Stack:", error.stack);
        }
        const executionTime = Date.now() - startTime;
        res.status(500).json({
            message: "Error al obtener los contactos de la lista",
            error,
            errorMessage: error instanceof Error ? error.message : "Error desconocido",
            executionTime: `${executionTime}ms`,
        });
    }
});
exports.getDynamicListContacts = getDynamicListContacts;
// Obtener Todas las Listas
const getAllLists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        const lists = yield ListModel_1.default.find({
            organizationId: req.user.organizationId,
        }).exec();
        res.status(200).json(lists);
    }
    catch (error) {
        console.error("Error retrieving lists:", error);
        res.status(500).json({ message: "Error al obtener las listas", error });
    }
});
exports.getAllLists = getAllLists;
// Actualizar Lista
const updateList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { name, description, filters, isDynamic } = req.body;
    try {
        const list = yield ListModel_1.default.findById(id).exec();
        if (!list) {
            res.status(404).json({ message: "Lista no encontrada" });
            return;
        }
        list.name = name || list.name;
        list.description = description || list.description;
        list.filters = filters || list.filters;
        list.isDynamic = isDynamic !== undefined ? isDynamic : list.isDynamic;
        if (!isDynamic) {
            // Para listas estáticas, actualizar los contactIds según los filtros
            // Separar filtros de leadScore
            const leadScoreFilter = filters === null || filters === void 0 ? void 0 : filters.find((filter) => filter.key === "leadScore");
            const regularFilters = filters === null || filters === void 0 ? void 0 : filters.filter((filter) => filter.key !== "leadScore");
            // Primero obtener contactos por filtros regulares
            const contactQuery = { organizationId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId };
            // Añadir condiciones de leadScore directamente a la consulta principal
            if (leadScoreFilter) {
                console.log("Añadiendo filtro de leadScore a la consulta principal:", leadScoreFilter);
                if (!contactQuery.$and) {
                    contactQuery.$and = [];
                }
                let leadScoreCondition = {};
                switch (leadScoreFilter.operator) {
                    case "greater_than":
                        leadScoreCondition = {
                            leadScore: { $gt: Number(leadScoreFilter.value) },
                        };
                        break;
                    case "less_than":
                        leadScoreCondition = {
                            leadScore: { $lt: Number(leadScoreFilter.value) },
                        };
                        break;
                    case "equals":
                        leadScoreCondition = { leadScore: Number(leadScoreFilter.value) };
                        break;
                    default:
                        console.warn(`Operador de leadScore no soportado: ${leadScoreFilter.operator}, se usará $gt por defecto`);
                        leadScoreCondition = {
                            leadScore: { $gt: Number(leadScoreFilter.value) },
                        };
                }
                contactQuery.$and.push(leadScoreCondition);
            }
            if (regularFilters && regularFilters.length > 0) {
                if (!contactQuery.$and) {
                    contactQuery.$and = [];
                }
                contactQuery.$and = [
                    ...contactQuery.$and,
                    ...regularFilters.map((filter) => {
                        let valueCondition;
                        switch (filter.operator) {
                            case "contains":
                                valueCondition = { $regex: filter.value, $options: "i" };
                                break;
                            case "equals":
                                valueCondition = filter.value;
                                break;
                            case "starts with":
                                valueCondition = { $regex: `^${filter.value}`, $options: "i" };
                                break;
                            case "ends with":
                                valueCondition = { $regex: `${filter.value}$`, $options: "i" };
                                break;
                            case "is empty":
                                valueCondition = { $in: ["", null] };
                                break;
                            case "is not empty":
                                valueCondition = { $nin: ["", null] };
                                break;
                            case "greater_than":
                                valueCondition = { $gt: Number(filter.value) };
                                break;
                            case "less_than":
                                valueCondition = { $lt: Number(filter.value) };
                                break;
                            default:
                                valueCondition = { $regex: filter.value, $options: "i" };
                        }
                        return {
                            $and: [
                                { "properties.key": filter.key },
                                { "properties.value": valueCondition },
                            ],
                        };
                    }),
                ];
            }
            let contacts = yield ContactModel_1.default.find(contactQuery).select("_id").exec();
            list.contactIds = contacts.map((contact) => contact._id);
        }
        else {
            list.contactIds = [];
        }
        yield list.save();
        res.status(200).json(list);
    }
    catch (error) {
        console.error("Error updating list:", error);
        res.status(500).json({ message: "Error al actualizar la lista", error });
    }
});
exports.updateList = updateList;
// Eliminar Lista
const deleteList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const list = yield ListModel_1.default.findByIdAndDelete(id).exec();
        if (!list) {
            res.status(404).json({ message: "Lista no encontrada" });
            return;
        }
        res.status(200).json({ message: "Lista eliminada exitosamente" });
    }
    catch (error) {
        console.error("Error deleting list:", error);
        res.status(500).json({ message: "Error al eliminar la lista", error });
    }
});
exports.deleteList = deleteList;
function transformContactsForExcel(contacts) {
    return contacts.map((contact) => {
        const flat = {};
        if (Array.isArray(contact.properties)) {
            contact.properties.forEach((prop) => {
                if (prop.isVisible && prop.value !== "") {
                    flat[prop.key] = prop.value;
                }
            });
        }
        return flat;
    });
}
const exportList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
        const { id } = req.params;
        const list = yield ListModel_1.default.findOne({ _id: id, organizationId }).exec();
        if (!list)
            return res.status(404).json({ message: "Lista no encontrada" });
        let contacts = [];
        // 🧠 Buscar contactos
        if (list.isDynamic && ((_b = list.filters) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            // Separar filtros de leadScore
            const leadScoreFilter = list.filters.find((filter) => filter.key === "leadScore");
            const regularFilters = list.filters.filter((filter) => filter.key !== "leadScore");
            // Construir query inicial sin leadScore
            const query = { organizationId };
            // Añadir filtro de leadScore directamente a la consulta
            if (leadScoreFilter) {
                console.log("Añadiendo filtro de leadScore para exportación:", leadScoreFilter);
                if (!query.$and) {
                    query.$and = [];
                }
                let leadScoreCondition = {};
                switch (leadScoreFilter.operator) {
                    case "greater_than":
                        leadScoreCondition = {
                            leadScore: { $gt: Number(leadScoreFilter.value) },
                        };
                        break;
                    case "less_than":
                        leadScoreCondition = {
                            leadScore: { $lt: Number(leadScoreFilter.value) },
                        };
                        break;
                    case "equals":
                        leadScoreCondition = { leadScore: Number(leadScoreFilter.value) };
                        break;
                    default:
                        console.warn(`Operador de leadScore no soportado: ${leadScoreFilter.operator}, se usará $gt por defecto`);
                        leadScoreCondition = {
                            leadScore: { $gt: Number(leadScoreFilter.value) },
                        };
                }
                query.$and.push(leadScoreCondition);
            }
            // Añadir filtros regulares a la consulta
            for (const filter of regularFilters) {
                if (!query.$and) {
                    query.$and = [];
                }
                let filterCondition = {};
                switch (filter.operator) {
                    case "contains":
                        filterCondition = {
                            $and: [
                                { "properties.key": filter.key },
                                { "properties.value": { $regex: filter.value, $options: "i" } },
                            ],
                        };
                        break;
                    case "equals":
                        filterCondition = {
                            $and: [
                                { "properties.key": filter.key },
                                { "properties.value": filter.value },
                            ],
                        };
                        break;
                    case "greater_than":
                        filterCondition = {
                            $and: [
                                { "properties.key": filter.key },
                                { "properties.value": { $gt: Number(filter.value) } },
                            ],
                        };
                        break;
                    case "less_than":
                        filterCondition = {
                            $and: [
                                { "properties.key": filter.key },
                                { "properties.value": { $lt: Number(filter.value) } },
                            ],
                        };
                        break;
                    default:
                        filterCondition = {
                            $and: [
                                { "properties.key": filter.key },
                                { "properties.value": { $regex: filter.value, $options: "i" } },
                            ],
                        };
                }
                query.$and.push(filterCondition);
            }
            // Obtener contactos con todos los filtros aplicados
            contacts = yield ContactModel_1.default.find(query).exec();
            console.log(`Encontrados ${contacts.length} contactos para exportar`);
        }
        else {
            contacts = yield ContactModel_1.default.find({
                _id: { $in: list.contactIds },
                organizationId,
            }).exec();
        }
        // 🔄 Transformar contactos para Excel
        const transformContactsForExcel = (contacts) => {
            return contacts.map((contact) => {
                const flat = {};
                if (Array.isArray(contact.properties)) {
                    contact.properties.forEach((prop) => {
                        if (prop.isVisible && prop.value !== "") {
                            flat[prop.key] = prop.value;
                        }
                    });
                }
                return flat;
            });
        };
        const transformedContacts = transformContactsForExcel(contacts);
        // 📦 Crear Excel
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Contactos");
        // Headers dinámicos
        const allKeys = new Set();
        transformedContacts.forEach((c) => Object.keys(c).forEach((k) => allKeys.add(k)));
        worksheet.columns = Array.from(allKeys).map((key) => ({
            header: key,
            key,
            width: 20,
        }));
        // Agregar filas
        transformedContacts.forEach((row) => {
            worksheet.addRow(row);
        });
        // Enviar como descarga
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="Export-${list.name}.xlsx"`);
        yield workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("Error exportando lista:", error);
        res.status(500).json({ message: "Error al exportar la lista", error });
    }
});
exports.exportList = exportList;
