"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  username?: string;
}

interface CommentsListProps {
  eventId: number;
  onCommentAdded?: () => void;
}

export function CommentsList({ eventId, onCommentAdded }: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [eventId]);

  async function loadComments() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading comments:", error);
        setError("Failed to load comments");
      } else {
        // For each comment, fetch the username from profiles
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((c) => c.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username")
            .in("user_id", userIds);

          const profileMap: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => {
            profileMap[p.user_id] = p.username;
          });

          const commentsWithUsernames = data.map((c: any) => ({
            ...c,
            username: profileMap[c.user_id] || "Anonymous",
          }));
          setComments(commentsWithUsernames);
        } else {
          setComments([]);
        }
      }
    } catch (e) {
      console.error("Exception loading comments:", e);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  async function postComment() {
    if (!newComment.trim()) return;

    setPosting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) throw new Error("Not authenticated");

      const { error: insertError } = await supabase.from("comments").insert({
        event_id: eventId,
        user_id: userId,
        content: newComment.trim(),
      });

      if (insertError) throw insertError;

      setNewComment("");
      await loadComments();
      onCommentAdded?.();
    } catch (e: any) {
      console.error("Error posting comment:", e);
      setError(e?.message ?? "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <h4 className="font-semibold text-sm">Comments ({comments.length})</h4>

      {/* New comment form */}
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={posting || loading}
          className="w-full border rounded p-2 text-sm resize-none"
          rows={2}
        />
        <Button
          onClick={postComment}
          disabled={posting || !newComment.trim() || loading}
          className="flex-1 w-full"
        >
          {posting ? "Posting..." : "Post Comment"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Comments list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-muted/50 p-2 rounded text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium">{comment.username}</span>
                <span className="text-muted-foreground text-xs">
                  {formatTime(comment.created_at)}
                </span>
              </div>
              <p className="text-foreground mt-1 break-words">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
