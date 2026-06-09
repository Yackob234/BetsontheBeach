"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoIcon, Loader2, Upload } from "lucide-react";

export function NewsUploadForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl("") // clear URL if file picked
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    setImageFile(null) // clear file if URL typed
    setImagePreview(e.target.value || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        setMessage({ type: "error", text: "Not authenticated" });
        return;
      }

      // Upload file if provided, otherwise use URL
      let finalImageUrl: string | null = imageUrl.trim() || null

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = `${Date.now()}-${userData.user.id}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('news-images')
          .upload(filePath, imageFile)

        if (uploadError) {
          setMessage({ type: "error", text: `Image upload failed: ${uploadError.message}` });
          return;
        }

        const { data: urlData } = supabase.storage
          .from('news-images')
          .getPublicUrl(filePath)

        finalImageUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("news").insert({
        title: title.trim(),
        content: content.trim(),
        image_url: finalImageUrl,
        author: userData.user.id,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      setMessage({ type: "success", text: "News article published successfully!" });
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setImageUrl("");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message ?? "Failed to publish news, likely not a HUMAN" });
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

        {/* Image Upload */}
        <div>
          <Label>Image (optional)</Label>
          <div
            className="mt-1 border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => document.getElementById('image')?.click()}
          >
            {imagePreview && imageFile ? (
              <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded-md object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload size={24} />
                <p className="text-sm">Click to upload an image</p>
              </div>
            )}
          </div>
          <input
            id="image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            disabled={loading}
          />
          {imageFile && (
            <button
              type="button"
              className="text-xs text-muted-foreground mt-1 hover:text-destructive"
              onClick={() => { setImageFile(null); setImagePreview(null) }}
            >
              Remove image
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">or paste an image URL</span>
          <div className="flex-1 border-t" />
        </div>

        {/* Image URL */}
        <div>
          <Input
            id="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={handleUrlChange}
            disabled={loading || !!imageFile}
            className="mt-1"
          />
          {imageUrl && !imageFile && (
            <img src={imageUrl} alt="url preview" className="mt-2 max-h-40 rounded-md object-cover" />
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-md flex gap-2 items-start ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800"
          }`}>
            <InfoIcon size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</>
          ) : (
            "Publish Article"
          )}
        </Button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 text-sm p-3 px-5 rounded-md text-blue-900 dark:text-blue-100 flex gap-3 items-start">
        <InfoIcon size="16" strokeWidth={2} className="flex-shrink-0 mt-0.5" />
        <p>
          Articles you publish will be visible on the home page news section.
        </p>
      </div>
    </div>
  );
}