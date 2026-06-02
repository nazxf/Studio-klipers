import { redirect } from "next/navigation";

import { LoginView } from "@/components/auth/login-view";
import { auth } from "@/lib/auth";

function getCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/dashboard";
  }

  return callbackUrl;
}

function getAuthErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  if (error === "OAuthAccountNotLinked") {
    return "This email is already linked to another provider. Sign in with the original provider first.";
  }

  return "Sign in could not be completed. Try another provider or start again.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const callbackUrl = getCallbackUrl(params?.callbackUrl);

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <LoginView
      authError={getAuthErrorMessage(params?.error)}
      callbackUrl={callbackUrl}
    />
  );
}
