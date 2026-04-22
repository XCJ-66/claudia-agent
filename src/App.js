import { useState, useRef, useEffect, useCallback } from "react"; import GameTracker from "./GameTracker";

const SYSTEM_PROMPT = `You are Claudia, a powerful personal AI agent. You can:
- Have natural, intelligent conversations
- Help plan and break down complex tasks into steps
- Analyze problems and provide structured solutions
- Remember context within a conversation
- Roleplay as a capable assistant who "executes" tasks

When asked to DO something (like "search for X", "create a plan", "calculate Y"), simulate completing the task thoughtfully and present results in a clear, structured format.

Personality: Sharp, efficient, slightly futuristic. You speak like a capable agent — confident, direct, but warm.`;

const TOOLS = [
  { id: "think",   icon: "🧠", label: "Deep Think", desc: "Multi-step reasoning" },
  { id: "plan",    icon: "📋", label: "Make Plan",  desc: "Break into steps" },
  { id: "search",  icon: "🔍", label: "Search",     desc: "Find information" },
  { id: "code",    icon: "💻", label: "Write Code", desc: "Generate code" },
  { id: "analyze", icon: "📊", label: "Analyze",    desc: "Data & insights" },
];

function getBritishVoice() {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Google UK English Female",
    "Microsoft Libby Online (Natural) - English (United Kingdom)",
    "Microsoft Mia Online (Natural) - English (United Kingdom)",
    "Karen",
    "Daniel",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  const gbVoice = voices.find(v => v.lang === "en-GB");
  if (gbVoice) return gbVoice;
  return voices.find(v => v.lang.startsWith("en")) || null;
}

