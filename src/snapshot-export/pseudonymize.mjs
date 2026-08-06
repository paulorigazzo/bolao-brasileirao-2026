import { createHmac } from "node:crypto";

function keyBuffer(secret) {
  const value = Buffer.isBuffer(secret) ? secret : Buffer.from(String(secret ?? ""), "utf8");
  if (value.byteLength < 32) throw new Error("A chave de pseudonimização deve possuir ao menos 32 bytes");
  return value;
}

export function opaqueRef(type, value, secret) {
  if (!new Set(["participant", "membership", "prediction"]).has(type)) throw new Error("Domínio de pseudônimo inválido");
  if (value === undefined || value === null || String(value).trim() === "") throw new Error(`Valor ausente para ${type}`);
  const digest = createHmac("sha256", keyBuffer(secret)).update(`${type}\0${String(value)}`, "utf8").digest("hex").slice(0, 32);
  return `${type}-${digest}`;
}
