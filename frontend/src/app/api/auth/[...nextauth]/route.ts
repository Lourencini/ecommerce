import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { API_URL } from '@/lib/api';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const { accessToken } = await res.json();

          // Buscar dados do usuário
          const meRes = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!meRes.ok) return null;

          const user = await meRes.json();

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            customerId: user.customer?.id ?? null,
            accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.customerId = (user as any).customerId;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        if (session.user) {
          (session.user as any).id          = token.id;
          (session.user as any).role        = token.role;
          (session.user as any).customerId  = token.customerId;
          (session.user as any).accessToken = token.accessToken;
        }
        // Expor também na raiz do objeto session para conveniência
        (session as any).accessToken  = token.accessToken;
        (session as any).role         = token.role;
        (session as any).customerId   = token.customerId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
