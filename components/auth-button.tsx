import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { UserAvatar } from "./user-avatar";

export async function AuthButton() {
  const supabase = await createClient();

  // getUser() is the reliable way to check auth on the server
  const { data: { user } } = await supabase.auth.getUser();

  let username = user?.email;
  let profile: { username?: string; avatar_url?: string | null } | null = null;

  if (user?.id) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .single();

    profile = data;

    if (profile?.username) {
      username = profile.username;
    }
  }

  return user ? (
    <div className="flex items-center gap-2 md:gap-4">
      <div className="hidden md:flex items-center gap-2">
        <UserAvatar
          name={username as string | null}
          avatarUrl={(profile as { avatar_url?: string | null } | null | undefined)?.avatar_url}
          sizeClassName="h-8 w-8"
        />
        <span className="text-sm truncate">
          Hey, {username}!
        </span>
      </div>
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
