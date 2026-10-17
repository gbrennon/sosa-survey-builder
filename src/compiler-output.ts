import type {
  AuthoringSurvey,
  FormbricksBlock,
  FormbricksEnding,
  FormbricksPayload,
  LocalizedText,
} from "./schema.ts";
import { cuid, localize } from "./compiler-utils.ts";

const localizeLabel = (value: LocalizedText | undefined): string => {
  if (typeof value === "string") return value;
  if (value?.default) return value.default;
  return "Continue";
};

const compileRedirectEnding = (survey: AuthoringSurvey): FormbricksEnding => ({
  id: cuid(`${survey.id ?? survey.name}:ending`),
  type: "redirectToUrl",
  url: survey.ending!.buttonLink!,
  label: localizeLabel(survey.ending!.buttonLabel),
});

const compileEndScreen = (survey: AuthoringSurvey): FormbricksEnding => ({
  id: cuid(`${survey.id ?? survey.name}:ending`),
  type: "endScreen",
  ...(localize(survey.ending?.headline ?? "Thank you")
    ? { headline: localize(survey.ending?.headline ?? "Thank you") }
    : {}),
  ...(localize(survey.ending?.subheader)
    ? { subheader: localize(survey.ending?.subheader) }
    : {}),
  ...(localize(survey.ending?.buttonLabel)
    ? { buttonLabel: localize(survey.ending?.buttonLabel) }
    : {}),
});

export const compileEnding = (survey: AuthoringSurvey): FormbricksEnding =>
  survey.ending?.buttonLink ? compileRedirectEnding(survey) : compileEndScreen(survey);

export const basePayload = (
  survey: AuthoringSurvey,
  blocks: FormbricksBlock[],
  ending: FormbricksEnding,
): FormbricksPayload => ({
  workspaceId: survey.workspaceId,
  name: survey.name,
  type: "link",
  status: "draft",
  displayOption: "displayOnce",
  autoClose: null,
  triggers: [],
  recontactDays: null,
  displayLimit: null,
  welcomeCard: survey.welcomeCard
    ? {
        enabled: true,
        headline: localize(survey.welcomeCard.headline),
        ...(localize(survey.welcomeCard.subheader) ? { subheader: localize(survey.welcomeCard.subheader) } : {}),
        ...(localize(survey.welcomeCard.buttonLabel) ? { buttonLabel: localize(survey.welcomeCard.buttonLabel) } : {}),
      }
    : { enabled: false },
  questions: [],
  blocks,
  endings: [ending],
  hiddenFields: { enabled: false, fieldIds: [] },
  variables: [],
  followUps: [],
  delay: 0,
  publishOn: null,
  closeOn: null,
  autoComplete: null,
  workspaceOverwrites: null,
  styling: null,
  showLanguageSwitch: null,
  autoSelectLanguage: null,
  surveyClosedMessage: null,
  segment: null,
  singleUse: null,
  isVerifyEmailEnabled: false,
  recaptcha: null,
  isBackButtonHidden: false,
  isAutoProgressingEnabled: false,
  isCaptureIpEnabled: false,
  isAnonymizeResponsesEnabled: false,
  pin: null,
  displayPercentage: null,
  languages: [],
  metadata: {
    ...(localize(survey.name) ? { title: localize(survey.name) } : {}),
    ...(localize(survey.description) ? { description: localize(survey.description) } : {}),
  },
  slug: null,
});
