import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { UsernameForm } from "./username-form";
import { ProfilePictureForm } from "./profile-picture-form";
import { UserAvatar } from "@/components/user-avatar";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/auth/login");
  }

  const userId = user.id;

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

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <UserAvatar
          name={profile?.username || "Your profile"}
          avatarUrl={profile?.avatar_url}
          sizeClassName="h-14 w-14"
        />
        <div>
          <p className="font-semibold">{profile?.username || "Your profile"}</p>
          <p className="text-sm text-muted-foreground">Your public avatar and username are shown across the app.</p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-6">
        <UsernameForm currentUsername={profile?.username || ""} />
      </div>

      <div className="w-full flex flex-col gap-6">
          <ProfilePictureForm />
      </div>
      
      <div className="w-full">
          <div className="bg-blue-50 dark:bg-blue-950 text-sm p-3 px-5 rounded-md text-blue-900 dark:text-blue-100 flex gap-3 items-start">
              <InfoIcon size="16" strokeWidth={2} className="flex-shrink-0 mt-0.5" />
              <p>
              News creation has been moved to the News page.
              </p>
          </div>
      </div>
    </div>
  );
}
