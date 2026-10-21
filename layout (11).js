import { Bebas_Neue, Inter } from 'next/font/google';
import './globals.css';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: 'BrasaBurg & Freeze',
  description: 'Hambúrgueres premium e geladinhos gourmet. Do fogo ao gelo.',
  icons: { icon: '/logo.png' },
};

export const viewport = { themeColor: '#0b0b0d', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
