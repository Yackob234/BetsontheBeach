'use client'
import { useState } from 'react'

export type NewsRecord = {
    id: number;
    created_at: string;
    title: string;
    content: string;
    image_url: string | null;
    author: string;
    author_username?: string;
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
        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
        <p className={`text-sm text-muted-foreground mb-3 flex-grow ${expanded ? '' : 'line-clamp-3'}`}>
          {item.content}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            By {item.author_username || "Unknown"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
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