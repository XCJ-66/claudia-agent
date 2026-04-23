import { useState, useEffect, useRef, useCallback } from "react";

// ── British TTS ──────────────────────────────────────────────────────────────

async function speak(text) {
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*_`#>-]+/g, " ").replace(/\s+/g, " ").trim();
  try {
    const res = await fetch("/api/tts-brian", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) });
    if (!res.ok) throw new Error("TTS failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = document.getElementById("honus-audio") || Object.assign(document.createElement("audio"), {id: "honus-audio"});
    document.body.contains(audio) || document.body.appendChild(audio);
    audio.src = url;
    audio.play().catch(e => console.log(e));
    return;
  } catch(err) { console.log(err); }
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "en-US";
  utter.rate = 0.85;
  utter.pitch = 0.7;
  // replaced by ElevenLabs
}
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 15000; // 30 seconds

function Diamond({ bases }) {
  // bases = { first, second, third }
  const active = "#ffdd00";
  const inactive = "rgba(255,255,255,0.1)";
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      {/* Second base (top) */}
      <rect x="32" y="4" width="16" height="16" rx="2"
        fill={bases?.second ? active : inactive}
        stroke={bases?.second ? active : "rgba(255,255,255,0.2)"} strokeWidth="1" transform="rotate(45 40 12)" />
      {/* Third base (left) */}
      <rect x="4" y="32" width="16" height="16" rx="2"
        fill={bases?.third ? active : inactive}
        stroke={bases?.third ? active : "rgba(255,255,255,0.2)"} strokeWidth="1" transform="rotate(45 12 40)" />
      {/* First base (right) */}
      <rect x="60" y="32" width="16" height="16" rx="2"
        fill={bases?.first ? active : inactive}
        stroke={bases?.first ? active : "rgba(255,255,255,0.2)"} strokeWidth="1" transform="rotate(45 68 40)" />
      {/* Home plate */}
      <polygon points="40,72 34,66 34,60 46,60 46,66"
        fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  );
}

function InningScoreboard({ innings, homeTeam, awayTeam }) {
  const maxInnings = Math.max(innings.length, 6);
  const displayInnings = Array.from({ length: maxInnings }, (_, i) => innings[i] || null);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, fontFamily: "monospace" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 12px", color: "#888", fontWeight: 400, minWidth: 100 }}>TEAM</th>
            {displayInnings.map((_, i) => (
              <th key={i} style={{ padding: "6px 10px", color: "#888", fontWeight: 400, textAlign: "center", minWidth: 32 }}>{i + 1}</th>
            ))}
            <th style={{ padding: "6px 10px", color: "#ffdd00", fontWeight: 700, textAlign: "center" }}>R</th>
            <th style={{ padding: "6px 10px", color: "#888", fontWeight: 400, textAlign: "center" }}>H</th>
            <th style={{ padding: "6px 10px", color: "#888", fontWeight: 400, textAlign: "center" }}>E</th>
          </tr>
        </thead>
        <tbody>
          {[awayTeam, homeTeam].map((team, ti) => (
            <tr key={ti} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <td style={{ padding: "8px 12px", color: "#f0f0f0", fontWeight: 600 }}>{team?.name || (ti === 0 ? "AWAY" : "HOME")}</td>
              {displayInnings.map((_, i) => (
                <td key={i} style={{ padding: "8px 10px", textAlign: "center", color: "#ccc" }}>
                  {team?.innings?.[i] ?? "-"}
                </td>
              ))}
              <td style={{ padding: "8px 10px", textAlign: "center", color: "#ffdd00", fontWeight: 700, fontSize: 15 }}>{team?.runs ?? 0}</td>
              <td style={{ padding: "8px 10px", textAlign: "center", color: "#ccc" }}>{team?.hits ?? 0}</td>
              <td style={{ padding: "8px 10px", textAlign: "center", color: "#ef4444" }}>{team?.errors ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GameTracker({ onBack }) {
  const [gcUrl, setGcUrl]         = useState("");
  const [inputUrl, setInputUrl]   = useState("");
  const [gameData, setGameData]   = useState(null);
  const [plays, setPlays]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tracking, setTracking]   = useState(false);
  const [muted, setMuted]         = useState(false);
  const intervalRef               = useRef(null);
  const prevPlaysRef              = useRef([]);

  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const fetchGame = useCallback(async (url) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gc-proxy?url=" + encodeURIComponent(url));
      if (!res.ok) throw new Error("Failed to fetch game data");
      const data = await res.json();

      // Check for new plays and announce them
      if (data.plays && prevPlaysRef.current.length > 0) {
        const newPlays = data.plays.slice(prevPlaysRef.current.length);
        if (newPlays.length > 0 && !muted) {
          newPlays.forEach(play => {
            setTimeout(() => speak(`New play: ${play.description}`), 500);
          });
        }
      }
      prevPlaysRef.current = data.plays || [];

      setGameData(data);
      setPlays(data.plays || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Could not load game data. Make sure the GameChanger URL is correct and the game is public.");
    }
    setLoading(false);
  }, [muted]);

  const startTracking = () => {
    if (!inputUrl.trim()) return;
    const url = inputUrl.trim();
    setGcUrl(url);
    setTracking(true);
    fetchGame(url);
    intervalRef.current = setInterval(() => fetchGame(url), REFRESH_INTERVAL);
    if (!muted) speak("Tracking started. I'll update you on the game every 30 seconds.");
  };

  const stopTracking = () => {
    setTracking(false);
    clearInterval(intervalRef.current);
    setGameData(null);
    setPlays([]);
    setGcUrl("");
    if (!muted) speak("Game tracking stopped.");
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Mock data for demo/testing when no real URL
  const useMockData = () => {
    const mock = {
      status: "In Progress",
      inning: 4,
      isTop: true,
      outs: 2,
      bases: { first: true, second: false, third: true },
      homeTeam: {
        name: "TIGERS",
        runs: 3, hits: 6, errors: 1,
        innings: [0, 1, 0, 2],
      },
      awayTeam: {
        name: "EAGLES",
        runs: 5, hits: 8, errors: 0,
        innings: [2, 0, 3, 0],
      },
      currentBatter: "J. Smith #12",
      currentPitcher: "M. Jones #7",
      plays: [
        { id: 1, description: "J. Smith singles to left field. R. Davis scores.", time: "2:34 PM" },
        { id: 2, description: "M. Johnson strikes out swinging.", time: "2:38 PM" },
        { id: 3, description: "T. Williams doubles to center. 2 RBIs.", time: "2:42 PM" },
        { id: 4, description: "D. Brown grounds out to second.", time: "2:45 PM" },
      ],
    };
    setGameData(mock);
    setPlays(mock.plays);
    setLastUpdated(new Date());
    setTracking(true);
    if (!muted) speak("Demo mode active. Here's a sample game.");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#080f08",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#f0f0f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Oswald:wght@400;600;700&family=Space+Mono&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyndef fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1923 0%, #1a0a0a 100%)",
        borderBottom: "2px solid #ffdd00",
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#aaa", fontSize: 12,
        }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚾</span>
          <div>
            <div style={{ fontFamily: "Oswald", fontSize: 16, color: "#ffdd00", letterSpacing: 2 }}>HONUS GAME TRACKER</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, fontFamily: "Space Mono" }}>LIVE LITTLE LEAGUE STATS</div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {tracking && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff44", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 11, color: "#00ff44", fontFamily: "Space Mono" }}>LIVE</span>
            </div>
          )}
          <button onClick={() => setMuted(m => !m)} style={{
            background: muted ? "rgba(255,255,255,0.04)" : "rgba(245,158,11,0.1)",
            border: `1px solid ${muted ? "rgba(255,255,255,0.08)" : "#ffdd0050"}`,
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            color: muted ? "#555" : "#ffdd00", fontSize: 11, fontFamily: "Space Mono",
          }}>
            {muted ? "🔇 MUTED" : "🔊 VOICE"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>

        {/* URL Input */}
        {!tracking && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: 24, marginBottom: 20,
          }}>
            <div style={{ fontFamily: "Oswald", fontSize: 18, color: "#ffdd00", marginBottom: 6 }}>
              ENTER GAMECHANGER URL
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
              Paste your public GameChanger game URL from web.gc.com
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://web.gc.com/games/..."
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#f0f0f0", fontSize: 14, fontFamily: "monospace",
                }}
              />
              <button onClick={startTracking} disabled={!inputUrl.trim()} style={{
                background: inputUrl.trim() ? "linear-gradient(135deg, #ffdd00, #ccaa00)" : "rgba(255,255,255,0.06)",
                border: "none", borderRadius: 10, padding: "10px 20px",
                color: inputUrl.trim() ? "#0a0f0a" : "#555",
                fontFamily: "Oswald", fontSize: 14, letterSpacing: 1,
                cursor: inputUrl.trim() ? "pointer" : "not-allowed",
              }}>TRACK GAME</button>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Don't have a URL yet? Test with demo data:</div>
              <button onClick={useMockData} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "7px 14px", cursor: "pointer",
                color: "#888", fontSize: 12, fontFamily: "Space Mono",
              }}>⚾ LOAD DEMO GAME</button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid #ef444440",
            borderRadius: 10, padding: "12px 16px", marginBottom: 16,
            color: "#fca5a5", fontSize: 13,
          }}>⚠️ {error}</div>
        )}

        {/* Loading */}
        {loading && !gameData && (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
            <div style={{ fontSize: 30, animation: "spin 1s linear infinite", display: "inline-block" }}>⚾</div>
            <div style={{ marginTop: 12, fontFamily: "Space Mono", fontSize: 12 }}>FETCHING GAME DATA...</div>
          </div>
        )}

        {/* Game Data */}
        {gameData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Status bar */}
            <div style={{
              background: "rgba(245,158,11,0.08)", border: "1px solid #ffdd0030",
              borderRadius: 12, padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontFamily: "Oswald", fontSize: 20, color: "#ffdd00" }}>
                  {gameData.isTop ? "TOP" : "BOT"} {gameData.inning || "-"}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: i < (gameData.outs || 0) ? "#ef4444" : "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }} />
                  ))}
                  <span style={{ fontSize: 11, color: "#888", marginLeft: 4, alignSelf: "center" }}>OUTS</span>
                </div>
              </div>

              <Diamond bases={gameData.bases} />

              <div style={{ textAlign: "right" }}>
                {lastUpdated && (
                  <div style={{ fontSize: 11, color: "#555", fontFamily: "Space Mono" }}>
                    Updated {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
                {tracking && (
                  <div style={{ fontSize: 11, color: "#00ff44", fontFamily: "Space Mono" }}>
                    Next refresh in 30s
                  </div>
                )}
              </div>
            </div>

            {/* Scoreboard */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px", background: "rgba(245,158,11,0.08)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "Oswald", fontSize: 13, color: "#ffdd00", letterSpacing: 2,
              }}>SCOREBOARD</div>
              <div style={{ padding: "8px 0" }}>
                <InningScoreboard
                  innings={gameData.homeTeam?.innings || []}
                  homeTeam={gameData.homeTeam}
                  awayTeam={gameData.awayTeam}
                />
              </div>
            </div>

            {/* Current at bat */}
            {(gameData.currentBatter || gameData.currentPitcher) && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
              }}>
                {gameData.currentBatter && (
                  <div style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ fontSize: 10, color: "#888", fontFamily: "Space Mono", letterSpacing: 1, marginBottom: 6 }}>AT BAT</div>
                    <div style={{ fontSize: 16, fontFamily: "Oswald", color: "#f0f0f0" }}>{gameData.currentBatter}</div>
                  </div>
                )}
                {gameData.currentPitcher && (
                  <div style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ fontSize: 10, color: "#888", fontFamily: "Space Mono", letterSpacing: 1, marginBottom: 6 }}>PITCHING</div>
                    <div style={{ fontSize: 16, fontFamily: "Oswald", color: "#f0f0f0" }}>{gameData.currentPitcher}</div>
                  </div>
                )}
              </div>
            )}

            {/* Play by play */}
            {plays.length > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{
                  padding: "10px 16px", background: "rgba(245,158,11,0.08)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: "Oswald", fontSize: 13, color: "#ffdd00", letterSpacing: 2,
                }}>PLAY BY PLAY</div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {[...plays].reverse().map((play, i) => (
                    <div key={play.id || i} style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      display: "flex", gap: 12, alignItems: "flex-start",
                    }}>
                      <div style={{ fontSize: 11, color: "#555", fontFamily: "Space Mono", flexShrink: 0, marginTop: 2 }}>
                        {play.time || ""}
                      </div>
                      <div style={{ fontSize: 13, color: i === 0 ? "#f0f0f0" : "#888", lineHeight: 1.5 }}>
                        {play.description}
                      </div>
                      {i === 0 && (
                        <button onClick={() => speak(play.description)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#555", fontSize: 14, flexShrink: 0,
                        }} title="Read aloud">🔊</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => fetchGame(gcUrl)} disabled={loading} style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "10px", cursor: "pointer", color: "#aaa",
                fontFamily: "Space Mono", fontSize: 12,
              }}>
                {loading ? "REFRESHING..." : "↻ REFRESH NOW"}
              </button>
              <button onClick={stopTracking} style={{
                flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid #ef444430",
                borderRadius: 10, padding: "10px", cursor: "pointer", color: "#ef4444",
                fontFamily: "Space Mono", fontSize: 12,
              }}>■ STOP TRACKING</button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
