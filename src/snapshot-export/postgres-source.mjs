const WRITE_PRIVILEGES = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"];
const TABLES = ["public.jogos", "public.palpites"];

const GAMES_SQL = `select id_jogo, rodada, time_casa_id, time_casa, time_fora_id, time_fora,
  inicio, gols_casa, gols_fora, status
from public.jogos
where lower(status) in ('encerrado', 'finalizado')
  and gols_casa is not null and gols_fora is not null
order by rodada, inicio, id_jogo`;

const PREDICTIONS_SQL = `select p.id, p.id_jogo, p.user_id, p.gols_casa, p.gols_fora,
  p.criado_em, p.atualizado_em
from public.palpites p
join public.jogos j on j.id_jogo = p.id_jogo
where lower(j.status) in ('encerrado', 'finalizado')
  and j.gols_casa is not null and j.gols_fora is not null
order by p.id_jogo, p.user_id, p.id`;

export async function readPseudonymousOrigin(client, context) {
  let transaction = false;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    transaction = true;
    const readOnly = await client.query("show transaction_read_only");
    if (readOnly.rows?.[0]?.transaction_read_only !== "on") throw new Error("A transação não está em modo somente leitura");
    for (const table of TABLES) {
      const selected = await client.query("select has_table_privilege(current_user, $1, 'SELECT') as allowed", [table]);
      if (selected.rows?.[0]?.allowed !== true) throw new Error(`Credencial sem SELECT em ${table}`);
      for (const privilege of WRITE_PRIVILEGES) {
        const result = await client.query("select has_table_privilege(current_user, $1, $2) as allowed", [table, privilege]);
        if (result.rows?.[0]?.allowed === true) throw new Error(`Credencial possui ${privilege} em ${table}`);
      }
    }
    const games = (await client.query(GAMES_SQL)).rows;
    const predictions = (await client.query(PREDICTIONS_SQL)).rows;
    await client.query("commit");
    transaction = false;
    return {
      ...context,
      games: games.map((row) => ({
        id: row.id_jogo, round: row.rodada,
        homeTeamExternalRef: row.time_casa_id, homeTeamName: row.time_casa,
        awayTeamExternalRef: row.time_fora_id, awayTeamName: row.time_fora,
        kickoffAt: row.inicio, status: "encerrado", homeScore: row.gols_casa, awayScore: row.gols_fora,
      })),
      predictions: predictions.map((row) => ({
        id: row.id, gameId: row.id_jogo, participantKey: row.user_id,
        homeScore: row.gols_casa, awayScore: row.gols_fora,
        submittedAt: row.criado_em, updatedAt: row.atualizado_em,
      })),
    };
  } catch (error) {
    if (transaction) await client.query("rollback").catch(() => {});
    throw error;
  }
}

export const SOURCE_QUERY_CONTRACT = Object.freeze({ tables: TABLES, writePrivileges: WRITE_PRIVILEGES, gamesSql: GAMES_SQL, predictionsSql: PREDICTIONS_SQL });
