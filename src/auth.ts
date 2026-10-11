import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { getAuthConfig, isEmailAllowed } from "@/lib/auth-config";

const authConfig = getAuthConfig();

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel sets the host per deployment (production, previews).
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers:
    authConfig.status === "enabled"
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            // https://login.microsoftonline.com/<tenant-id>/v2.0: only accounts of that tenant.
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
          }),
        ]
      : [],
  callbacks: {
    signIn({ user, profile }) {
      if (authConfig.status !== "enabled") return false;
      const email = user.email ?? (profile?.preferred_username as string | undefined);
      return isEmailAllowed(email, authConfig.allowedEmails);
    },
  },
});
