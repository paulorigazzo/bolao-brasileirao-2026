const SUSPICIOUS_UTF8 = /(?:Ã[\u0080-\u00bf]|Â[\u0080-\u00bf])/g;

function suspiciousCount(value) {
  return [...String(value || "").matchAll(SUSPICIOUS_UTF8)].length;
}

function decodeLatin1Utf8(value) {
  const points = [...value].map((character) => character.codePointAt(0));
  if (points.some((point) => point > 255)) return value;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(points));
  } catch {
    return value;
  }
}

export function repairMojibake(value) {
  if (typeof value !== "string" || suspiciousCount(value) === 0) return value;
  const repaired = decodeLatin1Utf8(value);
  return suspiciousCount(repaired) < suspiciousCount(value) ? repaired : value;
}
