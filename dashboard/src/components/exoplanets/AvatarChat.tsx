"use client";

import { useEffect, useRef, useState } from "react";
import { ExoplanetFlow } from "@/app/exoplanets/page";

interface SelectionData {
  explore: string;
  telescope: string;
  system: string;
}

interface Props {
  flow: ExoplanetFlow;
  onComplete: (selections: SelectionData) => void;
  onSkip: () => void;
}

type ChatStep =
  | "welcome"
  | "question1"
  | "question1b" // ← after NO
  | "question2"
  | "question3"
  | "farewell"
  | "glitch"
  | "done";

const TELESCOPES = ["JWST", "TESS", "KEPLER", "HUBBLE"];
const SYSTEMS = ["TRAPPIST-1", "KEPLER-452", "PROXIMA CEN", "HD 209458"];

// Typewriter hook
function useTypewriter(text: string, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, active]);

  return { displayed, done };
}

export default function AvatarChat({ flow, onComplete, onSkip }: Props) {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [visible, setVisible] = useState(false);
  const [glitchText, setGlitchText] = useState("");
  const [selections, setSelections] = useState({
    explore: "",
    telescope: "",
    system: "",
  });
  const glitchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Appear when freeze complete
  useEffect(() => {
    if (flow === "chat") {
      setTimeout(() => setVisible(true), 400);
    }
  }, [flow]);

  // Message per step
  const getMessage = () => {
    switch (step) {
      case "welcome":
        return "ARIA ONLINE. Welcome, researcher. I am your Astroflux navigation interface.";
      case "question1":
        return "Are you ready to explore the exoplanetary void?";
      case "question1b":
        return "Understood. Shall I return you to the main portal, or would you prefer to explore freely?";
      case "question2":
        return "Select your primary telescope array for this mission.";
      case "question3":
        return "Which star system do you wish to observe?";
      case "farewell":
        return selections.explore === "NO"
          ? "Understood. Initializing Astroflux Engine with default parameters. Good luck, researcher."
          : `Coordinates locked. ${selections.telescope} trained on ${selections.system}. Good luck on your journey, researcher.`;
      case "glitch":
        return glitchText;
      default:
        return "";
    }
  };

  const { displayed, done } = useTypewriter(
    getMessage(),
    step === "glitch" ? 0 : 120,
    visible && step !== "done",
  );

  // After welcome — auto advance
  useEffect(() => {
    if (step === "welcome" && done) {
      setTimeout(() => setStep("question1"), 1800);
    }
  }, [step, done]);

  // After farewell — trigger glitch
  useEffect(() => {
    if (step === "farewell" && done) {
      setTimeout(() => startGlitch(), 2500);
    }
  }, [step, done]);

  // Glitch sequence
  function startGlitch() {
    setStep("glitch");
    const glitchChars = "▓▒░█▄▀■□▪▫◆◇○●";
    let count = 0;
    const totalGlitches = 10;

    glitchRef.current = setInterval(() => {
      const len = 20 + Math.floor(Math.random() * 20);
      let txt = "";
      for (let i = 0; i < len; i++) {
        txt += glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      setGlitchText(txt);
      count++;

      if (count >= totalGlitches) {
        if (glitchRef.current) clearInterval(glitchRef.current);
        setStep("done");
        setVisible(false);
        setTimeout(() => onComplete(selections), 1500);
      }
    }, 120);
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (glitchRef.current) clearInterval(glitchRef.current);
    };
  }, []);

  function handleExplore(val: string) {
    setSelections((s) => ({ ...s, explore: val }));
    if (val === "NO") {
      setStep("question1b");
    } else {
      setStep("question2");
    }
  }

  function handlePostNo(val: string) {
    if (val === "HOME") {
      window.location.href = "/";
    } else {
      // FREE EXPLORE — warp with no preselection
      setStep("farewell");
    }
  }

  function handleTelescope(val: string) {
    setSelections((s) => ({ ...s, telescope: val }));
    setStep("question3");
  }

  function handleSystem(val: string) {
    setSelections((s) => ({ ...s, system: val }));
    setStep("farewell");
  }

  if (flow !== "chat" && flow !== "warping") return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      style={{
        opacity: visible && step !== "done" ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        className="flex flex-col items-center gap-8 pointer-events-auto"
        style={{ maxWidth: "520px", width: "90%" }}
      >
        {/* Avatar circle */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: "100px",
              height: "100px",
              border: "1px solid rgba(180,220,255,0.3)",
              animation: "ariaRing 3s linear infinite",
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: "80px",
              height: "80px",
              border: "1px solid rgba(180,220,255,0.15)",
              animation: "ariaRing 2s linear infinite reverse",
            }}
          />
          {/* Core */}
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: "62px",
              height: "62px",
              background:
                "radial-gradient(circle, rgba(180,220,255,0.15) 0%, rgba(140,190,255,0.05) 100%)",
              border: "1px solid rgba(180,220,255,0.5)",
              boxShadow:
                "0 0 20px rgba(180,220,255,0.2), inset 0 0 15px rgba(180,220,255,0.05)",
            }}
          >
            <span
              className="font-mono font-bold"
              style={{
                fontSize: "15px",
                color: "rgba(200,235,255,0.9)",
                letterSpacing: "0.15em",
              }}
            >
              ARIA
            </span>
          </div>

          {/* Pulse dots */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: "3px",
                height: "3px",
                background: "rgba(180,220,255,0.7)",
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 120}deg) translateX(48px) translateY(-50%)`,
                animation: `ariaDot 1.5s ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Message box */}
        <div
          style={{
            background: "rgba(10,15,25,0.7)",
            border: "1px solid rgba(180,220,255,0.15)",
            backdropFilter: "blur(12px)",
            padding: "24px 28px",
            width: "100%",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="rounded-full"
              style={{
                width: "6px",
                height: "6px",
                background: "#4ade80",
                boxShadow: "0 0 6px #4ade80",
                animation: "ariaPulse 2s ease-in-out infinite",
              }}
            />
            <span
              className="font-mono"
              style={{
                fontSize: "9px",
                color: "rgba(180,220,255,0.4)",
                letterSpacing: "0.25em",
              }}
            >
              ARIA · ASTROFLUX NAV INTERFACE
            </span>
          </div>

          {/* Text */}
          <p
            className="font-mono"
            style={{
              fontSize: "13px",
              color:
                step === "glitch"
                  ? "rgba(255,100,100,0.8)"
                  : "rgba(220,238,255,0.9)",
              lineHeight: "1.7",
              letterSpacing: "0.04em",
              minHeight: "44px",
            }}
          >
            {displayed}
            {/* Cursor */}
            {!done && step !== "glitch" && (
              <span
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "13px",
                  background: "rgba(180,220,255,0.8)",
                  marginLeft: "2px",
                  verticalAlign: "middle",
                  animation: "ariaBlink 0.8s step-end infinite",
                }}
              />
            )}
          </p>
        </div>

        {/* Action buttons */}
        {done && (
          <div
            className="flex flex-wrap gap-3 justify-center"
            style={{
              opacity: done ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            {step === "question1" && (
              <>
                {["YES", "NO"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleExplore(opt)}
                    className="font-mono"
                    style={{
                      border: "1px solid rgba(180,220,255,0.25)",
                      background: "rgba(180,220,255,0.05)",
                      color: "rgba(200,235,255,0.8)",
                      padding: "10px 28px",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.12)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.6)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.05)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.25)";
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </>
            )}

            {step === "question1b" && (
              <>
                {[
                  { label: "RETURN HOME", val: "HOME" },
                  { label: "FREE EXPLORE", val: "FREE" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => handlePostNo(opt.val)}
                    className="font-mono"
                    style={{
                      border: "1px solid rgba(180,220,255,0.25)",
                      background: "rgba(180,220,255,0.05)",
                      color: "rgba(200,235,255,0.8)",
                      padding: "10px 24px",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.12)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.6)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.05)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.25)";
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </>
            )}

            {step === "question2" && (
              <div className="grid grid-cols-2 gap-2 w-full">
                {TELESCOPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTelescope(t)}
                    className="font-mono"
                    style={{
                      border: "1px solid rgba(180,220,255,0.2)",
                      background: "rgba(180,220,255,0.04)",
                      color: "rgba(200,235,255,0.7)",
                      padding: "10px 16px",
                      fontSize: "10px",
                      letterSpacing: "0.2em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.10)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.04)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.2)";
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {step === "question3" && (
              <div className="grid grid-cols-2 gap-2 w-full">
                {SYSTEMS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSystem(s)}
                    className="font-mono"
                    style={{
                      border: "1px solid rgba(180,220,255,0.2)",
                      background: "rgba(180,220,255,0.04)",
                      color: "rgba(200,235,255,0.7)",
                      padding: "10px 16px",
                      fontSize: "10px",
                      letterSpacing: "0.2em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.10)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background =
                        "rgba(180,220,255,0.04)";
                      (e.target as HTMLElement).style.borderColor =
                        "rgba(180,220,255,0.2)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes ariaRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ariaDot {
          0%, 100% { opacity: 0.3; transform: rotate(var(--r)) translateX(48px) translateY(-50%) scale(1); }
          50%       { opacity: 1;   transform: rotate(var(--r)) translateX(48px) translateY(-50%) scale(1.5); }
        }
        @keyframes ariaPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; box-shadow: 0 0 10px #4ade80; }
        }
        @keyframes ariaBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
