import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewsRecord } from "@/components/news-card";

async function enrichNewsItems(supabase: Awaited<ReturnType<typeof createClient>>, newsItems: any[]) {
  if (!newsItems.length) return [];

  const newsIds = newsItems.map((item) => item.id);
  
  const { data: stats } = await supabase
    .from("news_comment_stats")
    .select("news_id, comment_count, like_count")
    .in("news_id", newsIds);

  const statsMap = Object.fromEntries(
    (stats ?? []).map((row) => [row.news_id, row])
  );

  return newsItems.map((item) => ({
    ...item,
    comment_count: statsMap[item.id]?.comment_count ?? 0,
    like_count: statsMap[item.id]?.like_count ?? 0,
  }));
}

export default async function NewsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select("id, created_at, title, content, image_url, author")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const newsItems = data ?? [];
  const authorIds = [...new Set(newsItems.map((item: any) => item.author).filter(Boolean))];

  let newsWithUsernames: NewsRecord[] = [];
  if (authorIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", authorIds);

    const profileMap = Object.fromEntries(
      (profilesData ?? []).map((profile: any) => [profile.user_id, profile.username]),
    );

    const enrichedItems = newsItems.map((item: any) => ({
      ...item,
      author_username: profileMap[item.author] || "Unknown",
    }));

    newsWithUsernames = await enrichNewsItems(supabase, enrichedItems);
  } else {
    const enrichedItems = newsItems.map((item: any) => ({
      ...item,
      author_username: "Unknown",
    }));

    newsWithUsernames = await enrichNewsItems(supabase, enrichedItems);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Community</p>
          <h1 className="text-3xl font-semibold">News archive</h1>
        </div>
        
        <Link 
          href="/news/create" 
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition"
        >
          Create
          <div className="rounded-full border bg-background p-2">
            <Newspaper className="h-5 w-5" />
          </div>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past headlines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {newsWithUsernames.length === 0 ? (
            <p className="text-sm text-muted-foreground">No news posts yet.</p>
          ) : (
            newsWithUsernames.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="h-24 w-full rounded-lg object-cover md:w-36" />
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <h2 className="text-xl font-semibold">{item.title}</h2>
                      <p className="text-sm text-muted-foreground">By {item.author_username || "Unknown"}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{(item.comment_count ?? 0)} comment{(item.comment_count ?? 0) === 1 ? "" : "s"}</span>
                        <span>•</span>
                        <span>{(item.like_count ?? 0)} like{(item.like_count ?? 0) === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full md:w-auto">
                    <Link href={`/news/${item.id}`} className="inline-flex items-center justify-center gap-2">
                      Read full post
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
