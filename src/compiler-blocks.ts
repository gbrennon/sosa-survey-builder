import type { AuthoringSurvey, FormbricksBlock, Rule } from "./schema.ts";
import { compileElement } from "./compiler-element.ts";
import { compileRule } from "./compiler-logic.ts";
import { cuid } from "./compiler-utils.ts";

interface IndexedRule {
  rule: Rule;
  index: number;
  sourceIndex: number;
  targetIndex: number;
}

type IndexedRulesBySource = Map<number, IndexedRule[]>;

const getRuleConditions = (rule: Rule, index: number) => {
  const conditions = rule.all ?? rule.any;
  if (!conditions || conditions.length === 0) {
    throw new Error(`rules.${index}: provide at least one condition`);
  }
  return conditions;
};

const getRuleSourceIndex = (
  survey: AuthoringSurvey,
  rule: Rule,
  index: number,
): number => {
  const conditions = getRuleConditions(rule, index);
  const conditionIndexes = conditions.map((condition) =>
    survey.elements.findIndex((element) => element.id === condition.element),
  );
  if (conditionIndexes.some((conditionIndex) => conditionIndex < 0)) {
    throw new Error(`rules.${index}: every condition must reference an existing element`);
  }
  return Math.max(...conditionIndexes);
};

const getRuleTargetIndex = (survey: AuthoringSurvey, rule: Rule, index: number): number => {
  const targetIndex = survey.elements.findIndex((element) => element.id === rule.target);
  if (targetIndex < 0) {
    throw new Error(`rules.${index}: target '${rule.target}' does not exist`);
  }
  if (targetIndex === 0) {
    throw new Error(`rules.${index}: the first element cannot have a display or skip rule`);
  }
  return targetIndex;
};

const validateRuleSource = (sourceIndex: number, targetIndex: number, index: number): void => {
  if (sourceIndex >= targetIndex) {
    throw new Error(`rules.${index}: conditions must reference elements before the target`);
  }
};

const indexRule = (
  survey: AuthoringSurvey,
  indexedRules: IndexedRulesBySource,
  rule: Rule,
  index: number,
): void => {
  const targetIndex = getRuleTargetIndex(survey, rule, index);
  const sourceIndex = getRuleSourceIndex(survey, rule, index);
  validateRuleSource(sourceIndex, targetIndex, index);
  const indexedRule = { rule, index, sourceIndex, targetIndex };
  indexedRules.set(sourceIndex, [...(indexedRules.get(sourceIndex) ?? []), indexedRule]);
};

const indexRules = (survey: AuthoringSurvey): IndexedRulesBySource => {
  const indexedRules: IndexedRulesBySource = new Map();
  for (const [index, rule] of (survey.rules ?? []).entries()) {
    indexRule(survey, indexedRules, rule, index);
  }
  return indexedRules;
};

const getShowRule = (indexedRules: IndexedRule[]): IndexedRule | undefined => {
  const showRules = indexedRules.filter(({ rule }) => rule.mode === "show");
  const firstShowRule = showRules[0];
  const hasDifferentFallback = showRules.some(
    ({ targetIndex }) => targetIndex !== firstShowRule?.targetIndex,
  );
  if (firstShowRule && hasDifferentFallback) {
    throw new Error("multiple show rules on one block require different fallback paths");
  }
  return firstShowRule;
};

const compileBlockLogic = (
  indexedRules: IndexedRule[] | undefined,
  blockIds: string[],
  endingId: string,
): Pick<FormbricksBlock, "logic" | "logicFallback"> => {
  if (!indexedRules) return {};
  const orderedRules = [...indexedRules].sort((left, right) => left.index - right.index);
  const logic = orderedRules.map((indexedRule) => {
    const targetBlockId = blockIds[indexedRule.targetIndex];
    const afterTargetBlockId = blockIds[indexedRule.targetIndex + 1] ?? endingId;
    return compileRule(indexedRule.rule, indexedRule.index, targetBlockId, afterTargetBlockId);
  });
  const showRule = getShowRule(orderedRules);
  return {
    logic,
    ...(showRule
      ? { logicFallback: blockIds[showRule.targetIndex + 1] ?? endingId }
      : {}),
  };
};

const compileBlock = (
  survey: AuthoringSurvey,
  elementIndex: number,
  blockIds: string[],
  rulesBySourceIndex: IndexedRulesBySource,
  endingId: string,
): FormbricksBlock => {
  const element = survey.elements[elementIndex];
  return {
    id: blockIds[elementIndex],
    name: element.id,
    elements: [compileElement(element)],
    ...compileBlockLogic(rulesBySourceIndex.get(elementIndex), blockIds, endingId),
  };
};

export const compileBlocks = (
  survey: AuthoringSurvey,
  endingId: string,
): FormbricksBlock[] => {
  const blockIds = survey.elements.map((element) =>
    cuid(`${survey.id ?? survey.name}:block:${element.id}`),
  );
  const rulesBySourceIndex = indexRules(survey);
  return survey.elements.map((_, index) =>
    compileBlock(survey, index, blockIds, rulesBySourceIndex, endingId),
  );
};
