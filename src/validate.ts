import type { AuthoringElement, AuthoringSurvey } from "./schema.ts";
import { validateElement } from "./validation-element.ts";
import { type ElementContextMap } from "./validation-condition.ts";
import { validateRule } from "./validation-rule.ts";
import { addStringError, isLocalizedText, isRecord, isString } from "./validation-primitives.ts";

export type ValidationResult =
  | { ok: true; survey: AuthoringSurvey }
  | { ok: false; errors: string[] };

const validateLocalizedField = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
  required: boolean,
): void => {
  if (value[path] === undefined) {
    if (required) errors.push(`${path} is required`);
    return;
  }
  if (!isLocalizedText(value[path])) {
    errors.push(`${path} must be text or a localized object with default`);
  }
};

const validateWelcomeCard = (raw: unknown, errors: string[]): void => {
  if (raw === undefined) return;
  if (!isRecord(raw)) {
    errors.push("welcomeCard must be an object");
    return;
  }
  validateLocalizedField(raw, "headline", errors, true);
  validateLocalizedField(raw, "subheader", errors, false);
  validateLocalizedField(raw, "buttonLabel", errors, false);
};

const isHttpUrl = (value: string): boolean => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const validateRedirectUrl = (value: unknown, errors: string[]): void => {
  if (!isString(value) || value.trim().length === 0) {
    errors.push("ending.buttonLink must be a non-empty URL");
    return;
  }
  if (!isHttpUrl(value)) errors.push("ending.buttonLink must be a valid http or https URL");
};

const validateEnding = (raw: unknown, errors: string[]): void => {
  if (raw === undefined) return;
  if (!isRecord(raw)) {
    errors.push("ending must be an object");
    return;
  }
  validateLocalizedField(raw, "headline", errors, false);
  validateLocalizedField(raw, "subheader", errors, false);
  validateLocalizedField(raw, "buttonLabel", errors, false);
  if (raw.buttonLink !== undefined) validateRedirectUrl(raw.buttonLink, errors);
};

const validateSurveyMetadata = (raw: Record<string, unknown>, errors: string[]): void => {
  addStringError(errors, "name", raw.name);
  addStringError(errors, "workspaceId", raw.workspaceId);
  if (raw.id !== undefined) addStringError(errors, "id", raw.id);
  if (raw.locale !== undefined) addStringError(errors, "locale", raw.locale);
  if (raw.description !== undefined && !isLocalizedText(raw.description)) {
    errors.push("description must be text or a localized object with default");
  }
};

const validateSurveyElements = (
  raw: unknown,
  errors: string[],
): AuthoringElement[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("elements must contain at least one element");
    return [];
  }
  const elements = raw.filter((element, index) => validateElement(element, index, errors));
  const ids = elements.map((element) => element.id);
  if (new Set(ids).size !== ids.length) errors.push("element ids must be unique");
  return elements;
};

const validateSurveyRules = (
  raw: unknown,
  elements: ElementContextMap,
  errors: string[],
): void => {
  if (raw === undefined) return;
  if (!Array.isArray(raw)) {
    errors.push("rules must be an array");
    return;
  }
  raw.forEach((rule, index) => validateRule(rule, index, elements, errors));
};

export const validateAuthoringSurvey = (raw: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ["survey must be a JSON object"] };
  validateSurveyMetadata(raw, errors);
  validateWelcomeCard(raw.welcomeCard, errors);
  validateEnding(raw.ending, errors);
  const elements = validateSurveyElements(raw.elements, errors);
  const elementsById: ElementContextMap = new Map(
    elements.map((element, index) => [element.id, { element, index }]),
  );
  validateSurveyRules(raw.rules, elementsById, errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, survey: raw as unknown as AuthoringSurvey };
};
