import type { Rule } from "./schema.ts";
import {
  type ElementContext,
  type ElementContextMap,
  validateCondition,
} from "./validation-condition.ts";
import { addStringError, isRecord, isString } from "./validation-primitives.ts";

const validateRuleTarget = (
  value: Record<string, unknown>,
  path: string,
  elements: ElementContextMap,
  errors: string[],
): ElementContext | undefined => {
  addStringError(errors, `${path}.target`, value.target);
  if (!isString(value.target)) return undefined;
  const context = elements.get(value.target);
  if (!context) errors.push(`${path}.target does not exist`);
  return context;
};

const validateRuleMode = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.mode !== "show" && value.mode !== "skip") {
    errors.push(`${path}.mode must be show or skip`);
  }
};

const validateRuleGroupSelection = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if ((value.all === undefined) === (value.any === undefined)) {
    errors.push(`${path} must contain exactly one of all or any`);
  }
};

const getRuleConditions = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): unknown[] | undefined => {
  validateRuleGroupSelection(value, path, errors);
  const conditions = value.all ?? value.any;
  if (!Array.isArray(conditions)) {
    errors.push(`${path} conditions must not be empty`);
    return undefined;
  }
  return conditions;
};

const validateRuleConditions = (
  value: Record<string, unknown>,
  path: string,
  elements: ElementContextMap,
  targetIndex: number,
  errors: string[],
): void => {
  const conditions = getRuleConditions(value, path, errors);
  if (!conditions) return;
  if (conditions.length === 0) {
    errors.push(`${path} conditions must not be empty`);
    return;
  }
  conditions.forEach((condition, conditionIndex) =>
    validateCondition(
      condition,
      `${path}.conditions.${conditionIndex}`,
      elements,
      targetIndex,
      errors,
    ),
  );
};

export const validateRule = (
  value: unknown,
  index: number,
  elements: ElementContextMap,
  errors: string[],
): value is Rule => {
  const path = `rules.${index}`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const target = validateRuleTarget(value, path, elements, errors);
  validateRuleMode(value, path, errors);
  validateRuleConditions(value, path, elements, target?.index ?? Number.MAX_SAFE_INTEGER, errors);
  return true;
};
