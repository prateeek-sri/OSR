import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token in the JWT
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.githubLogin = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose access token to the client-side session
      (session as unknown as Record<string, unknown>).accessToken = token.accessToken;
      (session as unknown as Record<string, unknown>).githubUsername = token.githubLogin;
      return session;
    },
  },
});
