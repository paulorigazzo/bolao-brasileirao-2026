import { createClient } from "@supabase/supabase-js";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export function serviceClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function safeErrorMessage(error, fallback = "Erro interno.") {
  const message = error?.message || String(error || "");
  return message.trim() || fallback;
}

export function errorResponse(error, status = 500, extraHeaders = {}) {
  return jsonResponse({ ok: false, error: safeErrorMessage(error) }, status, {
    "cache-control": "no-store",
    ...extraHeaders,
  });
}

export function methodNotAllowed(allowedMethods) {
  const allow = Array.isArray(allowedMethods) ? allowedMethods.join(", ") : String(allowedMethods);
  return jsonResponse({ ok: false, error: `Método não permitido. Use ${allow}.` }, 405, {
    Allow: allow,
    "cache-control": "no-store",
  });
}

export async function requireAdmin(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { ok: false, status: 401, error: "Autenticação obrigatória." };

  const supabase = serviceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) {
    return { ok: false, status: 401, error: "Sessão inválida ou expirada." };
  }

  const email = user.email.trim().toLowerCase();
  const { data: participant, error: participantError } = await supabase
    .from("participantes_autorizados")
    .select("administrador,ativo")
    .eq("email", email)
    .maybeSingle();

  if (participantError) {
    return { ok: false, status: 503, error: `Não foi possível validar o administrador: ${participantError.message}` };
  }

  const envAdmins = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowed = participant?.ativo !== false && (participant?.administrador === true || envAdmins.includes(email));
  if (!allowed) return { ok: false, status: 403, error: "Apenas administradores podem sincronizar jogos." };

  return { ok: true, user, email, supabase };
}

export function isMissingTableError(error) {
  const text = String(error?.message || error || "").toLowerCase();
  return text.includes("does not exist") || text.includes("could not find the table") || text.includes("schema cache");
}
