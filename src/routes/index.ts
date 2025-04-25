import authRouter from "./authRouter";
import contactsRouter from "./contactsRouter";
import userRouter from "./userRouter";
import organizationRouter from "./organizationRouter";
import dealsRouter from "./dealsRouter";
import activityRouter from "./activityRouter";
import statusRouter from "./statusRouter";
import pipelinesRouter from "./pipelinesRouter";
import dealsFieldsRouter from "./dealsFieldsRouter";
import chatRouter from "./chatRouter";
import listRouter from "./listRouter";
import fragmentRouter from "./fragmentRouter";
import fileRouter from "./fileRouter";
import quotationRouter from "./quotationRouter";
import productRouter from "./productRouter";
import notificationRouter from "./notificationRouter";
import formRouter from "./formRouter";
import importRouter from "./importRouter";
import emailrouter from "./emailRouter";
import advancedSearchRouter from "./advanceSearchRouter";
import taskRouter from "./taskRouter";
import projectRouter from "./projectRouter";
import campanasRouter from "./campanasRouter";
import leadsGenerationRouter from "./leadsGenerationRouter";
import reportsRouter from "./reportsRouter";
import purchaseRouter from "./purchaseRouter";
import pushTokenRouter from "./pushTokenRouter";
import sendMasiveEmailsRouter from "./sendMasiveEmails";
import emailMarketing from "./emailMarketingRouter";
import emailTemplatesRouter from "./emailTemplatesRouter";
import contactsApi from "./contactsApi";
import dealsApi from "./dealsApi";
import downloadDealsRouter from "./downloadDealsRouter";
import automationRouter from "./automationRouter";
import invoiceRouter from "./invoiceRouter";
import postRouter from "./postRouter";
import socialAccountRouter from "./socialAccountRouter";
import integrationsRouter from "./integrationsRouter";
import webhookRouter from "./webhookRouter";
import webhookAdminRouter from "./webhookAdmin";
import executionLogRouter from "./executionLog";
import invoiceConfigRouter from "./invoiceConfigRouter";
import creditNoteRouter from "./creditNoteRouter";
import productVariantRouter from "./productRouter";
import productAcquisitionRouter from "./productAcquisitionRouter";
import documentRouter from "./documentRouter";
import contactFilesRouter from "./contactFilesRouter";
import scoringRulesRouter from "./scoringRulesRouter";

const routes = {
  authRouter,
  downloadDealsRouter,
  contactsRouter,
  userRouter,
  organizationRouter,
  dealsRouter,
  activityRouter,
  statusRouter,
  pipelinesRouter,
  dealsFieldsRouter,
  chatRouter,
  listRouter,
  fragmentRouter,
  fileRouter,
  quotationRouter,
  productRouter,
  notificationRouter,
  formRouter,
  importRouter,
  emailrouter,
  advancedSearchRouter,
  taskRouter,
  projectRouter,
  campanasRouter,
  leadsGenerationRouter,
  reportsRouter,
  purchaseRouter,
  pushTokenRouter,
  sendMasiveEmailsRouter,
  emailMarketing,
  emailTemplatesRouter,
  contactsApi,
  dealsApi,
  automationRouter,
  invoiceRouter,
  postRouter,
  socialAccountRouter,
  integrationsRouter,
  webhookRouter,
  webhookAdminRouter,
  executionLogRouter,
  invoiceConfigRouter,
  creditNoteRouter,
  productVariantRouter,
  productAcquisitionRouter,
  documentRouter,
  contactFilesRouter,
  scoringRulesRouter,
};

export default routes;
