import type { AuthoringElement } from "./schema.ts";
import { validateChoice } from "./validation-choice.ts";
import {
  isLocalizedText,
  isRecord,
  isString,
  validateFormbricksId,
} from "./validation-primitives.ts";

type ElementValidator = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
) => void;

const supportedElementTypes = new Set([
  "directions",
  "scale",
  "multiselect",
  "single_select",
  "essay",
  "short_text",
  "date",
]);

const validateScaleBounds = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (typeof value.min !== "number" || typeof value.max !== "number") {
    errors.push(`${path}.min and ${path}.max must be numbers`);
    return;
  }
  if (value.min !== 1) errors.push(`${path}.min must be 1 for Formbricks`);
  if (![3, 4, 5, 6, 7, 10].includes(value.max)) {
    errors.push(`${path}.max must be 3, 4, 5, 6, 7, or 10 for Formbricks`);
  }
};

const validateScaleType = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.scale !== undefined && !["number", "smiley", "star"].includes(String(value.scale))) {
    errors.push(`${path}.scale is not supported by Formbricks`);
  }
};

const validateScaleEndpoint = (
  value: Record<string, unknown>,
  key: "lowerLabel" | "upperLabel",
  path: string,
  errors: string[],
): void => {
  if (value[key] !== undefined && !isLocalizedText(value[key])) {
    errors.push(`${path}.${key} must be text or a localized object with default`);
  }
};

const validateScaleLabels = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.labels !== undefined) {
    errors.push(`${path}.labels is not representable by Formbricks; use lowerLabel and upperLabel`);
  }
  validateScaleEndpoint(value, "lowerLabel", path, errors);
  validateScaleEndpoint(value, "upperLabel", path, errors);
};

const validateScaleDirection = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.randomizeDirection !== undefined) {
    errors.push(`${path}.randomizeDirection is not supported by Formbricks`);
  }
};

const validateScaleElement: ElementValidator = (value, path, errors): void => {
  validateScaleBounds(value, path, errors);
  validateScaleType(value, path, errors);
  validateScaleLabels(value, path, errors);
  validateScaleDirection(value, path, errors);
};

const hasEnoughChoices = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): boolean => {
  const rawChoices = value.choices;
  const generatedOther = isRecord(value.other) ? 1 : 0;
  if (Array.isArray(rawChoices) && rawChoices.length + generatedOther >= 2) return true;
  errors.push(`${path}.choices must produce at least two choices`);
  return false;
};

const collectChoiceIds = (
  rawChoices: unknown[],
  path: string,
  errors: string[],
  generatedOther: boolean,
): Set<string> => {
  const choices = rawChoices.filter((choice, choiceIndex) =>
    validateChoice(choice, `${path}.choices.${choiceIndex}`, errors),
  );
  const ids = choices.map((choice) => choice.id);
  if (new Set(ids).size !== ids.length) errors.push(`${path}.choices ids must be unique`);
  if (generatedOther) ids.push("other");
  return new Set(ids);
};

const validateChoiceList = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): Set<string> => {
  if (!hasEnoughChoices(value, path, errors)) return new Set();
  const rawChoices = value.choices as unknown[];
  return collectChoiceIds(rawChoices, path, errors, isRecord(value.other));
};

const validateAnchoredChoice = (
  choiceId: string,
  path: string,
  choiceIds: Set<string>,
  errors: string[],
): void => {
  if (!choiceIds.has(choiceId)) {
    errors.push(`${path} contains unknown choice '${choiceId}'`);
  }
  if (choiceId !== "other" && choiceId !== "none") {
    errors.push(`${path} can only contain 'other' or 'none'`);
  }
};

const validateAnchoredChoices = (
  value: Record<string, unknown>,
  path: string,
  choiceIds: Set<string>,
  errors: string[],
): void => {
  if (value.anchoredChoiceIds === undefined) return;
  if (!Array.isArray(value.anchoredChoiceIds) || !value.anchoredChoiceIds.every(isString)) {
    errors.push(`${path}.anchoredChoiceIds must be an array of ids`);
    return;
  }
  value.anchoredChoiceIds.forEach((choiceId) =>
    validateAnchoredChoice(choiceId, `${path}.anchoredChoiceIds`, choiceIds, errors),
  );
};

const hasExplicitOtherChoice = (value: Record<string, unknown>): boolean => {
  if (!Array.isArray(value.choices)) return false;
  return value.choices.some(
    (choice) => isRecord(choice) && choice.id === "other",
  );
};

const validateOtherChoiceConflict = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (isRecord(value.other) && hasExplicitOtherChoice(value)) {
    errors.push(`${path}.other cannot be combined with an explicit 'other' choice`);
  }
};

