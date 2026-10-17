import type {
  AuthoringElement,
  AuthoringElementType,
  RuleCondition,
  RuleOperator,
} from "./schema.ts";
import { addStringError, isRecord, isString } from "./validation-primitives.ts";

export type ElementContext = {
  element: AuthoringElement;
  index: number;
};

export type ElementContextMap = Map<string, ElementContext>;

const scalarOperators = new Set<RuleOperator>(["equals", "not_equals"]);
const singleChoiceOperators = new Set<RuleOperator>([
  "equals",
  "not_equals",
  "one_of",
]);
const multiChoiceOperators = new Set<RuleOperator>([
  "equals",
  "not_equals",
  "includes_one_of",
  "includes_all_of",
]);
const textOperators = new Set<RuleOperator>([
  "equals",
  "not_equals",
  "contains",
]);

const operatorsByElementType: Record<AuthoringElementType, ReadonlySet<RuleOperator>> = {
  directions: new Set(),
  scale: scalarOperators,
  multiselect: multiChoiceOperators,
  single_select: singleChoiceOperators,
  essay: textOperators,
  short_text: textOperators,
  date: scalarOperators,
};

const isValueFree = (value: Record<string, unknown>): boolean =>
  value.operator === "is_set" || value.operator === "is_not_set";

const isArrayOperator = (operator: unknown): boolean =>
  operator === "one_of"
  || operator === "includes_one_of"
  || operator === "includes_all_of";

const getAllowedOperators = (element: AuthoringElement): ReadonlySet<RuleOperator> => {
  if (element.type === "short_text" && element.inputType === "number") return scalarOperators;
  return operatorsByElementType[element.type];
};

const validateConditionReference = (
  value: Record<string, unknown>,
  path: string,
  elements: ElementContextMap,
  targetIndex: number,
  errors: string[],
): ElementContext | undefined => {
  addStringError(errors, `${path}.element`, value.element);
  if (!isString(value.element)) return undefined;
  const context = elements.get(value.element);
  if (!context) {
    errors.push(`${path}.element does not exist`);
    return undefined;
  }
  if (context.index >= targetIndex) {
    errors.push(`${path}.element must occur before the target`);
  }
  return context;
};

const validateConditionOperator = (
  value: Record<string, unknown>,
  path: string,
  context: ElementContext | undefined,
  errors: string[],
): void => {
  if (!context || !isString(value.operator)) {
    errors.push(`${path}.operator is not supported by Formbricks`);
    return;
  }
  if (!getAllowedOperators(context.element).has(value.operator as RuleOperator)) {
    errors.push(`${path}.operator is not supported by Formbricks for this element`);
  }
};

const validateConditionValuePresence = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  const valueFree = isValueFree(value);
  if (valueFree && value.value !== undefined) {
    errors.push(`${path}.value must be omitted for ${value.operator}`);
  }
  if (!valueFree && value.value === undefined) {
    errors.push(`${path}.value is required`);
  }
};

const getChoiceIds = (element: AuthoringElement): Set<string> | undefined => {
  if (element.type !== "multiselect" && element.type !== "single_select") return undefined;
  return new Set(element.choices.map((choice) => choice.id));
};

const validateChoiceValues = (
  value: unknown,
  path: string,
  element: AuthoringElement | undefined,
  errors: string[],
): void => {
  if (!element || value === undefined) return;
  const choiceIds = getChoiceIds(element);
  if (!choiceIds) return;
  const values = Array.isArray(value) ? value : [value];
  values.filter(isString).forEach((choiceId) => {
    if (!choiceIds.has(choiceId)) {
      errors.push(`${path}.value references unknown choice '${choiceId}'`);
    }
  });
};

const validateArrayOperatorValue = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): boolean => {
  if (!isArrayOperator(value.operator)) return false;
  if (!Array.isArray(value.value) || !value.value.every(isString)) {
    errors.push(`${path}.value must be a non-empty string array`);
    return true;
  }
  if (value.value.length === 0) {
    errors.push(`${path}.value must be a non-empty string array`);
  }
  return true;
};

const validateScalarKind = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): boolean => {
  if (Array.isArray(value.value)) {
    errors.push(`${path}.value must be a string or number`);
    return false;
  }
  if (!isString(value.value) && typeof value.value !== "number") {
    errors.push(`${path}.value must be a string or number`);
    return false;
  }
  return true;
};

const validateNonEmptyString = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (isString(value.value) && value.value.trim().length === 0) {
    errors.push(`${path}.value must not be empty`);
  }
};

const validateScalarValue = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): boolean => {
  if (!validateScalarKind(value, path, errors)) return false;
  validateNonEmptyString(value, path, errors);
  return true;
};

const validateScaleValue = (
  value: Record<string, unknown>,
  path: string,
  context: ElementContext | undefined,
  errors: string[],
): void => {
  if (context?.element.type === "scale" && typeof value.value !== "number") {
    errors.push(`${path}.value must be a number for a scale`);
  }
};

const validateNumericShortTextValue = (
  value: Record<string, unknown>,
  path: string,
  context: ElementContext | undefined,
  errors: string[],
): void => {
  if (context?.element.type === "short_text"
    && context.element.inputType === "number"
    && typeof value.value !== "number") {
    errors.push(`${path}.value must be a number for numeric short text`);
  }
};

const validateElementValueType = (
  value: Record<string, unknown>,
  path: string,
  context: ElementContext | undefined,
  errors: string[],
): void => {
  validateScaleValue(value, path, context, errors);
  validateNumericShortTextValue(value, path, context, errors);
};

const validateConditionValueShape = (
  value: Record<string, unknown>,
  path: string,
  context: ElementContext | undefined,
  errors: string[],
): void => {
  if (value.value === undefined) return;
  if (validateArrayOperatorValue(value, path, errors)) return;
  if (!validateScalarValue(value, path, errors)) return;
  validateElementValueType(value, path, context, errors);
  validateChoiceValues(value.value, path, context?.element, errors);
};

export const validateCondition = (
  value: unknown,
  path: string,
  elements: ElementContextMap,
  targetIndex: number,
  errors: string[],
): value is RuleCondition => {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const context = validateConditionReference(value, path, elements, targetIndex, errors);
  validateConditionOperator(value, path, context, errors);
  validateConditionValuePresence(value, path, errors);
  validateConditionValueShape(value, path, context, errors);
  return true;
};
