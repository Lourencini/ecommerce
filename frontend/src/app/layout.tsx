import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'E-3D Print — Impressões 3D Premium',
    template: '%s | E-3D Print',
  },
  description:
    'Peças e miniaturas em impressão 3D de alta qualidade. PLA, PETG, Resina e mais. Frete para todo o Brasil.',
  keywords: ['impressão 3d', 'miniaturas 3d', 'peças 3d', 'pla', 'petg', 'resina', 'comprar online'],
  authors: [{ name: 'E-3D Print' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'E-3D Print',
    title: 'E-3D Print — Impressões 3D Premium',
    description: 'Peças e miniaturas em impressão 3D de alta qualidade. Frete para todo o Brasil.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-3D Print — Impressões 3D Premium',
    description: 'Peças e miniaturas em impressão 3D de alta qualidade.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <Providers>
          <Header />
          <main className="main-content">{children}</main>
          <footer className="footer">
            <p>© {new Date().getFullYear()} E-3D Print. Todos os direitos reservados.</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
