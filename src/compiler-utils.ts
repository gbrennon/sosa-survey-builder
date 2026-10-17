import { createHash } from "node:crypto";
import type { AuthoringElement, LocalizedText } from "./schema.ts";

export const cuid = (seed: string): string =>
  `c${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;

export const localize = (
  value: LocalizedText | undefined,
): Record<string, string> | undefined => {
  if (value === undefined) return undefined;
  return typeof value === "string" ? { default: value } : { ...value };
};

export const required = (element: AuthoringElement): boolean =>
  element.type === "directions" ? false : element.required ?? false;

export const baseElement = (element: AuthoringElement): Record<string, unknown> => ({
  id: element.id,
  headline: localize(element.headline),
  ...(localize(element.subheader) ? { subheader: localize(element.subheader) } : {}),
  required: required(element),
});
