/**
 * Motor de cálculo de clasificados a eliminatorias.
 * 12 grupos → 2 primeros (24) + 8 mejores terceros = 32 equipos.
 */
import { getFifaRank } from './fifaRanking.js';

export function calculateKnockoutTeams(allStandings) {
  const groupWinners   = [];
  const groupRunnersUp = [];
  const allThirds      = [];

  allStandings.forEach((standings, group) => {
    const sorted = [...standings].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg  !== a.dg)  return b.dg  - a.dg;
      if (b.gf  !== a.gf)  return b.gf  - a.gf;
      return a.name.localeCompare(b.name);
    });
    if (sorted[0]) groupWinners.push({   group, team: sorted[0], rank: 1 });
    if (sorted[1]) groupRunnersUp.push({ group, team: sorted[1], rank: 2 });
    if (sorted[2]) allThirds.push({      group, team: sorted[2], rank: 3 });
  });

  // Tabla paralela de terceros: pts → dg → gf → ranking FIFA
  const sortedThirds = [...allThirds].sort((a, b) => {
    const ta = a.team, tb = b.team;
    if (tb.pts !== ta.pts) return tb.pts - ta.pts;
    if (tb.dg  !== ta.dg)  return tb.dg  - ta.dg;
    if (tb.gf  !== ta.gf)  return tb.gf  - ta.gf;
    return getFifaRank(ta.name) - getFifaRank(tb.name);
  });

  const bestThirds = sortedThirds.slice(0, 8).map((t, i) => ({ ...t, thirdRank: i + 1 }));
  const bestThirdGroups = new Set(bestThirds.map(t => t.group));
  const allThirdsMarked = sortedThirds.map(t => ({
    ...t,
    qualified: bestThirdGroups.has(t.group)
  }));

  return { groupWinners, groupRunnersUp, bestThirds, allThirds: allThirdsMarked };
}

/**
 * Genera el bracket. Cada match tiene:
 *   matchId   {number}  – número global del partido (1-31)
 *   home/away {TeamSlot} – { name, code, isKnown }
 */
