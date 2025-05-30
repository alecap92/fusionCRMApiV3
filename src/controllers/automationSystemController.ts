import { Request, Response } from "express";
import AutomationModel from "../models/AutomationModel";
import OrganizationModel from "../models/OrganizationModel";
import UserModel from "../models/UserModel";

// Obtener todas las automatizaciones de la organización
export const getAutomations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const organization = await OrganizationModel.findOne({
      employees: user._id,
    });

    if (!organization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    // Filtrar por tipo si se especifica
    const query: any = { organizationId: organization._id };
    if (req.query.automationType) {
      query.automationType = req.query.automationType;
    }

    const automations = await AutomationModel.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    // Usar toJSON() que automáticamente convierte _id a id
    const formattedAutomations = automations.map((automation) =>
      automation.toJSON()
    );

    res.json(formattedAutomations);
  } catch (error) {
    console.error("Error obteniendo automatizaciones:", error);
    res.status(500).json({ error: "Error al obtener automatizaciones" });
  }
};

// Obtener una automatización por ID
export const getAutomation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const automation = await AutomationModel.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!automation) {
      return res.status(404).json({ error: "Automatización no encontrada" });
    }

    res.json(automation.toJSON());
  } catch (error) {
    console.error("Error obteniendo automatización:", error);
    res.status(500).json({ error: "Error al obtener automatización" });
  }
};

// Crear nueva automatización
export const createAutomation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const organization = await OrganizationModel.findOne({
      employees: user._id,
    });

    if (!organization) {
      return res.status(404).json({ error: "Organización no encontrada" });
    }

    // Detectar el tipo de automatización basado en los nodos
    let automationType = req.body.automationType || "workflow";
    let triggerType = req.body.triggerType || "manual";

    // Si viene del editor visual, detectar automáticamente
    if (req.body.nodes && req.body.nodes.length > 0) {
      const triggerNode = req.body.nodes.find((n: any) => n.type === "trigger");

      if (triggerNode) {
        // Detectar si es una automatización de conversación
        if (
          triggerNode.module === "whatsapp" ||
          (triggerNode.data && triggerNode.data.message)
        ) {
          automationType = "conversation";
        }

        // Detectar el tipo de trigger
        switch (triggerNode.module) {
          case "whatsapp":
            if (triggerNode.event === "conversation_started") {
              triggerType = "conversation_started";
            } else if (triggerNode.event === "keyword") {
              triggerType = "keyword";
            } else if (triggerNode.event === "whatsapp_message") {
              triggerType = "whatsapp_message";
            } else {
              triggerType = "message_received";
            }
            break;
          case "webhook":
            triggerType = "webhook";
            break;
          case "deal":
          case "deals":
            triggerType = "deal";
            break;
          case "contact":
          case "contacts":
            triggerType = "contact";
            break;
          case "task":
          case "tasks":
            triggerType = "task";
            break;
          default:
            triggerType = "manual";
        }
      }
    }

    const newAutomation = await AutomationModel.create({
      ...req.body,
      organizationId: organization._id,
      createdBy: user._id,
      automationType,
      triggerType,
      isActive: req.body.isActive || false,
      status: req.body.isActive ? "active" : "inactive",
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      },
    });

    const populated = await AutomationModel.findById(
      newAutomation._id
    ).populate("createdBy", "name email");

    res.status(201).json(populated?.toJSON());
  } catch (error) {
    console.error("Error creando automatización:", error);
    res.status(500).json({ error: "Error al crear automatización" });
  }
};

