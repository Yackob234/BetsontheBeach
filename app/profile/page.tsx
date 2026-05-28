"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) {
    redirect("/auth/login");
  }

  const userId = data.session.user.id;

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

async function updateUsername(formData: FormData) {
  "use server";

  const newUsername = formData.get("username") as string;

  if (!newUsername || newUsername.trim().length === 0) {
    return { error: "Username cannot be empty" };
  }

  if (newUsername.trim().length < 3) {
    return { error: "Username must be at least 3 characters" };
  }

  if (newUsername.trim().length > 30) {
    return { error: "Username must be less than 30 characters" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) {
    redirect("/auth/login");
  }

  const userId = data.session.user.id;

  // Update the username
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ username: newUsername.trim() })
    .eq("user_id", userId);

  if (updateError) {
    if (updateError.message.includes("unique")) {
      return { error: "This username is already taken" };
    }
    console.error("Error updating username:", updateError);
    return { error: "Failed to update username" };
  }

  return { success: true, message: "Username updated successfully!" };
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Change Username</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateUsername} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter new username"
                  defaultValue={profile?.username || ""}
                  required
                  minLength={3}
                  maxLength={30}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  3-30 characters, no spaces
                </p>
              </div>

              <Button type="submit" className="w-full">
                Update Username
              </Button>
            </form>
          </CardContent>
        </Card>
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
