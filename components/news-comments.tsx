"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "./ui/textarea";
import { MessageCircleReply, Loader2, Heart } from "lucide-react";

type CommentRecord = {
  id: number;
  created_at: string;
  content: string;
  user_id: string | null;
  parent_id: number | null;
  deleted_at: string | null;
  rating: number | null;
  username?: string;
  children?: CommentRecord[];
};

function buildTree(items: CommentRecord[]) {
  const byId = new Map(items.map((item) => [item.id, { ...item, children: [] as CommentRecord[] }]));
  const roots: CommentRecord[] = [];

  items.forEach((item) => {
    const node = byId.get(item.id)!;
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function NewsComments({ newsId }: { newsId: number }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number; username: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("news_comments")
      .select("id, created_at, content, user_id, parent_id, deleted_at, rating")
      .eq("news_id", newsId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data ?? []).map((comment) => comment.user_id).filter(Boolean))] as string[];
    const { data: profilesData } = userIds.length
      ? await supabase.from("profiles").select("user_id, username").in("user_id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profilesData ?? []).map((profile: any) => [profile.user_id, profile.username]));

    const mapped = (data ?? [])
      .filter((comment: any) => Boolean(comment.content?.trim()) && (comment.rating ?? 0) <= 0)
      .map((comment: any) => ({
        ...comment,
        username: profileMap[comment.user_id] || "Anonymous",
      }));

    const likeTotal = (data ?? []).filter((comment: any) => (comment.rating ?? 0) > 0).length;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    const { data: existingLikeData } = userId
      ? await supabase.from("news_comments").select("id").eq("news_id", newsId).eq("user_id", userId).eq("rating", 1).is("deleted_at", null).limit(1)
      : { data: [] };

    setLikes(likeTotal);
    setLiked((existingLikeData ?? []).length > 0);
    setComments(buildTree(mapped));
    setLoading(false);
  };

  useEffect(() => {
    void loadComments();
  }, [newsId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const { error: insertError } = await supabase.from("news_comments").insert({
        news_id: newsId,
        user_id: userId,
        content: content.trim(),
        parent_id: replyingTo?.id ?? null,
      });

      if (insertError) throw insertError;

      setContent("");
      setReplyingTo(null);
      await loadComments();
    } catch (err: any) {
      setError(err?.message ?? "Unable to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async () => {
    setLikeLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      if (!userId) {
        throw new Error("You must be signed in to like a post");
      }

      const { data: existingLikeData } = await supabase
        .from("news_comments")
        .select("id")
        .eq("news_id", newsId)
        .eq("user_id", userId)
        .eq("rating", 1)
        .is("deleted_at", null)
        .limit(1);

      if ((existingLikeData ?? []).length > 0) {
        setLiked(true);
        return;
      }

      const { error: insertError } = await supabase.from("news_comments").insert({
        news_id: newsId,
        user_id: userId,
        content: "",
        rating: 1,
        parent_id: null,
      });

      if (insertError) throw insertError;
      await loadComments();
    } catch (err: any) {
      setError(err?.message ?? "Unable to like post");
    } finally {
      setLikeLoading(false);
    }
  };

  const renderComment = (comment: CommentRecord, depth = 0) => (
    <div key={comment.id} className={`rounded-lg border bg-background p-3 ${depth > 0 ? "ml-4" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{comment.username || "Anonymous"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setReplyingTo({ id: comment.id, username: comment.username || "Anonymous" })}>
          <MessageCircleReply className="mr-1 h-4 w-4" />
          Reply
        </Button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{comment.content}</p>
      {comment.children && comment.children.length > 0 ? (
        <div className="mt-3 space-y-2">{comment.children.map((child) => renderComment(child, depth + 1))}</div>
      ) : null}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discussion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyingTo ? <p className="text-sm text-muted-foreground">Replying to {replyingTo.username}</p> : null}
          <Textarea
            value={content}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)}
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            rows={4}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={posting || !content.trim()}>
              {posting ? "Posting..." : replyingTo ? "Post reply" : "Post comment"}
            </Button>
            <Button type="button" variant="outline" onClick={handleLike} disabled={likeLoading || liked}>
              <Heart className={`mr-1 h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likeLoading ? "Liking..." : liked ? `Liked (${likes})` : `Like (${likes})`}
            </Button>
            {replyingTo ? (
              <Button type="button" variant="outline" onClick={() => setReplyingTo(null)}>
                Cancel reply
              </Button>
            ) : null}
          </div>
        </form>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-2">{comments.map((comment) => renderComment(comment))}</div>
        )}
      </CardContent>
    </Card>
  );
}
