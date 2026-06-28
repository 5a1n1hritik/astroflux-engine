"use client";

/**
 * TopPanel.tsx
 * src/components/universe/hud/TopPanel.tsx
 * ──────────────────────────────────────────────────────────────────────────
 * NASA "Eyes on Exoplanets" style top navigation bar.
 * Plain text overlay — no card, no border, no glass.
 *
 * Layout:
 *   Left  — Logo circle + "ASTROFLUX ENGINE"
 *   Right — HOME | BROWSE DESTINATIONS | SPACECRAFT | 🔍
 *
 * Search:
 *   Icon click → input expands inline (right side)
 *   Typing → debounced fetch to /api/v1/search?q=...
 *   Dropdown — scrollable results, star + planet entries
 *   Click result → onTargetSelect(name) → triggers pipeline
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

interface CatalogEntry {
  name:              string;
  type:              "planet" | "star";
  planet_type?:      string;
  star_name?:        string;
  star_type:         string;
  discovery_year?:   number | null;
  distance_ly?:      number | null;
  planets_in_system: number;
}

export interface TopPanelProps {
  onTargetSelect: (name: string) => void;
}

// ── Shared text styles ────────────────────────────────────────────────────

const monoSm: React.CSSProperties = {
  fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
  fontSize:      11,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color:         "rgba(203,213,225,0.80)",
  cursor:        "pointer",
  background:    "none",
  border:        "none",
  padding:       "0 2px",
  whiteSpace:    "nowrap",
  transition:    "color 0.15s ease",
};

// ── Component ─────────────────────────────────────────────────────────────

export default function TopPanel({ onTargetSelect }: TopPanelProps) {
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState<CatalogEntry[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef    = useRef<HTMLDivElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search fetch
  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/v1/search?q=${encodeURIComponent(val)}&limit=40`);
        const data = await res.json();
        setResults(data.results ?? []);
        setDropdownOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
  }, []);

  const handleSelect = useCallback((entry: CatalogEntry) => {
    // For planets use planet name; for stars use first planet or star name
    const target = entry.type === "planet" ? entry.name : entry.name;
    onTargetSelect(target);
    setSearchOpen(false);
    setDropdownOpen(false);
    setQuery("");
    setResults([]);
  }, [onTargetSelect]);

  return (
    <div
      ref={panelRef}
      style={{
        position:       "absolute",
        top:            0,
        left:           0,
        right:          0,
        height:         52,
        display:        "flex",
        alignItems:     "center",
        paddingLeft:    20,
        paddingRight:   20,
        zIndex:         30,
        // Subtle top bar — very faint, not blocking canvas
        borderBottom:   "1px solid rgba(226,232,240,0.05)",
      }}
    >
      {/* ── LEFT: Logo + Name ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Logo circle */}
        <div style={{
          width:        32,
          height:       32,
          borderRadius: "50%",
          border:       "2px solid rgba(226,232,240,0.30)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          flexShrink:   0,
        }}>
          {/* Simple orbit icon inside circle */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" fill="rgba(226,232,240,0.85)" />
            <ellipse cx="9" cy="9" rx="7.5" ry="4" stroke="rgba(226,232,240,0.50)" strokeWidth="1.2" fill="none" />
          </svg>
        </div>

        <span style={{
          fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
          fontSize:      12,
          fontWeight:    700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color:         "rgba(226,232,240,0.90)",
          textShadow:    "0 1px 12px rgba(0,0,0,0.70)",
        }}>
          AstroFlux Engine
        </span>
      </div>

      {/* ── RIGHT: Nav + Search ── */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 24 }}>

        {/* Nav links — hidden when search open */}
        {!searchOpen && (
          <>
            {["Home", "Browse Destinations", "Spacecraft"].map((link) => (
              <button
                key={link}
                style={monoSm}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f1f5f9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(203,213,225,0.80)"; }}
              >
                {link}
              </button>
            ))}
          </>
        )}

        {/* Search input — expands inline */}
        {searchOpen && (
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Type a name or partial name of a planet or star..."
              style={{
                width:         340,
                height:        30,
                background:    "rgba(15,23,42,0.85)",
                border:        "1px solid rgba(226,232,240,0.18)",
                borderRadius:  4,
                padding:       "0 32px 0 12px",
                fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
                fontSize:      10,
                letterSpacing: "0.04em",
                color:         "rgba(226,232,240,0.90)",
                outline:       "none",
              }}
            />
            {/* Clear button */}
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]); setDropdownOpen(false); inputRef.current?.focus(); }}
                style={{
                  position:   "absolute",
                  right:      6,
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  color:      "rgba(100,116,139,0.80)",
                  display:    "flex",
                  padding:    2,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* ── DROPDOWN ── */}
            {dropdownOpen && results.length > 0 && (
              <div style={{
                position:        "absolute",
                top:             36,
                right:           0,
                width:           380,
                maxHeight:       520,
                overflowY:       "auto",
                background:      "rgba(8,15,30,0.96)",
                border:          "1px solid rgba(226,232,240,0.10)",
                borderRadius:    6,
                zIndex:          50,
                boxShadow:       "0 16px 48px rgba(0,0,0,0.70)",
              }}>
                {results.map((entry, i) => (
                  <ResultRow
                    key={`${entry.type}-${entry.name}-${i}`}
                    entry={entry}
                    query={query}
                    onSelect={handleSelect}
                    isLast={i === results.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div style={{
                position:  "absolute",
                top:       36,
                right:     0,
                width:     380,
                padding:   "12px 16px",
                background: "rgba(8,15,30,0.96)",
                border:    "1px solid rgba(226,232,240,0.10)",
                borderRadius: 6,
                fontFamily: "var(--font-mono,'Space Mono',monospace)",
                fontSize:   9,
                color:      "rgba(100,116,139,0.70)",
                letterSpacing: "0.12em",
              }}>
                SCANNING CATALOG...
              </div>
            )}
          </div>
        )}

        {/* Search icon toggle */}
        <button
          onClick={() => { setSearchOpen((v) => !v); if (searchOpen) { setQuery(""); setResults([]); setDropdownOpen(false); } }}
          aria-label="Toggle search"
          style={{
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      searchOpen ? "#22d3ee" : "rgba(203,213,225,0.70)",
            display:    "flex",
            padding:    4,
            transition: "color 0.18s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { if (!searchOpen) e.currentTarget.style.color = "#f1f5f9"; }}
          onMouseLeave={(e) => { if (!searchOpen) e.currentTarget.style.color = "rgba(203,213,225,0.70)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Result Row ────────────────────────────────────────────────────────────

function ResultRow({ entry, query, onSelect, isLast }: {
  entry:    CatalogEntry;
  query:    string;
  onSelect: (e: CatalogEntry) => void;
  isLast:   boolean;
}) {
  const isPlanet = entry.type === "planet";

  // Highlight matching substring
  const highlight = (text: string) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <span style={{ color: "#22d3ee", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect(entry)}
      style={{
        padding:       "10px 16px",
        borderBottom:  isLast ? "none" : "1px solid rgba(226,232,240,0.05)",
        cursor:        "pointer",
        transition:    "background 0.15s ease",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(34,211,238,0.06)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      {/* Name */}
      <div style={{
        fontFamily:    "var(--font-mono,'Space Mono',monospace)",
        fontSize:      11,
        fontWeight:    700,
        color:         isPlanet ? "#22d3ee" : "#fbbf24",
        marginBottom:  4,
        letterSpacing: "0.04em",
      }}>
        {highlight(entry.name)}
      </div>

      {/* Meta */}
      <div style={{
        fontFamily:    "var(--font-mono,'Space Mono',monospace)",
        fontSize:      9,
        color:         "rgba(100,116,139,0.85)",
        letterSpacing: "0.06em",
        display:       "flex",
        gap:           12,
        flexWrap:      "wrap",
      }}>
        {isPlanet ? (
          <>
            <span>Planet Type: <span style={{ color: "rgba(203,213,225,0.80)" }}>{entry.planet_type ?? "—"}</span></span>
            <span>Star Type: <span style={{ color: "rgba(203,213,225,0.80)" }}>{entry.star_type}</span></span>
            {entry.discovery_year && <span>Discovery: <span style={{ color: "rgba(203,213,225,0.80)" }}>{entry.discovery_year}</span></span>}
            {entry.distance_ly    && <span>Distance from Earth: <span style={{ color: "rgba(203,213,225,0.80)", fontWeight: 700 }}>{entry.distance_ly.toLocaleString()} light-years</span></span>}
          </>
        ) : (
          <>
            <span>Star Type: <span style={{ color: "rgba(203,213,225,0.80)" }}>{entry.star_type}</span></span>
            <span>Planets: <span style={{ color: "rgba(203,213,225,0.80)" }}>{entry.planets_in_system}</span></span>
            {entry.distance_ly && <span>Distance from Earth: <span style={{ color: "rgba(203,213,225,0.80)", fontWeight: 700 }}>{entry.distance_ly.toLocaleString()} light-years</span></span>}
          </>
        )}
      </div>
    </div>
  );
}