export function generateBracket(knockoutTeams) {
  const { groupWinners, groupRunnersUp, bestThirds } = knockoutTeams;

  const winnerMap = new Map(groupWinners.map(w   => [w.group, w.team]));
  const runnerMap = new Map(groupRunnersUp.map(r => [r.group, r.team]));
  const thirdMap  = new Map(bestThirds.map(t     => [t.group, t.team]));

  const leftGroups  = ['A','B','C','D','E','F'];
  const rightGroups = ['G','H','I','J','K','L'];
  const leftThirds  = bestThirds.slice(0, 4);
  const rightThirds = bestThirds.slice(4, 8);

  function slot(team, pos, group) {
    if (team && team.pj > 0) {
      return { name: team.name, label: team.name, pos, group, isKnown: true };
    }
    return { name: null, label: `${pos}${group}`, pos, group, isKnown: false };
  }

  // ── Round of 32 (matches 1-16) ──────────────────────────
  const roundOf32 = [];
  let mid = 1;

  function addMatch(home, away) {
    roundOf32.push({ matchId: mid++, round: 'round_of_32', home, away });
  }

  // Izquierda: 1A×3ro, 2A×2B, 1C×3ro, 2C×2D, 1E×3ro, 2E×2F
  addMatch(slot(winnerMap.get('A'),'1','A'), slot(thirdMap.get(leftThirds[0]?.group),'3', leftThirds[0]?.group||'?'));
  addMatch(slot(runnerMap.get('A'),'2','A'), slot(runnerMap.get('B'),'2','B'));
  addMatch(slot(winnerMap.get('C'),'1','C'), slot(thirdMap.get(leftThirds[1]?.group),'3', leftThirds[1]?.group||'?'));
  addMatch(slot(runnerMap.get('C'),'2','C'), slot(runnerMap.get('D'),'2','D'));
  addMatch(slot(winnerMap.get('E'),'1','E'), slot(thirdMap.get(leftThirds[2]?.group),'3', leftThirds[2]?.group||'?'));
  addMatch(slot(runnerMap.get('E'),'2','E'), slot(runnerMap.get('F'),'2','F'));
  addMatch(slot(winnerMap.get('B'),'1','B'), slot(thirdMap.get(leftThirds[3]?.group),'3', leftThirds[3]?.group||'?'));
  addMatch(slot(runnerMap.get('F'),'2','F'), slot(winnerMap.get('D'),'1','D'));

  // Derecha: 1G×3ro, 2G×2H, 1I×3ro, 2I×2J, 1K×3ro, 2K×2L
  addMatch(slot(winnerMap.get('G'),'1','G'), slot(thirdMap.get(rightThirds[0]?.group),'3', rightThirds[0]?.group||'?'));
  addMatch(slot(runnerMap.get('G'),'2','G'), slot(runnerMap.get('H'),'2','H'));
  addMatch(slot(winnerMap.get('I'),'1','I'), slot(thirdMap.get(rightThirds[1]?.group),'3', rightThirds[1]?.group||'?'));
  addMatch(slot(runnerMap.get('I'),'2','I'), slot(runnerMap.get('J'),'2','J'));
  addMatch(slot(winnerMap.get('K'),'1','K'), slot(thirdMap.get(rightThirds[2]?.group),'3', rightThirds[2]?.group||'?'));
  addMatch(slot(runnerMap.get('K'),'2','K'), slot(runnerMap.get('L'),'2','L'));
  addMatch(slot(winnerMap.get('H'),'1','H'), slot(thirdMap.get(rightThirds[3]?.group),'3', rightThirds[3]?.group||'?'));
  addMatch(slot(runnerMap.get('J'),'2','J'), slot(winnerMap.get('L'),'1','L'));

  // ── Rondas siguientes con IDs cortos ─────────────────────
  let matchCounter = mid;

  function nextRound(prev, roundName) {
    const out = [];
    for (let i = 0; i < prev.length; i += 2) {
      const m1 = prev[i], m2 = prev[i + 1];
      if (!m1 || !m2) continue;
      out.push({
        matchId: matchCounter++,
        round: roundName,
        home: { label: `M${m1.matchId}`, name: null, isKnown: false, refId: m1.matchId },
        away: { label: `M${m2.matchId}`, name: null, isKnown: false, refId: m2.matchId }
      });
    }
    return out;
  }

  const roundOf16    = nextRound(roundOf32,   'round_of_16');
  const quarterFinal = nextRound(roundOf16,   'quarter_final');
  const semiFinal    = nextRound(quarterFinal,'semi_final');
  const final        = nextRound(semiFinal,   'final');

  return [
    { name: 'Round of 32',    shortName: 'R32',  matches: roundOf32    },
    { name: 'Round of 16',    shortName: 'R16',  matches: roundOf16    },
    { name: 'Cuartos',        shortName: 'QF',   matches: quarterFinal },
    { name: 'Semifinales',    shortName: 'SF',   matches: semiFinal    },
    { name: 'Final',          shortName: 'F',    matches: final        },
  ];
}

/**
 * Aplica resultados de rondas eliminatorias al bracket y propaga ganadores.
 * Modifica los rounds in-place y retorna el mapa de ganadores.
 */
export function applyKnockoutResults(rounds, koResults) {
  if (!koResults || Object.keys(koResults).length === 0) return;

  const winners = new Map(); // matchId → { name, label, isKnown: true }

  rounds.forEach(round => {
    round.matches.forEach(match => {
      const r = koResults[String(match.matchId)];
      if (!r) return;

      // Rellenar equipos desde resultado guardado
      if (r.homeTeam) match.home = { name: r.homeTeam, label: r.homeTeam, isKnown: true };
      if (r.awayTeam) match.away = { name: r.awayTeam, label: r.awayTeam, isKnown: true };
      match.result = r;

      // Determinar ganador
      if (r.homeGoals !== null && r.awayGoals !== null && r.homeTeam && r.awayTeam) {
        let winnerName;
        if (r.homeGoals > r.awayGoals)       winnerName = r.homeTeam;
        else if (r.awayGoals > r.homeGoals)  winnerName = r.awayTeam;
        else if (r.penWinner === 'home')      winnerName = r.homeTeam;
        else if (r.penWinner === 'away')      winnerName = r.awayTeam;
        else                                  winnerName = r.homeTeam;
        winners.set(match.matchId, { name: winnerName, label: winnerName, isKnown: true });
      }
    });
  });

  // Propagar ganadores a la siguiente ronda
  rounds.forEach((round, ri) => {
    const next = rounds[ri + 1];
    if (!next) return;
    next.matches.forEach(nm => {
      if (nm.home?.refId !== undefined && winners.has(nm.home.refId))
        nm.home = { ...winners.get(nm.home.refId) };
      if (nm.away?.refId !== undefined && winners.has(nm.away.refId))
        nm.away = { ...winners.get(nm.away.refId) };
    });
  });
}
