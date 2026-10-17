import {
  isLocalizedText,
} from "./validation-primitives.ts";

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

export const validateScaleElement = (
  value: Record<string, unknown>,
  path: string,
  errors: string[],
): void => {
  validateScaleBounds(value, path, errors);
  validateScaleType(value, path, errors);
  validateScaleLabels(value, path, errors);
  validateScaleDirection(value, path, errors);
};
