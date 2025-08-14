import AutomationModel, {
  IAutomation,
  IAutomationNode,
} from "../../models/AutomationModel";
import ConversationModel from "../../models/ConversationModel";
import MessageModel from "../../models/MessageModel";
import { AutomationService } from "../conversations/automationService";

interface ExecutionContext {
  conversationId: string;
  organizationId: string;
  contactNumber: string;
  lastMessage: string;
  variables: Record<string, any>;
  sessionData?: {
    messagesCount: number;
    startedAt: Date;
  };
  isFirstMessage: boolean;
}

export class AutomationExecutor {
  /**
   * Procesa un mensaje entrante y ejecuta automatizaciones relevantes
   */
  public static async processIncomingMessage(
    conversationId: string,
    organizationId: string,
    contactNumber: string,
    message: string,
    isFirstMessage: boolean = false
  ): Promise<void> {
    try {
      // Buscar automatizaciones activas de tipo conversación para esta organización
      const automations = await AutomationModel.find({
        organizationId,
        isActive: true,
        automationType: { $in: ["conversation", null] }, // null para compatibilidad con antiguas
        $or: [
          { triggerType: "message_received" },
          { triggerType: "conversation_started" },
          { triggerType: "keyword" },
          { triggerType: "whatsapp_message" }, // Nuevo trigger específico
          // También buscar por nodos para automatizaciones visuales
          { "nodes.type": "trigger", "nodes.module": "whatsapp" },
        ],
      });

      // Buscar conversación
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        console.error("Conversación no encontrada");
        return;
      }

      // Verificar si las automatizaciones están activas para esta conversación
      const automationSettings = conversation.automationSettings || {
        isPaused: false,
      };

      if (automationSettings.isPaused) {
        return;
      }

      // Contexto para la ejecución
      const context: ExecutionContext = {
        conversationId,
        organizationId,
        contactNumber,
        lastMessage: message,
        isFirstMessage,
        variables: {
          contact_name: contactNumber,
          message,
          timestamp: new Date().toISOString(),
        },
      };

      // Ejecutar cada automatización que coincida
      for (const automation of automations) {
        const shouldExecute = await this.shouldExecuteAutomation(
          automation,
          context
        );

        if (shouldExecute) {
          await this.executeAutomation(automation, context);
        }
      }
    } catch (error) {
      console.error(
        "[AutomationExecutor] Error procesando mensaje entrante:",
        error
      );
    }
  }

  /**
   * Determina si una automatización debe ejecutarse basándose en el contexto
   */
  private static async shouldExecuteAutomation(
    automation: IAutomation,
    context: ExecutionContext
  ): Promise<boolean> {
    // Para automatizaciones del editor visual, verificar el nodo trigger
    if (automation.nodes && automation.nodes.length > 0) {
      const triggerNode = automation.nodes.find((n) => n.type === "trigger");

      if (triggerNode && triggerNode.module === "whatsapp") {
        // Verificar el evento del trigger
        if (
          triggerNode.event === "conversation_started" &&
          !context.isFirstMessage
        ) {
          return false;
        }

        if (triggerNode.event === "keyword" && triggerNode.data?.keywords) {
          const keywords = Array.isArray(triggerNode.data.keywords)
            ? triggerNode.data.keywords
            : [];
          const messageWords = context.lastMessage.toLowerCase().split(/\s+/);
          const hasKeyword = keywords.some((keyword: string) =>
            messageWords.includes(keyword.toLowerCase())
          );
          if (!hasKeyword) return false;
        }

        // Para message_received, siempre ejecutar (a menos que sea conversation_started)
        return true;
      }
    }

    // Lógica original para automatizaciones no visuales
    switch (automation.triggerType) {
      case "conversation_started":
        return context.isFirstMessage;

      case "keyword":
        if (!automation.triggerConditions?.keywords) return false;
        const messageWords = context.lastMessage.toLowerCase().split(/\s+/);
        return automation.triggerConditions.keywords.some((keyword) =>
          messageWords.includes(keyword.toLowerCase())
        );

      case "message_received":
        return true;

      default:
        return false;
    }
  }

  /**
   * Ejecuta una automatización completa
   */
  public static async executeAutomation(
    automation: IAutomation,
    context: ExecutionContext
  ): Promise<void> {
    try {
      // Verificar si se puede ejecutar basándose en el historial
      const conversation = await ConversationModel.findById(
        context.conversationId
      );

      if (!conversation) {
        console.error("Conversación no encontrada");
        return;
      }

      // Verificar duplicados
      const canTrigger = await AutomationService.canTriggerAutomation({
        conversationId: context.conversationId,
        automationType: automation._id?.toString() || "",
      });

      if (!canTrigger) {
        return;
      }

      // Si la automatización tiene nodos (editor visual), ejecutar flujo de nodos
      if (automation.nodes && automation.nodes.length > 0) {
        await this.executeNodeFlow(automation, context);
      } else {
        // Ejecutar flujo antiguo basado en código
        await this.executeLegacyFlow(automation, context);
      }

      // Registrar la ejecución
      await AutomationService.recordAutomationTriggered(
        context.conversationId,
        automation._id?.toString() || ""
      );

      // Actualizar estadísticas
      await this.updateAutomationStats(automation._id?.toString() || "", true);
    } catch (error) {
      console.error(
        `[AutomationExecutor] Error ejecutando automatización ${automation.name}:`,
        error
      );

      // Actualizar estadísticas de error
      await this.updateAutomationStats(automation._id?.toString() || "", false);
    }
  }

  /**
   * Ejecuta un flujo basado en nodos del editor visual
   */
  private static async executeNodeFlow(
    automation: IAutomation,
    context: ExecutionContext
  ): Promise<void> {
    // Encontrar el nodo trigger
    const triggerNode = automation.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      console.error("No se encontró nodo trigger");
      return;
    }

    // Ejecutar desde el trigger
    await this.executeNodeRecursive(triggerNode, automation.nodes, context);
  }

  /**
   * Ejecuta un nodo y sus siguientes de forma recursiva
   */
  private static async executeNodeRecursive(
    node: IAutomationNode,
    allNodes: IAutomationNode[],
    context: ExecutionContext
  ): Promise<void> {
    // Ejecutar según el tipo de nodo
    switch (node.type) {
      case "trigger":
        // Los triggers no ejecutan acciones, solo inician el flujo
        break;

      case "action":
        await this.executeActionNode(node, context);
        break;

      case "condition":
        const conditionMet = await this.evaluateCondition(node, context);
        const nextNodeId = conditionMet ? node.trueBranch : node.falseBranch;

        if (nextNodeId) {
          const nextNode = allNodes.find((n) => n.id === nextNodeId);
          if (nextNode) {
            await this.executeNodeRecursive(nextNode, allNodes, context);
          }
        }
        return; // Las condiciones manejan su propio flujo

      case "delay":
        const delayMs = (node.data?.delay || 5) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        break;
    }

    // Ejecutar nodos siguientes (para nodos que no son condiciones)
    if (node.next && node.next.length > 0) {
      for (const nextId of node.next) {
        const nextNode = allNodes.find((n) => n.id === nextId);
        if (nextNode) {
          await this.executeNodeRecursive(nextNode, allNodes, context);
        }
      }
    }
  }

  /**
   * Ejecuta un nodo de acción
   */
  private static async executeActionNode(
    node: IAutomationNode,
    context: ExecutionContext
  ): Promise<void> {
    // Manejar nodos del editor visual
    if (node.module === "whatsapp" || node.module === "send_whatsapp") {
      const message = this.processTemplate(
        node.data?.message || "",
        context.variables
      );

      try {
        // Importar el helper de WhatsApp
        const { sendWhatsAppMessage } = await import("./whatsappHelper");

        // Buscar la integración de WhatsApp para obtener las credenciales
        const IntegrationsModel = (
          await import("../../models/IntegrationsModel")
        ).default;
        const integration = await IntegrationsModel.findOne({
          organizationId: context.organizationId,
          service: "whatsapp",
        });

        if (!integration) {
          console.error("No se encontró integración de WhatsApp");
          return;
        }

        // Enviar el mensaje
        const messageId = await sendWhatsAppMessage({
          to: context.contactNumber,
          message,
          accessToken: integration.credentials.accessToken as string,
          phoneNumberId: integration.credentials.numberIdIdentifier as string,
        });

        if (!messageId) {
          console.error("Error al enviar mensaje de WhatsApp");
          return;
        }

        // Registrar el mensaje en la base de datos
        const MessageModel = (await import("../../models/MessageModel"))
          .default;
        const UserModel = (await import("../../models/UserModel")).default;
        const OrganizationModel = (
          await import("../../models/OrganizationModel")
        ).default;

        const org = await OrganizationModel.findById(context.organizationId);
        const systemUserId = org?.employees[0];

        await MessageModel.create({
          user: systemUserId,
          conversation: context.conversationId,
          organization: context.organizationId,
          from: "system",
          to: context.contactNumber,
          message: message,
          type: "text",
          direction: "outgoing",
          timestamp: new Date(),
          messageId: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      } catch (error) {
        console.error("Error enviando mensaje de WhatsApp:", error);
      }
    } else if (node.module === "email" || node.module === "send_email") {
      // Manejar envío de email
      console.log(`[AutomationExecutor] Enviando email (no implementado aún)`);
      // TODO: Implementar envío de email
    } else if (node.module === "webhook" || node.module === "http_request") {
      // Manejar webhook/HTTP request
      console.log(
        `[AutomationExecutor] Ejecutando HTTP request (no implementado aún)`
      );
      // TODO: Implementar HTTP request
    }
  }

  /**
   * Ejecuta el flujo antiguo (para compatibilidad)
   */
  private static async executeLegacyFlow(
    automation: IAutomation,
    context: ExecutionContext
  ): Promise<void> {
    // Por ahora, ejecutar una acción simple basada en el tipo
    if (automation.triggerType === "conversation_started") {
      await this.executeAction(
        {
          id: "legacy_action",
          type: "action",
          module: "whatsapp",
          event: "send_message",
          data: {
            message:
              "¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte hoy?",
          },
        },
        context
      );
    }
  }

  /**
   * Ejecuta una acción (enviar mensaje, etc.)
   */
  private static async executeAction(
    node: IAutomationNode,
    context: ExecutionContext
  ) {
    if (node.module === "whatsapp" && node.event === "send_message") {
      const message = this.processTemplate(
        node.data?.message || "",
        context.variables
      );

      try {
        // Importar el helper de WhatsApp
        const { sendWhatsAppMessage } = await import("./whatsappHelper");

        // Buscar la integración de WhatsApp para obtener las credenciales
        const IntegrationsModel = (
          await import("../../models/IntegrationsModel")
        ).default;
        const integration = await IntegrationsModel.findOne({
          organizationId: context.organizationId,
          service: "whatsapp",
        });

        if (!integration) {
          console.error(
            "[AutomationExecutor] No se encontró integración de WhatsApp"
          );
          return;
        }

        // Enviar el mensaje real
        const messageId = await sendWhatsAppMessage({
          to: context.contactNumber,
          message: message,
          accessToken: integration.credentials.accessToken as string,
          phoneNumberId: integration.credentials.numberIdIdentifier as string,
        });

        console.log(
          `[AutomationExecutor] Mensaje enviado exitosamente a ${context.contactNumber}, ID: ${messageId}`
        );
      } catch (error) {
        console.error(
          `[AutomationExecutor] Error enviando mensaje WhatsApp:`,
          error
        );
      }

      // Registrar el mensaje en la base de datos
      const UserModel = (await import("../../models/UserModel")).default;
      const OrganizationModel = (await import("../../models/OrganizationModel"))
        .default;

      const org = await OrganizationModel.findById(context.organizationId);
      const systemUserId = org?.employees[0];

      await MessageModel.create({
        user: systemUserId,
        conversation: context.conversationId,
        organization: context.organizationId,
        from: "system",
        to: context.contactNumber,
        message: message,
        type: "text",
        direction: "outgoing",
        timestamp: new Date(),
        messageId: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    } else if (node.module === "system" && node.event === "notify_team") {
      // Notificar al equipo
      console.log(
        `[AutomationExecutor] Notificando al equipo: ${node.data?.message || "Cliente requiere atención"}`
      );

      try {
        // Actualizar la conversación para marcarla como prioritaria
        const ConversationModel = (
          await import("../../models/ConversationModel")
        ).default;
        await ConversationModel.findByIdAndUpdate(context.conversationId, {
          priority: "high",
          $push: {
            "automationSettings.automationHistory": {
              automationType: "team_notification",
              triggeredAt: new Date(),
            },
          },
        });

        // Emitir notificación por socket
        const { getSocketInstance } = await import("../../config/socket");
        const io = getSocketInstance();

        io.to(`organization_${context.organizationId}`).emit(
          "automation_notification",
          {
            type: "team_notification",
            conversationId: context.conversationId,
            message: node.data?.message || "Cliente requiere atención humana",
            contactNumber: context.contactNumber,
            timestamp: new Date(),
          }
        );

        console.log("[AutomationExecutor] Notificación enviada al equipo");
      } catch (error) {
        console.error(
          "[AutomationExecutor] Error notificando al equipo:",
          error
        );
      }
    }
  }

  /**
   * Evalúa una condición
   */
  private static async evaluateCondition(
    node: IAutomationNode,
    context: ExecutionContext
  ): Promise<boolean> {
    const condition = node.data?.condition;
    if (!condition) return false;

    const fieldValue = this.getFieldValue(condition.field, context);
    const compareValue = condition.value;

    switch (condition.operator) {
      case "equals":
        return fieldValue === compareValue;

      case "contains":
        return String(fieldValue)
          .toLowerCase()
          .includes(String(compareValue).toLowerCase());

      case "starts_with":
        return String(fieldValue)
          .toLowerCase()
          .startsWith(String(compareValue).toLowerCase());

      case "ends_with":
        return String(fieldValue)
          .toLowerCase()
          .endsWith(String(compareValue).toLowerCase());

      case "regex":
        try {
          const regex = new RegExp(compareValue, "i");
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Obtiene el valor de un campo del contexto
   */
  private static getFieldValue(field: string, context: ExecutionContext): any {
    if (field === "message") return context.lastMessage;
    if (field.startsWith("variables.")) {
      const varName = field.substring(10);
      return context.variables[varName];
    }
    return null;
  }

  /**
   * Procesa un template reemplazando variables
   */
  private static processTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] || match;
    });
  }

  private static async updateAutomationStats(
    automationId: string,
    isSuccessful: boolean
  ) {
    // Implementa la lógica para actualizar las estadísticas de la automatización en la base de datos
  }
}