// Actualizar automatización
export const updateAutomation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user._id;

    // Si se están actualizando los nodos, recalcular el tipo
    if (req.body.nodes) {
      const triggerNode = req.body.nodes.find((n: any) => n.type === "trigger");

      if (triggerNode) {
        // Detectar si es una automatización de conversación
        if (
          triggerNode.module === "whatsapp" ||
          (triggerNode.data && triggerNode.data.message)
        ) {
          req.body.automationType = "conversation";
        }

        // Actualizar el triggerType basado en el nodo
        switch (triggerNode.module) {
          case "whatsapp":
            if (triggerNode.event === "conversation_started") {
              req.body.triggerType = "conversation_started";
            } else if (triggerNode.event === "keyword") {
              req.body.triggerType = "keyword";
            } else if (triggerNode.event === "whatsapp_message") {
              req.body.triggerType = "whatsapp_message";
            } else {
              req.body.triggerType = "message_received";
            }
            break;
          case "webhook":
            req.body.triggerType = "webhook";
            break;
          case "deal":
          case "deals":
            req.body.triggerType = "deal";
            break;
          case "contact":
          case "contacts":
            req.body.triggerType = "contact";
            break;
          case "task":
          case "tasks":
            req.body.triggerType = "task";
            break;
          default:
            req.body.triggerType = "manual";
        }
      }
    }

    // Actualizar status basado en isActive
    if (req.body.isActive !== undefined) {
      req.body.status = req.body.isActive ? "active" : "inactive";
    }

    const automation = await AutomationModel.findByIdAndUpdate(
      id,
      {
        ...req.body,
        updatedBy: userId,
      },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!automation) {
      return res.status(404).json({ error: "Automatización no encontrada" });
    }

    res.json(automation.toJSON());
  } catch (error) {
    console.error("Error actualizando automatización:", error);
    res.status(500).json({ error: "Error al actualizar automatización" });
  }
};

// Eliminar automatización
export const deleteAutomation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const automation = await AutomationModel.findByIdAndDelete(id);

    if (!automation) {
      return res.status(404).json({ error: "Automatización no encontrada" });
    }

    res.json({ message: "Automatización eliminada exitosamente" });
  } catch (error) {
    console.error("Error eliminando automatización:", error);
    res.status(500).json({ error: "Error al eliminar automatización" });
  }
};

// Alternar estado activo/inactivo
export const toggleAutomationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const automation = await AutomationModel.findById(id);

    if (!automation) {
      return res.status(404).json({ error: "Automatización no encontrada" });
    }

    automation.isActive = !automation.isActive;
    automation.status = automation.isActive ? "active" : "inactive";
    await automation.save();

    const populated = await AutomationModel.findById(automation._id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.json(populated?.toJSON());
  } catch (error) {
    console.error("Error alternando estado de automatización:", error);
    res
      .status(500)
      .json({ error: "Error al cambiar estado de automatización" });
  }
};

// Ejecutar automatización manualmente (para pruebas)
export const executeAutomation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { testData } = req.body;

    const automation = await AutomationModel.findById(id);
    if (!automation) {
      return res.status(404).json({ error: "Automatización no encontrada" });
    }

    // Importar el ejecutor apropiado según el tipo
    if (automation.automationType === "conversation") {
      const { AutomationExecutor } = await import(
        "../services/automations/automationExecutor"
      );

      // Crear contexto de prueba para conversación
      const testContext = {
        conversationId: testData?.conversationId || "test_conversation",
        organizationId: automation.organizationId.toString(),
        contactNumber: testData?.contactNumber || "34600000000",
        lastMessage: testData?.message || "Test message",
        variables: {
          contact_name: testData?.contactName || "Test User",
          message: testData?.message || "Test message",
          timestamp: new Date().toISOString(),
        },
      };

      // Ejecutar la automatización
      await (AutomationExecutor as any).executeAutomation(
        automation,
        testContext
      );
    } else {
      // Para automatizaciones visuales/workflow, usar el servicio de ejecución existente
      // TODO: Implementar ejecución para automatizaciones de workflow
      console.log(
        "Ejecución de automatizaciones de workflow no implementada aún"
      );
    }

    // Actualizar estadísticas
    automation.stats = automation.stats || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    };
    automation.stats.totalExecutions++;
    automation.stats.lastExecutedAt = new Date();
    automation.lastRun = new Date();
    automation.runsCount = (automation.runsCount || 0) + 1;
    await automation.save();

    res.json({
      message: "Automatización ejecutada exitosamente",
      testData,
    });
  } catch (error) {
    console.error("Error ejecutando automatización:", error);
    res.status(500).json({ error: "Error al ejecutar automatización" });
  }
};

// Obtener historial de ejecuciones
export const getExecutionHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const automation = await AutomationModel.findById(id).select(
      "stats automationType"
    );

    if (!automation) {
      return res.status(404).json({ error: "Automatización no encontrada" });
    }

    // Por ahora devolvemos las estadísticas
    // En el futuro podríamos tener un modelo separado para el historial detallado
    res.json({
      stats: automation.stats,
      automationType: automation.automationType,
      history: [], // TODO: Implementar historial detallado
    });
  } catch (error) {
    console.error("Error obteniendo historial:", error);
    res.status(500).json({ error: "Error al obtener historial" });
  }
};
