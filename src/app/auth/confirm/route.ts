// BACKEND-OWNED (route handler, not a page). Target of the sign-up
// confirmation email (supabase/templates/confirmation.html). Verifies the
// one-time token, which signs the player in, then sends them into the app.
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Only same-site paths, so the link can't be used to redirect elsewhere.
  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "confirmation_failed");
  return NextResponse.redirect(redirectTo);
}
