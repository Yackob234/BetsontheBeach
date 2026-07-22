import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { UsernameForm } from "./username-form";
import { NotificationToggle } from "@/components/notification-toggle";

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

      <div className="w-full flex flex-col gap-6">
        <UsernameForm currentUsername={profile?.username || ""} />
      </div>

      <NotificationToggle />
      
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
