import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/Providers';
import { Header } from '../components/Header';

export const metadata: Metadata = {
    title: 'Ecommerce 3D Print',
    description: 'Loja Premium de Impressão 3D',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body>
                <Providers>
                    <Header />
                    <main className="main-content">
                        {children}
                    </main>
                    <footer className="footer">
                        <p>© 2026 E-3D Print. Todos os direitos reservados.</p>
                    </footer>
                </Providers>
            </body>
        </html>
    );
}
