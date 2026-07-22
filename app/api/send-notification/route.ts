import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  "mailto:yackob234@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check — must be admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, url } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  // Fetch all subscriptions
  const { data: subs, error: subError } = await supabase
    .from("push_subscriptions")
    .select("subscription");

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const payload = JSON.stringify({ title, body, url: url ?? "/" });

  const results = await Promise.allSettled(
    (subs ?? []).map((row) =>
      webpush.sendNotification(row.subscription as webpush.PushSubscription, payload)
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed });
}