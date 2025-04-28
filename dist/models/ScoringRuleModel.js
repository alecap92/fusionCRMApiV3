"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleCondition = void 0;
const mongoose_1 = require("mongoose");
var RuleCondition;
(function (RuleCondition) {
    RuleCondition["EXISTS"] = "exists";
    RuleCondition["EQUALS"] = "equals";
    RuleCondition["NOT_EQUALS"] = "not_equals";
    RuleCondition["CONTAINS"] = "contains";
    RuleCondition["GREATER_THAN"] = "greater_than";
    RuleCondition["LESS_THAN"] = "less_than";
    RuleCondition["IN_LIST"] = "in_list";
    RuleCondition["LAST_DEAL_OLDER_THAN"] = "last_deal_older_than";
    RuleCondition["LAST_DEAL_NEWER_THAN"] = "last_deal_newer_than";
    RuleCondition["DEAL_AMOUNT_GREATER_THAN"] = "deal_amount_greater_than";
    RuleCondition["DEAL_AMOUNT_LESS_THAN"] = "deal_amount_less_than";
    RuleCondition["DEAL_STATUS_IS"] = "deal_status_is";
    RuleCondition["DEAL_PIPELINE_IS"] = "deal_pipeline_is";
    RuleCondition["TOTAL_DEALS_COUNT_GREATER_THAN"] = "total_deals_count_greater_than";
    RuleCondition["TOTAL_DEALS_AMOUNT_GREATER_THAN"] = "total_deals_amount_greater_than";
    RuleCondition["HAS_PURCHASED_PRODUCT"] = "has_purchased_product";
    RuleCondition["PURCHASE_FREQUENCY_LESS_THAN"] = "purchase_frequency_less_than";
    RuleCondition["DEAL_FIELD_VALUE_IS"] = "deal_field_value_is";
})(RuleCondition || (exports.RuleCondition = RuleCondition = {}));
const ruleSchema = new mongoose_1.Schema({
    propertyName: { type: String, required: true },
    condition: {
        type: String,
        enum: Object.values(RuleCondition),
        required: true,
    },
    value: { type: mongoose_1.Schema.Types.Mixed },
    points: { type: Number, required: true },
});
const scoringRuleSchema = new mongoose_1.Schema({
    _id: {
        type: mongoose_1.Schema.Types.ObjectId,
        auto: true,
    },
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.default = (0, mongoose_1.model)("ScoringRule", scoringRuleSchema);
