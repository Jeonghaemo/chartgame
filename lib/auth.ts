// lib/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function env(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return undefined;
}

const GOOGLE_ID = env("AUTH_GOOGLE_ID", "GOOGLE_CLIENT_ID");
const GOOGLE_SECRET = env("AUTH_GOOGLE_SECRET", "GOOGLE_CLIENT_SECRET");
const NAVER_ID = env("AUTH_NAVER_ID", "NAVER_CLIENT_ID");
const NAVER_SECRET = env("AUTH_NAVER_SECRET", "NAVER_CLIENT_SECRET");

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,

  providers: [
    Google({
      clientId: GOOGLE_ID!,
      clientSecret: GOOGLE_SECRET!,
    }),
    Naver({
      clientId: NAVER_ID!,
      clientSecret: NAVER_SECRET!,
    }),
  ],

  // ✅ 기본 /api/auth/signin UI 대신 /signin 사용
  pages: {
    signIn: "/signin",
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = (user as any).id;
        (session.user as any).capital = (user as any).capital;
        (session.user as any).hearts = (user as any).hearts;
        (session.user as any).maxHearts = (user as any).maxHearts;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
