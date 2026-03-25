"use client";

/**
 * SphinxLogo — animated logo for sphinx-ci
 *
 * Usage:
 *   import SphinxLogo from "@/components/SphinxLogo";
 *   <SphinxLogo size={40} />
 *
 * Props:
 *   size      — width & height in px (default: 40)
 *   className — extra CSS classes on the <svg>
 */

interface SphinxLogoProps {
  size?: number;
  className?: string;
}

export default function SphinxLogo({
  size = 40,
  className = "",
}: SphinxLogoProps) {
  return (
    <>
      <style>{`
        /* ── Outer hexagon: draws itself, then rotates slowly ── */
        .sphinx-hex-outer {
          stroke-dasharray: 3200;
          stroke-dashoffset: 3200;
          transform-origin: 491.5px 496.5px;
          animation:
            sphinx-draw-hex    1.4s cubic-bezier(.4,0,.2,1) 0.1s forwards,
            sphinx-slow-rotate 18s  linear 2.5s infinite;
        }
        @keyframes sphinx-draw-hex {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sphinx-slow-rotate {
          to { transform: rotate(360deg); }
        }

        /* ── Inner hex background ── */
        .sphinx-hex-inner {
          opacity: 0;
          animation: sphinx-fade-in 0.5s ease 1.2s forwards;
        }
        @keyframes sphinx-fade-in { to { opacity: 1; } }

        /* ── Eye outer (gold ellipse) ── */
        .sphinx-eye-outer {
          opacity: 0;
          transform-origin: 491.5px 499.935px;
          transform: scale(0.3);
          animation: sphinx-eye-pop 0.55s cubic-bezier(.34,1.56,.64,1) 1.55s forwards;
        }
        @keyframes sphinx-eye-pop {
          to { opacity: 1; transform: scale(1); }
        }

        /* ── Eye mid (dark iris) ── */
        .sphinx-eye-mid {
          opacity: 0;
          transform-origin: 491.5px 499.935px;
          transform: scale(0.3);
          animation: sphinx-eye-pop 0.5s cubic-bezier(.34,1.56,.64,1) 1.75s forwards;
        }

        /* ── Pupil ── */
        .sphinx-eye-pupil {
          opacity: 0;
          transform-origin: 491.5px 499.935px;
          transform: scale(0.3);
          animation:
            sphinx-eye-pop 0.45s cubic-bezier(.34,1.56,.64,1) 1.9s forwards,
            sphinx-pulse   3.5s  ease-in-out 2.8s infinite;
        }
        @keyframes sphinx-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }

        /* ── Gleam ── */
        .sphinx-eye-gleam {
          opacity: 0;
          animation:
            sphinx-gleam-in    0.4s ease        2.2s forwards,
            sphinx-gleam-drift 4s   ease-in-out  3s  infinite;
        }
        @keyframes sphinx-gleam-in {
          0%   { opacity: 0; }
          60%  { opacity: 1; }
          100% { opacity: 0.8; }
        }
        @keyframes sphinx-gleam-drift {
          0%, 100% { transform: translate(0, 0);       opacity: 0.8; }
          50%      { transform: translate(4px, -3px);  opacity: 0.5; }
        }

        /* ── Blink (clipPath ellipse animates scaleY) ── */
        .sphinx-eyelid {
          transform-origin: 491.5px 499.935px;
          animation:
            sphinx-blink-intro 0.55s ease-in-out 4.2s 1,
            sphinx-blink-idle  28s   ease-in-out 12s  infinite;
        }
        @keyframes sphinx-blink-intro {
          0%   { transform: scaleY(1);    }
          30%  { transform: scaleY(0.04); }
          70%  { transform: scaleY(0.04); }
          100% { transform: scaleY(1);    }
        }
        @keyframes sphinx-blink-idle {
          0%, 3%, 100% { transform: scaleY(1);    }
          1%           { transform: scaleY(0.04); }
          2%           { transform: scaleY(0.04); }
        }

        /* ── Reduced motion: keep it static ── */
        @media (prefers-reduced-motion: reduce) {
          .sphinx-hex-outer,
          .sphinx-hex-inner,
          .sphinx-eye-outer,
          .sphinx-eye-mid,
          .sphinx-eye-pupil,
          .sphinx-eye-gleam,
          .sphinx-eyelid {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 983 993"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="sphinx-ci logo"
        role="img"
      >
        <defs>
          {/* clipPath controls the blink — its ellipse animates scaleY */}
          <clipPath id="sphinx-eye-clip">
            <ellipse
              className="sphinx-eyelid"
              cx="491.5"
              cy="499.935"
              rx="274.063"
              ry="153.048"
            />
          </clipPath>
        </defs>

        {/* 1. Outer hexagon — draws itself, then rotates */}
        <path
          className="sphinx-hex-outer"
          d="M491.5 12.3164L972 254.346V738.405L491.5 980.435L11 738.405V254.346L491.5 12.3164Z"
          stroke="#C9923A"
          strokeWidth="22"
        />

        {/* 2. Inner hexagon fill */}
        <path
          className="sphinx-hex-inner"
          d="M491.5 133.332L850.985 323.498V669.255L491.5 859.421L132.015 669.255V323.498L491.5 133.332Z"
          fill="#1A1308"
        />

        {/* 3-6. Eye — all clipped so gleam disappears on blink */}
        <g clipPath="url(#sphinx-eye-clip)">
          <ellipse
            className="sphinx-eye-outer"
            cx="491.5"
            cy="499.935"
            rx="274.063"
            ry="153.048"
            fill="#C9923A"
          />
          <ellipse
            className="sphinx-eye-mid"
            cx="491.5"
            cy="499.935"
            rx="153.048"
            ry="110.337"
            fill="#0D1117"
          />
          <circle
            className="sphinx-eye-pupil"
            cx="491.5"
            cy="499.936"
            r="67.626"
            fill="#C9923A"
          />
          {/* Gleam — inside clip so it disappears on blink */}
          <ellipse
            className="sphinx-eye-gleam"
            cx="541.33"
            cy="446.548"
            rx="24.915"
            ry="14.237"
            fill="#FCE9C0"
            opacity="0"
          />
        </g>
      </svg>
    </>
  );
}
