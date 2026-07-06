// components/admin-link.tsx
import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";
import Link from "next/link";

export async function AdminLink() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); 
  const { data: profileData } = await supabase.from("profiles").select("is_admin").eq("user_id", user?.id).single();

  if (!user || !profileData?.is_admin) return null;

  return (
    <Link href="/admin" className="flex items-center gap-2 hover:opacity-70 transition-opacity p-2 md:p-0">
      <Shield size={20} className="md:hidden flex-shrink-0" />
      <span className="hidden md:inline text-sm">Admin</span>
    </Link>
  );
}