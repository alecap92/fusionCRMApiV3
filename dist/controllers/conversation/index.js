"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findConversationByPhone = exports.searchConversations = exports.deleteConversation = exports.getConversationStats = exports.getUnreadMessagesCount = exports.markConversationAsRead = exports.addMessage = exports.changeConversationPipeline = exports.moveConversationStage = exports.updateConversation = exports.getConversationById = exports.getConversationsKanban = exports.getConversations = exports.createConversation = void 0;
// Exportaciones para controladores de conversación
var createConversation_1 = require("./createConversation");
Object.defineProperty(exports, "createConversation", { enumerable: true, get: function () { return createConversation_1.createConversation; } });
var getConversations_1 = require("./getConversations");
Object.defineProperty(exports, "getConversations", { enumerable: true, get: function () { return getConversations_1.getConversations; } });
Object.defineProperty(exports, "getConversationsKanban", { enumerable: true, get: function () { return getConversations_1.getConversationsKanban; } });
Object.defineProperty(exports, "getConversationById", { enumerable: true, get: function () { return getConversations_1.getConversationById; } });
var updateConversation_1 = require("./updateConversation");
Object.defineProperty(exports, "updateConversation", { enumerable: true, get: function () { return updateConversation_1.updateConversation; } });
Object.defineProperty(exports, "moveConversationStage", { enumerable: true, get: function () { return updateConversation_1.moveConversationStage; } });
Object.defineProperty(exports, "changeConversationPipeline", { enumerable: true, get: function () { return updateConversation_1.changeConversationPipeline; } });
var addMessage_1 = require("./addMessage");
Object.defineProperty(exports, "addMessage", { enumerable: true, get: function () { return addMessage_1.addMessage; } });
Object.defineProperty(exports, "markConversationAsRead", { enumerable: true, get: function () { return addMessage_1.markConversationAsRead; } });
Object.defineProperty(exports, "getUnreadMessagesCount", { enumerable: true, get: function () { return addMessage_1.getUnreadMessagesCount; } });
var conversationStats_1 = require("./conversationStats");
Object.defineProperty(exports, "getConversationStats", { enumerable: true, get: function () { return conversationStats_1.getConversationStats; } });
var deleteConversation_1 = require("./deleteConversation");
Object.defineProperty(exports, "deleteConversation", { enumerable: true, get: function () { return deleteConversation_1.deleteConversation; } });
var searchConversations_1 = require("./searchConversations");
Object.defineProperty(exports, "searchConversations", { enumerable: true, get: function () { return searchConversations_1.searchConversations; } });
var findConversationByPhone_1 = require("./findConversationByPhone");
Object.defineProperty(exports, "findConversationByPhone", { enumerable: true, get: function () { return findConversationByPhone_1.findConversationByPhone; } });
