export const API_FOOTBALL_LOCAL_CREST_ROOT = "/assets/clubs/api-football";

export const API_FOOTBALL_BRASILEIRAO_TEAM_IDS = Object.freeze([
  118, 119, 120, 121, 124, 126, 127, 128, 130, 131,
  132, 133, 134, 135, 136, 147, 794, 1062, 1198, 7848,
]);

export function apiFootballLocalCrestUrl(teamId) {
  const normalized = Number(teamId);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) throw new Error("api_football_team_id_invalid");
  return `${API_FOOTBALL_LOCAL_CREST_ROOT}/${normalized}.png`;
}

export function assessApiFootballCrestCoverage(teamIds, expectedIds = API_FOOTBALL_BRASILEIRAO_TEAM_IDS) {
  const actual = new Set(teamIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0));
  const expected = new Set(expectedIds);
  const missing = [...expected].filter((id) => !actual.has(id));
  const unexpected = [...actual].filter((id) => !expected.has(id));
  return { ok: missing.length === 0 && unexpected.length === 0, clubs: actual.size, missing, unexpected };
}

export function inspectApiFootballCrest(bytes, contentType = "image/png") {
  const buffer = Buffer.from(bytes);
  const png = buffer.length >= 24
    && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("ascii") === "PNG";
  const width = png ? buffer.readUInt32BE(16) : 0;
  const height = png ? buffer.readUInt32BE(20) : 0;
  const normalizedType = String(contentType).split(";")[0].trim().toLowerCase();
  const errors = [];
  if (normalizedType !== "image/png") errors.push("content_type_invalid");
  if (!png) errors.push("png_invalid");
  if (buffer.length > 2 * 1024 * 1024) errors.push("file_too_large");
  if (png && (width < 64 || height < 64)) errors.push("resolution_too_low");
  return { ok: errors.length === 0, bytes: buffer.length, width, height, errors };
}
