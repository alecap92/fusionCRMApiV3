// Exportaciones para controladores de conversación
export { createConversation } from "./createConversation";
export {
  getConversations,
  getConversationsKanban,
  getConversationById,
} from "./getConversations";
export {
  updateConversation,
  moveConversationStage,
  changeConversationPipeline,
} from "./updateConversation";
export {
  addMessage,
  markConversationAsRead,
  getUnreadMessagesCount,
} from "./addMessage";
export { getConversationStats } from "./conversationStats";
export { deleteConversation } from "./deleteConversation";
export { searchConversations } from "./searchConversations";
export { findConversationByPhone } from "./findConversationByPhone";