const validateOtherLabel = (
  other: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (other.label !== undefined && !isLocalizedText(other.label)) {
    errors.push(`${path}.label must be text or a localized object with default`);
  }
};

const validateOtherPlaceholder = (
  other: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (other.placeholder !== undefined && !isLocalizedText(other.placeholder)) {
    errors.push(`${path}.placeholder must be text or a localized object with default`);
  }
};

const validateOtherChoiceFields = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.other === undefined) return;
  if (!isRecord(value.other)) {
    errors.push(`${path}.other must be an object`);
    return;
  }
  validateOtherLabel(value.other, `${path}.other`, errors);
  validateOtherPlaceholder(value.other, `${path}.other`, errors);
};

const validateChoiceElement: ElementValidator = (value, path, errors): void => {
  const choiceIds = validateChoiceList(value, path, errors);
  validateAnchoredChoices(value, path, choiceIds, errors);
  validateOtherChoiceConflict(value, path, errors);
  validateOtherChoiceFields(value, path, errors);
  if (value.randomize !== undefined && typeof value.randomize !== "boolean") {
    errors.push(`${path}.randomize must be boolean`);
  }
};

const validateShortText = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  const inputTypes = ["text", "email", "url", "number", "phone"];
  if (value.inputType !== undefined && !inputTypes.includes(String(value.inputType))) {
    errors.push(`${path}.inputType is not supported by Formbricks`);
  }
  if (value.placeholder !== undefined && !isLocalizedText(value.placeholder)) {
    errors.push(`${path}.placeholder must be text or a localized object with default`);
  }
};

const validateDate = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.format !== undefined && !["M-d-y", "d-M-y", "y-M-d"].includes(String(value.format))) {
    errors.push(`${path}.format is not supported by Formbricks`);
  }
};

const validateCharLimitBounds = (
  limit: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  for (const bound of ["min", "max"]) {
    if (limit[bound] !== undefined && (typeof limit[bound] !== "number" || limit[bound] < 0)) {
      errors.push(`${path}.${bound} must be a non-negative number`);
    }
  }
};

const validateCharLimitOrder = (
  limit: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (typeof limit.min === "number" && typeof limit.max === "number" && limit.min > limit.max) {
    errors.push(`${path}.min must not exceed max`);
  }
};

const validateCharLimit = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.charLimit === undefined) return;
  if (!isRecord(value.charLimit)) {
    errors.push(`${path}.charLimit must be an object`);
    return;
  }
  if (value.charLimit.min === undefined && value.charLimit.max === undefined) {
    errors.push(`${path}.charLimit must define min or max`);
    return;
  }
  validateCharLimitBounds(value.charLimit, `${path}.charLimit`, errors);
  validateCharLimitOrder(value.charLimit, `${path}.charLimit`, errors);
};

const validateTextElement: ElementValidator = (value, path, errors): void => {
  if (value.type === "short_text") validateShortText(value, path, errors);
  if (value.type === "date") validateDate(value, path, errors);
  validateCharLimit(value, path, errors);
};

const elementValidators: Record<string, ElementValidator> = {
  scale: validateScaleElement,
  multiselect: validateChoiceElement,
  single_select: validateChoiceElement,
  essay: validateTextElement,
  short_text: validateTextElement,
  date: validateTextElement,
};

const validateElementIdentity = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  validateFormbricksId(errors, `${path}.id`, value.id);
  if (!isLocalizedText(value.headline)) {
    errors.push(`${path}.headline must be text or a localized object with default`);
  }
};

const getSupportedElementType = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): string | undefined => {
  if (!isString(value.type) || !supportedElementTypes.has(value.type)) {
    errors.push(`${path}.type must be a supported element type`);
    return undefined;
  }
  return value.type;
};

const validateElementOptions = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  if (value.subheader !== undefined && !isLocalizedText(value.subheader)) {
    errors.push(`${path}.subheader must be text or a localized object with default`);
  }
  if (value.required !== undefined && typeof value.required !== "boolean") {
    errors.push(`${path}.required must be boolean`);
  }
};

const validateElementBase = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): string | undefined => {
  validateElementIdentity(value, path, errors);
  const type = getSupportedElementType(value, path, errors);
  if (!type) return undefined;
  validateElementOptions(value, path, errors);
  return type;
};

export const validateElement = (
  value: unknown,
  index: number,
  errors: string[],
): value is AuthoringElement => {
  const path = `elements.${index}`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const type = validateElementBase(value, path, errors);
  if (type) elementValidators[type]?.(value, path, errors);
  return Boolean(type);
};
