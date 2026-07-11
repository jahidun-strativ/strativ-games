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

export type PosterData = {
  variant: "full" | "vs" | "squad";
  kindLabel: string; // "Match day" · "Competitive" · "Round-robin"…
  teams: PosterTeam[];
  venue: string;
  when: string;
  sport?: string | null;
};

// Instagram / Facebook portrait feed size (4:5, 1080×1350) — the standard
// upload size for both. Type is scaled for this canvas so it reads at feed size.
export const POSTER_SIZE = { width: 1080, height: 1350 };

// Per-team accent colours (burnt → pitch → sky → gold), cycled.
const ACCENTS = ["#f97316", "#10b981", "#38bdf8", "#f5b81f"];

const INK_900 = "#f3f6fb";
const INK_500 = "#8a96a7";
const INK_700 = "#c4cedb";
const BASE = "#080b11";

// Faint diagonal turf pinstripes across the whole poster.
const TURF =
  "repeating-linear-gradient(118deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 2px, transparent 2px, transparent 46px)";

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
            STRATIV GAME
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

function MetaChips({ venue, when }: { venue: string; when: string }) {
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
      {chip("🗓", when)}
      {chip("📍", venue)}
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
    // are 3 teams so a full round-robin still fits.
    const compact = teams.length >= 3;
    body = (
      <div style={{ display: "flex", flex: 1, width: "100%", alignItems: "stretch" }}>
        {teams.map((t, i) => (
          <TeamColumn key={i} team={t} accent={ACCENTS[i % ACCENTS.length]} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <PageShell>
      <Header kindLabel={kindLabel} sport={sport} />
      <div style={{ display: "flex", flex: 1, width: "100%", marginTop: 32, marginBottom: 30 }}>{body}</div>
      <div style={{ display: "flex", width: "100%", marginBottom: 26 }}>
        <MetaChips venue={venue} when={when} />
      </div>
      <Footer />
    </PageShell>
  );
}
