import { expect, test } from "bun:test";
import { compileSurvey } from "../src/compiler.ts";
import type { AuthoringSurvey } from "../src/schema.ts";

const survey = (overrides: Partial<AuthoringSurvey> = {}): AuthoringSurvey => ({
  id: "branching-survey",
  name: "Branching survey",
  workspaceId: "cworkspaceexample000000000000",
  elements: [
    { id: "intro", type: "directions", headline: "Intro" },
    {
      id: "choice",
      type: "single_select",
      headline: "Choose",
      choices: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
    { id: "shown", type: "essay", headline: "Shown" },
    { id: "after", type: "short_text", headline: "After" },
  ],
  ...overrides,
});

  test("maps authoring elements to Formbricks blocks", () => {
    const result = compileSurvey(survey());
    expect(result.payload.questions).toEqual([]);
    expect(result.payload.blocks).toHaveLength(4);
    expect(result.payload.blocks[0]?.elements[0]?.type).toBe("cta");
    expect(result.payload.blocks[1]?.elements[0]?.type).toBe("multipleChoiceSingle");
    expect(result.fixture.id).toMatch(/^c[a-z0-9]{24}$/);
    expect(result.payload.blocks.every((block) => /^c[a-z0-9]{24}$/.test(block.id))).toBe(true);
  });

  test("uses the post-target block as the false branch for a show rule", () => {
    const result = compileSurvey(
      survey({
        rules: [
          {
            target: "shown",
            mode: "show",
            all: [{ element: "choice", operator: "equals", value: "yes" }],
          },
        ],
      }),
    );
    const sourceBlock = result.payload.blocks[1];
    const targetBlock = result.payload.blocks[2];
    expect(sourceBlock?.logic?.[0]?.actions[0]?.target).toBe(targetBlock?.id);
    expect(sourceBlock?.logicFallback).toBe(result.payload.blocks[3]?.id);
  });

  test("jumps past the target when a skip rule matches", () => {
    const result = compileSurvey(
      survey({
        rules: [
          {
            target: "shown",
            mode: "skip",
            all: [{ element: "choice", operator: "equals", value: "no" }],
          },
        ],
      }),
    );
    const sourceBlock = result.payload.blocks[1];
    expect(sourceBlock?.logic?.[0]?.actions[0]?.target).toBe(result.payload.blocks[3]?.id);
    expect(sourceBlock?.logicFallback).toBeUndefined();
  });

  test("attaches a rule to the latest condition block", () => {
    const result = compileSurvey(
      survey({
        rules: [
          {
            target: "after",
            mode: "show",
            all: [{ element: "choice", operator: "equals", value: "yes" }],
          },
        ],
      }),
    );
    const sourceBlock = result.payload.blocks[1];
    expect(sourceBlock?.logic?.[0]?.actions[0]?.target).toBe(result.payload.blocks[3]?.id);
    expect(sourceBlock?.logicFallback).toBe(result.payload.endings[0]?.id);
  });

  test("maps array membership conditions to Formbricks operators", () => {
    const result = compileSurvey(
      survey({
        rules: [
          {
            target: "shown",
            mode: "show",
            all: [{ element: "choice", operator: "one_of", value: ["yes", "no"] }],
          },
        ],
      }),
    );
    const condition = result.payload.blocks[1]?.logic?.[0]?.conditions.conditions[0];
    expect(condition?.operator).toBe("equalsOneOf");
    expect(condition?.rightOperand?.value).toEqual(["yes", "no"]);
  });

  test("rejects scalar values for array membership conditions", () => {
    expect(() =>
      compileSurvey(
        survey({
          rules: [
            {
              target: "shown",
              mode: "show",
              all: [{ element: "choice", operator: "one_of", value: "yes" }],
            },
          ],
        }),
      ),
    ).toThrow("requires a string array");
  });


  test("rejects Formbricks-incompatible scale features instead of dropping them", () => {
    expect(() =>
      compileSurvey(
        survey({
          elements: [{ id: "scale", type: "scale", headline: "Scale", min: 0, max: 5 }],
        }),
      ),
    ).toThrow("rating scales must start at 1");
  });

test("evaluates rules from the latest condition block", () => {
  const result = compileSurvey(
    survey({
      elements: [
        { id: "intro", type: "directions", headline: "Intro" },
        {
          id: "choice",
          type: "single_select",
          headline: "Choose",
          choices: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
        },
        { id: "a", type: "essay", headline: "A" },
        { id: "b", type: "essay", headline: "B" },
      ],
      rules: [
        {
          target: "a",
          mode: "skip",
          all: [{ element: "choice", operator: "equals", value: "no" }],
        },
        {
          target: "b",
          mode: "show",
          all: [{ element: "choice", operator: "equals", value: "yes" }],
        },
      ],
    }),
  );
  const sourceBlock = result.payload.blocks[1];

  expect(sourceBlock?.logic).toHaveLength(2);
  expect(sourceBlock?.logic?.[0]?.actions[0]?.target).toBe(result.payload.blocks[3]?.id);
  expect(sourceBlock?.logic?.[1]?.actions[0]?.target).toBe(result.payload.blocks[3]?.id);
});

