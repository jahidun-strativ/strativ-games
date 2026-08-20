// JSX for the match-day posters, rendered to PNG by next/og (Satori).
//
// Satori only supports flexbox + a subset of CSS (no grid), and every element
// with >1 child must set display:flex. It DOES support transforms (rotate/skew),
// multiple background gradients and box-shadow — which is what gives these a
// proper sports-poster vibe (angled colour bands, turf pinstripes, jersey-number
// line-ups, a dramatic VS). Keep all styling inline. Three variants:
//   • "full"  — every team in the slot with its full player list (internal
//               games / round-robins). All names, no status/sub labels.
//   • "vs"    — a dramatic split "A vs B" hero (competitive, where we may not
//               have the opponent's roster).
//   • "squad" — one team's line-up on its own (the Strativ team sheet).

export type PosterTeam = { name: string; players: string[] };

// One booked slot on the "fixtures" poster: a date badge plus where & when it's
// played (team names and session type are intentionally omitted).
export type PosterFixture = {
  weekday: string; // "SUN"
  day: string; // "26"
  month: string; // "JUL"
  time: string; // "3:30 PM"
  venue: string; // "Offside Mirpur, Dhaka"
};

export type PosterData =
  | {
      variant: "full" | "vs" | "squad";
      kindLabel: string; // "Match day" · "Competitive" · "Round-robin"…
      teams: PosterTeam[];
      // Omitted for a standalone team squad sheet (no match => no venue/kick-off).
      venue?: string;
      when?: string;
      sport?: string | null;
      // Set on a league matchday's line-up/team-sheet poster: swaps the header
      // for the gold season ribbon and tints the columns, so it's visibly a
      // league photo rather than a regular one.
      league?: { seasonName: string; matchday: string } | null;
    }
  | {
      // A league matchday: season branding ribbon + a gold VS hero.
      variant: "league";
      seasonName: string; // "Strativ Futsal League Season 1"
      matchday: string; // "Matchday 3"
      teams: PosterTeam[]; // [home, away] (names used; players optional)
      venue: string;
      when: string;
      sport?: string | null;
    }
  | {
      // A schedule of every upcoming slot in one image.
      variant: "fixtures";
      kindLabel: string; // headline, e.g. "Upcoming"
      subtitle?: string | null; // "5 sessions · 15 games"
      fixtures: PosterFixture[];
      sport?: string | null;
    };

// Fixed feed width (Instagram / Facebook portrait). The HEIGHT is computed from
// the content (see posterHeight) so the canvas hugs the line-ups instead of
// leaving dead space below a short squad.
export const POSTER_WIDTH = 1080;

// Estimate the canvas height so the columns fill it with little/no dead space.
// The "chrome" (header + meta + footer + padding) is roughly constant; the team
// columns grow with the longest line-up. We slightly overestimate on purpose —
// a few px of breathing room at the bottom beats clipping a player's name.
export function posterHeight(data: PosterData): number {
  // The fixtures schedule stacks one card per slot; its height grows with the
  // number of slots (and the tallest team line inside each).
  if (data.variant === "fixtures") {
    const cardsH = data.fixtures.length * FIXTURE_CARD_HEIGHT;
    const gaps = Math.max(0, data.fixtures.length - 1) * FIXTURE_GAP;
    // padding(112) + header(150) + subtitle(46) + body margins(62) + footer(24).
    const chrome = 394;
    return Math.max(720, Math.round(chrome + cardsH + gaps));
  }
  // The "vs" and "league" heroes have no line-ups; keep them tall & centred.
  if (data.variant === "vs" || data.variant === "league") return 1080;

  const compact = data.teams.length >= 3;
  const maxPlayers = Math.max(1, ...data.teams.map((t) => t.players.length));

  const rowH = compact ? 44 : 53; // one player row incl. its bottom margin
  const teamHeaderH = compact ? 104 : 120; // accent band with team name
  const listPadV = compact ? 32 : 40; // line-up top + bottom padding
  const bodyH = teamHeaderH + listPadV + maxPlayers * rowH;

  // padding(112) + header(150) + body margins(62) + meta(48+26) + footer(24).
  // The league ribbon header is ~90px taller than the regular headline.
  const chrome = 422 + (data.league ? 96 : 0);
  return Math.max(640, Math.round(chrome + bodyH));
}

