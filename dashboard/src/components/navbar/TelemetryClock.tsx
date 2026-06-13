"use client";

import { useState, useEffect } from "react";

interface DigitDisplayProps {
  digit: string;
}

function DigitDisplay({ digit }: DigitDisplayProps) {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (digit !== displayDigit) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayDigit(digit);
        setIsAnimating(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [digit, displayDigit]);

  return (
    <div className="relative w-5 h-7 overflow-hidden flex items-center justify-center">
      <style>{`
        @keyframes odometer-drop {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(1.75rem);
            opacity: 1;
          }
        }

        .digit-animate {
          animation: odometer-drop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Current digit */}
      <div
        className={`font-mono font-medium text-white text-sm leading-none ${
          isAnimating ? "digit-animate" : ""
        }`}
        style={{
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayDigit}
      </div>

      {/* Next digit for incoming animation */}
      {isAnimating && (
        <div
          className="absolute top-7 left-0 font-mono font-medium text-white text-sm leading-none"
          style={{
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {digit}
        </div>
      )}
    </div>
  );
}

export default function TelemetryClock() {
  const [time, setTime] = useState({
    h1: "0",
    h2: "0",
    m1: "0",
    m2: "0",
    s1: "0",
    s2: "0",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      setTime({
        h1: hours[0],
        h2: hours[1],
        m1: minutes[0],
        m2: minutes[1],
        s1: seconds[0],
        s2: seconds[1],
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  return (
    <div className="flex flex-col px-4 py-2 gap-1">
      <div className="text-white/40 text-[9px] font-light tracking-[0.25em] uppercase">
        MISSION TIME
      </div>
      <div
        className="flex items-center gap-1 font-mono tracking-wide"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <DigitDisplay digit={time.h1} />
        <DigitDisplay digit={time.h2} />

        <span className="text-white/60 text-sm font-light leading-none">:</span>

        <DigitDisplay digit={time.m1} />
        <DigitDisplay digit={time.m2} />

        <span className="text-white/60 text-sm font-light leading-none">:</span>

        <DigitDisplay digit={time.s1} />
        <DigitDisplay digit={time.s2} />
      </div>
    </div>
  );
}
