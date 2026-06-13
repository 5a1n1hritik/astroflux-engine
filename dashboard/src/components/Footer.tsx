const FOOTER_LINKS = [
  { label: "PRIVACY POLICY", href: "#" },
  { label: "DOCUMENTATION", href: "#" },
  { label: "API STATUS", href: "#" },
] as const;

export default function Footer() {
  return (
    <footer className="relative w-full border-t border-white/5 bg-void py-8 px-6 md:px-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left — Brand */}
        <div className="flex flex-col gap-1">
          <span className="font-sans font-bold text-xs tracking-[0.2em] uppercase text-white/80">
            ASTROFLUX
          </span>
          <span className="font-mono text-[10px] tracking-widest uppercase text-white/40">
            EXOPLANETARY TRANSIT SIMULATOR · © 2026
          </span>
        </div>

        {/* Right — Links */}
        <div className="flex items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-mono text-[10px] tracking-widest uppercase text-white/30 hover:text-white/70 transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

      </div>
    </footer>
  );
}