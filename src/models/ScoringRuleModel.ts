import { Schema, model, Document } from "mongoose";

enum RuleCondition {
  EXISTS = "exists", // La propiedad existe y no es null/undefined
  EQUALS = "equals", // La propiedad es igual a un valor específico
  NOT_EQUALS = "not_equals", // La propiedad no es igual a un valor específico
  CONTAINS = "contains", // La propiedad (string) contiene un valor
  GREATER_THAN = "greater_than", // La propiedad es mayor que un valor (numérico)
  LESS_THAN = "less_than", // La propiedad es menor que un valor (numérico)
  IN_LIST = "in_list", // La propiedad está en una lista de valores
}

interface IRule {
  propertyName: string; // Nombre del campo del contacto (ej: "city", "lifeCycle")
  condition: RuleCondition; // Tipo de condición
  value?: any; // Valor esperado (cuando aplique)
  points: number; // Puntos a asignar cuando se cumple la condición
}

interface IScoringRule extends Document {
  _id: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  rules: IRule[];
  createdAt: Date;
  updatedAt: Date;
}

const ruleSchema = new Schema<IRule>({
  propertyName: { type: String, required: true },
  condition: {
    type: String,
    enum: Object.values(RuleCondition),
    required: true,
  },
  value: { type: Schema.Types.Mixed },
  points: { type: Number, required: true },
});

const scoringRuleSchema = new Schema<IScoringRule>({
  _id: {
    type: Schema.Types.ObjectId,
    auto: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  rules: [ruleSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export { RuleCondition };
export default model<IScoringRule>("ScoringRule", scoringRuleSchema);
