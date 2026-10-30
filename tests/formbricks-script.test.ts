import { expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type Runtime = "podman" | "docker";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ingestScript = join(repoRoot, "scripts", "start-and-ingest-survey.sh");
const startScript = join(repoRoot, "scripts", "start-formbricks.sh");
const surveyPath = join(repoRoot, "examples", "architecture-survey.json");

const writeExecutable = (path: string, content: string) => {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
};

const createFixture = (databaseUrl: string, runtime: Runtime = "podman") => {
  const root = mkdtempSync(join(tmpdir(), "sosa-formbricks-test-"));
  const formbricks = join(root, "formbricks");
  const bin = join(root, "bin");
  mkdirSync(join(formbricks, "node_modules"), { recursive: true });
  mkdirSync(bin);
  const git = Bun.spawnSync({ cmd: ["git", "init", "-q"], cwd: formbricks });
  if (git.exitCode !== 0) throw new Error("failed to initialize the fixture checkout");

  writeFileSync(join(formbricks, "package.json"), '{"name":"formbricks"}\n');
  writeFileSync(join(formbricks, "docker-compose.dev.yml"), "services: {}\n");
  writeFileSync(join(formbricks, ".env"), `${databaseUrl}\n`);

  const stackReady = join(root, "stack-ready");
  writeExecutable(
    join(bin, "pnpm"),
    '#!/usr/bin/env bash\necho "pnpm:$*" >> "$FAKE_LOG"\nexit 0\n',
  );

  if (runtime === "podman") {
    writeExecutable(
      join(bin, "podman"),
      '#!/usr/bin/env bash\ncase "$*" in *inspect*) [[ -e "$FAKE_STACK_READY" ]] && echo running;; esac\n',
    );
    writeExecutable(
      join(bin, "podman-compose"),
      '#!/usr/bin/env bash\nif [[ "$*" == *pull* ]]; then echo compose-pull >> "$FAKE_LOG"; fi\nif [[ "$*" == *"up -d"* ]]; then echo compose-up >> "$FAKE_LOG"; touch "$FAKE_STACK_READY"; fi\nif [[ "$*" == *" ps -q "* ]]; then [[ -e "$FAKE_STACK_READY" ]] && echo fake-container; fi\nif [[ "$*" == *exec* ]]; then echo compose-valkey >> "$FAKE_LOG"; echo PONG; fi\n',
    );
  } else {
    writeExecutable(
      join(bin, "docker"),
      '#!/usr/bin/env bash\ncase "$*" in\n  "compose version") exit 0;;\n  *pull*) echo compose-pull >> "$FAKE_LOG";;\n  *"up -d"*) echo compose-up >> "$FAKE_LOG"; /usr/bin/touch "$FAKE_STACK_READY";;\n  *"ps -q"*) [[ -e "$FAKE_STACK_READY" ]] && echo fake-container;;\n  *exec*) echo compose-valkey >> "$FAKE_LOG"; echo PONG;;\n  *inspect*) [[ -e "$FAKE_STACK_READY" ]] && echo running;;\nesac\n',
    );
  }

  writeExecutable(
    join(bin, "psql"),
    '#!/usr/bin/env bash\necho psql >> "$FAKE_LOG"\nprintf "%s\\n" "$1" > "$FAKE_PSQL_ARG"\nprintf "%s\\n" "$FAKE_COUNTS"\n',
  );
  writeExecutable(
    join(bin, "curl"),
    `#!/usr/bin/env bash
if [[ "$*" == *"--request POST"* ]]; then
  echo curl-post >> "$FAKE_LOG"
  output=""
  while (($# > 0)); do
    if [[ "$1" == "--output" ]]; then
      shift
      output="$1"
    fi
    shift
  done
  printf '%s\\n' '{"data":{"id":"csurvey000000000000000000"}}' > "$output"
else
  echo curl-readiness >> "$FAKE_LOG"
fi
exit 0
`,
  );

  return { root, formbricks, bin, stackReady };
};

const runDemo = (counts: string, databaseUrl = "DATABASE_URL=postgresql://localhost:5432/demo?schema=public") => {
  const fixture = createFixture(databaseUrl);
  const logPath = join(fixture.root, "order.log");
  const psqlArgPath = join(fixture.root, "psql-arg");
  try {
    const result = Bun.spawnSync({
      cmd: ["bash", ingestScript, "--demo", surveyPath, fixture.formbricks],
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${fixture.bin}:${process.env.PATH ?? ""}`,
        FAKE_COUNTS: counts,
        FAKE_LOG: logPath,
        FAKE_PSQL_ARG: psqlArgPath,
        FAKE_STACK_READY: fixture.stackReady,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      ...result,
      output: `${Buffer.from(result.stdout).toString()}${Buffer.from(result.stderr).toString()}`,
      log: readFileSync(logPath, "utf8"),
      psqlArg: readFileSync(psqlArgPath, "utf8").trim(),
    };
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
};

test("normal mode still requires caller credentials", () => {
  const result = Bun.spawnSync({
    cmd: ["bash", ingestScript],
    cwd: repoRoot,
    env: {
      ...process.env,
      FORMBRICKS_API_KEY: undefined,
      FORMBRICKS_WORKSPACE_ID: undefined,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = `${Buffer.from(result.stdout).toString()}${Buffer.from(result.stderr).toString()}`;

  expect(result.exitCode).toBe(1);
  expect(output).toContain("FORMBRICKS_API_KEY is required");
});

test("demo mode refuses non-empty data and does not execute .env content", async () => {
  const marker = join(tmpdir(), `sosa-formbricks-marker-${Date.now()}`);
  const result = runDemo("1|0|0", `DATABASE_URL = \"postgresql://localhost:5432/demo?schema=public\"\n$(touch ${marker})`);

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("users=1 organizations=0 workspaces=0");
  expect(result.psqlArg).toBe("postgresql://localhost:5432/demo");
  await expect(Bun.file(marker).exists()).resolves.toBe(false);
});

test("demo mode pulls, seeds, imports, and never prints the management key", () => {
  const result = runDemo("0|0|0");
  const phases = result.log.split("\n");
  const indexOf = (phase: string) => phases.indexOf(phase);

  expect(result.exitCode).toBe(0);
  expect(indexOf("compose-pull")).toBeLessThan(indexOf("compose-up"));
  expect(indexOf("compose-up")).toBeLessThan(indexOf("psql"));
  expect(indexOf("psql")).toBeLessThan(indexOf("pnpm:--filter=@formbricks/database db:seed"));
  expect(indexOf("pnpm:--filter=@formbricks/database db:seed")).toBeLessThan(
    indexOf("pnpm:authzed:backfill --apply"),
  );
  expect(indexOf("pnpm:authzed:backfill --apply")).toBeLessThan(
    indexOf("pnpm:--reporter=append-only --filter @formbricks/web dev"),
  );
  expect(result.output).toContain("Survey ID: csurvey000000000000000000");
  expect(result.output).toContain("Live survey: http://localhost:3000/s/csurvey000000000000000000");
  expect(result.output).toContain("Demo login: admin@formbricks.com");
  expect(result.output).not.toContain("fbk_");
});

test("bootstrap selects Docker Compose when Podman is unavailable", () => {
  const fixture = createFixture("DATABASE_URL=postgresql://localhost:5432/demo", "docker");
  const logPath = join(fixture.root, "order.log");
  try {
    symlinkSync("/bin/bash", join(fixture.bin, "bash"));
    symlinkSync("/usr/bin/git", join(fixture.bin, "git"));
    writeExecutable(join(fixture.bin, "podman"), "#!/usr/bin/env bash\nexit 1\n");
    writeExecutable(join(fixture.bin, "podman-compose"), "#!/usr/bin/env bash\nexit 1\n");
    const result = Bun.spawnSync({
      cmd: ["bash", startScript, fixture.formbricks],
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${fixture.bin}:/usr/bin:/bin`,
        FORMBRICKS_PREPARE_ONLY: "1",
        FAKE_LOG: logPath,
        FAKE_STACK_READY: fixture.stackReady,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = `${Buffer.from(result.stdout).toString()}${Buffer.from(result.stderr).toString()}`;

    expect(result.exitCode).toBe(0);
    expect(output).toContain("Using Docker Compose for Formbricks containers");
    expect(output).toContain("Formbricks dependencies are ready");
    expect(readFileSync(logPath, "utf8")).toContain("compose-pull");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("bootstrap reports a missing container runtime clearly", () => {
  const root = mkdtempSync(join(tmpdir(), "sosa-formbricks-no-runtime-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeExecutable(join(bin, "pnpm"), "#!/usr/bin/env bash\nexit 0\n");
  symlinkSync("/bin/bash", join(bin, "bash"));
  symlinkSync("/usr/bin/git", join(bin, "git"));
  writeExecutable(join(bin, "podman"), "#!/usr/bin/env bash\nexit 1\n");
  writeExecutable(join(bin, "podman-compose"), "#!/usr/bin/env bash\nexit 1\n");
  writeExecutable(join(bin, "docker"), "#!/usr/bin/env bash\nexit 1\n");
  try {
    const result = Bun.spawnSync({
      cmd: ["bash", startScript, join(root, "formbricks")],
      cwd: repoRoot,
      env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` },
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = `${Buffer.from(result.stdout).toString()}${Buffer.from(result.stderr).toString()}`;

    expect(result.exitCode).toBe(1);
    expect(output).toContain("Podman with podman-compose or Docker with Compose is required");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
