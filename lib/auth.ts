import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";



export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID!,
      clientSecret: process.env.AUTH_NAVER_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      // 사용자 경제 상태를 세션에 노출
      // (필요시 클라이언트에서 참조)
      if (session.user) {
        (session.user as any).id = (user as any).id;
        (session.user as any).capital = (user as any).capital;
        (session.user as any).hearts = (user as any).hearts;
        (session.user as any).maxHearts = (user as any).maxHearts;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
