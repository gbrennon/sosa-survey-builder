import type { AuthoringSurvey, FormbricksFixture, FormbricksPayload } from "./schema.ts";
import { compileBlocks } from "./compiler-blocks.ts";
import { basePayload, compileEnding } from "./compiler-output.ts";
import { cuid } from "./compiler-utils.ts";

export interface CompiledSurvey {
  payload: FormbricksPayload;
  fixture: FormbricksFixture;
}

export const compileSurvey = (survey: AuthoringSurvey): CompiledSurvey => {
  if (survey.elements.length === 0) throw new Error("elements must contain at least one element");
  const firstElementRule = survey.rules?.find(
    (rule) => rule.target === survey.elements[0]?.id,
  );
  if (firstElementRule) {
    throw new Error(
      "the first element cannot have a display or skip rule; "
        + "use a welcome card or directions element first",
    );
  }
  const ending = compileEnding(survey);
  const blocks = compileBlocks(survey, ending.id);
  const payload = basePayload(survey, blocks, ending);
  const fixture: FormbricksFixture = {
    ...payload,
    id: cuid(survey.id ?? survey.name),
    overlayAppearance: { color: null, opacity: null },
  };
  return { payload, fixture };
};
