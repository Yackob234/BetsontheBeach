"use client";

import { useEffect, useState } from "react";

export function FormattedTime({ timestamp }: { timestamp: string }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const date = new Date(timestamp);
    const formatted = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    setFormatted(formatted);
  }, [timestamp]);

  return <>{formatted}</>;
}
