"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateUsername(formData: FormData) {
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
    return { error: "Not authenticated" };
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
