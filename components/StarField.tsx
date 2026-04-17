"use client";

import { useEffect, useState } from "react";

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  waypoints: { tx: number; ty: number }[];
};

const COUNT = 65;

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateWaypoints() {
  // 4 random intermediate positions the star wanders through
  return Array.from({ length: 4 }, () => ({
    tx: randBetween(-22, 22),
    ty: randBetween(-22, 22),
  }));
}

export function StarField() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 6,
        opacity: Math.random() * 0.2 + 0.08,
        duration: randBetween(25, 55),
        delay: -(Math.random() * 55),
        waypoints: generateWaypoints(),
      }))
    );
  }, []);

  if (!stars.length) return null;

  const css = stars
    .map((s) => {
      const [w1, w2, w3, w4] = s.waypoints;
      return `
        @keyframes starDrift${s.id} {
          0%   { transform: translate(0px, 0px); }
          20%  { transform: translate(${w1.tx}px, ${w1.ty}px); }
          45%  { transform: translate(${w2.tx}px, ${w2.ty}px); }
          70%  { transform: translate(${w3.tx}px, ${w3.ty}px); }
          85%  { transform: translate(${w4.tx}px, ${w4.ty}px); }
          100% { transform: translate(0px, 0px); }
        }
      `;
    })
    .join("");

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <style>{css}</style>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            opacity: s.opacity,
            animation: `starDrift${s.id} ${s.duration}s ${s.delay}s ease-in-out infinite`,
            willChange: "transform",
          }}
        >
          <svg
            width={s.size}
            height={s.size}
            viewBox="-1 -1 2 2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,-1 L0.25,-0.25 L1,0 L0.25,0.25 L0,1 L-0.25,0.25 L-1,0 L-0.25,-0.25Z"
              fill="white"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
