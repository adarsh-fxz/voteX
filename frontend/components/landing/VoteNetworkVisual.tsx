"use client";

import { motion, useReducedMotion } from "framer-motion";

const nodes = [
  { x: 160, y: 72, label: "Proof" },
  { x: 74, y: 192, label: "Wallet" },
  { x: 246, y: 192, label: "Tally" },
  { x: 160, y: 312, label: "IPFS" },
] as const;

const links = [
  { x1: 160, y1: 102, x2: 160, y2: 152 },
  { x1: 101, y1: 189, x2: 132, y2: 173 },
  { x1: 218, y1: 189, x2: 188, y2: 173 },
  { x1: 160, y1: 282, x2: 160, y2: 232 },
] as const;

export function VoteNetworkVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-136">
      <div className="absolute inset-[14%] rounded-full border border-primary/20 bg-primary/6 blur-2xl" />
      <svg
        viewBox="0 0 320 384"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 h-full w-full"
      >
        <circle
          cx="160"
          cy="192"
          r="142"
          className="stroke-primary/15"
          strokeWidth="1"
          strokeDasharray="6 8"
        />
        <circle
          cx="160"
          cy="192"
          r="106"
          className="stroke-cyan-400/12"
          strokeWidth="1"
          strokeDasharray="4 10"
        />

        {links.map((link, index) => (
          <motion.line
            key={index}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
            stroke="currentColor"
            className="text-primary/25"
            strokeWidth="1.5"
            strokeDasharray="5 6"
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: [0.3, 0.9, 0.3],
                  }
            }
            transition={{ duration: 2.8 + index * 0.3, repeat: Infinity }}
          />
        ))}

        <motion.g
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, -6, 0],
                }
          }
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect
            x="108"
            y="144"
            width="104"
            height="96"
            rx="22"
            fill="url(#cardFill)"
            stroke="url(#cardStroke)"
            strokeWidth="1.5"
          />
          <rect x="142" y="132" width="36" height="14" rx="7" fill="#22c55e" opacity="0.9" />
          <rect x="128" y="166" width="64" height="10" rx="5" fill="rgba(255,255,255,0.08)" />
          <rect x="128" y="184" width="64" height="10" rx="5" fill="rgba(56,189,248,0.14)" />
          <rect x="128" y="202" width="64" height="10" rx="5" fill="rgba(45,212,191,0.14)" />
          <motion.circle
            cx="196"
            cy="171"
            r="8"
            fill="#34d399"
            animate={reduceMotion ? undefined : { scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <path
            d="M192 171.5L195 174.5L200 168.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>

        {nodes.map((node, index) => (
          <g key={node.label}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="24"
              fill="rgba(7, 14, 29, 0.78)"
              stroke="rgba(91, 198, 255, 0.34)"
              strokeWidth="1.5"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.05, 1],
                    }
              }
              transition={{ duration: 3.2 + index * 0.35, repeat: Infinity }}
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              className="fill-slate-100 text-[11px] font-medium tracking-[0.18em]"
            >
              {node.label}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="cardFill" x1="108" y1="144" x2="212" y2="240">
            <stop stopColor="rgba(20, 29, 52, 0.92)" />
            <stop offset="1" stopColor="rgba(11, 20, 40, 0.82)" />
          </linearGradient>
          <linearGradient id="cardStroke" x1="108" y1="144" x2="212" y2="240">
            <stop stopColor="rgba(45, 212, 191, 0.75)" />
            <stop offset="1" stopColor="rgba(56, 189, 248, 0.35)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
