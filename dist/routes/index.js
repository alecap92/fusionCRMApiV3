"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authRouter_1 = __importDefault(require("./authRouter"));
const contactsRouter_1 = __importDefault(require("./contactsRouter"));
const userRouter_1 = __importDefault(require("./userRouter"));
const organizationRouter_1 = __importDefault(require("./organizationRouter"));
const dealsRouter_1 = __importDefault(require("./dealsRouter"));
const activityRouter_1 = __importDefault(require("./activityRouter"));
const statusRouter_1 = __importDefault(require("./statusRouter"));
const pipelinesRouter_1 = __importDefault(require("./pipelinesRouter"));
const dealsFieldsRouter_1 = __importDefault(require("./dealsFieldsRouter"));
const chatRouter_1 = __importDefault(require("./chatRouter"));
const listRouter_1 = __importDefault(require("./listRouter"));
const fragmentRouter_1 = __importDefault(require("./fragmentRouter"));
const fileRouter_1 = __importDefault(require("./fileRouter"));
const quotationRouter_1 = __importDefault(require("./quotationRouter"));
const productRouter_1 = __importDefault(require("./productRouter"));
const notificationRouter_1 = __importDefault(require("./notificationRouter"));
const formRouter_1 = __importDefault(require("./formRouter"));
const importRouter_1 = __importDefault(require("./importRouter"));
const emailRouter_1 = __importDefault(require("./emailRouter"));
const advanceSearchRouter_1 = __importDefault(require("./advanceSearchRouter"));
const taskRouter_1 = __importDefault(require("./taskRouter"));
const projectRouter_1 = __importDefault(require("./projectRouter"));
const campanasRouter_1 = __importDefault(require("./campanasRouter"));
const leadsGenerationRouter_1 = __importDefault(require("./leadsGenerationRouter"));
const reportsRouter_1 = __importDefault(require("./reportsRouter"));
const purchaseRouter_1 = __importDefault(require("./purchaseRouter"));
const pushTokenRouter_1 = __importDefault(require("./pushTokenRouter"));
const sendMasiveEmails_1 = __importDefault(require("./sendMasiveEmails"));
const emailMarketingRouter_1 = __importDefault(require("./emailMarketingRouter"));
const emailTemplatesRouter_1 = __importDefault(require("./emailTemplatesRouter"));
const apiRouter_1 = __importDefault(require("./apiRouter"));
const downloadDealsRouter_1 = __importDefault(require("./downloadDealsRouter"));
const automationRouter_1 = __importDefault(require("./automationRouter"));
const invoiceRouter_1 = __importDefault(require("./invoiceRouter"));
const postRouter_1 = __importDefault(require("./postRouter"));
const socialAccountRouter_1 = __importDefault(require("./socialAccountRouter"));
const integrationsRouter_1 = __importDefault(require("./integrationsRouter"));
const webhookRouter_1 = __importDefault(require("./webhookRouter"));
const webhookAdmin_1 = __importDefault(require("./webhookAdmin"));
const executionLog_1 = __importDefault(require("./executionLog"));
const invoiceConfigRouter_1 = __importDefault(require("./invoiceConfigRouter"));
const creditNoteRouter_1 = __importDefault(require("./creditNoteRouter"));
const productRouter_2 = __importDefault(require("./productRouter"));
const productAcquisitionRouter_1 = __importDefault(require("./productAcquisitionRouter"));
const documentRouter_1 = __importDefault(require("./documentRouter"));
const contactFilesRouter_1 = __importDefault(require("./contactFilesRouter"));
const scoringRulesRouter_1 = __importDefault(require("./scoringRulesRouter"));
const analyticsRouter_1 = __importDefault(require("./analyticsRouter"));
const strategyRouter_1 = __importDefault(require("./strategyRouter"));
const conversation_routes_1 = __importDefault(require("./conversation.routes"));
const automationSystemRouter_1 = __importDefault(require("./automationSystemRouter"));
const n8nRouter_1 = __importDefault(require("./n8nRouter"));
const routes = {
    authRouter: authRouter_1.default,
    downloadDealsRouter: downloadDealsRouter_1.default,
    contactsRouter: contactsRouter_1.default,
    userRouter: userRouter_1.default,
    organizationRouter: organizationRouter_1.default,
    dealsRouter: dealsRouter_1.default,
    activityRouter: activityRouter_1.default,
    statusRouter: statusRouter_1.default,
    pipelinesRouter: pipelinesRouter_1.default,
    dealsFieldsRouter: dealsFieldsRouter_1.default,
    chatRouter: chatRouter_1.default,
    listRouter: listRouter_1.default,
    fragmentRouter: fragmentRouter_1.default,
    fileRouter: fileRouter_1.default,
    quotationRouter: quotationRouter_1.default,
    productRouter: productRouter_1.default,
    notificationRouter: notificationRouter_1.default,
    formRouter: formRouter_1.default,
    importRouter: importRouter_1.default,
    emailrouter: emailRouter_1.default,
    advancedSearchRouter: advanceSearchRouter_1.default,
    taskRouter: taskRouter_1.default,
    projectRouter: projectRouter_1.default,
    campanasRouter: campanasRouter_1.default,
    leadsGenerationRouter: leadsGenerationRouter_1.default,
    reportsRouter: reportsRouter_1.default,
    purchaseRouter: purchaseRouter_1.default,
    pushTokenRouter: pushTokenRouter_1.default,
    sendMasiveEmailsRouter: sendMasiveEmails_1.default,
    emailMarketing: emailMarketingRouter_1.default,
    emailTemplatesRouter: emailTemplatesRouter_1.default,
    apiRouter: apiRouter_1.default,
    automationRouter: automationRouter_1.default,
    automationSystemRouter: automationSystemRouter_1.default,
    invoiceRouter: invoiceRouter_1.default,
    postRouter: postRouter_1.default,
    socialAccountRouter: socialAccountRouter_1.default,
    integrationsRouter: integrationsRouter_1.default,
    webhookRouter: webhookRouter_1.default,
    webhookAdminRouter: webhookAdmin_1.default,
    executionLogRouter: executionLog_1.default,
    invoiceConfigRouter: invoiceConfigRouter_1.default,
    creditNoteRouter: creditNoteRouter_1.default,
    productVariantRouter: productRouter_2.default,
    productAcquisitionRouter: productAcquisitionRouter_1.default,
    documentRouter: documentRouter_1.default,
    contactFilesRouter: contactFilesRouter_1.default,
    scoringRulesRouter: scoringRulesRouter_1.default,
    analyticsRouter: analyticsRouter_1.default,
    strategyRouter: strategyRouter_1.default,
    conversationRouter: conversation_routes_1.default,
    n8nRouter: n8nRouter_1.default,
};
exports.default = routes;
