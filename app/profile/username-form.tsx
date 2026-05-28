"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUsername } from "./actions";

export function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const [username, setUsername] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateUsername = async () => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("username", username);

    const result = await updateUsername(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Username</CardTitle>
        <CardDescription>Update your display name</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter new username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              minLength={3}
              maxLength={30}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              3-30 characters
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">Username updated successfully!</p>}

          <Button
            onClick={handleUpdateUsername}
            disabled={isLoading || username.trim().length === 0}
            className="w-full"
          >
            {isLoading ? "Updating..." : "Update Username"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