function speak(text, onStart, onEnd) {
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*_`#>-]+/g, " ").replace(/\s+/g, " ").trim();
  const utter = new SpeechSynthesisUtterance(clean);
  const voice = getBritishVoice();
  if (voice) utter.voice = voice;
  utter.lang = "en-GB";
  utter.rate = 1.05;
  utter.pitch = 1.1;
  utter.onstart = onStart;
  utter.onend = onEnd;
  utter.onerror = onEnd;
  window.speechSynthesis.speak(utter);
}

function TypingDots() {
  `if (view === "game") return <GameTracker onBack={() => setView("chat")} />;
return (`
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#00f5c4",
          animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

function SpeakerIcon({ on }) {
  `if (view === "game") return <GameTracker onBack={() => setView("chat")} />;
return (`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {on
        ? <><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>
        : <><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
      }
    </svg>
  );
}

function Message({ msg, muted, onSpeak }) {
  const isUser   = msg.role === "user";
  const isSystem = msg.role === "system";

  if (isSystem) `if (view === "game") return <GameTracker onBack={() => setView("chat")} />;
return (`
    <div style={{
      textAlign: "center", color: "#555", fontSize: 11,
      padding: "6px 0", letterSpacing: 1, fontFamily: "monospace",
    }}>{msg.content}</div>
  );

  `if (view === "game") return <GameTracker onBack={() => setView("chat")} />;
return (`
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16, gap: 10, alignItems: "flex-end",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #00f5c4, #7b61ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, boxShadow: "0 0 10px #00f5c440",
        }}>C</div>
      )}

      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column",
        gap: 4, alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{
          background: isUser
            ? "linear-gradient(135deg, #7b61ff, #a78bfa)"
            : "rgba(255,255,255,0.06)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "12px 16px", color: "#f0f0f0", fontSize: 14, lineHeight: 1.6,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          boxShadow: isUser ? "0 4px 15px #7b61ff40" : "none",
        }}>
          {!isUser && msg.tool && (
            <div style={{ fontSize: 11, color: "#00f5c4", marginBottom: 6, fontFamily: "monospace", letterSpacing: 1 }}>
              ⚡ {msg.tool.toUpperCase()} MODE
            </div>
          )}
          {msg.content}
        </div>

        {!isUser && (
          <button onClick={() => onSpeak(msg.content)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#555", padding: "2px 4px", display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, fontFamily: "Space Mono", letterSpacing: 1, transition: "color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#00f5c4"}
          onMouseLeave={e => e.currentTarget.style.color = "#555"}
          title="Read aloud">
            🔊 LISTEN
          </button>
        )}
      </div>

      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "rgba(123,97,255,0.3)", border: "1px solid #7b61ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#c4b5fd",
        }}>U</div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("chat"); const [messages, setMessages]] = useState([
    { role: "system", content: "— CLAUDIA AGENT ONLINE —" },
    { role: "assistant", content: "Hello, darling. I'm Claudia — your personal AI agent. I can think, plan, search, write code, and analyse anything you throw at me.\n\nWhat do you need done?" }
  ]);
  const [history, setHistory]       = useState([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [muted, setMuted]           = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    `if (view === "game") return <GameTracker onBack={() => setView("chat")} />;
return (`) => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSpeak = useCallback((text) => {
    if (muted) return;
    speak(text, () => setSpeaking(true), () => setSpeaking(false));
  }, [muted]);

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setSpeaking(false); };
  const toggleMute   = () => { if (!muted) stopSpeaking(); setMuted(m => !m); };

  const send = async (overrideInput) => {
    const text = (overrideInput || input).trim();
    if (!text || loading) return;

    const toolPrompt = activeTool
      ? `[User wants you to use your ${activeTool.toUpperCase()} capability for this] ` : "";

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    const newHistory = [...history, { role: "user", content: toolPrompt + text }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newHistory,
        }),
      });
      const data  = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      const assistantMsg = { role: "assistant", content: reply, tool: activeTool };
      setMessages(prev => [...prev, assistantMsg]);
      setHistory([...newHistory, { role: "assistant", content: reply }]);
      if (!muted) speak(reply, () => setSpeaking(true), () => setSpeaking(false));
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Check your network and try again." }]);
    }

    setLoading(false);
    setActiveTool(null);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const quickPrompts = [
    "Plan my day productively",
    "Write a Python web scraper",
    "Explain quantum computing simply",
    "Brainstorm startup ideas in AI",
  ];

  `if (view === "game") return <GameTracker onBack={() => setView("chat")} />;
return (`
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ripple  { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.7);opacity:0} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        textarea:focus{outline:none} textarea{resize:none}
      `}</style>

      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {speaking && (
            <div style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: "2px solid #00f5c4", animation: "ripple 1.1s infinite ease-out",
            }} />
          )}
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #00f5c4, #7b61ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Space Mono", fontWeight: 700, fontSize: 13, color: "#0a0a0f",
            boxShadow: speaking ? "0 0 24px #00f5c470" : "0 0 20px #00f5c430",
            transition: "box-shadow 0.3s",
          }}>C</div>
        </div>

        <div>
          <div style={{ fontFamily: "Space Mono", fontSize: 13, color: "#00f5c4", letterSpacing: 2 }}>CLAUDIA</div>
          <div style={{ fontSize: 11, color: speaking ? "#00f5c4" : "#555", letterSpacing: 1, transition: "color 0.3s" }}>
            {speaking ? "SPEAKING..." : "YOUR PERSONAL AI AGENT"}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {speaking && (
            <button onClick={stopSpeaking} style={{
              background: "rgba(255,80,80,0.12)", border: "1px solid #ff5050",
              borderRadius: 8, padding: "4px 10px", cursor: "pointer",
              color: "#ff5050", fontSize: 11, fontFamily: "Space Mono",
            }}>■ STOP</button>
          )}
          <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} style={{
            background: muted ? "rgba(255,255,255,0.04)" : "rgba(0,245,196,0.08)",
            border: `1px solid ${muted ? "rgba(255,255,255,0.08)" : "#00f5c430"}`,
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            color: muted ? "#444" : "#00f5c4",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontFamily: "Space Mono", transition: "all 0.2s",
          }}>
            <SpeakerIcon on={!muted} />
            {muted ? "MUTED" : "VOICE ON"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00f5c4", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#00f5c4", fontFamily: "Space Mono" }}>ONLINE</span>           <button onClick={() => setView("game")} style={{             background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b40",             borderRadius: 8, padding: "5px 10px", cursor: "pointer",        color: "#f59e0b", fontSize: 11, fontFamily: "Space Mono",           }}>⚾ GAME</button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", maxWidth: 760, width: "100%", margin: "0 auto" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ animation: "fadeIn 0.3s ease" }}>
            <Message msg={msg} muted={muted} onSpeak={handleSpeak} />
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #00f5c4, #7b61ff)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>C</div>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "18px 18px 18px 4px", padding: "8px 16px" }}>
              <TypingDots />
            </div>
          </div>
        )}
        {messages.length <= 2 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {quickPrompts.map(p => (
              <button key={p} onClick={() => send(p)} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: "8px 14px", color: "#aaa", fontSize: 12,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.target.style.borderColor="#00f5c4"; e.target.style.color="#00f5c4"; }}
              onMouseLeave={e => { e.target.style.borderColor="rgba(255,255,255,0.1)"; e.target.style.color="#aaa"; }}
              >{p}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Tools bar */}
      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto",
        padding: "0 16px", display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActiveTool(activeTool === t.id ? null : t.id)} style={{
            flexShrink: 0,
            background: activeTool === t.id ? "rgba(0,245,196,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${activeTool === t.id ? "#00f5c4" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 10, padding: "6px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            <span style={{ fontSize: 11, color: activeTool === t.id ? "#00f5c4" : "#888", fontWeight: 500, whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto", padding: "8px 16px 20px" }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${activeTool ? "#00f5c440" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 16, padding: "12px 14px",
          display: "flex", gap: 10, alignItems: "flex-end",
          transition: "border-color 0.2s",
          boxShadow: activeTool ? "0 0 20px #00f5c420" : "none",
        }}>
          {activeTool && (
            <div style={{
              fontSize: 11, color: "#00f5c4", fontFamily: "Space Mono",
              position: "absolute", marginTop: -30, background: "#0a0a0f",
              padding: "2px 8px", borderRadius: 6, border: "1px solid #00f5c440",
            }}>⚡ {TOOLS.find(t => t.id === activeTool)?.label} active</div>
          )}
          <textarea ref={textareaRef} rows={1} value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKey}
            placeholder={activeTool
              ? `What should I ${TOOLS.find(t => t.id === activeTool)?.desc.toLowerCase()}?`
              : "Ask Claudia anything or give her a task..."}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "#f0f0f0", fontSize: 14, lineHeight: 1.5,
              fontFamily: "'DM Sans', sans-serif",
              minHeight: 24, maxHeight: 120, overflowY: "auto",
            }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: input.trim() && !loading
              ? "linear-gradient(135deg, #00f5c4, #7b61ff)" : "rgba(255,255,255,0.08)",
            border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, transition: "all 0.2s",
            boxShadow: input.trim() && !loading ? "0 0 15px #00f5c440" : "none",
          }}>➤</button>
        </div>
        <div style={{ fontSize: 11, color: "#333", textAlign: "center", marginTop: 8 }}>
          Enter to send · Shift+Enter for new line · Select a tool to guide Claudia's mode
        </div>
      </div>
    </div>
  );
}