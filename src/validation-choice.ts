import type { Choice } from "./schema.ts";
import {
  isLocalizedText,
  isRecord,
  validateFormbricksId,
} from "./validation-primitives.ts";

export const validateChoice = (
  value: unknown,
  path: string,
  errors: string[],
): value is Choice => {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  validateFormbricksId(errors, `${path}.id`, value.id);
  if (!isLocalizedText(value.label)) {
    errors.push(`${path}.label must be text or a localized object with default`);
  }
  return true;
};
