export const SPORTS_DATA_PROVIDERS = Object.freeze({
  FOOTBALL_DATA: "football-data.org",
  API_FOOTBALL: "api-football",
});

export const SPORTS_DATA_PROVIDER_ENV = "SPORTS_DATA_OFFICIAL_PROVIDER";

export function officialSportsDataProvider(environment = process.env) {
  const configured = String(environment?.[SPORTS_DATA_PROVIDER_ENV] || "").trim();
  if (!configured) return SPORTS_DATA_PROVIDERS.FOOTBALL_DATA;
  if (!Object.values(SPORTS_DATA_PROVIDERS).includes(configured)) {
    throw new Error(`sports_data_provider_invalid:${configured}`);
  }
  return configured;
}

export function providerClassificationSnapshotId(baseId, provider) {
  if (!Object.values(SPORTS_DATA_PROVIDERS).includes(provider)) {
    throw new Error(`sports_data_provider_invalid:${provider}`);
  }
  return provider === SPORTS_DATA_PROVIDERS.FOOTBALL_DATA ? baseId : `${baseId}:${provider}`;
}
