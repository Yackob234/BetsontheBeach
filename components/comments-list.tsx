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
  is_bet_comment?: boolean;
  bet_pick?: boolean;
  bet_amount?: number;
}

interface CommentsListProps {
  eventId: number;
  onCommentAdded?: () => void;
  // New props
  betComment?: string;
  onBetCommentChange?: (val: string) => void;
  isBetMode?: boolean;
}

export function CommentsList({ 
  eventId, 
  onCommentAdded,
  betComment,
  onBetCommentChange,
  isBetMode = false
}: CommentsListProps) {
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
        .select("id, content, created_at, user_id, is_bet_comment, bet_pick, bet_amount")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Failed to load comments");
      } else {
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

          setComments(data.map((c: any) => ({
            ...c,
            username: profileMap[c.user_id] || "Anonymous",
          })));
        } else {
          setComments([]);
        }
      }
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
        is_bet_comment: false,
      });

      if (insertError) throw insertError;
      setNewComment("");
      await loadComments();
      onCommentAdded?.();
    } catch (e: any) {
      setError(e?.message ?? "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <h4 className="font-semibold text-sm">Comments ({comments.length})</h4>

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
            className="w-full"
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
            <div key={comment.id} className={`p-2 rounded text-xs ${
              comment.is_bet_comment 
                ? 'bg-primary/10 border border-primary/20' 
                : 'bg-muted/50'
            }`}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.username}</span>
                  {comment.is_bet_comment && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      comment.bet_pick 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      {comment.bet_pick ? 'YES' : 'NO'} · ${comment.bet_amount}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">{formatTime(comment.created_at)}</span>
              </div>
              <p className="text-foreground mt-1 break-words">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}