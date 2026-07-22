'use client'
import Link from 'next/link';
import { useState } from 'react';
import { UserAvatar } from './user-avatar';

export type NewsRecord = {
    id: number;
    created_at: string;
    title: string;
    content: string;
    image_url: string | null;
    author: string;
    author_username?: string;
    author_avatar_url?: string | null;
    comment_count?: number;
    like_count?: number;
};

export function NewsCard({ item }: { item: NewsRecord }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="rounded-lg border hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {item.image_url && (
        <div className="w-full h-40 overflow-hidden bg-muted">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <Link
          href={`/news/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mb-4 hover:opacity-70 transition-opacity"
        >
          <h3 className="font-semibold text-lg">{item.title}</h3>
        </Link>
        <p className={`text-sm text-muted-foreground mb-3 flex-grow ${expanded ? '' : 'line-clamp-3'}`}>
          {item.content}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar
              name={item.author_username || "Unknown"}
              avatarUrl={item.author_avatar_url}
              sizeClassName="h-7 w-7"
            />
            <span>By {item.author_username || "Unknown"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{(item.comment_count ?? 0)} comment{(item.comment_count ?? 0) === 1 ? "" : "s"}</span>
          <span>•</span>
          <span>{(item.like_count ?? 0)} like{(item.like_count ?? 0) === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center justify-end mt-1">
          <p className="text-xs text-muted-foreground">
            {expanded ? 'Show less ↑' : 'Read more ↓'}
          </p>
        </div>
      </div>
    </div>
  )
}