import { readFile, readdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function compareVersions(expected, sources) {
  return sources
    .filter(({ value }) => value !== expected)
    .map(({ file, value }) => `${file}: versao ${JSON.stringify(value ?? "nao encontrada")} diverge de VERSION.md (${expected})`);
}

export function markdownTargets(source) {
  const withoutFences = source.replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~)[ \t]*$/gm, "");
  const targets = [];
  for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)\n]+)\)/g)) {
    let target = match[1].trim();
    if (target.startsWith("<")) {
      const end = target.indexOf(">");
      target = end >= 0 ? target.slice(1, end) : target;
    } else {
      target = target.split(/[ \t]+/)[0];
    }
    if (!target || target.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
    targets.push(target);
  }
  return targets;
}

export async function missingMarkdownTargets(markdownFile, source, root = projectRoot) {
  const failures = [];
  for (const rawTarget of markdownTargets(source)) {
    const targetWithoutFragment = rawTarget.split("#", 1)[0];
    if (!targetWithoutFragment) continue;
    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(targetWithoutFragment);
    } catch {
      decodedTarget = targetWithoutFragment;
    }
    const absoluteTarget = decodedTarget.startsWith("/")
      ? path.join(root, decodedTarget.slice(1))
      : path.resolve(path.dirname(markdownFile), decodedTarget);
    try {
      await access(absoluteTarget, constants.R_OK);
    } catch {
      failures.push(`${path.relative(root, markdownFile)}: destino Markdown local inexistente: ${rawTarget}`);
    }
  }
  return failures;
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

function capture(source, expression) {
  return source.match(expression)?.[1];
}

export async function checkDocumentationContracts(root = projectRoot) {
  const files = {
    version: path.join(root, "VERSION.md"),
    package: path.join(root, "package.json"),
    app: path.join(root, "js/app.js"),
    constants: path.join(root, "netlify/functions/_constants.mjs"),
    readme: path.join(root, "README.md"),
    roadmap: path.join(root, "ROADMAP.md"),
    html: path.join(root, "index.html"),
  };
  const [versionText, packageText, app, constantsSource, readme, roadmap, html] = await Promise.all([
    readFile(files.version, "utf8"),
    readFile(files.package, "utf8"),
    readFile(files.app, "utf8"),
    readFile(files.constants, "utf8"),
    readFile(files.readme, "utf8"),
    readFile(files.roadmap, "utf8"),
    readFile(files.html, "utf8"),
  ]);
  const expected = versionText.split(/\r?\n/, 1)[0].trim();
  const failures = compareVersions(expected, [
    { file: "package.json", value: JSON.parse(packageText).version },
    { file: "js/app.js", value: capture(app, /const APP_VERSION = "([^"]+)"/) },
    { file: "netlify/functions/_constants.mjs", value: capture(constantsSource, /APP_VERSION = "([^"]+)"/) },
    { file: "README.md", value: capture(readme, /Versão funcional:\s*`v([^`]+)`/) },
    { file: "ROADMAP.md", value: capture(roadmap, /Versão funcional:\s*`v([^`]+)`/) },
    { file: "index.html", value: capture(html, /id="appVersion"[^>]*>v([^<]+)</) },
  ]);

  for (const markdownFile of await markdownFiles(root)) {
    const source = await readFile(markdownFile, "utf8");
    failures.push(...await missingMarkdownTargets(markdownFile, source, root));
  }
  return { expected, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { expected, failures } = await checkDocumentationContracts();
  if (failures.length) {
    console.error("Falha nos contratos documentais:\n- " + failures.join("\n- "));
    process.exit(1);
  }
  console.log(`Contratos documentais v${expected} verificados: versao operacional e caminhos Markdown locais consistentes.`);
}
