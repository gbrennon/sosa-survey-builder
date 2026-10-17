export type LocalizedText = string | Record<string, string>;

export type AuthoringElementType =
  | "directions"
  | "scale"
  | "multiselect"
  | "single_select"
  | "essay"
  | "short_text"
  | "date";

export type AuthoringInputType = "text" | "email" | "url" | "number" | "phone";

export interface Choice {
  id: string;
  label: LocalizedText;
}

export interface OtherChoice {
  label?: LocalizedText;
  placeholder?: LocalizedText;
}

export interface AuthoringElementBase {
  id: string;
  type: AuthoringElementType;
  headline: LocalizedText;
  subheader?: LocalizedText;
  required?: boolean;
}

export interface DirectionsElement extends AuthoringElementBase {
  type: "directions";
}

export interface ScaleElement extends AuthoringElementBase {
  type: "scale";
  min: number;
  max: number;
  scale?: "number" | "smiley" | "star";
  lowerLabel?: LocalizedText;
  upperLabel?: LocalizedText;
  labels?: Record<string, LocalizedText>;
  randomizeDirection?: boolean;
}

export interface ChoiceElement extends AuthoringElementBase {
  type: "multiselect" | "single_select";
  choices: Choice[];
  randomize?: boolean;
  anchoredChoiceIds?: string[];
  other?: OtherChoice;
}

export interface EssayElement extends AuthoringElementBase {
  type: "essay";
  charLimit?: { min?: number; max?: number };
}

export interface ShortTextElement extends AuthoringElementBase {
  type: "short_text";
  inputType?: AuthoringInputType;
  placeholder?: LocalizedText;
  charLimit?: { min?: number; max?: number };
}

export interface DateElement extends AuthoringElementBase {
  type: "date";
  format?: "M-d-y" | "d-M-y" | "y-M-d";
}

export type AuthoringElement =
  | DirectionsElement
  | ScaleElement
  | ChoiceElement
  | EssayElement
  | ShortTextElement
  | DateElement;

export type RuleOperator =
  | "equals"
  | "not_equals"
  | "one_of"
  | "contains"
  | "includes_one_of"
  | "includes_all_of"
  | "is_set"
  | "is_not_set";

export interface RuleCondition {
  element: string;
  operator: RuleOperator;
  value?: string | number | string[];
}

export interface Rule {
  target: string;
  mode: "show" | "skip";
  all?: RuleCondition[];
  any?: RuleCondition[];
}

export interface AuthoringWelcomeCard {
  headline: LocalizedText;
  subheader?: LocalizedText;
  buttonLabel?: LocalizedText;
}

export interface AuthoringEnding {
  headline?: LocalizedText;
  subheader?: LocalizedText;
  buttonLabel?: LocalizedText;
  buttonLink?: string;
}

export interface AuthoringSurvey {
  id?: string;
  workspaceId: string;
  name: string;
  description?: LocalizedText;
  locale?: string;
  welcomeCard?: AuthoringWelcomeCard;
  elements: AuthoringElement[];
  rules?: Rule[];
  ending?: AuthoringEnding;
}

export interface FormbricksPayload {
  workspaceId: string;
  name: string;
  type: "link" | "app";
  status: "draft";
  displayOption: "displayOnce";
  autoClose: null;
  triggers: [];
  recontactDays: null;
  displayLimit: null;
  welcomeCard: Record<string, unknown>;
  questions: [];
  blocks: FormbricksBlock[];
  endings: FormbricksEnding[];
  hiddenFields: { enabled: false; fieldIds: [] };
  variables: [];
  followUps: [];
  delay: 0;
  publishOn: null;
  closeOn: null;
  autoComplete: null;
  workspaceOverwrites: null;
  styling: null;
  showLanguageSwitch: null;
  autoSelectLanguage: null;
  surveyClosedMessage: null;
  segment: null;
  singleUse: null;
  isVerifyEmailEnabled: false;
  recaptcha: null;
  isBackButtonHidden: false;
  isAutoProgressingEnabled: false;
  isCaptureIpEnabled: false;
  isAnonymizeResponsesEnabled: false;
  pin: null;
  displayPercentage: null;
  languages: [];
  metadata: Record<string, unknown>;
  slug: null;
}

export interface FormbricksFixture extends FormbricksPayload {
  id: string;
  overlayAppearance: { color: null; opacity: null };
}

export interface FormbricksBlock {
  id: string;
  name: string;
  elements: Record<string, unknown>[];
  logic?: FormbricksLogic[];
  logicFallback?: string;
}

export interface FormbricksLogic {
  id: string;
  conditions: FormbricksConditionGroup;
  actions: FormbricksAction[];
}

export interface FormbricksConditionGroup {
  id: string;
  connector: "and" | "or";
  conditions: FormbricksCondition[];
}

export interface FormbricksCondition {
  id: string;
  leftOperand: { type: "element"; value: string };
  operator: string;
  rightOperand?: { type: "static"; value: string | number | string[] };
}

export interface FormbricksAction {
  id: string;
  objective: "jumpToBlock";
  target: string;
}

export interface FormbricksEnding {
  id: string;
  type: "endScreen" | "redirectToUrl";
  headline?: Record<string, string>;
  subheader?: Record<string, string>;
  buttonLabel?: Record<string, string>;
  buttonLink?: string;
  url?: string;
  label?: string;
}