// Per-team accent colours (burnt → pitch → sky → gold), cycled.
const ACCENTS = ["#f97316", "#10b981", "#38bdf8", "#f5b81f"];
// Gold-leaning accents for league photos, to set them apart from regular ones.
const LEAGUE_ACCENTS = ["#f5b81f", "#f97316", "#fb8b4c", "#f5cf6b"];

const INK_900 = "#f3f6fb";
const INK_500 = "#8a96a7";
const INK_700 = "#c4cedb";
const BASE = "#080b11";

// Faint diagonal turf pinstripes across the whole poster.
const TURF =
  "repeating-linear-gradient(118deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 2px, transparent 2px, transparent 46px)";

// Vertical gap between fixture cards on the schedule poster.
const FIXTURE_GAP = 16;

// Fixed height of one fixture card (date badge · session type · time · venue).
const FIXTURE_CARD_HEIGHT = 150;

function Monogram({ size = 46 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: "linear-gradient(180deg,#182238,#0a0e15)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Oswald",
        fontWeight: 700,
        fontSize: size * 0.6,
        letterSpacing: -1.5,
      }}
    >
      <span style={{ color: "#f97316" }}>S</span>
      <span style={{ color: "#ffffff" }}>G</span>
    </div>
  );
}

// Bold match-day header: brand row + big headline + chevron accent.
function Header({ kindLabel, sport }: { kindLabel: string; sport?: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Monogram size={46} />
          <div
            style={{
              display: "flex",
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: 27,
              letterSpacing: 2,
              color: INK_900,
              marginLeft: 14,
            }}
          >
            STRATIV GAMES
          </div>
        </div>
        {sport ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: INK_700,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              padding: "6px 16px",
            }}
          >
            {sport}
          </div>
        ) : null}
      </div>

      {/* Headline */}
      <div style={{ display: "flex", alignItems: "flex-start", marginTop: 26 }}>
        <div
          style={{
            display: "flex",
            width: 9,
            alignSelf: "stretch",
            borderRadius: 5,
            marginRight: 18,
            marginTop: 4,
            marginBottom: 4,
            background: "linear-gradient(180deg,#f97316,#f5b81f)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: 74,
            lineHeight: 0.92,
            letterSpacing: -1,
            textTransform: "uppercase",
            color: INK_900,
          }}
        >
          {kindLabel}
        </div>
      </div>
    </div>
  );
}

// League matchday header: brand row + a gold season ribbon with the matchday.
function LeagueBanner({
  seasonName,
  matchday,
  sport,
}: {
  seasonName: string;
  matchday: string;
  sport?: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Monogram size={46} />
          <div
            style={{
              display: "flex",
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: 27,
              letterSpacing: 2,
              color: INK_900,
              marginLeft: 14,
            }}
          >
            STRATIV GAMES
          </div>
        </div>
        {sport ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: INK_700,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              padding: "6px 16px",
            }}
          >
            {sport}
          </div>
        ) : null}
      </div>

      {/* Gold season ribbon */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 26,
          padding: "22px 28px",
          borderRadius: 18,
          background: "linear-gradient(120deg, rgba(245,184,31,0.22), rgba(249,115,22,0.08))",
          border: "1px solid rgba(245,184,31,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: "Archivo",
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#f5cf6b",
          }}
        >
          🏆 League Matchday
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: -1,
            color: INK_900,
          }}
        >
          {seasonName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontFamily: "Oswald",
            fontWeight: 600,
            fontSize: 30,
            color: "#fb8b4c",
          }}
        >
          {matchday}
        </div>
      </div>
    </div>
  );
}

