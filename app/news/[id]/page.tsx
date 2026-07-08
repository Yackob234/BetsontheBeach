import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewsComments } from "@/components/news-comments";

export default async function NewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const newsId = Number(id);
  const supabase = await createClient();

  const { data: newsItem, error } = await supabase
    .from("news")
    .select("id, created_at, title, content, image_url, author")
    .eq("id", newsId)
    .single();

  if (error || !newsItem) {
    notFound();
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", newsItem.author)
    .single();

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="w-fit">
        <Link href="/news" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to news
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>News post</span>
          </div>
          <CardTitle className="text-3xl">{newsItem.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {newsItem.image_url ? (
            <img src={newsItem.image_url} alt={newsItem.title} className="w-full max-h-96 rounded-lg object-cover" />
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>By {profileData?.username || "Unknown"}</span>
            <span>•</span>
            <span>{new Date(newsItem.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <div className="whitespace-pre-wrap text-base leading-7">{newsItem.content}</div>
        </CardContent>
      </Card>

      <NewsComments newsId={newsId} />
    </div>
  );
}
