import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compileSurvey } from "./compiler.ts";
import { validateAuthoringSurvey } from "./validate.ts";
import type { AuthoringSurvey } from "./schema.ts";

const usage = `Usage:
  bun run src/cli.ts build <survey.json> [--out-dir <directory>]
  bun run src/cli.ts validate <survey.json>`;

const readSurveyText = async (path: string): Promise<string> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read '${path}': ${message}`);
  }
};

const parseSurveyJson = (path: string, text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse '${path}': ${message}`);
  }
};

const readAuthoringSurvey = async (path: string): Promise<AuthoringSurvey> => {
  const raw = parseSurveyJson(path, await readSurveyText(path));
  const validation = validateAuthoringSurvey(raw);
  if (!validation.ok) throw new Error(validation.errors.join("\n"));
  return validation.survey;
};

const parseOutDir = (args: string[]): string => {
  const outDirIndex = args.indexOf("--out-dir");
  if (outDirIndex < 0) return "dist";
  const outDir = args[outDirIndex + 1];
  if (!outDir) throw new Error("--out-dir requires a directory");
  return outDir;
};

const build = async (survey: AuthoringSurvey, outDir: string): Promise<void> => {
  const compiled = compileSurvey(survey);
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(outDir, "survey.payload.json"),
      `${JSON.stringify(compiled.payload, null, 2)}\n`,
    ),
    writeFile(
      join(outDir, "survey.fixture.json"),
      `${JSON.stringify(compiled.fixture, null, 2)}\n`,
    ),
  ]);
  console.log(`Wrote ${join(outDir, "survey.payload.json")}`);
  console.log(`Wrote ${join(outDir, "survey.fixture.json")}`);
};

const isSupportedCommand = (command: string | undefined): command is "build" | "validate" =>
  command === "build" || command === "validate";

const runCommand = async (
  command: "build" | "validate",
  inputPath: string,
  args: string[],
): Promise<void> => {
  const survey = await readAuthoringSurvey(inputPath);
  if (command === "validate") {
    console.log(`Valid authoring survey: ${survey.name}`);
    return;
  }
  await build(survey, parseOutDir(args));
};

const main = async (): Promise<void> => {
  const [command, inputPath, ...args] = process.argv.slice(2);
  if (!inputPath || !isSupportedCommand(command)) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }
  try {
    await runCommand(command, inputPath, args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

await main();
