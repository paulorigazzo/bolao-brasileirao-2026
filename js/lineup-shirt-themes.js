const FALLBACK_THEME = theme("linear-gradient(135deg,#123d29 0 50%,#e5f5ea 50% 100%)", "#ffffff");

function theme(pattern, number) {
  return {
    pattern,
    number,
    numberShadow: number === "#ffffff" ? "0 1px 2px rgba(0,0,0,.9)" : "0 1px 1px rgba(255,255,255,.8)",
  };
}

function stripes(primary, secondary, tertiary, number = "#ffffff") {
  const stops = tertiary
    ? `${primary} 0 20%,${secondary} 20% 34%,${tertiary} 34% 54%,${primary} 54% 74%,${secondary} 74% 88%,${tertiary} 88% 100%`
    : `${primary} 0 28%,${secondary} 28% 50%,${primary} 50% 78%,${secondary} 78% 100%`;
  return theme(`linear-gradient(90deg,${stops})`, number);
}

function classicStripes(primary, secondary, number = "#ffffff") {
  return theme(`linear-gradient(90deg,${primary} 0 17%,${secondary} 17% 34%,${primary} 34% 50%,${secondary} 50% 67%,${primary} 67% 83%,${secondary} 83% 100%)`, number);
}

function hoops(primary, secondary, tertiary, number = "#ffffff") {
  const stops = tertiary
    ? `${primary} 0 25%,${secondary} 25% 38%,${tertiary} 38% 63%,${primary} 63% 82%,${secondary} 82% 100%`
    : `${primary} 0 32%,${secondary} 32% 55%,${primary} 55% 78%,${secondary} 78% 100%`;
  return theme(`linear-gradient(180deg,${stops})`, number);
}

function sleeves(primary, secondary, number = "#ffffff") {
  return theme(`linear-gradient(90deg,${secondary} 0 22%,${primary} 22% 78%,${secondary} 78% 100%)`, number);
}

function bands(base, upper, lower, number = "#102318", diagonal = false) {
  return theme(`linear-gradient(${diagonal ? "135deg" : "180deg"},${base} 0 37%,${upper} 37% 47%,${lower} 47% 57%,${base} 57% 100%)`, number);
}

const THEMES = {
  "athletico-pr": classicStripes("#c8102e", "#111111"),
  "atletico-mg": classicStripes("#111111", "#f5fff8"),
  bahia: stripes("#0057a8", "#f5fff8", "#d71920"),
  botafogo: stripes("#111111", "#f5fff8", null, "#ffffff"),
  bragantino: sleeves("#f5fff8", "#d71920", "#102318"),
  chapecoense: sleeves("#17753c", "#f5fff8"),
  corinthians: sleeves("#f5fff8", "#111111", "#102318"),
  coritiba: stripes("#17753c", "#f5fff8", null, "#ffffff"),
  cruzeiro: sleeves("#17479e", "#f5fff8"),
  flamengo: hoops("#c52613", "#111111"),
  fluminense: stripes("#7a1731", "#f5fff8", "#006341"),
  fortaleza: hoops("#134b9b", "#f5fff8", "#e31b23"),
  gremio: stripes("#1e9bd7", "#111111", "#f5fff8"),
  internacional: sleeves("#d71920", "#f5fff8"),
  mirassol: stripes("#f2c500", "#17753c", null, "#102318"),
  palmeiras: sleeves("#006437", "#f5fff8"),
  remo: hoops("#102f67", "#f5fff8"),
  santos: sleeves("#f5fff8", "#111111", "#102318"),
  "sao-paulo": bands("#f5fff8", "#e2231a", "#111111", "#102318"),
  vasco: bands("#111111", "#f5fff8", "#f5fff8", "#ffffff", true),
  vitoria: hoops("#d71920", "#111111"),
};

const ALIASES = {
  paranaense: "athletico-pr",
  "athletico-paranaense": "athletico-pr",
  "atletico-paranaense": "athletico-pr",
  "atletico-mineiro": "atletico-mg",
  "clube-do-remo": "remo",
  "rb-bragantino": "bragantino",
  "red-bull-bragantino": "bragantino",
  "sao-paulo-fc": "sao-paulo",
  "vasco-da-gama": "vasco",
};

function normalizeTeamKey(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function lineupShirtTheme(teamName) {
  const rawKey = normalizeTeamKey(teamName);
  return THEMES[ALIASES[rawKey] || rawKey] || FALLBACK_THEME;
}

export const LINEUP_SHIRT_THEME_KEYS = Object.freeze(Object.keys(THEMES));
