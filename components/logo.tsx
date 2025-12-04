export function LaristoLogo({ className = "w-9 h-9", showText = false }: { className?: string, showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="icl-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Problème à 3 corps - Cercles imbriqués/superposés */}

        {/* Grand cercle (le plus grand, englobe les autres) */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="url(#icl-gradient)"
          strokeWidth="2.5"
          opacity="0.85"
        />

        {/* Moyen cercle (intérieur gauche du grand) */}
        <circle
          cx="18"
          cy="24"
          r="12"
          fill="none"
          stroke="url(#icl-gradient)"
          strokeWidth="2.5"
          opacity="0.90"
        />

        {/* Petit cercle (intérieur droit du moyen) */}
        <circle
          cx="24"
          cy="24"
          r="7"
          fill="none"
          stroke="url(#icl-gradient)"
          strokeWidth="2.5"
          opacity="0.95"
        />
      </svg>

      {showText && (
        <div>
          <h1 className="text-xl font-bold text-slate-50 tracking-tight">ICL</h1>
          <p className="text-xs text-cyan-400 font-medium tracking-wide">BUDGET</p>
        </div>
      )}
    </div>
  )
}
