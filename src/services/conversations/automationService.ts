import ConversationModel from "../../models/ConversationModel";
import { Schema } from "mongoose";

interface PauseAutomationParams {
  conversationId: string;
  duration: string; // "30m", "1h", "3h", "6h", "12h", "1d", "forever"
  userId: string;
}

interface CheckAutomationParams {
  conversationId: string;
  automationType: string; // "greeting", "follow_up", "reminder", etc.
}

export class AutomationService {
  /**
   * Pausa las automatizaciones para una conversación
   */
  static async pauseAutomations({
    conversationId,
    duration,
    userId,
  }: PauseAutomationParams) {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        throw new Error("Conversación no encontrada");
      }

      let pausedUntil: Date | undefined;

      if (duration !== "forever") {
        const now = new Date();
        const durationMap: { [key: string]: number } = {
          "30m": 30 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          "3h": 3 * 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "12h": 12 * 60 * 60 * 1000,
          "1d": 24 * 60 * 60 * 1000,
        };

        pausedUntil = new Date(now.getTime() + durationMap[duration]);
      }

      conversation.automationSettings = {
        ...conversation.automationSettings,
        isPaused: true,
        pausedUntil,
        pausedBy: userId as any,
        pauseReason: duration,
      };

      await conversation.save();
      return conversation;
    } catch (error) {
      console.error("Error pausando automatizaciones:", error);
      throw error;
    }
  }

  /**
   * Reanuda las automatizaciones para una conversación
   */
  static async resumeAutomations(conversationId: string, userId: string) {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        throw new Error("Conversación no encontrada");
      }

      conversation.automationSettings = {
        ...conversation.automationSettings,
        isPaused: false,
        pausedUntil: undefined,
        pausedBy: userId as any,
        pauseReason: undefined,
      };

      await conversation.save();
      return conversation;
    } catch (error) {
      console.error("Error reanudando automatizaciones:", error);
      throw error;
    }
  }

  /**
   * Verifica si las automatizaciones están activas para una conversación
   */
  static async areAutomationsActive(conversationId: string): Promise<boolean> {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        return false;
      }

      const { automationSettings } = conversation;

      // Si no está pausado, las automatizaciones están activas
      if (!automationSettings.isPaused) {
        return true;
      }

      // Si está pausado para siempre, no están activas
      if (!automationSettings.pausedUntil) {
        return false;
      }

      // Si está pausado temporalmente, verificar si ya expiró
      const now = new Date();
      if (automationSettings.pausedUntil <= now) {
        // La pausa expiró, reactivar automatizaciones
        await this.resumeAutomations(conversationId, "system");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error verificando estado de automatizaciones:", error);
      return false;
    }
  }

  /**
   * Verifica si una automatización específica puede ejecutarse
   */
  static async canTriggerAutomation({
    conversationId,
    automationType,
  }: CheckAutomationParams): Promise<boolean> {
    try {
      // Primero verificar si las automatizaciones están activas
      const areActive = await this.areAutomationsActive(conversationId);
      if (!areActive) {
        return false;
      }

      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        return false;
      }

      // Verificar si esta automatización ya se ejecutó
      const hasTriggered =
        conversation.automationSettings.automationHistory.some(
          (history) => history.automationType === automationType
        );

      // Para ciertos tipos de automatización (como saludo), solo permitir una vez
      const oneTimeAutomations = ["greeting", "welcome"];
      if (oneTimeAutomations.includes(automationType) && hasTriggered) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "Error verificando si puede disparar automatización:",
        error
      );
      return false;
    }
  }

  /**
   * Registra que una automatización fue ejecutada
   */
  static async recordAutomationTriggered(
    conversationId: string,
    automationType: string,
    triggeredBy?: string
  ) {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        throw new Error("Conversación no encontrada");
      }

      conversation.automationSettings.automationHistory.push({
        automationType,
        triggeredAt: new Date(),
        triggeredBy: triggeredBy as any,
      });

      conversation.automationSettings.lastAutomationTriggered = new Date();
      await conversation.save();

      return conversation;
    } catch (error) {
      console.error("Error registrando automatización ejecutada:", error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de automatizaciones de una conversación
   */
  static async getAutomationHistory(conversationId: string) {
    try {
      const conversation = await ConversationModel.findById(
        conversationId
      ).populate(
        "automationSettings.automationHistory.triggeredBy",
        "firstName lastName email"
      );

      if (!conversation) {
        throw new Error("Conversación no encontrada");
      }

      return conversation.automationSettings.automationHistory;
    } catch (error) {
      console.error("Error obteniendo historial de automatizaciones:", error);
      throw error;
    }
  }
}
