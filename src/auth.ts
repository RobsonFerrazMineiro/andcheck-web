import { DEFAULT_COMPANY_ID, DEFAULT_WORKSPACE_ID } from "@/lib/multi-company";
import { resolveAuditRequestContext } from "@/lib/audit-context";
import { prisma } from "@/lib/prisma";
import { AuditAction, AuditEntityType } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
    updateAge: 60 * 30,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        if (email.length > 254 || password.length > 256) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.is_active) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.companyId = (user as { companyId?: string }).companyId;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        const requestContext = await resolveAuditRequestContext();
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(user.id ? [{ id: user.id }] : []),
              ...(user.email ? [{ email: user.email }] : []),
            ],
          },
          include: {
            roles: {
              include: { role: true },
              orderBy: { assigned_at: "asc" },
            },
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: dbUser?.id ?? user.id ?? null,
            userName: dbUser?.name ?? user.name ?? user.email ?? null,
            userRole: dbUser?.roles[0]?.role.code ?? null,
            sessionId: requestContext.sessionId,
            entityType: AuditEntityType.USER,
            entityId: dbUser?.id ?? user.id ?? null,
            entityLabel: dbUser?.email ?? user.email ?? user.name ?? null,
            action: AuditAction.LOGIN,
            description: `${dbUser?.email ?? user.email ?? user.name ?? "Usuário"} acessou o AndCheck`,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            browserName: requestContext.browserName,
            osName: requestContext.osName,
            deviceType: requestContext.deviceType,
            companyId: dbUser?.companyId ?? DEFAULT_COMPANY_ID,
            workspaceId: dbUser?.workspaceId ?? DEFAULT_WORKSPACE_ID,
          },
        });
      } catch (error) {
        console.error("Login audit failed:", error);
        // Login não deve falhar se a auditoria estiver indisponível.
      }
    },
    async signOut(message) {
      try {
        const requestContext = await resolveAuditRequestContext();
        const token = "token" in message ? message.token : null;
        await prisma.auditLog.create({
          data: {
            userId: typeof token?.id === "string" ? token.id : null,
            userName:
              typeof token?.name === "string"
                ? token.name
                : typeof token?.email === "string"
                  ? token.email
                : null,
            userRole: typeof token?.role === "string" ? token.role : null,
            sessionId: requestContext.sessionId,
            entityType: AuditEntityType.USER,
            entityId: typeof token?.id === "string" ? token.id : null,
            entityLabel: typeof token?.email === "string" ? token.email : null,
            action: AuditAction.LOGOUT,
            description: "Usuário encerrou a sessão no AndCheck",
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            browserName: requestContext.browserName,
            osName: requestContext.osName,
            deviceType: requestContext.deviceType,
            companyId:
              typeof token?.companyId === "string"
                ? token.companyId
                : DEFAULT_COMPANY_ID,
            workspaceId:
              typeof token?.workspaceId === "string"
                ? token.workspaceId
                : DEFAULT_WORKSPACE_ID,
          },
        });
      } catch {
        // Logout não deve falhar se a auditoria estiver indisponível.
      }
    },
  },
});
