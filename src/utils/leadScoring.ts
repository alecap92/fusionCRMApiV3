import { Types } from "mongoose";
import ContactModel from "../models/ContactModel";
import ScoringRuleModel, { RuleCondition } from "../models/ScoringRuleModel";

/**
 * Recalcula los puntajes de todos los contactos de una organización
 * basándose en las reglas de lead scoring activas
 */
export const recalculateAllLeadScores = async (
  organizationId: string | Types.ObjectId
): Promise<void> => {
  // Convertir a ObjectId si es string
  const orgId =
    typeof organizationId === "string"
      ? new Types.ObjectId(organizationId)
      : organizationId;

  try {
    // Obtener todas las reglas activas para esta organización
    const activeRules = await ScoringRuleModel.find({
      organizationId: orgId,
      isActive: true,
    });

    if (activeRules.length === 0) {
      console.log(`No hay reglas activas para la organización ${orgId}`);
      return;
    }

    // Obtener todos los contactos de la organización
    const contacts = await ContactModel.find({ organizationId: orgId });

    // Para cada contacto, recalcular su puntaje
    for (const contact of contacts) {
      let totalScore = 0;

      // Aplicar todas las reglas activas
      for (const scoringRule of activeRules) {
        for (const rule of scoringRule.rules) {
          // Buscar la propiedad en el contacto
          const contactProperty = contact.properties.find(
            (p) => p.key === rule.propertyName
          );

          // Verificar si se cumple la condición
          if (
            evaluateRule(contactProperty?.value, rule.condition, rule.value)
          ) {
            totalScore += rule.points;
          }
        }
      }

      await contact.save();
    }

    console.log(
      `Puntajes recalculados para ${contacts.length} contactos de la organización ${orgId}`
    );
  } catch (error) {
    console.error("Error al recalcular puntajes de lead scoring:", error);
    throw error;
  }
};

/**
 * Calcula el puntaje de un contacto específico basado en las reglas activas
 * @param contactId ID del contacto
 * @param organizationId ID de la organización
 * @returns El puntaje calculado para el contacto
 */
export const calculateContactScore = async (
  contactId: string | Types.ObjectId,
  organizationId: string | Types.ObjectId
): Promise<number> => {
  try {
    // Convertir a ObjectId si son strings
    const orgId =
      typeof organizationId === "string"
        ? new Types.ObjectId(organizationId)
        : organizationId;
    const contId =
      typeof contactId === "string" ? new Types.ObjectId(contactId) : contactId;

    // Obtener todas las reglas activas para esta organización
    const activeRules = await ScoringRuleModel.find({
      organizationId: orgId,
      isActive: true,
    });

    if (activeRules.length === 0) {
      console.log(`No hay reglas activas para la organización ${orgId}`);
      return 0;
    }

    // Obtener el contacto específico
    const contact = await ContactModel.findOne({
      _id: contId,
      organizationId: orgId,
    });

    if (!contact) {
      console.log(`Contacto ${contId} no encontrado`);
      return 0;
    }

    let totalScore = 0;

    // Aplicar todas las reglas activas
    for (const scoringRule of activeRules) {
      for (const rule of scoringRule.rules) {
        // Buscar la propiedad en el contacto
        const contactProperty = contact.properties.find(
          (p) => p.key === rule.propertyName
        );

        // Verificar si se cumple la condición
        if (evaluateRule(contactProperty?.value, rule.condition, rule.value)) {
          totalScore += rule.points;
        }
      }
    }

    return totalScore;
  } catch (error) {
    console.error("Error al calcular el puntaje del contacto:", error);
    throw error;
  }
};

/**
 * Calcula los puntajes para un conjunto de contactos
 * @param contactIds Array de IDs de contactos, si no se proporciona se calculan todos
 * @param organizationId ID de la organización
 * @returns Un objeto con los IDs de contactos como claves y sus puntajes como valores
 */
export const calculateContactsScores = async (
  organizationId: string | Types.ObjectId,
  contactIds?: string[] | Types.ObjectId[]
): Promise<Record<string, number>> => {
  try {
    // Convertir a ObjectId si es string
    const orgId =
      typeof organizationId === "string"
        ? new Types.ObjectId(organizationId)
        : organizationId;

    // Obtener todas las reglas activas para esta organización
    const activeRules = await ScoringRuleModel.find({
      organizationId: orgId,
      isActive: true,
    });

    if (activeRules.length === 0) {
      console.log(`No hay reglas activas para la organización ${orgId}`);
      return {};
    }

    // Preparar el filtro de consulta
    const filter: any = { organizationId: orgId };

    // Si se proporciona una lista de IDs, filtrar solo esos contactos
    if (contactIds && contactIds.length > 0) {
      filter._id = { $in: contactIds };
    }

    // Obtener los contactos
    const contacts = await ContactModel.find(filter);

    // Calcular puntajes para cada contacto
    const scores: Record<string, number> = {};

    for (const contact of contacts) {
      let totalScore = 0;

      // Aplicar todas las reglas activas
      for (const scoringRule of activeRules) {
        for (const rule of scoringRule.rules) {
          // Buscar la propiedad en el contacto
          const contactProperty = contact.properties.find(
            (p) => p.key === rule.propertyName
          );

          // Verificar si se cumple la condición
          if (
            evaluateRule(contactProperty?.value, rule.condition, rule.value)
          ) {
            totalScore += rule.points;
          }
        }
      }

      // Asegurar que contact._id tenga el método toString()
      if (contact._id && typeof contact._id.toString === "function") {
        scores[contact._id.toString()] = totalScore;
      }
    }

    return scores;
  } catch (error) {
    console.error("Error al calcular puntajes de contactos:", error);
    throw error;
  }
};

/**
 * Evalúa si un valor cumple con una condición según las reglas de scoring
 */
const evaluateRule = (
  propertyValue: any,
  condition: string,
  expectedValue: any
): boolean => {
  // Si la propiedad no existe y la condición no es EXISTS, retorna falso
  if (propertyValue === undefined && condition !== RuleCondition.EXISTS) {
    return false;
  }

  switch (condition) {
    case RuleCondition.EXISTS:
      return (
        propertyValue !== undefined &&
        propertyValue !== null &&
        propertyValue !== ""
      );

    case RuleCondition.EQUALS:
      return propertyValue === expectedValue;

    case RuleCondition.NOT_EQUALS:
      return propertyValue !== expectedValue;

    case RuleCondition.CONTAINS:
      if (typeof propertyValue !== "string") return false;
      return propertyValue
        .toLowerCase()
        .includes(String(expectedValue).toLowerCase());

    case RuleCondition.GREATER_THAN:
      const numValue1 = Number(propertyValue);
      const numExpected1 = Number(expectedValue);
      return (
        !isNaN(numValue1) && !isNaN(numExpected1) && numValue1 > numExpected1
      );

    case RuleCondition.LESS_THAN:
      const numValue2 = Number(propertyValue);
      const numExpected2 = Number(expectedValue);
      return (
        !isNaN(numValue2) && !isNaN(numExpected2) && numValue2 < numExpected2
      );

    case RuleCondition.IN_LIST:
      if (!Array.isArray(expectedValue)) return false;
      return expectedValue.includes(propertyValue);

    default:
      return false;
  }
};
