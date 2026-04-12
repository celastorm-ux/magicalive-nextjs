export type ClerkOAuthStrategy = "oauth_google" | "oauth_facebook";

type SsoArgs = {
  strategy: ClerkOAuthStrategy;
  redirectCallbackUrl: string;
  redirectUrl: string;
};

type SsoResult = { error?: { message?: string } } | void;

/**
 * Clerk v7+ custom OAuth: `signUp.sso` / `signIn.sso`.
 * Falls back to `authenticateWithRedirect` when present (older docs).
 */
export async function clerkOAuthSignUp(
  signUp: unknown,
  args: SsoArgs,
): Promise<{ error: string | null }> {
  const su = signUp as {
    sso?: (p: SsoArgs) => Promise<SsoResult>;
    authenticateWithRedirect?: (p: Record<string, unknown>) => Promise<unknown>;
  };
  if (typeof su.sso === "function") {
    const out = await su.sso(args);
    const err = out && typeof out === "object" && "error" in out ? out.error : undefined;
    if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
      return { error: err.message };
    }
    return { error: null };
  }
  if (typeof su.authenticateWithRedirect === "function") {
    await su.authenticateWithRedirect({
      strategy: args.strategy,
      redirectUrl: args.redirectCallbackUrl,
      redirectUrlComplete: args.redirectUrl,
    } as any);
    return { error: null };
  }
  return { error: "OAuth is not available in this Clerk build. Update @clerk/nextjs or enable SSO in the dashboard." };
}

export async function clerkOAuthSignIn(
  signIn: unknown,
  args: SsoArgs,
): Promise<{ error: string | null }> {
  const si = signIn as {
    sso?: (p: SsoArgs) => Promise<SsoResult>;
    authenticateWithRedirect?: (p: Record<string, unknown>) => Promise<unknown>;
  };
  if (typeof si.sso === "function") {
    const out = await si.sso(args);
    const err = out && typeof out === "object" && "error" in out ? out.error : undefined;
    if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
      return { error: err.message };
    }
    return { error: null };
  }
  if (typeof si.authenticateWithRedirect === "function") {
    await si.authenticateWithRedirect({
      strategy: args.strategy,
      redirectUrl: args.redirectCallbackUrl,
      redirectUrlComplete: args.redirectUrl,
    } as any);
    return { error: null };
  }
  return { error: "OAuth is not available in this Clerk build." };
}
