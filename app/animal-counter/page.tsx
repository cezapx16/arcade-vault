"use client";
import { useState } from "react";
const ANIMALS = [
  { emoji: "🐶", name: "PERRO" },
  { emoji: "🐱", name: "GATO" },
  { emoji: "🦊", name: "ZORRO" },
  { emoji: "🐼", name: "PANDA" },
  { emoji: "🦁", name: "LEÓN" },
  { emoji: "🐸", name: "RANA" },
  { emoji: "🐧", name: "PINGÜINO" },
  { emoji: "🐢", name: "TORTUGA" },
  { emoji: "🦉", name: "BÚHO" },
  { emoji: "🐙", name: "PULPO" },
];
export default function AnimalCounterPage() {
  const [count, setCount] = useState(0);
  const animal = ANIMALS[count % ANIMALS.length];
  return (
    <div className="fade-in flex flex-col items-center px-4 py-24 text-center">
      <div className="pixel neon-magenta text-[clamp(20px,5vw,36px)]">
        CONTADOR
      </div>
      <div className="pixel neon-cyan mt-6 text-[clamp(40px,10vw,72px)]">
        {count}
      </div>
      <div
        role="img"
        aria-label={animal.name}
        className="mt-8 text-[clamp(96px,25vw,160px)] leading-none"
      >
        {animal.emoji}
      </div>
      <div className="pixel mt-4 text-[12px] text-ink-dim">{animal.name}</div>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="btn lg mt-10"
      >
        +1
      </button>
    </div>
  );
}
