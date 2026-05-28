import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";
import { UsernameForm } from "./username-form";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return null;
  }

  return profile;
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>

      <div className="max-w-md">
        <UsernameForm currentUsername={profile?.username || ""} />
      </div>

      <div className="w-full">
        <div className="bg-blue-50 dark:bg-blue-950 text-sm p-3 px-5 rounded-md text-blue-900 dark:text-blue-100 flex gap-3 items-start">
          <InfoIcon size="16" strokeWidth={2} className="flex-shrink-0 mt-0.5" />
          <p>
            Your username is your display name and will be shown on the leaderboard and to other users.
          </p>
        </div>
      </div>
    </div>
  );
}
