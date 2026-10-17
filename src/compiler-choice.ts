import type { ChoiceElement } from "./schema.ts";
import { baseElement, localize } from "./compiler-utils.ts";

const validateAnchors = (element: ChoiceElement): void => {
  if (element.anchoredChoiceIds && element.anchoredChoiceIds.length > 1) {
    throw new Error(
      `${element.id}: Formbricks supports at most one explicitly anchored choice when randomizing`,
    );
  }
  if (element.anchoredChoiceIds?.some((id) => id !== "other" && id !== "none")) {
    throw new Error(
      `${element.id}: anchored choices must use the Formbricks reserved ids 'other' or 'none'`,
    );
  }
};

const shuffleOption = (element: ChoiceElement): "none" | "all" | "exceptLast" => {
  if (!element.randomize) return "none";
  validateAnchors(element);
  return element.anchoredChoiceIds?.length ? "exceptLast" : "all";
};

const choiceType = (element: ChoiceElement): string =>
  element.type === "multiselect" ? "multipleChoiceMulti" : "multipleChoiceSingle";

const multiselectValidation = (element: ChoiceElement): Record<string, unknown> =>
  element.type === "multiselect"
    ? { validation: { rules: [], logic: "and" } }
    : {};

const addOtherChoice = (element: ChoiceElement, choices: Record<string, unknown>[]) =>
  element.other
    ? [
        ...choices,
        {
          id: "other",
          label: localize(element.other.label ?? "Other"),
        },
      ]
    : choices;

export const compileChoiceElement = (element: ChoiceElement): Record<string, unknown> => {
  const declaredChoices = element.choices.map((choice) => ({
    id: choice.id,
    label: localize(choice.label),
  }));
  const choices = addOtherChoice(element, declaredChoices);
  if (
    element.anchoredChoiceIds?.includes("none")
    && !choices.some((choice) => choice.id === "none")
  ) {
    throw new Error(`${element.id}: an anchored 'none' choice must be included in choices`);
  }
  const common = {
    ...baseElement(element),
    choices,
    shuffleOption: shuffleOption(element),
    type: choiceType(element),
    ...multiselectValidation(element),
  };
  return element.other?.placeholder
    ? { ...common, otherOptionPlaceholder: localize(element.other.placeholder) }
    : common;
};
