import { useState, useEffect, useRef, useCallback } from "react";

// ── British TTS ──────────────────────────────────────────────────────────────
function getBritishVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Prefer deep male voices for 1920s announcer feel
  const preferred = [
    "Google US English",
    "Microsoft David Desktop - English (United States)",
    "Microsoft Mark Online (Natural) - English (United States)",
    "Alex",
    "Daniel",
    "Fred",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  return voices.find(v => v.lang === "en-US") || voices.find(v => v.lang.startsWith("en")) || null;
}
async function speak(text, onStart, onEnd) {
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*_`#>-]+/g, " ").replace(/\s+/g, " ").trim();
  try {
    const res = await fetch("/api/tts-brian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) throw new Error("TTS failed");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = document.getElementById("honus-audio") || Object.assign(document.createElement("audio"), {id: "honus-audio"});document.body.contains(audio) || document.body.appendChild(audio);audio.src = url;const _dummy = new Audio();
    audio.volume = 1.0;
    if (onStart) audio.onplay = onStart;
    if (onEnd) audio.onended = onEnd;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.log("Audio play failed:", err);
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 0.85; utter.pitch = 0.7;
        window.speechSynthesis.speak(utter);
      });
    }
  } catch (err) {
    console.log("TTS fetch failed:", err);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 0.85; utter.pitch = 0.7;
    window.speechSynthesis.speak(utter);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const SUPER_PROMPT = `You are Honus, an expert little league baseball analyst and coaching assistant with a warm British personality.

You will receive live game data from GameChanger including plays, scores, and situations. Your job is to:

1. ANNOUNCE each new play enthusiastically in British style
2. Give INSTANT tactical advice relevant to the current situation
3. TRACK player stats mentally and report when asked
4. CELEBRATE good plays ("Brilliant!", "Splendid!", "Crikey, what a hit!")
5. Give COACHING TIPS after each play ("With runners on first and third, consider...")

Keep responses SHORT and punchy during live games — coaches are busy!
Use British expressions naturally.
Always end with a quick tactical tip when relevant.

When given a play update, respond in this format:
- First line: Announce the play enthusiastically
- Second line: Quick tactical insight or next move suggestion
- Keep it under 3 sentences total`;

const REFRESH_INTERVAL = 15000;

function Diamond({ bases }) {
  const active = "#f59e0b";
  const inactive = "rgba(255,255,255,0.08)";
  return (
    <svg width="70" height="70" viewBox="0 0 80 80">
      <rect x="32" y="4" width="16" height="16" rx="2"
        fill={bases?.second ? active : inactive}
        stroke={bases?.second ? active : "rgba(255,255,255,0.15)"} strokeWidth="1"
        transform="rotate(45 40 12)" />
      <rect x="4" y="32" width="16" height="16" rx="2"
        fill={bases?.third ? active : inactive}
        stroke={bases?.third ? active : "rgba(255,255,255,0.15)"} strokeWidth="1"
        transform="rotate(45 12 40)" />
      <rect x="60" y="32" width="16" height="16" rx="2"
        fill={bases?.first ? active : inactive}
        stroke={bases?.first ? active : "rgba(255,255,255,0.15)"} strokeWidth="1"
        transform="rotate(45 68 40)" />
      <polygon points="40,72 34,66 34,60 46,60 46,66"
        fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    </svg>
  );
}

function ScoreBoard({ homeTeam, awayTeam }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0,
      background: "rgba(0,0,0,0.4)", borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
    }}>
      {/* Away */}
      <div style={{ padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#888", fontFamily: "Space Mono", letterSpacing: 1, marginBottom: 4 }}>AWAY</div>
        <div style={{ fontFamily: "Oswald", fontSize: 18, color: "#f0f0f0", marginBottom: 4 }}>{awayTeam?.name || "AWAY"}</div>
        <div style={{ fontFamily: "Oswald", fontSize: 48, color: "#60a5fa", lineHeight: 1 }}>{awayTeam?.runs ?? 0}</div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
          {awayTeam?.hits ?? 0}H · {awayTeam?.errors ?? 0}E
        </div>
      </div>

      {/* Middle divider */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 16px", borderLeft: "1px solid rgba(255,255,255,0.06)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontFamily: "Oswald", fontSize: 22, color: "#555" }}>VS</div>
      </div>

      {/* Home */}
      <div style={{ padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#888", fontFamily: "Space Mono", letterSpacing: 1, marginBottom: 4 }}>HOME</div>
        <div style={{ fontFamily: "Oswald", fontSize: 18, color: "#f0f0f0", marginBottom: 4 }}>{homeTeam?.name || "HOME"}</div>
        <div style={{ fontFamily: "Oswald", fontSize: 48, color: "#22c55e", lineHeight: 1 }}>{homeTeam?.runs ?? 0}</div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
          {homeTeam?.hits ?? 0}H · {homeTeam?.errors ?? 0}E
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "8px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
          animation: `sgbounce 1.2s ${i*0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

export default function SuperGameDay({ onBack }) {
  const [gcUrl, setGcUrl]           = useState("");
  const [inputUrl, setInputUrl]     = useState("");
  const [gameData, setGameData]     = useState(null);
  const [tracking, setTracking]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [analyzing, setAnalyzing]   = useState(false);
  const [error, setError]           = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [muted, setMuted]           = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [honusFeed, setHonusFeed] = useState([
    { type: "honus", text: "Right then! Paste your GameChanger URL and I'll watch the game for you, darling. I'll announce every play and give you tactical advice in real time! ⚾" }
  ]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [lastPlayCount, setLastPlayCount] = useState(0);
  const intervalRef   = useRef(null);
  const feedBottomRef = useRef(null);

  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [honusFeed, analyzing]);

  const announcePlay = useCallback(async (play, gameContext) => {
    setAnalyzing(true);
    try {
      const prompt = `New play just happened: "${play.description}"

Current game situation:
- Inning: ${gameContext.isTop ? "Top" : "Bottom"} ${gameContext.inning}
- Outs: ${gameContext.outs}
- Score: ${gameContext.awayTeam?.name} ${gameContext.awayTeam?.runs} - ${gameContext.homeTeam?.name} ${gameContext.homeTeam?.runs}
- Bases: First=${gameContext.bases?.first}, Second=${gameContext.bases?.second}, Third=${gameContext.bases?.third}

Announce this play and give instant coaching advice!`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 200,
          system: SUPER_PROMPT,
          messages: [...chatHistory, { role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Play noted!";
      setChatHistory(prev => [
        ...prev,
        { role: "user", content: prompt },
        { role: "assistant", content: reply },
      ]);
      setHonusFeed(prev => [...prev,
        { type: "play", text: play.description, time: play.time },
        { type: "honus", text: reply },
      ]);
      if (!muted) {
        setSpeaking(true);
        const utter = new SpeechSynthesisUtterance(reply.replace(/[*_`#>-]+/g, " ").trim());
        const voice = getBritishVoice();
        if (voice) utter.voice = voice;
        utter.lang = "en-US"; utter.rate = 0.85; utter.pitch = 0.7;
        utter.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }, [chatHistory, muted]);

  const fetchGame = useCallback(async (url) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gc-proxy?url=" + encodeURIComponent(url));
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setGameData(data);
      setLastUpdated(new Date());

      // Detect new plays and announce them
      const plays = data.plays || [];
      if (plays.length > lastPlayCount && lastPlayCount > 0) {
        const newPlays = plays.slice(lastPlayCount);
        for (const play of newPlays) {
          await announcePlay(play, data);
        }
      } else if (plays.length > 0 && lastPlayCount === 0) {
        // First load — announce game start
        const startMsg = `Game is underway! ${data.awayTeam?.name || "Away"} vs ${data.homeTeam?.name || "Home"}. I'm tracking everything for you, darling! ⚾`;
        setHonusFeed(prev => [...prev, { type: "honus", text: startMsg }]);
        if (!muted) speak(startMsg);
      }
      setLastPlayCount(plays.length);
    } catch (err) {
      setError("Could not load game data. Check the URL and try again.");
    }
    setLoading(false);
  }, [lastPlayCount, announcePlay, muted]);

  const startTracking = () => {
    if (!inputUrl.trim()) return;
    const url = inputUrl.trim();
    setGcUrl(url);
    setTracking(true);
    setLastPlayCount(0);
    fetchGame(url);
    intervalRef.current = setInterval(() => fetchGame(url), REFRESH_INTERVAL);
  };

  const stopTracking = () => {
    setTracking(false);
    clearInterval(intervalRef.current);
    setGameData(null);
    setLastPlayCount(0);
    setGcUrl("");
    setHonusFeed(prev => [...prev, { type: "honus", text: "Game tracking stopped. Well played today! ⚾" }]);
    if (!muted) speak("Game tracking stopped. Well played today!");
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    setHonusFeed(prev => [...prev, { type: "user", text }]);

    const gameContext = gameData ? `Current game: ${gameData.awayTeam?.name} ${gameData.awayTeam?.runs} - ${gameData.homeTeam?.name} ${gameData.homeTeam?.runs}, ${gameData.isTop ? "Top" : "Bot"} ${gameData.inning}, ${gameData.outs} outs.` : "";

    try {
      const newHistory = [...chatHistory, { role: "user", content: gameContext + "\n" + text }];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 300,
          system: SUPER_PROMPT,
          messages: newHistory,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, couldn't process that.";
      setChatHistory([...newHistory, { role: "assistant", content: reply }]);
      setHonusFeed(prev => [...prev, { type: "honus", text: reply }]);
      if (!muted) {
        setSpeaking(true);
        const utter = new SpeechSynthesisUtterance(reply.replace(/[*_`#>-]+/g, " ").trim());
        const voice = getBritishVoice();
        if (voice) utter.voice = voice;
        utter.lang = "en-US"; utter.rate = 0.85; utter.pitch = 0.7;
        utter.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
      }
    } catch {
      setHonusFeed(prev => [...prev, { type: "honus", text: "⚠️ Connection error. Try again." }]);
    }
    setChatLoading(false);
  };

  const loadDemo = () => {
    const demo = {
      status: "In Progress", inning: 3, isTop: false, outs: 1,
      bases: { first: true, second: false, third: false },
      homeTeam: { name: "TIGERS", runs: 4, hits: 6, errors: 0, innings: [2,0,2] },
      awayTeam: { name: "EAGLES", runs: 2, hits: 4, errors: 1, innings: [0,2,0] },
      currentBatter: "T. Williams #7",
      currentPitcher: "M. Jones #12",
      plays: [
        { id: 1, description: "J. Smith doubles to left. 2 RBIs score.", time: "2:10 PM" },
        { id: 2, description: "T. Williams singles to center. Runner advances.", time: "2:18 PM" },
        { id: 3, description: "M. Johnson strikes out swinging.", time: "2:22 PM" },
      ],
    };
    setGameData(demo);
    setTracking(true);
    setLastUpdated(new Date());
    const startMsg = "Demo mode! Tigers vs Eagles — bottom of the 3rd, Tigers leading 4-2. I'm on it, darling! ⚾";
    setHonusFeed(prev => [...prev, { type: "honus", text: startMsg }]);
    if (!muted) speak(startMsg);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const downloadReport = async () => {
const res = await fetch("/api/game-report", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
gameData, plays: gameData?.plays || [],
teamName: gameData?.homeTeam?.name,
opponentName: gameData?.awayTeam?.name,
gameDate: new Date().toLocaleDateString(),
}),
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "Honus_Game_Report.csv";
a.click();
};
  const emailReport = async () => {
const res = await fetch("/api/email-report", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
gameData, plays: gameData?.plays || [],
email: "jcx7816@gmail.com",
teamName: gameData?.homeTeam?.name,
opponentName: gameData?.awayTeam?.name,
gameDate: new Date().toLocaleDateString(),
}),
});
const data = await res.json();
const mailto = `mailto:jcx7816@gmail.com?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.emailBody)}`;
window.open(mailto);
};
const quickAsks = [
    "Should I steal with runner on first?",
    "Pitching change advice?",
    "Best bunt situation now?",
    "How do I motivate the team?",
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#070a0e",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#f0f0f0",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Oswald:wght@400;600;700&family=Space+Mono&display=swap');
        @keyframes sgbounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ripple { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.8);opacity:0} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#222;border-radius:4px}
        textarea:focus{outline:none} textarea{resize:none}
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0a1628, #0a1a0a)",
        borderBottom: "2px solid #22c55e",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#aaa", fontSize: 11,
        }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Honus avatar with speaking ring */}
          <div style={{ position: "relative" }}>
            {speaking && <div style={{
              position: "absolute", inset: -4, borderRadius: "50%",
              border: "2px solid #22c55e", animation: "ripple 1s infinite ease-out",
            }} />}
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #22c55e, #00f5c4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Space Mono", fontWeight: 700, fontSize: 13, color: "#0a0a0f",
            }}>C</div>
          </div>
          <div>
            <div style={{ fontFamily: "Oswald", fontSize: 15, color: "#22c55e", letterSpacing: 2 }}>
              HONUS · GAME DAY
            </div>
            <div style={{ fontSize: 10, color: "#555", fontFamily: "Space Mono" }}>
              {speaking ? "SPEAKING..." : tracking ? "LIVE TRACKING" : "READY"}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {tracking && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "Space Mono" }}>LIVE</span>
            </div>
          )}
          {speaking && (
            <button onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid #ef444440",
              borderRadius: 6, padding: "3px 8px", cursor: "pointer",
              color: "#ef4444", fontSize: 10, fontFamily: "Space Mono",
            }}>■ STOP</button>
          )}
          <button onClick={() => setMuted(m => !m)} style={{
            background: muted ? "rgba(255,255,255,0.04)" : "rgba(34,197,94,0.08)",
            border: `1px solid ${muted ? "rgba(255,255,255,0.08)" : "#22c55e30"}`,
            borderRadius: 6, padding: "4px 8px", cursor: "pointer",
            color: muted ? "#444" : "#22c55e", fontSize: 10, fontFamily: "Space Mono",
          }}>{muted ? "🔇" : "🔊"}</button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 860, width: "100%", margin: "0 auto", padding: "0 0 0 0", overflow: "hidden" }}>

        {/* URL input (when not tracking) */}
        {!tracking && (
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, color: "#666", fontFamily: "Space Mono", marginBottom: 8 }}>
              GAMECHANGER URL
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={inputUrl} onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && startTracking()}
                placeholder="https://web.gc.com/games/..."
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "8px 12px",
                  color: "#f0f0f0", fontSize: 13, fontFamily: "monospace",
                }}
              />
              <button onClick={startTracking} disabled={!inputUrl.trim()} style={{
                background: inputUrl.trim() ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.06)",
                border: "none", borderRadius: 8, padding: "8px 16px",
                color: inputUrl.trim() ? "#0a0a0f" : "#555",
                fontFamily: "Oswald", fontSize: 13, cursor: inputUrl.trim() ? "pointer" : "not-allowed",
              }}>TRACK</button>
              <button onClick={loadDemo} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "8px 12px", cursor: "pointer",
                color: "#888", fontSize: 12, fontFamily: "Space Mono",
              }}>DEMO</button>
            </div>
            {error && <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>⚠️ {error}</div>}
          </div>
        )}

        {/* Live game data */}
        {gameData && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <ScoreBoard homeTeam={gameData.homeTeam} awayTeam={gameData.awayTeam} />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 10, flexWrap: "wrap", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontFamily: "Oswald", fontSize: 16, color: "#f59e0b" }}>
                  {gameData.isTop ? "TOP" : "BOT"} {gameData.inning}
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: i < (gameData.outs || 0) ? "#ef4444" : "rgba(255,255,255,0.1)",
                    }} />
                  ))}
                  <span style={{ fontSize: 10, color: "#666", fontFamily: "Space Mono", marginLeft: 3 }}>OUTS</span>
                </div>
                <Diamond bases={gameData.bases} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {lastUpdated && (
                  <span style={{ fontSize: 10, color: "#444", fontFamily: "Space Mono" }}>
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                {tracking && (
                  <button onClick={stopTracking} style={{
                    background: "rgba(239,68,68,0.08)", border: "1px solid #ef444430",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                    color: "#ef4444", fontSize: 10, fontFamily: "Space Mono",
                  }}>■ STOP</button>
                )}
                {tracking && (
                  <button onClick={() => fetchGame(gcUrl)} disabled={loading} style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                    color: "#888", fontSize: 10, fontFamily: "Space Mono",
                  }}>{loading ? "..." : "↻"}</button>
                )}
              </div>
            </div>
          </div>
        )}

        `{/* Post Game Report buttons */}
{gameData && (
<div style={{ padding: "8px 16px", display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
<button onClick={downloadReport} style={{
background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e40",
borderRadius: 8, padding: "7px 14px", cursor: "pointer",
color: "#22c55e", fontSize: 11, fontFamily: "Space Mono",
}}>📊 DOWNLOAD REPORT</button>
<button onClick={emailReport} style={{
background: "rgba(96,165,250,0.1)", border: "1px solid #60a5fa40",
borderRadius: 8, padding: "7px 14px", cursor: "pointer",
color: "#60a5fa", fontSize: 11, fontFamily: "Space Mono",
}}>📧 EMAIL REPORT</button>
</div>
)}
        <div style={{
          padding: "8px 16px", display: "flex", gap: 6, overflowX: "auto",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          {quickAsks.map(q => (
            <button key={q} onClick={() => { setChatInput(q); }} style={{
              flexShrink: 0, background: "rgba(34,197,94,0.06)",
              border: "1px solid #22c55e20", borderRadius: 16,
              padding: "5px 12px", cursor: "pointer",
              color: "#22c55e80", fontSize: 11, whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(34,197,94,0.12)"; e.currentTarget.style.color="#22c55e"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(34,197,94,0.06)"; e.currentTarget.style.color="#22c55e80"; }}
            >{q}</button>
          ))}
        </div>

        {/* Honus feed */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {honusFeed.map((item, i) => (
            <div key={i} style={{ marginBottom: 12, animation: "fadeUp 0.3s ease" }}>
              {item.type === "play" && (
                <div style={{
                  background: "rgba(245,158,11,0.08)", border: "1px solid #f59e0b20",
                  borderRadius: 8, padding: "8px 12px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>⚾</span>
                  <div>
                    <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 500 }}>{item.text}</div>
                    {item.time && <div style={{ fontSize: 10, color: "#555", fontFamily: "Space Mono" }}>{item.time}</div>}
                  </div>
                </div>
              )}
              {item.type === "honus" && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #22c55e, #00f5c4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Space Mono", fontWeight: 700, fontSize: 11, color: "#0a0a0f",
                  }}>C</div>
                  <div style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px 14px 14px 4px", padding: "10px 14px",
                    fontSize: 14, lineHeight: 1.6, color: "#f0f0f0", maxWidth: "85%",
                  }}>
                    {item.text}
                    <button onClick={() => speak(item.text)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#444", fontSize: 10, marginLeft: 8, transition: "color 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color="#22c55e"}
                    onMouseLeave={e => e.currentTarget.style.color="#444"}
                    >🔊</button>
                  </div>
                </div>
              )}
              {item.type === "user" && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    background: "linear-gradient(135deg, #15803d, #22c55e)",
                    borderRadius: "14px 14px 4px 14px", padding: "10px 14px",
                    fontSize: 14, lineHeight: 1.6, color: "#f0f0f0", maxWidth: "80%",
                    boxShadow: "0 4px 12px #22c55e20",
                  }}>{item.text}</div>
                </div>
              )}
            </div>
          ))}
          {(analyzing || chatLoading) && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #00f5c4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Space Mono", fontWeight: 700, fontSize: 11, color: "#0a0a0f",
              }}>C</div>
              <div style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px 14px 14px 4px", padding: "10px 14px",
              }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={feedBottomRef} />
        </div>

        {/* Chat input */}
        <div style={{ padding: "8px 16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end",
          }}>
            <textarea rows={1} value={chatInput}
              onChange={e => {
                setChatInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
              }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }}}
              placeholder="Ask Honus anything about the game..."
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#f0f0f0", fontSize: 14, lineHeight: 1.5,
                fontFamily: "'DM Sans', sans-serif",
                minHeight: 24, maxHeight: 80, overflowY: "auto",
              }}
            />
            <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: chatInput.trim() && !chatLoading
                ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.06)",
              border: "none", cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, transition: "all 0.2s",
            }}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
