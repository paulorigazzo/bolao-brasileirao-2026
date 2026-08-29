import { createHash } from "node:crypto";

const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function nonEmpty(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function httpsUrl(value) {
  const text = nonEmpty(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function dimensionsFromPng(bytes) {
  if (bytes.length < 24 || bytes.subarray(1, 4).toString("ascii") !== "PNG") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function dimensionsFromSvg(bytes) {
  const source = bytes.toString("utf8", 0, Math.min(bytes.length, 64 * 1024));
  const tag = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const width = Number(tag.match(/\bwidth=["']([\d.]+)/i)?.[1]);
  const height = Number(tag.match(/\bheight=["']([\d.]+)/i)?.[1]);
  if (width > 0 && height > 0) return { width, height };
  const viewBox = tag.match(/\bviewBox=["'][^"']*?([\d.]+)[ ,]+([\d.]+)["']/i);
  return viewBox ? { width: Number(viewBox[1]), height: Number(viewBox[2]) } : null;
}

export function collectClubCrestEvidence(rows) {
  const officialByGame = new Map();
  for (const row of rows) {
    if (row.fornecedor === "football-data.org") officialByGame.set(String(row.id_jogo), row);
  }
  const clubs = new Map();
  for (const row of rows) {
    if (row.fornecedor !== "api-football") continue;
    const official = officialByGame.get(String(row.id_jogo));
    for (const side of ["casa", "fora"]) {
      const providerTeamId = Number(row[`time_${side}_id_externo`]);
      if (!Number.isSafeInteger(providerTeamId) || providerTeamId <= 0) continue;
      const current = clubs.get(providerTeamId) || {
        providerTeamId, names: new Set(), codes: new Set(), providerUrls: new Set(),
        canonicalUrls: new Set(), gameIds: new Set(),
      };
      const name = nonEmpty(row[`time_${side}_nome`]);
      const code = nonEmpty(row[`time_${side}_codigo`]);
      const providerUrl = nonEmpty(row[`time_${side}_logo`]);
      const canonicalUrl = nonEmpty(official?.[`time_${side}_logo`]);
      if (name) current.names.add(name);
      if (code) current.codes.add(code);
      if (providerUrl) current.providerUrls.add(providerUrl);
      if (canonicalUrl) current.canonicalUrls.add(canonicalUrl);
      current.gameIds.add(row.id_jogo);
      clubs.set(providerTeamId, current);
    }
  }
  return [...clubs.values()].map((club) => Object.fromEntries(
    Object.entries(club).map(([key, value]) => [key, value instanceof Set ? [...value].sort() : value]),
  )).sort((a, b) => a.providerTeamId - b.providerTeamId);
}

export async function probeCrest(url, fetchImpl = fetch) {
  const normalizedUrl = httpsUrl(url);
  if (!normalizedUrl) return { url, ok: false, errors: ["https_url_invalid"] };
  try {
    const response = await fetchImpl(normalizedUrl, { headers: { Accept: "image/*" }, redirect: "follow" });
    if (!response.ok) return { url: normalizedUrl, ok: false, status: response.status, errors: ["http_error"] };
    const contentType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const bytes = Buffer.from(await response.arrayBuffer());
    const errors = [];
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) errors.push("content_type_invalid");
    if (!bytes.length) errors.push("file_empty");
    if (bytes.length > MAX_BYTES) errors.push("file_too_large");
    const dimensions = contentType === "image/png" ? dimensionsFromPng(bytes)
      : contentType === "image/svg+xml" ? dimensionsFromSvg(bytes) : null;
    if (dimensions && (dimensions.width < 64 || dimensions.height < 64)) errors.push("resolution_too_low");
    if (dimensions) {
      const ratio = dimensions.width / dimensions.height;
      if (ratio < 0.5 || ratio > 2) errors.push("aspect_ratio_suspicious");
    }
    return {
      url: normalizedUrl, ok: errors.length === 0, status: response.status, contentType,
      bytes: bytes.length, dimensions,
      sha256: createHash("sha256").update(bytes).digest("hex"), errors,
    };
  } catch (error) {
    return { url: normalizedUrl, ok: false, errors: ["request_failed"], detail: error.message };
  }
}

export async function auditClubCrests(rows, { fetchImpl = fetch, probe = true } = {}) {
  const results = [];
  for (const club of collectClubCrestEvidence(rows)) {
    const structuralErrors = [];
    if (!club.providerUrls.length) structuralErrors.push("provider_crest_missing");
    if (club.providerUrls.length > 1) structuralErrors.push("provider_crest_inconsistent");
    if (club.names.length > 1) structuralErrors.push("provider_name_inconsistent");
    if (club.providerUrls[0] && !httpsUrl(club.providerUrls[0])) structuralErrors.push("https_url_invalid");
    const providerProbe = probe && club.providerUrls[0] ? await probeCrest(club.providerUrls[0], fetchImpl) : null;
    const canonicalProbe = probe && club.canonicalUrls[0] ? await probeCrest(club.canonicalUrls[0], fetchImpl) : null;
    const technicalErrors = [...structuralErrors, ...(providerProbe?.errors || [])];
    let classification = "pending";
    let reason = probe ? "visual_review_required" : "technical_probe_not_run";
    if (technicalErrors.length) {
      classification = "rejected";
      reason = technicalErrors[0];
    } else if (providerProbe?.sha256 && providerProbe.sha256 === canonicalProbe?.sha256) {
      classification = "approved";
      reason = "identical_to_canonical";
    }
    results.push({ ...club, classification, reason, technicalErrors, providerProbe, canonicalProbe });
  }
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      clubs: results.length,
      approved: results.filter((item) => item.classification === "approved").length,
      pending: results.filter((item) => item.classification === "pending").length,
      rejected: results.filter((item) => item.classification === "rejected").length,
    },
    clubs: results,
  };
}

export function crestAuditMarkdown(report) {
  const lines = [
    "# Auditoria de escudos — API-Football", "", `Gerado em: ${report.generatedAt}`, "",
    `Clubes: ${report.summary.clubs} | Aprovados: ${report.summary.approved} | Pendentes: ${report.summary.pending} | Rejeitados: ${report.summary.rejected}`,
    "", "| ID API-Football | Clube | Código observado | Situação | Motivo | Escudo atual | Escudo novo |",
    "| ---: | --- | --- | --- | --- | --- | --- |",
  ];
  for (const club of report.clubs) {
    lines.push(`| ${club.providerTeamId} | ${club.names.join(" / ") || "—"} | ${club.codes.join(" / ") || "—"} | ${club.classification} | ${club.reason} | ${club.canonicalUrls[0] || "—"} | ${club.providerUrls[0] || "—"} |`);
  }
  return `${lines.join("\n")}\n`;
}
