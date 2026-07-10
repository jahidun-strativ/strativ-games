// JSX for the match-day posters, rendered to PNG by next/og (Satori).
//
// Satori only supports flexbox + a subset of CSS (no grid, no gap on some
// versions — we use margins), and every element with >1 child must set
// display:flex. Keep all styling inline. Three variants:
//   • "full"  — every team in the slot with its full player list (internal
//               games / round-robins). All names, no status/sub labels.
//   • "vs"    — a bold "A vs B" hero (used for competitive, where we may not
//               have the opponent's roster).
//   • "squad" — one team's roster on its own (the Strativ team list).

export type PosterTeam = { name: string; players: string[] };

export type PosterData = {
  variant: "full" | "vs" | "squad";
  kindLabel: string; // "Match day" · "Competitive" · "Round-robin"…
  teams: PosterTeam[];
  venue: string;
  when: string;
  sport?: string | null;
};

export const POSTER_SIZE = { width: 1080, height: 1350 };

// Per-team accent colours (burnt → pitch → sky → gold), cycled.
const ACCENTS = ["#f97316", "#10b981", "#38bdf8", "#f5b81f"];

const INK_900 = "#f3f6fb";
const INK_500 = "#8a96a7";
const INK_700 = "#c4cedb";

function Monogram() {
  return (
    <div
      style={{
        display: "flex",
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "linear-gradient(180deg,#141d2e,#0a0e15)",
        border: "1px solid rgba(255,255,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Oswald",
        fontWeight: 700,
        fontSize: 40,
        letterSpacing: -2,
      }}
    >
      <span style={{ color: "#f97316" }}>S</span>
      <span style={{ color: "#ffffff" }}>G</span>
    </div>
  );
}

function Header({ kindLabel }: { kindLabel: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Monogram />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 20 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: 46,
              letterSpacing: 2,
              color: INK_900,
              lineHeight: 1,
            }}
          >
            STRATIV GAME
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#fb8b4c",
              marginTop: 8,
            }}
          >
            {kindLabel}
          </div>
        </div>
      </div>
      {/* Brand accent bar */}
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          marginTop: 28,
          background: "linear-gradient(90deg,#f97316,#f5b81f 40%,#10b981 72%,#38bdf8)",
        }}
      />
    </div>
  );
}

function MetaChips({ venue, when, sport }: { venue: string; when: string; sport?: string | null }) {
  const chip = (icon: string, text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 999,
        padding: "14px 24px",
        fontFamily: "Archivo",
        fontWeight: 600,
        fontSize: 26,
        color: INK_700,
        marginRight: 16,
        marginTop: 16,
      }}
    >
      <span style={{ marginRight: 12 }}>{icon}</span>
      {text}
    </div>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: "100%", justifyContent: "center" }}>
      {chip("🗓", when)}
      {chip("📍", venue)}
      {sport ? chip("⚽", sport) : null}
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Oswald",
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: INK_500,
        }}
      >
        Strativ Sports Manager
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo",
          fontWeight: 600,
          fontSize: 22,
          color: "#fb8b4c",
        }}
      >
        strativ.se
      </div>
    </div>
  );
}

// One team column: accent-topped card with a name header and the player list.
function TeamColumn({
  team,
  accent,
  compact,
}: {
  team: PosterTeam;
  accent: string;
  compact: boolean;
}) {
  const nameSize = compact ? 40 : 52;
  const playerSize = compact ? 27 : 32;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderTop: `6px solid ${accent}`,
        borderRadius: 20,
        padding: compact ? 24 : 32,
        marginRight: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Oswald",
          fontWeight: 700,
          fontSize: nameSize,
          color: INK_900,
          lineHeight: 1.05,
          marginBottom: 6,
        }}
      >
        {team.name}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo",
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: accent,
          marginBottom: 20,
        }}
      >
        {team.players.length} player{team.players.length === 1 ? "" : "s"}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {team.players.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Archivo",
              fontWeight: 400,
              fontSize: playerSize,
              color: INK_700,
              marginBottom: compact ? 10 : 14,
            }}
          >
            <span
              style={{
                display: "flex",
                width: 8,
                height: 8,
                borderRadius: 4,
                background: accent,
                marginRight: 16,
              }}
            />
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 64,
        background: "linear-gradient(180deg,#0c1119 0%,#0a0e15 55%,#0a0e15 100%)",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -220,
          right: -160,
          width: 620,
          height: 620,
          borderRadius: 320,
          background: "radial-gradient(circle,rgba(249,115,22,0.22),rgba(249,115,22,0) 70%)",
        }}
      />
      {/* Centre-circle pitch motif */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -260,
          left: "50%",
          marginLeft: -300,
          width: 600,
          height: 600,
          borderRadius: 300,
          border: "2px solid rgba(255,255,255,0.05)",
        }}
      />
      {children}
    </div>
  );
}

export function Poster(data: PosterData) {
  const { variant, kindLabel, teams, venue, when, sport } = data;

  let body: React.ReactNode;

  if (variant === "vs") {
    const [home, away] = [teams[0], teams[1] ?? { name: "TBD", players: [] }];
    const side = (name: string, accent: string) => (
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 24,
            height: 24,
            borderRadius: 12,
            background: accent,
            marginBottom: 28,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: 84,
            color: INK_900,
            textAlign: "center",
            lineHeight: 1,
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
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {side(home.name, ACCENTS[0])}
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontWeight: 700,
            fontSize: 120,
            color: "#fb8b4c",
            margin: "0 24px",
          }}
        >
          VS
        </div>
        {side(away.name, ACCENTS[2])}
      </div>
    );
  } else {
    // "full" (all teams) or "squad" (single team). Columns shrink when there
    // are 3 teams so a full round-robin still fits.
    const compact = teams.length >= 3;
    body = (
      <div
        style={{
          display: "flex",
          flex: 1,
          width: "100%",
          alignItems: "stretch",
          // negate the last column's right margin visually by padding the row
          paddingRight: 0,
        }}
      >
        {teams.map((t, i) => (
          <TeamColumn key={i} team={t} accent={ACCENTS[i % ACCENTS.length]} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <PageShell>
      <Header kindLabel={kindLabel} />
      <div style={{ display: "flex", flex: 1, width: "100%", marginTop: 40, marginBottom: 36 }}>
        {body}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <MetaChips venue={venue} when={when} sport={sport} />
      </div>
      <Footer />
    </PageShell>
  );
}
