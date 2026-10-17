import type {
  FormbricksAction,
  FormbricksCondition,
  FormbricksConditionGroup,
  FormbricksLogic,
  Rule,
  RuleCondition,
} from "./schema.ts";
import { cuid } from "./compiler-utils.ts";

const conditionOperators: Record<RuleCondition["operator"], string> = {
  equals: "equals",
  not_equals: "doesNotEqual",
  one_of: "equalsOneOf",
  contains: "contains",
  includes_one_of: "includesOneOf",
  includes_all_of: "includesAllOf",
  is_set: "isSet",
  is_not_set: "isNotSet",
};

const isValueFree = (condition: RuleCondition): boolean =>
  condition.operator === "is_set" || condition.operator === "is_not_set";

const usesArrayValue = (condition: RuleCondition): boolean =>
  condition.operator === "one_of" ||
  condition.operator === "includes_one_of" ||
  condition.operator === "includes_all_of";

const validateConditionPresence = (condition: RuleCondition, seed: string): void => {
  const valueFree = isValueFree(condition);
  if (!valueFree && condition.value === undefined) {
    throw new Error(`${seed}: ${condition.operator} requires a value`);
  }
  if (valueFree && condition.value !== undefined) {
    throw new Error(`${seed}: ${condition.operator} does not accept a value`);
  }
};

const validateConditionArrayValue = (condition: RuleCondition, seed: string): void => {
  const arrayValue = usesArrayValue(condition);
  if (arrayValue && !Array.isArray(condition.value)) {
    throw new Error(`${seed}: ${condition.operator} requires a string array`);
  }
  if (!arrayValue && Array.isArray(condition.value)) {
    throw new Error(`${seed}: ${condition.operator} does not accept an array`);
  }
};

const validateConditionValue = (condition: RuleCondition, seed: string): void => {
  validateConditionPresence(condition, seed);
  validateConditionArrayValue(condition, seed);
};

export const compileCondition = (
  condition: RuleCondition,
  seed: string,
): FormbricksCondition => {
  validateConditionValue(condition, seed);
  return {
    id: cuid(`${seed}:condition`),
    leftOperand: { type: "element", value: condition.element },
    operator: conditionOperators[condition.operator],
    ...(isValueFree(condition)
      ? {}
      : { rightOperand: { type: "static", value: condition.value! } }),
  };
};

const validateRuleGroupCombination = (rule: Rule, ruleIndex: number): void => {
  if (rule.all && rule.any) {
    throw new Error(`rules.${ruleIndex}: use either 'all' or 'any', not both`);
  }
};

const requireRuleConditions = (rule: Rule, ruleIndex: number): RuleCondition[] => {
  const conditions = rule.all ?? rule.any;
  if (!conditions || conditions.length === 0) {
    throw new Error(`rules.${ruleIndex}: provide at least one condition in 'all' or 'any'`);
  }
  return conditions;
};


const getRuleConditions = (rule: Rule, ruleIndex: number): RuleCondition[] => {
  validateRuleGroupCombination(rule, ruleIndex);
  return requireRuleConditions(rule, ruleIndex);
};

const compileConditionGroup = (
  rule: Rule,
  ruleIndex: number,
  conditions: RuleCondition[],
): FormbricksConditionGroup => ({
  id: cuid(`rule:${ruleIndex}:group`),
  connector: rule.all ? "and" : "or",
  conditions: conditions.map((condition, conditionIndex) =>
    compileCondition(condition, `rules.${ruleIndex}.conditions.${conditionIndex}`),
  ),
});

const compileRuleAction = (
  rule: Rule,
  ruleIndex: number,
  targetBlockId: string,
  afterTargetBlockId: string,
): FormbricksAction => ({
  id: cuid(`rule:${ruleIndex}:action`),
  objective: "jumpToBlock",
  target: rule.mode === "show" ? targetBlockId : afterTargetBlockId,
});

export const compileRule = (
  rule: Rule,
  ruleIndex: number,
  targetBlockId: string,
  afterTargetBlockId: string,
): FormbricksLogic => {
  const conditions = getRuleConditions(rule, ruleIndex);
  return {
    id: cuid(`rule:${ruleIndex}:logic`),
    conditions: compileConditionGroup(rule, ruleIndex, conditions),
    actions: [compileRuleAction(rule, ruleIndex, targetBlockId, afterTargetBlockId)],
  };
};
