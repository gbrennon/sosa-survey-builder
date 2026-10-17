import { describe, expect, test } from "bun:test";
import { validateAuthoringSurvey } from "../src/validate.ts";

const validSurvey = {
  name: "Example",
  workspaceId: "cworkspaceexample000000000000",
  elements: [
    {
      id: "intro",
      type: "directions",
      headline: { default: "Welcome" },
    },
    {
      id: "choice",
      type: "single_select",
      headline: "Choose one",
      choices: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    },
    {
      id: "later",
      type: "short_text",
      headline: "Later",
    },
  ],
};

describe("validateAuthoringSurvey", () => {
  test("accepts localized Formbricks authoring text", () => {
    const result = validateAuthoringSurvey(validSurvey);
    expect(result.ok).toBe(true);
  });

  test("rejects duplicate element ids and missing choice labels", () => {
    const result = validateAuthoringSurvey({
      ...validSurvey,
      elements: [
        validSurvey.elements[0],
        {
          ...validSurvey.elements[1],
          choices: [
            { id: "a", label: "A" },
            { id: "a", label: 42 },
          ],
        },
        { ...validSurvey.elements[0] },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("element ids must be unique");
      expect(result.errors.some((error) => error.includes("choices.1.label"))).toBe(true);
    }
  });

  test("rejects IDs that Formbricks cannot use", () => {
    const result = validateAuthoringSurvey({
      ...validSurvey,
      elements: [{ ...validSurvey.elements[0], id: "invalid id" }, validSurvey.elements[1]],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("letters, numbers"))).toBe(true);
    }
  });

  test("rejects a rule that references unknown elements", () => {
    const result = validateAuthoringSurvey({
      ...validSurvey,
      rules: [
        {
          target: "choice",
          mode: "show",
          all: [{ element: "missing", operator: "equals", value: "a" }],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("rules.0.conditions.0.element does not exist");
  });
});

test("rejects malformed welcome and redirect fields", () => {
  const welcomeResult = validateAuthoringSurvey({
    ...validSurvey,
    welcomeCard: {},
  });
  const endingResult = validateAuthoringSurvey({
    ...validSurvey,
    ending: { buttonLink: "javascript:alert(1)" },
  });

  expect(welcomeResult.ok).toBe(false);
  expect(endingResult.ok).toBe(false);
});

test("rejects operators and values Formbricks cannot evaluate", () => {
  const incompatibleOperator = validateAuthoringSurvey({
    ...validSurvey,
    rules: [
      {
        target: "later",
        mode: "show",
        all: [{ element: "choice", operator: "contains", value: "A" }],
      },
    ],
  });
  const unknownChoice = validateAuthoringSurvey({
    ...validSurvey,
    rules: [
      {
        target: "later",
        mode: "show",
        all: [{ element: "choice", operator: "equals", value: "missing" }],
      },
    ],
  });

  expect(incompatibleOperator.ok).toBe(false);
  expect(unknownChoice.ok).toBe(false);
  if (!incompatibleOperator.ok) {
    expect(incompatibleOperator.errors).toContain(
      "rules.0.conditions.0.operator is not supported by Formbricks for this element",
    );
  }
  if (!unknownChoice.ok) {
    expect(unknownChoice.errors).toContain(
      "rules.0.conditions.0.value references unknown choice 'missing'",
    );
  }
});
