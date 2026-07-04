// components/admin-link.tsx
import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";
import Link from "next/link";

export async function AdminLink() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const whitelist = (process.env.NEXT_PUBLIC_ADMIN_WHITELIST ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);

  if (!user || !whitelist.includes(user.id)) return null;

  return (
    <Link href="/admin" className="flex items-center gap-2 hover:opacity-70 transition-opacity p-2 md:p-0">
      <Shield size={20} className="md:hidden flex-shrink-0" />
      <span className="hidden md:inline text-sm">Admin</span>
    </Link>
  );
}