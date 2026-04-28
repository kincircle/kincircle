import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "./db";
import { sendEmail } from "./email";
import { MagicLinkEmail } from "../emails/MagicLinkEmail";
import {
  getBetterAuthSecret,
  getBetterAuthUrl,
  getGoogleOAuthConfig,
} from "./env";

const googleOAuthConfig = getGoogleOAuthConfig();

export const auth = betterAuth({
  appName: "KinCircle",
  baseURL: getBetterAuthUrl(),
  secret: getBetterAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: false,
  },
  ...(googleOAuthConfig
    ? {
        socialProviders: {
          google: googleOAuthConfig,
        },
      }
    : {}),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to KinCircle",
          react: MagicLinkEmail({ url }),
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
