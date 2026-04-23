import { useState, useRef, useEffect } from "react";

// ── British TTS ──────────────────────────────────────────────────────────────
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

const BASEBALL_PROMPT = `You are Honus, an expert little league baseball analyst and coaching assistant with a warm British personality. You have deep knowledge of:

BASEBALL RULES & STRATEGY:
- All official baseball rules including little league specific rules
- Batting strategy, pitch counts, fielding positions
- When to steal, bunt, hit and run
- Defensive alignments and shifts
- Pitching strategy and matchups

STATS TRACKING:
- You track player stats mentioned in conversation (hits, at-bats, RBIs, strikeouts, walks, batting average)
- You calculate batting averages (hits/at-bats), OBP, slugging
- You remember all players and stats mentioned in the conversation
- When asked for a stat summary, you compile everything mentioned

COACHING ADVICE:
- You give tactical in-game advice when asked
- You suggest lineup changes based on performance
- You explain situations clearly for youth baseball context
- You keep advice age-appropriate for little league

PLAY TRACKING:
- When told about plays (e.g. "Tommy hit a double"), you confirm, update mental stats, and comment intelligently
- You note scoring situations, runners on base, outs
- You celebrate good plays enthusiastically in British style

PERSONALITY:
- Warm, encouraging, knowledgeable
- Use 1920s baseball announcer expressions like "What a crack of the bat!", "He rounds the bases!", "The crowd goes wild!", "Great day in the morning!"
- You speak like a proper baseball-loving British woman who knows her stuff
- Concise responses during games, more detailed when asked for analysis

Always keep track of the game state when told about it. When asked "what are the stats" or "summarize the game", give a proper structured summary of everything you know.`;

const QUICK_ASKS = [
  { icon: "📊", label: "Game Summary", prompt: "Give me a full summary of the game so far including all stats you know" },
  { icon: "🎯", label: "Batting Tips", prompt: "Give me quick batting tips I can relay to my players right now" },
  { icon: "🏃", label: "When to Steal?", prompt: "What situations should I consider stealing a base in little league?" },
  { icon: "⚾", label: "Pitching Help", prompt: "What pitching strategy works best for little league?" },
  { icon: "🧢", label: "Lineup Advice", prompt: "How should I think about setting my batting lineup for little league?" },
  { icon: "📋", label: "Fielding Tips", prompt: "Give me quick fielding tips for little league players" },
];

// Simple stat tracker
function parseStatsFromConversation(messages) {
  const players = {};
  const playRegex = /(\w+(?:\s\w+)?)\s+(?:hit|singled|doubled|tripled|homered|struck out|walked|grounded out|flied out|popped out)/gi;

  messages.forEach(msg => {
    if (msg.role === "user") {
      let match;
      while ((match = playRegex.exec(msg.content)) !== null) {
        const name = match[1];
        if (!players[name]) players[name] = { ab: 0, hits: 0, rbi: 0, k: 0, bb: 0 };
        const play = match[0].toLowerCase();
        if (play.includes("singled") || play.includes("hit a single")) { players[name].ab++; players[name].hits++; }
        else if (play.includes("doubled")) { players[name].ab++; players[name].hits++; }
        else if (play.includes("tripled")) { players[name].ab++; players[name].hits++; }
        else if (play.includes("homered") || play.includes("home run")) { players[name].ab++; players[name].hits++; }
        else if (play.includes("struck out")) { players[name].ab++; players[name].k++; }
        else if (play.includes("walked")) { players[name].bb++; }
        else if (play.includes("grounded out") || play.includes("flied out") || play.includes("popped out")) { players[name].ab++; }
      }
    }
  });
  return players;
}

