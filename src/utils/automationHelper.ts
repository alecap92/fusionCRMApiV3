import { AutomationService } from "../services/conversations/automationService";

/**
 * Helper para verificar y ejecutar automatizaciones de manera segura
 */
export class AutomationHelper {
  /**
   * Verifica si se puede ejecutar una automatización y la registra si es exitosa
   * @param conversationId - ID de la conversación
   * @param automationType - Tipo de automatización (greeting, follow_up, etc.)
   * @param automationFunction - Función que ejecuta la automatización
   * @param triggeredBy - Usuario que dispara la automatización (opcional)
   * @returns Promise<boolean> - true si se ejecutó, false si no
   */
  static async executeIfAllowed(
    conversationId: string,
    automationType: string,
    automationFunction: () => Promise<void>,
    triggeredBy?: string
  ): Promise<boolean> {
    try {
      // Verificar si la automatización puede ejecutarse
      const canTrigger = await AutomationService.canTriggerAutomation({
        conversationId,
        automationType,
      });

      if (!canTrigger) {
        console.log(
          `Automatización '${automationType}' bloqueada para conversación ${conversationId}`
        );
        return false;
      }

      // Ejecutar la automatización
      await automationFunction();

      // Registrar que la automatización fue ejecutada
      await AutomationService.recordAutomationTriggered(
        conversationId,
        automationType,
        triggeredBy
      );

      console.log(
        `Automatización '${automationType}' ejecutada exitosamente para conversación ${conversationId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Error ejecutando automatización '${automationType}':`,
        error
      );
      return false;
    }
  }

  /**
   * Ejemplo de uso para saludo automático
   */
  static async sendGreetingIfAllowed(
    conversationId: string,
    phoneNumber: string,
    sendMessageFunction: (phone: string, message: string) => Promise<void>
  ): Promise<boolean> {
    return this.executeIfAllowed(
      conversationId,
      "greeting",
      async () => {
        const greetingMessage =
          "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?";
        await sendMessageFunction(phoneNumber, greetingMessage);
      },
      "system"
    );
  }

  /**
   * Ejemplo de uso para mensaje de seguimiento
   */
  static async sendFollowUpIfAllowed(
    conversationId: string,
    phoneNumber: string,
    sendMessageFunction: (phone: string, message: string) => Promise<void>,
    userId?: string
  ): Promise<boolean> {
    return this.executeIfAllowed(
      conversationId,
      "follow_up",
      async () => {
        const followUpMessage = "¿Hay algo más en lo que podamos ayudarte?";
        await sendMessageFunction(phoneNumber, followUpMessage);
      },
      userId || "system"
    );
  }

  /**
   * Ejemplo de uso para recordatorio
   */
  static async sendReminderIfAllowed(
    conversationId: string,
    phoneNumber: string,
    sendMessageFunction: (phone: string, message: string) => Promise<void>,
    reminderMessage: string,
    userId?: string
  ): Promise<boolean> {
    return this.executeIfAllowed(
      conversationId,
      "reminder",
      async () => {
        await sendMessageFunction(phoneNumber, reminderMessage);
      },
      userId || "system"
    );
  }

  /**
   * Verifica si las automatizaciones están activas para una conversación
   */
  static async areAutomationsActive(conversationId: string): Promise<boolean> {
    return AutomationService.areAutomationsActive(conversationId);
  }

  /**
   * Obtiene el historial de automatizaciones para debugging
   */
  static async getAutomationHistory(conversationId: string) {
    return AutomationService.getAutomationHistory(conversationId);
  }
}

/**
 * Ejemplo de integración en un webhook de WhatsApp
 */
export const exampleWebhookIntegration = async (
  conversationId: string,
  phoneNumber: string,
  messageText: string,
  sendMessage: (phone: string, message: string) => Promise<void>
) => {
  // Verificar si es el primer mensaje de la conversación
  const isFirstMessage =
    messageText.toLowerCase().includes("hola") ||
    messageText.toLowerCase().includes("hello");

  if (isFirstMessage) {
    // Intentar enviar saludo automático
    const greetingSent = await AutomationHelper.sendGreetingIfAllowed(
      conversationId,
      phoneNumber,
      sendMessage
    );

    if (greetingSent) {
      console.log("Saludo automático enviado");
    } else {
      console.log(
        "Saludo automático bloqueado (ya se envió anteriormente o automatizaciones pausadas)"
      );
    }
  }

  // Ejemplo de seguimiento después de cierto tiempo
  // (esto normalmente se haría con un cron job o sistema de colas)
  setTimeout(
    async () => {
      await AutomationHelper.sendFollowUpIfAllowed(
        conversationId,
        phoneNumber,
        sendMessage
      );
    },
    30 * 60 * 1000
  ); // 30 minutos después
};
