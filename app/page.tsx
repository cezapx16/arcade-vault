import Link from "next/link";

// Placeholder temporal: la landing llega en los pasos 7 y 8 de la SPEC 02.
export default function Home() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          <Link href="/games">EXPLORAR JUEGOS ▸</Link>
        </div>
      </section>
    </div>
  );
}