function StatCard({ name, stats }) {
  const avg = stats.ab > 0 ? (stats.hits / stats.ab).toFixed(3).replace("0.", ".") : ".000";
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, padding: "10px 14px", minWidth: 130,
    }}>
      <div style={{ fontFamily: "Oswald", fontSize: 14, color: "#f0f0f0", marginBottom: 6 }}>{name}</div>
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#888" }}>
        <div><span style={{ color: "#f59e0b", fontWeight: 700 }}>{avg}</span><br/>AVG</div>
        <div><span style={{ color: "#60a5fa", fontWeight: 700 }}>{stats.hits}/{stats.ab}</span><br/>H/AB</div>
        {stats.k > 0 && <div><span style={{ color: "#ef4444", fontWeight: 700 }}>{stats.k}</span><br/>K</div>}
        {stats.bb > 0 && <div><span style={{ color: "#22c55e", fontWeight: 700 }}>{stats.bb}</span><br/>BB</div>}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#f59e0b",
          animation: `bbounce 1.2s ${i*0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

export default function BaseballBrain({ onBack }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Right then! I'm your baseball brain for today's game. Tell me what's happening on the field — plays, scores, situations — and I'll track everything and give you tactical advice.\n\nYou can also ask me anything about strategy, rules, or player stats. Let's play ball! ⚾" }
  ]);
  const [history, setHistory]   = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [muted, setMuted]       = useState(false);
  const [tab, setTab]           = useState("chat"); // chat | stats
  const bottomRef  = useRef(null);
  const textRef    = useRef(null);

  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (overrideInput) => {
    const text = (overrideInput || input).trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    const newHistory = [...history, { role: "user", content: text }];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: BASEBALL_PROMPT,
          messages: newHistory,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setHistory([...newHistory, { role: "assistant", content: reply }]);
      if (!muted) speak(reply);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Try again." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const trackedStats = parseStatsFromConversation(messages);
  const hasStats = Object.keys(trackedStats).length > 0;

  return (
    <div style={{
      minHeight: "100vh", background: "#080c10",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#f0f0f0",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Oswald:wght@400;600;700&family=Space+Mono&display=swap');
        @keyframes bbounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        textarea:focus{outline:none} textarea{resize:none}
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0f1a0a 100%)",
        borderBottom: "2px solid #22c55e",
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#aaa", fontSize: 12,
        }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🧠⚾</span>
          <div>
            <div style={{ fontFamily: "Oswald", fontSize: 16, color: "#22c55e", letterSpacing: 2 }}>HONUS'S BASEBALL BRAIN</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, fontFamily: "Space Mono" }}>LIVE COACHING ASSISTANT</div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setMuted(m => !m)} style={{
            background: muted ? "rgba(255,255,255,0.04)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${muted ? "rgba(255,255,255,0.08)" : "#22c55e50"}`,
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            color: muted ? "#555" : "#22c55e", fontSize: 11, fontFamily: "Space Mono",
          }}>{muted ? "🔇 MUTED" : "🔊 VOICE"}</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)", maxWidth: 800, width: "100%", margin: "0 auto",
        alignSelf: "stretch",
      }}>
        {[
          { id: "chat", label: "💬 Coach Chat" },
          { id: "stats", label: `📊 Player Stats ${hasStats ? `(${Object.keys(trackedStats).length})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? "#22c55e" : "#666", fontSize: 13,
            borderBottom: tab === t.id ? "2px solid #22c55e" : "2px solid transparent",
            fontFamily: "Space Mono", transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === "stats" && (
        <div style={{ flex: 1, padding: 20, maxWidth: 800, width: "100%", margin: "0 auto" }}>
          {!hasStats ? (
            <div style={{
              textAlign: "center", padding: 60, color: "#555",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontFamily: "Oswald", fontSize: 16, marginBottom: 8 }}>NO STATS YET</div>
              <div style={{ fontSize: 13 }}>Tell Honus about plays in the chat and she'll automatically track player stats here.</div>
              <div style={{ fontSize: 12, color: "#444", marginTop: 8 }}>
                Try: "Tommy hit a double" or "Sarah struck out"
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: "Oswald", fontSize: 14, color: "#22c55e", letterSpacing: 2, marginBottom: 16 }}>
                TRACKED PLAYERS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {Object.entries(trackedStats).map(([name, stats]) => (
                  <StatCard key={name} name={name} stats={stats} />
                ))}
              </div>
              <div style={{ marginTop: 20, fontSize: 12, color: "#444" }}>
                Stats are automatically tracked from your chat messages. For full stats, ask Honus for a game summary.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {tab === "chat" && (
        <>
          {/* Quick asks */}
          <div style={{
            maxWidth: 800, width: "100%", margin: "0 auto",
            padding: "12px 16px 0", display: "flex", gap: 8, overflowX: "auto",
          }}>
            {QUICK_ASKS.map(q => (
              <button key={q.label} onClick={() => send(q.prompt)} style={{
                flexShrink: 0,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: "6px 12px", cursor: "pointer",
                color: "#888", fontSize: 11, display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#22c55e"; e.currentTarget.style.color="#22c55e"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#888"; }}
              >{q.icon} {q.label}</button>
            ))}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            maxWidth: 800, width: "100%", margin: "0 auto",
          }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
                  marginBottom: 14, gap: 10, alignItems: "flex-end",
                  animation: "fadeIn 0.3s ease",
                }}>
                  {!isUser && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>⚾</div>
                  )}
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 4,
                    alignItems: isUser ? "flex-end" : "flex-start" }}>
                    <div style={{
                      background: isUser ? "linear-gradient(135deg, #15803d, #22c55e)" : "rgba(255,255,255,0.05)",
                      border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      padding: "10px 14px", color: "#f0f0f0", fontSize: 14, lineHeight: 1.6,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      boxShadow: isUser ? "0 4px 15px #22c55e30" : "none",
                    }}>{msg.content}</div>
                    {!isUser && (
                      <button onClick={() => speak(msg.content)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#555", fontSize: 10, fontFamily: "Space Mono",
                        padding: "2px 4px", transition: "color 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color="#22c55e"}
                      onMouseLeave={e => e.currentTarget.style.color="#555"}
                      >🔊 LISTEN</button>
                    )}
                  </div>
                  {isUser && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(34,197,94,0.2)", border: "1px solid #22c55e50",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, color: "#22c55e",
                    }}>🧢</div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>⚾</div>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px 18px 18px 4px", padding: "8px 16px" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ maxWidth: 800, width: "100%", margin: "0 auto", padding: "8px 16px 20px" }}>
            {/* Game situation shortcuts */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {[
                "Runner on first, 1 out — steal?",
                "Bases loaded, 2 outs — what pitch?",
                "We're down by 2, last inning — strategy?",
              ].map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: "rgba(34,197,94,0.06)", border: "1px solid #22c55e20",
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                  color: "#22c55e90", fontSize: 11, transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(34,197,94,0.12)"; e.currentTarget.style.color="#22c55e"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(34,197,94,0.06)"; e.currentTarget.style.color="#22c55e90"; }}
                >{s}</button>
              ))}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "10px 14px",
              display: "flex", gap: 10, alignItems: "flex-end",
            }}>
              <textarea ref={textRef} rows={1} value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                }}
                onKeyDown={handleKey}
                placeholder="Tell me what's happening... Tommy hit a double, scored 2 runs"
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: "#f0f0f0", fontSize: 14, lineHeight: 1.5,
                  fontFamily: "'DM Sans', sans-serif",
                  minHeight: 24, maxHeight: 100, overflowY: "auto",
                }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading} style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.06)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "all 0.2s",
              }}>➤</button>
            </div>
            <div style={{ fontSize: 11, color: "#333", textAlign: "center", marginTop: 6 }}>
              Enter to send · Describe plays, ask strategy, request stats anytime
            </div>
          </div>
        </>
      )}
    </div>
  );
}
