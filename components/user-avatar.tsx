'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  sizeClassName?: string;
  className?: string;
  nameClassName?: string;
  showName?: boolean;
};

function getInitials(name?: string | null) {
  if (!name?.trim()) return '?';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  sizeClassName = 'h-8 w-8',
  className,
  nameClassName,
  showName = false,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const hasAvatar = Boolean(avatarUrl) && !imgError;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {hasAvatar ? (
        <img
          src={avatarUrl!}
          alt={name ?? 'User avatar'}
          className={cn('rounded-full object-cover ring-1 ring-foreground/10', sizeClassName)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground ring-1 ring-foreground/10',
            sizeClassName,
          )}
        >
          {initials}
        </div>
      )}

      {showName && name ? (
        <span className={cn('text-sm font-medium text-foreground', nameClassName)}>{name}</span>
      ) : null}
    </div>
  );
}
