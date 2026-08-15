function clockInteger(value, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const number=Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : null;
}

export function officialLiveMatchMinute(game) {
  const minute=clockInteger(game?.minuto,130);
  if (minute == null || minute === 0) return "";
  const injuryTime=clockInteger(game?.acrescimos,30);
  const acceptsInjuryTime=[45,90,105,120].includes(minute);
  return injuryTime && acceptsInjuryTime ? `${minute}+${injuryTime}` : String(minute);
}
