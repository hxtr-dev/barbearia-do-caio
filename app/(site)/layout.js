import Background from '@/components/Background';
import { CartProvider } from '@/components/CartProvider';
import SiteHeader from '@/components/SiteHeader';

export default function SiteLayout({ children }) {
  return (
    <CartProvider>
      <Background />
      <SiteHeader />
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <span>BrasaBurg &amp; Freeze · Do fogo ao gelo</span>
        <a href="https://instagram.com/brasafreeze" target="_blank" rel="noreferrer">@brasafreeze</a>
      </footer>
    </CartProvider>
  );
}
