import { Types } from "mongoose";
import ContactModel from "../models/ContactModel";
import ScoringRuleModel, { RuleCondition } from "../models/ScoringRuleModel";
import DealsModel from "../models/DealsModel";
import ProductAcquisitionModel from "../models/ProductAcquisitionModel";
import DealsFieldsValuesModel from "../models/DealsFieldsValuesModel";

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

      // Actualizar el leadScore del contacto
      contact.leadScore = totalScore;
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
 * Recalcula el puntaje de un contacto específico
 */
export const recalculateContactScore = async (
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

    return calculateContactScore(contId, orgId);
  } catch (error) {
    console.error("Error al recalcular puntaje de contacto:", error);
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

    // Obtener todos los deals del contacto si es necesario
    const dealsInfo = await DealsModel.find({
      associatedContactId: contId,
      organizationId: orgId,
    })
      .sort({ closingDate: -1 })
      .populate("status")
      .populate("pipeline");

    const lastDeal = dealsInfo.length > 0 ? dealsInfo[0] : null;

    // Obtener productos adquiridos si es necesario
    const productAcquisitions = await ProductAcquisitionModel.find({
      clientId: contId,
      organizationId: orgId,
    }).populate("productId");

    // Obtener campos personalizados de los deals
    const dealIds = dealsInfo.map((deal) => deal._id);
    const customFields = await DealsFieldsValuesModel.find({
      deal: { $in: dealIds },
    }).populate("field");

    let totalScore = 0;

    // Aplicar todas las reglas activas
    for (const scoringRule of activeRules) {
      for (const rule of scoringRule.rules) {
        let conditionMet = false;

        // Verificar si es una regla basada en deals o en propiedades del contacto
        if (
          rule.condition.startsWith("deal_") ||
          rule.condition.startsWith("last_deal_") ||
          rule.condition.startsWith("total_deals_") ||
          rule.condition.startsWith("has_purchased_") ||
          rule.condition.startsWith("purchase_")
        ) {
          // Evaluar reglas relacionadas con deals
          conditionMet = evaluateDealRule(rule.condition, rule.value, {
            lastDeal,
            allDeals: dealsInfo,
            productAcquisitions,
            customFields,
          });
        } else {
          // Evaluar reglas basadas en propiedades del contacto (código original)
          const contactProperty = contact.properties.find(
            (p) => p.key === rule.propertyName
          );
          conditionMet = evaluateRule(
            contactProperty?.value,
            rule.condition,
            rule.value
          );
        }

        if (conditionMet) {
          totalScore += rule.points;
        }
      }
    }

    // Actualizar el leadScore en el contacto
    contact.leadScore = totalScore;
    await contact.save();

    return totalScore;
  } catch (error) {
    console.error("Error al calcular el puntaje del contacto:", error);
    throw error;
  }
};

/**
 * Calcula los puntajes para un conjunto de contactos y actualiza sus valores de leadScore
 * @param organizationId ID de la organización
 * @param contactIds Array de IDs de contactos, si no se proporciona se calculan todos
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

    // Variable para almacenar los contactos que se actualizarán
    const contactsToUpdate = [];

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

      // Actualizar el leadScore del contacto
      if (contact.leadScore !== totalScore) {
        contact.leadScore = totalScore;
        contactsToUpdate.push(contact);
      }
    }

    // Guardar todos los contactos actualizados en una sola operación bulk
    if (contactsToUpdate.length > 0) {
      // Utilizamos Promise.all para actualizar todos los contactos en paralelo
      await Promise.all(contactsToUpdate.map((contact) => contact.save()));
      console.log(
        `Actualizados ${contactsToUpdate.length} contactos con nuevo leadScore`
      );
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

const evaluateDealRule = (
  condition: string,
  expectedValue: any,
  dealData: {
    lastDeal: any;
    allDeals: any[];
    productAcquisitions: any[];
    customFields: any[];
  }
): boolean => {
  const { lastDeal, allDeals, productAcquisitions, customFields } = dealData;

  // Si no hay deals y la condición es sobre deals, no se cumple
  if (allDeals.length === 0) {
    return false;
  }

  const now = new Date();

  switch (condition) {
    case RuleCondition.LAST_DEAL_OLDER_THAN:
      if (!lastDeal) return false;
      const dealDate = new Date(lastDeal.closingDate);
      const diffTime = Math.abs(now.getTime() - dealDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > Number(expectedValue);

    case RuleCondition.LAST_DEAL_NEWER_THAN:
      if (!lastDeal) return false;
      const lastDealDate = new Date(lastDeal.closingDate);
      const timeDiff = Math.abs(now.getTime() - lastDealDate.getTime());
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return daysDiff < Number(expectedValue);

    case RuleCondition.DEAL_AMOUNT_GREATER_THAN:
      if (!lastDeal) return false;
      return lastDeal.amount > Number(expectedValue);

    case RuleCondition.DEAL_AMOUNT_LESS_THAN:
      if (!lastDeal) return false;
      return lastDeal.amount < Number(expectedValue);

    case RuleCondition.DEAL_STATUS_IS:
      if (!lastDeal || !lastDeal.status) return false;
      return lastDeal.status._id.toString() === expectedValue.toString();

    case RuleCondition.DEAL_PIPELINE_IS:
      if (!lastDeal) return false;
      return lastDeal.pipeline.toString() === expectedValue.toString();

    case RuleCondition.TOTAL_DEALS_COUNT_GREATER_THAN:
      return allDeals.length > Number(expectedValue);

    case RuleCondition.TOTAL_DEALS_AMOUNT_GREATER_THAN:
      const totalAmount = allDeals.reduce((sum, deal) => sum + deal.amount, 0);
      return totalAmount > Number(expectedValue);

    case RuleCondition.HAS_PURCHASED_PRODUCT:
      return productAcquisitions.some(
        (acq) =>
          acq.productId &&
          acq.productId._id.toString() === expectedValue.toString()
      );

    case RuleCondition.PURCHASE_FREQUENCY_LESS_THAN:
      if (allDeals.length < 2) return false;

      // Ordenar deals por fecha
      const sortedDeals = [...allDeals].sort(
        (a, b) =>
          new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime()
      );

      // Calcular intervalos entre compras en días
      let totalInterval = 0;
      for (let i = 1; i < sortedDeals.length; i++) {
        const prevDate = new Date(sortedDeals[i - 1].closingDate);
        const currDate = new Date(sortedDeals[i].closingDate);
        const interval =
          Math.abs(currDate.getTime() - prevDate.getTime()) /
          (1000 * 60 * 60 * 24);
        totalInterval += interval;
      }

      const avgInterval = totalInterval / (sortedDeals.length - 1);
      return avgInterval < Number(expectedValue);

    case RuleCondition.DEAL_FIELD_VALUE_IS:
      // Esperamos que expectedValue sea un objeto {fieldId: "...", value: "..."}
      if (!expectedValue.fieldId || expectedValue.value === undefined)
        return false;

      return customFields.some(
        (field) =>
          field.field._id.toString() === expectedValue.fieldId.toString() &&
          field.value === expectedValue.value
      );

    default:
      return false;
  }
};
