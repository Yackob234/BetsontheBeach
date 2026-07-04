import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminResolveForm } from "@/components/admin-resolve-form";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/auth/login");
  }

  return <AdminResolveForm />;
}
