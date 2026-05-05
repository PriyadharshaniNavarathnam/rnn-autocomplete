import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ──────────────────────────────────────────────
// Replace with your deployed backend URL after deployment
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Debounce hook ────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Main App ─────────────────────────────────────────────
export default function App() {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [selectedWord, setSelectedWord] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const debouncedInput = useDebounce(input, 350);

  const fetchSuggestions = useCallback(async (prefix) => {
    if (prefix.length < 2) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/autocomplete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, n_suggestions: 6 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debouncedInput && /^[a-zA-Z]+$/.test(debouncedInput)) {
      fetchSuggestions(debouncedInput.toLowerCase());
    } else {
      setSuggestions([]);
      setStatus("idle");
    }
  }, [debouncedInput, fetchSuggestions]);

  function handleSelect(word) {
    setSelectedWord(word);
    setHistory((prev) => [word, ...prev.filter((w) => w !== word)].slice(0, 8));
    setSuggestions([]);
    setInput(word);
    setTimeout(() => setSelectedWord(null), 1200);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setInput("");
      setSuggestions([]);
    }
  }

  const highlightMatch = (word, prefix) => {
    if (!prefix || !word.toLowerCase().startsWith(prefix.toLowerCase())) {
      return <span>{word}</span>;
    }
    return (
      <>
        <span className="match-prefix">{word.slice(0, prefix.length)}</span>
        <span className="match-rest">{word.slice(prefix.length)}</span>
      </>
    );
  };

  return (
    <div className="app">
      <div className="noise" />

      <header className="header">
        <div className="logo">
          <span className="logo-icon">⟁</span>
          <div>
            <div className="logo-title">WordNet RNN</div>
            <div className="logo-sub">Character-Level LSTM Autocomplete</div>
          </div>
        </div>
        <div className="badge">LSTM · PyTorch</div>
      </header>

      <main className="main">
        <div className="hero">
          <h1 className="headline">
            Type a few letters.<br />
            <em>The model does the rest.</em>
          </h1>
          <p className="subline">
            Trained on 8,800+ English words using a character-level LSTM.
            Start typing and watch it autocomplete in real time.
          </p>
        </div>

        <div className="search-container">
          <div className={`input-wrap ${status === "loading" ? "loading" : ""} ${status === "error" ? "errored" : ""}`}>
            <span className="cursor-icon">❯</span>
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              placeholder="univ, comp, neur, algo…"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^a-zA-Z]/g, ""))}
              onKeyDown={handleKeyDown}
              autoFocus
              maxLength={10}
              spellCheck={false}
              autoComplete="off"
            />
            {status === "loading" && <div className="spinner" />}
            {input && (
              <button className="clear-btn" onClick={() => { setInput(""); setSuggestions([]); inputRef.current?.focus(); }}>
                ✕
              </button>
            )}
          </div>

          {status === "error" && (
            <div className="error-bar">
              ⚠ Cannot reach the API. Is the backend running?
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="suggestions">
              <div className="suggestions-label">
                {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} for <strong>"{input}"</strong>
              </div>
              <div className="chips">
                {suggestions.map((word, i) => (
                  <button
                    key={word}
                    className={`chip ${selectedWord === word ? "chip-selected" : ""}`}
                    onClick={() => handleSelect(word)}
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    {highlightMatch(word, input)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {input.length >= 2 && suggestions.length === 0 && status === "idle" && (
            <div className="empty-state">No completions found for "{input}"</div>
          )}
        </div>

        {history.length > 0 && (
          <div className="history-section">
            <div className="history-label">Recent picks</div>
            <div className="history-list">
              {history.map((w) => (
                <span key={w} className="history-tag" onClick={() => { setInput(w); fetchSuggestions(w); }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="model-info">
          <div className="info-card">
            <div className="info-val">8,847</div>
            <div className="info-key">Training Words</div>
          </div>
          <div className="info-card">
            <div className="info-val">512</div>
            <div className="info-key">LSTM Units</div>
          </div>
          <div className="info-card">
            <div className="info-val">64</div>
            <div className="info-key">Embed Dim</div>
          </div>
          <div className="info-card">
            <div className="info-val">15</div>
            <div className="info-key">Epochs</div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0b0f0e;
          --surface: #131918;
          --border: #1e2a27;
          --accent: #00e5a0;
          --accent2: #00b07a;
          --text: #e8f0ed;
          --muted: #5a706a;
          --error: #ff5f5f;
          --font-mono: 'Space Mono', monospace;
          --font-display: 'Syne', sans-serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-mono);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .noise {
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0; opacity: 0.5;
        }

        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid var(--border);
          position: relative; z-index: 10;
        }

        .logo { display: flex; align-items: center; gap: 0.75rem; }
        .logo-icon { font-size: 1.5rem; color: var(--accent); }
        .logo-title { font-family: var(--font-display); font-weight: 800; font-size: 1rem; letter-spacing: 0.05em; }
        .logo-sub { font-size: 0.65rem; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }

        .badge {
          font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase;
          border: 1px solid var(--accent2); color: var(--accent);
          padding: 0.25rem 0.6rem; border-radius: 2px;
        }

        .main {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3rem 1.5rem;
          position: relative; z-index: 1; gap: 2.5rem;
        }

        .hero { text-align: center; max-width: 600px; }

        .headline {
          font-family: var(--font-display); font-weight: 800;
          font-size: clamp(2rem, 5vw, 3.2rem);
          line-height: 1.15; letter-spacing: -0.02em;
          margin-bottom: 1rem;
        }

        .headline em {
          font-style: normal; color: var(--accent);
          text-shadow: 0 0 30px rgba(0,229,160,0.3);
        }

        .subline { color: var(--muted); font-size: 0.82rem; line-height: 1.7; }

        .search-container { width: 100%; max-width: 580px; display: flex; flex-direction: column; gap: 1rem; }

        .input-wrap {
          display: flex; align-items: center; gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.85rem 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-wrap:focus-within {
          border-color: var(--accent2);
          box-shadow: 0 0 0 3px rgba(0,229,160,0.08), 0 0 20px rgba(0,229,160,0.05);
        }

        .input-wrap.errored { border-color: var(--error); }

        .cursor-icon { color: var(--accent); font-size: 0.85rem; flex-shrink: 0; }

        .search-input {
          flex: 1; background: none; border: none; outline: none;
          color: var(--text); font-family: var(--font-mono);
          font-size: 1.15rem; letter-spacing: 0.05em;
        }

        .search-input::placeholder { color: var(--muted); }

        .spinner {
          width: 16px; height: 16px; flex-shrink: 0;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .clear-btn {
          background: none; border: none; cursor: pointer;
          color: var(--muted); font-size: 0.75rem;
          padding: 0.2rem 0.4rem; border-radius: 2px;
          transition: color 0.15s;
        }
        .clear-btn:hover { color: var(--text); }

        .error-bar {
          font-size: 0.78rem; color: var(--error);
          padding: 0.6rem 0.75rem;
          border: 1px solid rgba(255,95,95,0.25);
          border-radius: 3px;
          background: rgba(255,95,95,0.05);
        }

        .suggestions { display: flex; flex-direction: column; gap: 0.6rem; }

        .suggestions-label { font-size: 0.68rem; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
        .suggestions-label strong { color: var(--text); }

        .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }

        .chip {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 0.45rem 0.85rem;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.1s;
          animation: chipIn 0.25s ease both;
        }

        @keyframes chipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chip:hover { border-color: var(--accent2); background: rgba(0,229,160,0.06); }
        .chip:active { transform: scale(0.97); }
        .chip-selected { border-color: var(--accent); background: rgba(0,229,160,0.12); }

        .match-prefix { color: var(--muted); }
        .match-rest { color: var(--accent); font-weight: 700; }

        .empty-state { font-size: 0.78rem; color: var(--muted); text-align: center; padding: 0.5rem; }

        .history-section { width: 100%; max-width: 580px; }
        .history-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 0.5rem; }
        .history-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }

        .history-tag {
          font-size: 0.75rem; color: var(--muted);
          border: 1px solid var(--border);
          padding: 0.2rem 0.55rem; border-radius: 2px;
          cursor: pointer; transition: color 0.15s, border-color 0.15s;
        }
        .history-tag:hover { color: var(--text); border-color: var(--muted); }

        .model-info {
          display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
          width: 100%; max-width: 580px;
        }

        .info-card {
          flex: 1; min-width: 100px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.85rem 1rem;
          text-align: center;
        }

        .info-val {
          font-family: var(--font-display); font-weight: 800;
          font-size: 1.5rem; color: var(--accent); line-height: 1;
          margin-bottom: 0.25rem;
        }

        .info-key { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }

        @media (max-width: 480px) {
          .headline { font-size: 1.8rem; }
          .header { padding: 1rem; }
          .main { padding: 2rem 1rem; }
        }
      `}</style>
    </div>
  );
}