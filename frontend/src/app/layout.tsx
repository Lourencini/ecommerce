import type { Metadata } from 'next';
import { Cinzel_Decorative, IM_Fell_English, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import Link from 'next/link';

const cinzel = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-display',
});

const imFell = IM_Fell_English({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-fell',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: {
    default: 'WB Maker',
    template: '%s | WB Maker',
  },
  description:
    'Peças únicas em impressão 3D de alta qualidade. PLA, PETG, Resina e mais. Cada objeto feito com cuidado, entregue em todo o Brasil.',
  keywords: ['impressão 3d', 'miniaturas 3d', 'peças 3d', 'pla', 'petg', 'resina', 'comprar online'],
  authors: [{ name: 'WB Maker' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'WB Maker',
    title: 'WB Maker',
    description: 'Peças únicas em impressão 3D. Cada objeto feito com cuidado.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WB Maker',
    description: 'Peças únicas em impressão 3D de alta qualidade.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${imFell.variable} ${jakarta.variable}`}>
      <body>
        <Providers>
          <Header />
          <main className="main-content">{children}</main>

          <footer className="site-footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <span className="footer-logo">WB Maker</span>
                <p className="footer-tagline">
                  Impressão 3D feita com cuidado, entregue com qualidade.
                  Cada peça é única — assim como quem pede.
                </p>
              </div>
              <div className="footer-col">
                <h5>Produtos</h5>
                <Link href="/">Ver Vitrine</Link>
                <Link href="/?sort=newest">Lançamentos</Link>
                <Link href="/">Mais Vendidos</Link>
              </div>
              <div className="footer-col">
                <h5>Conta</h5>
                <Link href="/login">Entrar</Link>
                <Link href="/register">Criar conta</Link>
                <Link href="/minha-conta">Minha conta</Link>
              </div>
              <div className="footer-col">
                <h5>Ajuda</h5>
                <Link href="/orders/track">Rastrear pedido</Link>
                <Link href="/">Política de troca</Link>
                <Link href="/">Contato</Link>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} WB Maker · Todos os direitos reservados</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
