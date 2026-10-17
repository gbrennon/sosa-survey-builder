import type { AuthoringElement, ScaleElement, ShortTextElement } from "./schema.ts";
import { compileChoiceElement } from "./compiler-choice.ts";
import { baseElement, localize } from "./compiler-utils.ts";

const validateScaleRange = (element: ScaleElement): void => {
  if (element.min !== 1) {
    throw new Error(`${element.id}: Formbricks rating scales must start at 1`);
  }
  if (![3, 4, 5, 6, 7, 10].includes(element.max)) {
    throw new Error(
      `${element.id}: Formbricks supports rating ranges 3, 4, 5, 6, 7, or 10`,
    );
  }
};

const validateScaleFeatures = (element: ScaleElement): void => {
  if (element.labels && Object.keys(element.labels).length > 2) {
    throw new Error(
      `${element.id}: Formbricks supports only lowerLabel and upperLabel, `
        + "not labels for every scale value",
    );
  }
  if (element.randomizeDirection) {
    throw new Error(`${element.id}: Formbricks does not support randomized scale direction`);
  }
};

const compileScaleElement = (element: ScaleElement): Record<string, unknown> => {
  validateScaleRange(element);
  validateScaleFeatures(element);
  return {
    ...baseElement(element),
    type: "rating",
    scale: element.scale ?? "number",
    range: element.max,
    ...(localize(element.lowerLabel) ? { lowerLabel: localize(element.lowerLabel) } : {}),
    ...(localize(element.upperLabel) ? { upperLabel: localize(element.upperLabel) } : {}),
  };
};

const compileEssayElement = (
  element: Extract<AuthoringElement, { type: "essay" }>,
): Record<string, unknown> => ({
  ...baseElement(element),
  type: "openText",
  longAnswer: true,
  inputType: "text",
  ...(element.charLimit ? { charLimit: compileCharLimit(element.charLimit) } : {}),
});

const compileShortTextElement = (
  element: ShortTextElement,
): Record<string, unknown> => ({
  ...baseElement(element),
  type: "openText",
  longAnswer: false,
  inputType: element.inputType ?? "text",
  ...(localize(element.placeholder) ? { placeholder: localize(element.placeholder) } : {}),
  ...(element.charLimit ? { charLimit: compileCharLimit(element.charLimit) } : {}),
});

const compileDateElement = (
  element: Extract<AuthoringElement, { type: "date" }>,
): Record<string, unknown> => ({
  ...baseElement(element),
  type: "date",
  format: element.format ?? "y-M-d",
});

const compileCharLimit = (limit: { min?: number; max?: number }): Record<string, unknown> => ({
  enabled: true,
  ...(limit.min === undefined ? {} : { min: limit.min }),
  ...(limit.max === undefined ? {} : { max: limit.max }),
});

const compileDirectionsElement = (
  element: Extract<AuthoringElement, { type: "directions" }>,
): Record<string, unknown> => ({
  ...baseElement(element),
  type: "cta",
  buttonExternal: false,
});

type ElementCompiler = (element: never) => Record<string, unknown>;

const elementCompilers: Record<AuthoringElement["type"], ElementCompiler> = {
  directions: compileDirectionsElement as ElementCompiler,
  scale: compileScaleElement as ElementCompiler,
  multiselect: compileChoiceElement as ElementCompiler,
  single_select: compileChoiceElement as ElementCompiler,
  essay: compileEssayElement as ElementCompiler,
  short_text: compileShortTextElement as ElementCompiler,
  date: compileDateElement as ElementCompiler,
};

export const compileElement = (element: AuthoringElement): Record<string, unknown> =>
  elementCompilers[element.type](element as never);