function MetaChips({ venue, when }: { venue?: string; when?: string }) {
  const chip = (icon: string, text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "12px 20px",
        fontFamily: "Archivo",
        fontWeight: 600,
        fontSize: 20,
        color: INK_700,
        marginRight: 12,
      }}
    >
      <span style={{ marginRight: 10 }}>{icon}</span>
      {text}
    </div>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: "100%" }}>
      {when ? chip("🗓", when) : null}
      {venue ? chip("📍", venue) : null}
    </div>
  );
}

function Footer() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div
        style={{
          display: "flex",
          fontFamily: "Oswald",
          fontWeight: 500,
          fontSize: 17,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: INK_500,
        }}
      >
        Strativ Sports Manager
      </div>
      <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 600, fontSize: 17, color: "#fb8b4c" }}>
        strativ.se
      </div>
    </div>
  );
}

// Jersey-style number badge (line-up ordering, sports team-sheet look).
function NumberBadge({ n, accent, size }: { n: number; accent: string; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: accent,
        boxShadow: `0 4px 12px ${accent}55`,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Oswald",
        fontWeight: 700,
        fontSize: size * 0.52,
        color: BASE,
        marginRight: 14,
      }}
    >
      {n}
    </div>
  );
}

// One team column: angled accent header + jersey-numbered line-up.
function TeamColumn({ team, accent, compact }: { team: PosterTeam; accent: string; compact: boolean }) {
  const nameSize = compact ? 34 : 44;
  const playerSize = compact ? 22 : 26;
  const badge = compact ? 34 : 40;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        overflow: "hidden",
        marginRight: 18,
      }}
    >
      {/* Angled colour band header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: compact ? "20px 22px 18px" : "24px 26px 20px",
          background: `linear-gradient(120deg, ${accent} 0%, ${accent}00 78%)`,
          borderBottom: `3px solid ${accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: nameSize,
            textTransform: "uppercase",
            letterSpacing: -0.5,
            color: INK_900,
            lineHeight: 1,
          }}
        >
          {team.name}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Archivo",
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.85)",
            marginTop: 8,
          }}
        >
          Line-up · {team.players.length} player{team.players.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Line-up */}
      <div style={{ display: "flex", flexDirection: "column", padding: compact ? "16px 22px" : "20px 26px" }}>
        {team.players.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: playerSize,
              color: INK_700,
              marginBottom: compact ? 9 : 12,
            }}
          >
            <NumberBadge n={i + 1} accent={accent} size={badge} />
            {p}
          </div>
        ))}
        {team.players.length === 0 ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Archivo",
              fontStyle: "italic",
              fontSize: playerSize,
              color: INK_500,
            }}
          >
            Squad to be confirmed
          </div>
        ) : null}
      </div>
    </div>
  );
}

// One slot on the schedule poster: an accent date badge beside the session
// type, kick-off time and venue. Team names are intentionally left off.
function FixtureCard({ fx, accent, mb }: { fx: PosterFixture; accent: string; mb: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: FIXTURE_CARD_HEIGHT,
        marginBottom: mb,
        alignItems: "stretch",
        background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      {/* Accent date badge */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          width: 128,
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(160deg, ${accent} 0%, ${accent}22 100%)`,
          borderRight: `3px solid ${accent}`,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 600, fontSize: 17, letterSpacing: 2, color: "rgba(255,255,255,0.88)" }}>
          {fx.weekday}
        </div>
        <div style={{ display: "flex", fontFamily: "Oswald", fontWeight: 700, fontSize: 62, lineHeight: 1, color: "#ffffff" }}>
          {fx.day}
        </div>
        <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 600, fontSize: 17, letterSpacing: 2, color: "rgba(255,255,255,0.88)" }}>
          {fx.month}
        </div>
      </div>

      {/* Venue */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 28px" }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Archivo", fontWeight: 700, fontSize: 29, color: INK_900 }}>
          <span style={{ marginRight: 10 }}>📍</span>
          {fx.venue}
        </div>
      </div>

      {/* Kick-off time */}
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, alignItems: "flex-end", justifyContent: "center", padding: "0 28px" }}>
        <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 600, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: INK_500, marginBottom: 6 }}>
          Kick-off
        </div>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Oswald", fontWeight: 700, fontSize: 34, color: INK_900 }}>
          <span style={{ marginRight: 9 }}>🕒</span>
          {fx.time}
        </div>
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 56,
        background: `linear-gradient(160deg,#0d1420 0%,${BASE} 60%,${BASE} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Turf pinstripes */}
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: TURF }} />
      {/* Angled burnt band, top-right */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -260,
          right: -280,
          width: 900,
          height: 460,
          background: "linear-gradient(90deg,rgba(249,115,22,0),rgba(249,115,22,0.28))",
          transform: "rotate(-16deg)",
        }}
      />
      {/* Angled pitch band, bottom-left */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -300,
          left: -280,
          width: 900,
          height: 460,
          background: "linear-gradient(90deg,rgba(16,185,129,0.20),rgba(16,185,129,0))",
          transform: "rotate(-16deg)",
        }}
      />
      {/* Ambient glow */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -160,
          right: -120,
          width: 520,
          height: 520,
          borderRadius: 260,
          background: "radial-gradient(circle,rgba(249,115,22,0.28),rgba(249,115,22,0) 70%)",
        }}
      />
      {/* Centre-circle pitch motif */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -280,
          left: "50%",
          marginLeft: -320,
          width: 640,
          height: 640,
          borderRadius: 320,
          border: "3px solid rgba(255,255,255,0.05)",
        }}
      />
      {children}
    </div>
  );
}

