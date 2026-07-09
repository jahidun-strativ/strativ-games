import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const db = drizzle(neon(url), { schema });

const { sports, teams, players, staff, venues, matches, playerMatchStats, lineups, lineupSlots } =
  schema;

function daysFromNow(days: number, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const existing = await db.select().from(sports).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded — skipping. (Truncate tables to re-seed.)");
    return;
  }

  console.log("Seeding sports…");
  const [football, futsal] = await db
    .insert(sports)
    .values([
      {
        name: "Football",
        shortName: "FTB",
        color: "#2E6B34",
        description: "11-a-side association football.",
      },
      {
        name: "Futsal",
        shortName: "FUT",
        color: "#E8630A",
        description: "5-a-side indoor football, fast and technical.",
      },
    ])
    .returning();

  console.log("Seeding venues…");
  const venueRows = await db
    .insert(venues)
    .values([
      { name: "Strativ Arena", address: "Storgatan 12", city: "Stockholm", capacity: 4500, notes: "Home ground. Floodlights until 22:00." },
      { name: "Riverside Park Pitch 2", address: "Åkanten 3", city: "Stockholm", capacity: 800, notes: "Grass pitch, book min. 1 week ahead." },
      { name: "Idrottshallen Väst", address: "Västra vägen 44", city: "Solna", capacity: 1200, notes: "Indoor hall for futsal. Court shoes only." },
      { name: "Nordic Dome", address: "Kupolvägen 1", city: "Uppsala", capacity: 3000, notes: "All-weather dome, artificial turf." },
      { name: "Gamla Stadion", address: "Idrottsgatan 9", city: "Stockholm", capacity: 6200, notes: "Classic 1950s stadium. Cup finals venue." },
    ])
    .returning();

  console.log("Seeding teams…");
  const [aurora, borealis, comet, dynamo, polar] = await db
    .insert(teams)
    .values([
      { sportId: football.id, name: "Aurora FC", league: "Division 2 Norra", formation: "4-3-3", stadium: "Strativ Arena" },
      { sportId: football.id, name: "Borealis United", league: "Division 2 Norra", formation: "4-4-2", stadium: "Gamla Stadion" },
      { sportId: football.id, name: "Comet Rovers", league: "Division 2 Norra", formation: "3-5-2", stadium: "Nordic Dome" },
      { sportId: futsal.id, name: "Dynamo Indoor", league: "Futsalligan", formation: "1-2-1", stadium: "Idrottshallen Väst" },
      { sportId: futsal.id, name: "Polar Five", league: "Futsalligan", formation: "1-2-1", stadium: "Idrottshallen Väst" },
    ])
    .returning();

  console.log("Seeding players…");
  const footballPositions: [string, string][] = [
    ["GK", "Goalkeeper"], ["RB", "Defender"], ["CB", "Defender"], ["CB", "Defender"],
    ["LB", "Defender"], ["CM", "Midfielder"], ["CM", "Midfielder"], ["AM", "Midfielder"],
    ["RW", "Forward"], ["ST", "Forward"], ["LW", "Forward"], ["GK", "Goalkeeper"], ["CB", "Defender"],
  ];
  const rosterNames: Record<string, string[]> = {
    [aurora.id]: ["Mika Torres", "Elias Berg", "Jonas Lindqvist", "Sam Okafor", "Leo Nyström", "Adam Holm", "Noel Karlsson", "Rafael Costa", "Oskar Ek", "Viktor Sund", "Danny Osei", "Hugo Palm", "Aron Blom"],
    [borealis.id]: ["Kasper Falk", "Emil Ström", "Ali Reza", "Marcus Vinter", "Tobias Lund", "Ivan Petrov", "Sebastian Roos", "Felix Örn", "Anton Dahl", "Youssef Amin", "Nils Wik", "Otto Frisk", "Liam Sjö"],
    [comet.id]: ["Aarav Shah", "Benji Holt", "Carl Munk", "David Ek", "Elton Brand", "Filip Sten", "Gabriel Toma", "Henrik Ås", "Isak Norr", "Johan Pil", "Kian Reyes", "Ludde Hav", "Melvin Torp"],
  };

  const playerRows: (typeof players.$inferInsert)[] = [];
  for (const team of [aurora, borealis, comet]) {
    rosterNames[team.id].forEach((name, i) => {
      const [pos] = footballPositions[i % footballPositions.length];
      playerRows.push({
        sportId: football.id,
        teamId: team.id,
        name,
        position: pos,
        squadNumber: i + 1,
        status: "active",
      });
    });
  }
  const futsalPositions = ["GK", "DEF", "WING", "WING", "PIVOT", "DEF", "GK"];
  const futsalRosters: [typeof dynamo, string[]][] = [
    [dynamo, ["Pelle Vind", "Rico Salas", "Tim Frost", "Zlatan Miro", "Kim Asp", "Bo Lager", "Aziz Farah"]],
    [polar, ["Nino Berg", "Sasha Kron", "Teo Malm", "Erik Dyn", "Omar Silva", "Jens Ulv", "Max Iber"]],
  ];
  for (const [team, names] of futsalRosters) {
    names.forEach((name, i) =>
      playerRows.push({
        sportId: futsal.id,
        teamId: team.id,
        name,
        position: futsalPositions[i],
        squadNumber: i + 1,
        status: "active",
      }),
    );
  }
  const allPlayers = await db.insert(players).values(playerRows).returning();

  console.log("Seeding staff…");
  await db.insert(staff).values([
    { sportId: football.id, teamId: aurora.id, name: "Lena Ortiz", role: "Head Coach", department: "Technical" },
    { sportId: football.id, teamId: aurora.id, name: "Nico Reed", role: "Physiotherapist", department: "Medical" },
    { sportId: football.id, teamId: borealis.id, name: "Greta Vall", role: "Head Coach", department: "Technical" },
    { sportId: football.id, teamId: comet.id, name: "Stefan Bruk", role: "Head Coach", department: "Technical" },
    { sportId: football.id, teamId: null, name: "Maja Lindell", role: "Club Secretary", department: "Administration" },
    { sportId: futsal.id, teamId: dynamo.id, name: "Tomas Hed", role: "Head Coach", department: "Technical" },
  ]);

  console.log("Seeding matches…");
  const byTeam = (teamId: string) => allPlayers.filter((p) => p.teamId === teamId);
  const completedDefs = [
    { home: aurora, away: borealis, venue: venueRows[0], days: -28, hs: 2, as: 1 },
    { home: comet, away: aurora, venue: venueRows[3], days: -21, hs: 0, as: 3 },
    { home: borealis, away: comet, venue: venueRows[4], days: -14, hs: 2, as: 2 },
    { home: aurora, away: comet, venue: venueRows[0], days: -10, hs: 1, as: 0 },
    { home: borealis, away: aurora, venue: venueRows[4], days: -7, hs: 1, as: 1 },
    { home: comet, away: borealis, venue: venueRows[3], days: -3, hs: 3, as: 1 },
  ];

  for (const def of completedDefs) {
    const [match] = await db
      .insert(matches)
      .values({
        sportId: football.id,
        homeTeamId: def.home.id,
        awayTeamId: def.away.id,
        venueId: def.venue.id,
        kickoffAt: daysFromNow(def.days),
        status: "completed",
        homeScore: def.hs,
        awayScore: def.as,
      })
      .returning();

    // Attribute goals to attacking players (last few in each roster), one assist each where sensible.
    const statRows: (typeof playerMatchStats.$inferInsert)[] = [];
    const distribute = (squad: typeof allPlayers, goals: number) => {
      const attackers = squad.slice(8, 11);
      const mids = squad.slice(5, 8);
      for (let g = 0; g < goals; g++) {
        const scorer = attackers[g % attackers.length];
        const assister = mids[g % mids.length];
        const existingScorer = statRows.find((r) => r.playerId === scorer.id);
        if (existingScorer) existingScorer.goals = (existingScorer.goals ?? 0) + 1;
        else statRows.push({ matchId: match.id, playerId: scorer.id, goals: 1, assists: 0 });
        const existingAssister = statRows.find((r) => r.playerId === assister.id);
        if (existingAssister) existingAssister.assists = (existingAssister.assists ?? 0) + 1;
        else statRows.push({ matchId: match.id, playerId: assister.id, goals: 0, assists: 1 });
      }
      // Everyone in the starting 11 gets an appearance.
      for (const p of squad.slice(0, 11)) {
        if (!statRows.find((r) => r.playerId === p.id)) {
          statRows.push({ matchId: match.id, playerId: p.id, goals: 0, assists: 0 });
        }
      }
    };
    distribute(byTeam(def.home.id), def.hs);
    distribute(byTeam(def.away.id), def.as);
    await db.insert(playerMatchStats).values(statRows);
  }

  const upcomingDefs = [
    { home: aurora, away: comet, venue: venueRows[1], days: 3, sport: football },
    { home: borealis, away: aurora, venue: venueRows[4], days: 7, sport: football },
    { home: comet, away: borealis, venue: venueRows[3], days: 12, sport: football },
    { home: dynamo, away: polar, venue: venueRows[2], days: 5, sport: futsal },
  ];
  for (const def of upcomingDefs) {
    await db.insert(matches).values({
      sportId: def.sport.id,
      homeTeamId: def.home.id,
      awayTeamId: def.away.id,
      venueId: def.venue.id,
      kickoffAt: daysFromNow(def.days, def.sport.id === futsal.id ? 20 : 15),
      status: "scheduled",
      notes: def.sport.id === futsal.id ? "Internal training match" : null,
    });
  }

  console.log("Seeding a saved lineup for Aurora FC…");
  const [lineup] = await db
    .insert(lineups)
    .values({ teamId: aurora.id, formation: "4-3-3" })
    .returning();
  const auroraSquad = byTeam(aurora.id);
  const labels433 = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"];
  await db.insert(lineupSlots).values(
    labels433.map((label, i) => ({
      lineupId: lineup.id,
      slotIndex: i,
      positionLabel: label,
      playerId: auroraSquad[i]?.id ?? null,
    })),
  );

  console.log("Done. Seeded 2 sports, 4 teams, %d players, 6 staff, 5 venues, 10 matches.", allPlayers.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
