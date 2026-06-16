import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // getUser() is the reliable way to check auth on the server
  const { data: { user } } = await supabase.auth.getUser();

  let username = user?.email;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .single();

    if (profile?.username) {
      username = profile.username;
    }
  }

  return user ? (
    <div className="flex items-center gap-2 md:gap-4">
      <span className="hidden md:inline text-sm truncate">
        Hey, {username}!
      </span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-1 md:gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
