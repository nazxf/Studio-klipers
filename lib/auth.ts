import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // trustHost lets NextAuth honour the Host header when the app sits behind a
  // reverse proxy (Vercel, nginx, Cloudflare). Required for OAuth redirects to
  // resolve correctly in production deployments.
  trustHost: true,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  // Force secure cookie defaults. NextAuth picks reasonable defaults already,
  // but pinning them here prevents a future env tweak from accidentally
  // weakening session cookies.
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Require the session row to actually carry a user id. Without this stricter
    // guard, an edge-case session record missing user.id would still pass the
    // proxy auth check.
    authorized({ auth }) {
      return Boolean(auth?.user?.id);
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
});
