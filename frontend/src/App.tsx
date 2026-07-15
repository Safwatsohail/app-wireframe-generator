import { useState } from "react";
import type { AppFlow, AppScreen, GenerateOptions, GenerationStep } from "./types";
import { generateAppFlow } from "./api";

type View = "landing" | "customize" | "generating" | "results";

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// ─── Phone Mockup Component ──────────────────────────────────────────────────

function PhoneMockup({ screen, primary, isActive, onClick }: {
  screen: AppScreen; primary: string; isActive: boolean; onClick: () => void;
}) {
  const iconMap: Record<string, string> = {
    splash: "✦", onboarding: "→", auth: "🔑", home: "⊞",
    search: "⌕", profile: "◎", detail: "≡", success: "✓", empty: "○",
  };
  const icon = iconMap[screen.type] ?? "◈";
  const elements = screen.content.elements ?? [];

  return (
    <div onClick={onClick} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: isActive ? "scale(1.05)" : "scale(1)", transition: "transform 0.2s" }}>
      <div style={{
        width: 160, height: 300, borderRadius: 28,
        border: isActive ? `2px solid ${primary}` : "2px solid rgba(255,255,255,0.1)",
        background: "linear-gradient(160deg,#1a1b26,#0d0e18)",
        padding: "10px 8px", boxSizing: "border-box",
        display: "flex", flexDirection: "column", gap: 6,
        boxShadow: isActive ? `0 0 0 3px rgba(${hexToRgb(primary)},0.3),0 20px 40px rgba(0,0,0,0.5)` : "0 8px 24px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}>
        <div style={{ width: 50, height: 8, background: "#0d0e18", borderRadius: 4, margin: "0 auto", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 6px" }}>
          <div style={{ fontSize: 28, width: 52, height: 52, borderRadius: 16, background: `rgba(${hexToRgb(primary)},0.15)`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid rgba(${hexToRgb(primary)},0.3)` }}>{icon}</div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#f1f5f9", textAlign: "center", letterSpacing: 0.3 }}>{screen.content.greeting ?? screen.name}</p>
          {screen.content.subtitle && <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.4 }}>{screen.content.subtitle}</p>}
          {screen.content.primary_action && (
            <div style={{ marginTop: 4, background: primary, borderRadius: 8, padding: "5px 14px", fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>{screen.content.primary_action}</div>
          )}
          {elements.slice(0, 2).map((el, i) => (
            <div key={i} style={{ width: "100%", height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 5, display: "flex", alignItems: "center", paddingLeft: 8 }}>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}>{el}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 28, background: "rgba(255,255,255,0.04)", borderRadius: "0 0 20px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          {["←","●","⊟"].map((s, i) => <span key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s}</span>)}
        </div>
      </div>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{screen.name}</span>
    </div>
  );
}

// ─── Screen Detail Panel ─────────────────────────────────────────────────────

function ScreenDetail({ screen, primary }: { screen: AppScreen; primary: string }) {
  const elements = screen.content.elements ?? [];
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(${hexToRgb(primary)},0.15)`, border: `1px solid rgba(${hexToRgb(primary)},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {{ splash:"✦",onboarding:"→",auth:"🔑",home:"⊞",search:"⌕",profile:"◎",detail:"≡",success:"✓",empty:"○" }[screen.type] ?? "◈"}
        </div>
        <div>
          <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: 18, fontWeight: 600 }}>{screen.name}</h3>
          <span style={{ fontSize: 12, color: primary, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{screen.type}</span>
        </div>
      </div>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6 }}>{screen.description}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {screen.content.greeting && <InfoChip label="Heading" value={screen.content.greeting} primary={primary} />}
        {screen.content.subtitle && <InfoChip label="Subtitle" value={screen.content.subtitle} primary={primary} />}
        {screen.content.primary_action && <InfoChip label="Primary CTA" value={screen.content.primary_action} primary={primary} />}
        {screen.content.secondary_action && <InfoChip label="Secondary CTA" value={screen.content.secondary_action} primary={primary} />}
      </div>
      {elements.length > 0 && (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Elements</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {elements.map((el, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{el}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value, primary }: { label: string; value: string; primary: string }) {
  return (
    <div style={{ background: `rgba(${hexToRgb(primary)},0.07)`, border: `1px solid rgba(${hexToRgb(primary)},0.15)`, borderRadius: 12, padding: "10px 14px" }}>
      <p style={{ margin: "0 0 3px", fontSize: 10, color: primary, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{value}</p>
    </div>
  );
}

// ─── Views ───────────────────────────────────────────────────────────────────

function LandingView({ prompt, setPrompt, onContinue, error }: {
  prompt: string; setPrompt: (v: string) => void; onContinue: () => void; error: string | null;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#080910", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 100, padding: "6px 16px", fontSize: 12, color: "#a5b4fc", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>AI Wireframe Generator</div>
          <h1 style={{ margin: 0, fontSize: 52, fontWeight: 700, color: "#f1f5f9", textAlign: "center", lineHeight: 1.1, letterSpacing: -1.5 }}>Turn your idea into<br /><span style={{ color: "#6366f1" }}>a real app flow</span></h1>
          <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.45)", textAlign: "center", maxWidth: 480, lineHeight: 1.6 }}>Describe your app in plain English. Get screens, flows, and a full prototype in seconds.</p>
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 4 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A fitness app that tracks workouts, shows progress charts, and lets users follow friends..."
            style={{ width: "100%", minHeight: 120, background: "transparent", border: "none", outline: "none", resize: "none", color: "#f1f5f9", fontSize: 15, padding: "16px 18px", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px" }}>
            <button
              onClick={onContinue}
              disabled={!prompt.trim()}
              style={{ background: prompt.trim() ? "#6366f1" : "rgba(99,102,241,0.3)", color: prompt.trim() ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: prompt.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}
            >Continue →</button>
          </div>
        </div>
        {error && <p style={{ color: "#f87171", fontSize: 14, margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}

function CustomizeView({ options, setOptions, onGenerate, onBack }: {
  options: GenerateOptions; setOptions: (o: GenerateOptions) => void; onGenerate: () => void; onBack: () => void;
}) {
  const styles = ["Modern", "Minimal", "Bold", "Playful", "Corporate"];
  return (
    <div style={{ minHeight: "100vh", background: "#080910", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 24 }}>← Back</button>
          <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.5 }}>Customize your app</h2>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Pick a color and style to match your vision.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.8 }}>Primary Color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px" }}>
            <input type="color" value={options.primaryColor} onChange={e => setOptions({ ...options, primaryColor: e.target.value })}
              style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer", background: "none", padding: 0 }} />
            <span style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 500, fontFamily: "monospace" }}>{options.primaryColor.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.8 }}>Style</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {styles.map(s => (
              <button key={s} onClick={() => setOptions({ ...options, style: s })}
                style={{ background: options.style === s ? options.primaryColor : "rgba(255,255,255,0.05)", border: `1px solid ${options.style === s ? options.primaryColor : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 500, color: options.style === s ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.15s" }}
              >{s}</button>
            ))}
          </div>
        </div>
        <button onClick={onGenerate}
          style={{ background: options.primaryColor, border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", marginTop: 8, transition: "opacity 0.2s" }}
        >Generate App Flow ✦</button>
      </div>
    </div>
  );
}

function GeneratingView({ steps, primary }: { steps: GenerationStep[]; primary: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#080910", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, fontFamily: "system-ui,sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid rgba(${hexToRgb(primary)},0.2)`, borderTop: `3px solid ${primary}`, animation: "spin 1s linear infinite" }} />
        <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: 24, fontWeight: 600 }}>Building your app...</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
        {steps.map(s => (
          <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", background: s.done ? `rgba(${hexToRgb(primary)},0.08)` : "rgba(255,255,255,0.03)", border: `1px solid ${s.done ? `rgba(${hexToRgb(primary)},0.25)` : "rgba(255,255,255,0.06)"}`, borderRadius: 12, transition: "all 0.3s" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.done ? primary : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: s.done ? "#fff" : "rgba(255,255,255,0.3)", flexShrink: 0, fontWeight: 700 }}>{s.done ? "✓" : s.step}</div>
            <span style={{ fontSize: 14, color: s.done ? "#f1f5f9" : "rgba(255,255,255,0.4)", fontWeight: s.done ? 500 : 400 }}>{s.message}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultsView({ appFlow, onReset }: { appFlow: AppFlow; onReset: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const primary = appFlow.primary_color;
  const activeScreen = appFlow.screens[activeIdx];

  return (
    <div style={{ minHeight: "100vh", background: "#080910", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
          <div>
            <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>{appFlow.app_name}</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{appFlow.tagline}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {appFlow.tech_stack.slice(0, 3).map((t, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{t}</span>
            ))}
          </div>
          <button onClick={onReset} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "inherit" }}>+ New App</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Screen board */}
        <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{appFlow.screens.length} Screens</h3>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              <span>⏱ {appFlow.estimated_dev_time}</span>
              <span>👥 {appFlow.target_audience}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            {appFlow.screens.map((screen, i) => (
              <PhoneMockup key={screen.id} screen={screen} primary={primary} isActive={activeIdx === i} onClick={() => setActiveIdx(i)} />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ width: 320, borderLeft: "1px solid rgba(255,255,255,0.07)", padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Screen {activeIdx + 1} of {appFlow.screens.length}</p>
          {activeScreen && <ScreenDetail screen={activeScreen} primary={primary} />}
          <div style={{ marginTop: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>App Colors</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[["Primary", appFlow.primary_color], ["Secondary", appFlow.secondary_color], ["Background", appFlow.background_color]].map(([name, color]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: color, border: "1px solid rgba(255,255,255,0.1)" }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<GenerateOptions>({ primaryColor: "#6366f1", style: "Modern" });
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [appFlow, setAppFlow] = useState<AppFlow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setView("generating");
    setSteps([]);
    setError(null);
    try {
      for await (const event of generateAppFlow(prompt, options)) {
        if (event.type === "step") {
          setSteps(prev => {
            const idx = prev.findIndex(s => s.step === event.data.step);
            if (idx >= 0) { const u = [...prev]; u[idx] = event.data; return u; }
            return [...prev, event.data];
          });
        } else if (event.type === "result") {
          setAppFlow(event.data);
          setView("results");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("landing");
    }
  };

  if (view === "landing") return <LandingView prompt={prompt} setPrompt={setPrompt} onContinue={() => prompt.trim() && setView("customize")} error={error} />;
  if (view === "customize") return <CustomizeView options={options} setOptions={setOptions} onGenerate={handleGenerate} onBack={() => setView("landing")} />;
  if (view === "generating") return <GeneratingView steps={steps} primary={options.primaryColor} />;
  if (view === "results" && appFlow) return <ResultsView appFlow={appFlow} onReset={() => { setView("landing"); setAppFlow(null); setPrompt(""); }} />;
  return null;
}
