import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import Link from 'next/link';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-cormorant',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: {
    default: 'E-3D Print — Impressão 3D Artesanal',
    template: '%s | E-3D Print',
  },
  description:
    'Peças únicas em impressão 3D de alta qualidade. PLA, PETG, Resina e mais. Cada objeto feito com cuidado, entregue em todo o Brasil.',
  keywords: ['impressão 3d', 'miniaturas 3d', 'peças 3d', 'pla', 'petg', 'resina', 'comprar online'],
  authors: [{ name: 'E-3D Print' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'E-3D Print',
    title: 'E-3D Print — Impressão 3D Artesanal',
    description: 'Peças únicas em impressão 3D. Cada objeto feito com cuidado.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-3D Print — Impressão 3D Artesanal',
    description: 'Peças únicas em impressão 3D de alta qualidade.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${jakarta.variable}`}>
      <body>
        <Providers>
          <Header />
          <main className="main-content">{children}</main>

          <footer className="site-footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <span className="footer-logo">E-3D Print</span>
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
              <span>© {new Date().getFullYear()} E-3D Print · Todos os direitos reservados</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
