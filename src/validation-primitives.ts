import type { LocalizedText } from "./schema.ts";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === "string";

export const isLocalizedText = (value: unknown): value is LocalizedText => {
  if (isString(value)) return value.trim().length > 0;
  return (
    isRecord(value) &&
    isString(value.default) &&
    value.default.trim().length > 0 &&
    Object.values(value).every(isString)
  );
};

export const addStringError = (errors: string[], path: string, value: unknown): void => {
  if (!isString(value) || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
};

const forbiddenFormbricksIds = new Set([
  "userId",
  "source",
  "suid",
  "end",
  "start",
  "welcomeCard",
  "hidden",
  "verifiedEmail",
  "multiLanguage",
  "embed",
  "verify",
]);

export const validateFormbricksId = (
  errors: string[],
  path: string,
  value: unknown,
): void => {
  addStringError(errors, path, value);
  if (!isString(value)) return;
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    errors.push(`${path} must use only letters, numbers, hyphens, or underscores`);
  }
  if (forbiddenFormbricksIds.has(value)) {
    errors.push(`${path} is reserved by Formbricks`);
  }
};
