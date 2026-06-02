import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireCurrentUser(callbackUrl = "/dashboard") {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session.user;
}
