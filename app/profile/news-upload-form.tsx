"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoIcon, Loader2 } from "lucide-react";

export function NewsUploadForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!title.trim()) {
      setMessage({ type: "error", text: "Title is required" });
      return;
    }
    if (!content.trim()) {
      setMessage({ type: "error", text: "Content is required" });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        setMessage({ type: "error", text: "Not authenticated" });
        return;
      }

      // Insert news article
      const { error } = await supabase.from("news").insert({
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        author: userData.user.id,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      // Success
      setMessage({ type: "success", text: "News article published successfully!" });
      setTitle("");
      setContent("");
      setImageUrl("");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message ?? "Failed to publish news, liekly not a HUMAN" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm">
      <h2 className="font-bold text-2xl mb-4">Publish News</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="News headline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="content">Content</Label>
          <textarea
            id="content"
            placeholder="Write your news article here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            className="w-full border rounded-md p-2 mt-1 min-h-32 bg-background text-foreground"
          />
        </div>

        <div>
          <Label htmlFor="imageUrl">Image URL (optional)</Label>
          <Input
            id="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={loading}
            className="mt-1"
          />
        </div>

        {message && (
          <div
            className={`p-3 rounded-md flex gap-2 items-start ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800"
            }`}
          >
            <InfoIcon size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Article"
          )}
        </Button>
      </form>

      <div className="mt-4 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex gap-2">
        <InfoIcon size={16} className="flex-shrink-0 mt-0.5 text-blue-900 dark:text-blue-100" />
        <p className="text-xs text-blue-900 dark:text-blue-100">
          Articles you publish will be visible on the home page news section. Be sure to include an image URL for better visibility.
        </p>
      </div>
    </div>
  );
}
