import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
// import { adminAuth } from "@/firebase/firebase-admin";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Sign in with Farcaster",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
        name: {
          label: "Name",
          type: "text",
          placeholder: "0x0",
        },
        pfp: {
          label: "Pfp",
          type: "text",
          placeholder: "0x0",
        },
        nonce: {
          label: "Nonce",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const appClient = createAppClient({
          ethereum: viemConnector(),
        });
        try {
          const verifyResponse = await appClient.verifySignInMessage({
            message: credentials.message,
            signature: credentials.signature as `0x${string}`,
            domain: "localhost:3000",
            nonce: credentials.nonce,
          });
          const { success, fid } = verifyResponse;
          if (!success) return null;
          // const customToken = await adminAuth.createCustomToken(
          //   fid.toString(),
          //   {
          //     role: "user",
          //   }
          // );
          // console.log("customToken", customToken);
          return {
            id: fid.toString(),
            name: credentials.name,
            image: credentials.pfp,
            // customToken,
          };
        } catch (error) {
          console.log("error", error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};