export function Poster(data: PosterData) {
  // Schedule poster: a stack of date-badged slot cards. Handled first so the
  // match-only fields (teams/venue/when) never need to exist on this variant.
  if (data.variant === "fixtures") {
    const { fixtures, kindLabel, subtitle, sport } = data;
    return (
      <PageShell>
        <Header kindLabel={kindLabel} sport={sport} />
        {subtitle ? (
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: 0.5,
              color: INK_700,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", marginTop: 26, marginBottom: 28 }}>
          {fixtures.length === 0 ? (
            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Archivo",
                fontStyle: "italic",
                fontSize: 28,
                color: INK_500,
              }}
            >
              No upcoming fixtures scheduled.
            </div>
          ) : (
            fixtures.map((fx, i) => (
              <FixtureCard
                key={i}
                fx={fx}
                accent={ACCENTS[i % ACCENTS.length]}
                mb={i === fixtures.length - 1 ? 0 : FIXTURE_GAP}
              />
            ))
          )}
        </div>
        <Footer />
      </PageShell>
    );
  }

  // League matchday: gold-themed VS hero under a season ribbon.
  if (data.variant === "league") {
    const { seasonName, matchday, teams, venue, when, sport } = data;
    const home = teams[0] ?? { name: "TBD", players: [] };
    const away = teams[1] ?? { name: "TBD", players: [] };
    const side = (name: string, accent: string) => (
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 58,
            height: 58,
            borderRadius: 16,
            background: accent,
            boxShadow: `0 8px 22px ${accent}66`,
            marginBottom: 26,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: 60,
            textTransform: "uppercase",
            letterSpacing: -1,
            color: INK_900,
            textAlign: "center",
            lineHeight: 0.95,
            justifyContent: "center",
          }}
        >
          {name}
        </div>
      </div>
    );
    return (
      <PageShell>
        <LeagueBanner seasonName={seasonName} matchday={matchday} sport={sport} />
        <div style={{ display: "flex", flex: 1, width: "100%", marginTop: 28, marginBottom: 30 }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "stretch",
              justifyContent: "center",
              width: "100%",
              position: "relative",
              overflow: "hidden",
              borderRadius: 24,
              border: "1px solid rgba(245,184,31,0.25)",
              background: "linear-gradient(180deg,rgba(245,184,31,0.06),rgba(255,255,255,0.015))",
            }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: -80,
                left: -160,
                width: "62%",
                height: 1500,
                background: "linear-gradient(180deg,rgba(249,115,22,0.22),rgba(249,115,22,0.04))",
                transform: "skewX(-11deg)",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: -80,
                right: -160,
                width: "62%",
                height: 1500,
                background: "linear-gradient(180deg,rgba(245,184,31,0.22),rgba(245,184,31,0.04))",
                transform: "skewX(-11deg)",
              }}
            />
            {side(home.name, ACCENTS[0])}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 128,
                height: 128,
                marginLeft: -64,
                marginTop: -64,
                borderRadius: 64,
                background: `linear-gradient(150deg,${BASE},#241c0a)`,
                border: "3px solid rgba(245,184,31,0.45)",
                boxShadow: "0 12px 34px rgba(0,0,0,0.55)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "Oswald",
                  fontWeight: 700,
                  fontSize: 60,
                  color: "#f5cf6b",
                  lineHeight: 1,
                }}
              >
                VS
              </div>
            </div>
            {side(away.name, ACCENTS[3])}
          </div>
        </div>
        <div style={{ display: "flex", width: "100%", marginBottom: 26 }}>
          <MetaChips venue={venue} when={when} />
        </div>
        <Footer />
      </PageShell>
    );
  }

  const { variant, kindLabel, teams, venue, when, sport } = data;

  let body: React.ReactNode;

  if (variant === "vs") {
    const home = teams[0] ?? { name: "TBD", players: [] };
    const away = teams[1] ?? { name: "TBD", players: [] };
    const side = (name: string, accent: string) => (
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 58,
            height: 58,
            borderRadius: 16,
            background: accent,
            boxShadow: `0 8px 22px ${accent}66`,
            marginBottom: 26,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: 60,
            textTransform: "uppercase",
            letterSpacing: -1,
            color: INK_900,
            textAlign: "center",
            lineHeight: 0.95,
            justifyContent: "center",
          }}
        >
          {name}
        </div>
      </div>
    );
    body = (
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "stretch",
          justifyContent: "center",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))",
        }}
      >
        {/* Angled split panels */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -80,
            left: -160,
            width: "62%",
            height: 1500,
            background: "linear-gradient(180deg,rgba(249,115,22,0.20),rgba(249,115,22,0.04))",
            transform: "skewX(-11deg)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -80,
            right: -160,
            width: "62%",
            height: 1500,
            background: "linear-gradient(180deg,rgba(56,189,248,0.20),rgba(56,189,248,0.04))",
            transform: "skewX(-11deg)",
          }}
        />
        {side(home.name, ACCENTS[0])}
        {/* VS badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 128,
            height: 128,
            marginLeft: -64,
            marginTop: -64,
            borderRadius: 64,
            background: `linear-gradient(150deg,${BASE},#141d2e)`,
            border: "3px solid rgba(255,255,255,0.14)",
            boxShadow: "0 12px 34px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: 60,
              color: "#fb8b4c",
              lineHeight: 1,
            }}
          >
            VS
          </div>
        </div>
        {side(away.name, ACCENTS[2])}
      </div>
    );
  } else {
    // "full" (all teams) or "squad" (single team). Columns shrink when there
    // are 3 teams so a full round-robin still fits. League photos use the gold
    // accent set so they read differently from a regular line-up.
    const compact = teams.length >= 3;
    const accents = data.league ? LEAGUE_ACCENTS : ACCENTS;
    body = (
      <div style={{ display: "flex", flex: 1, width: "100%", alignItems: "stretch" }}>
        {teams.map((t, i) => (
          <TeamColumn key={i} team={t} accent={accents[i % accents.length]} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <PageShell>
      {data.league ? (
        <LeagueBanner
          seasonName={data.league.seasonName}
          matchday={data.league.matchday}
          sport={sport}
        />
      ) : (
        <Header kindLabel={kindLabel} sport={sport} />
      )}
      <div style={{ display: "flex", flex: 1, width: "100%", marginTop: 32, marginBottom: 30 }}>{body}</div>
      {venue || when ? (
        <div style={{ display: "flex", width: "100%", marginBottom: 26 }}>
          <MetaChips venue={venue} when={when} />
        </div>
      ) : null}
      <Footer />
    </PageShell>
  );
}
