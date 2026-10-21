import Link from 'next/link';
import StickyShowcase from '@/components/StickyShowcase';
import ThemeReset from '@/components/ThemeReset';
import { BURGERS, GELADINHOS } from '@/lib/menu';

export default function Home() {
  return (
    <>
      <ThemeReset />
      <section className="hero">
        <p className="kicker">Hambúrgueres premium · Geladinhos gourmet</p>
        <h1>
          <span className="fire">Do fogo</span> <span className="ice">ao gelo</span>
        </h1>
        <p className="hero-sub">
          Hambúrguer de carne no pão brioche e geladinhos cremosos. Escolha o seu Brasa ou o seu Freeze e peça pelo
          celular.
        </p>
        <div className="hero-actions">
          <Link href="/pedido" className="btn btn-big">Fazer meu pedido</Link>
          <a href="#brasa" className="btn btn-ghost">Conhecer os produtos</a>
        </div>
        <p className="scroll-cue" aria-hidden="true">role para baixo</p>
      </section>

      <StickyShowcase
        id="brasa"
        theme="brasa"
        kicker="01 · Brasa"
        title="Hambúrgueres"
        intro="Pão brioche, hambúrguer de carne, cheddar e o molho da casa. Quatro receitas, do clássico ao mais completo."
        products={BURGERS}
      />

      <StickyShowcase
        id="freeze"
        theme="freeze"
        kicker="02 · Freeze"
        title="Geladinhos gourmet"
        intro="Cremosos e bem gelados, para fechar o lanche ou para uma pausa no calor."
        products={GELADINHOS}
      />

      <section className="final-cta">
        <h2>
          Escolha o seu <span className="fire">Brasa</span> ou <span className="ice">Freeze</span>
        </h2>
        <Link href="/pedido" className="btn btn-big">Fazer meu pedido</Link>
      </section>
    </>
  );
}
