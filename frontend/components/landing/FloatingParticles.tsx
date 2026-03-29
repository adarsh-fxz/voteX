"use client";

import { motion, useReducedMotion } from "framer-motion";

type FloatingParticlesProps = {
  className?: string;
  count?: number;
};

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

export function FloatingParticles({
  className,
  count = 16,
}: FloatingParticlesProps) {
  const reduceMotion = useReducedMotion();
  const particles = Array.from({ length: count }, (_, index) => {
    const rand = seededRandom(index + 11);
    return {
      top: rand() * 100,
      left: rand() * 100,
      size: 2 + rand() * 4,
      duration: 12 + rand() * 10,
      driftX: -18 + rand() * 36,
      driftY: -22 + rand() * 44,
      opacity: 0.18 + rand() * 0.22,
    };
  });

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-white/70 dark:bg-primary/80"
          style={{
            top: `${particle.top}%`,
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, particle.driftX, 0],
                  y: [0, particle.driftY, 0],
                }
          }
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function cn(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
