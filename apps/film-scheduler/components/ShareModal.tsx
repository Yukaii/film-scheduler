"use client"

import React, { useMemo } from "react";
import { useCopyToClipboard } from "react-use";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateShareableUrlWithSessionIds } from "@/lib/utils"; // Assuming this is the function from the previous step
import { Session } from "@/components/types";
import { ExternalLink } from "lucide-react";

interface ShareModalProps {
  sessions: Session[];
  open: boolean
  close: () => void
}

export function ShareModal({ sessions, open, close }: ShareModalProps) {
  const [state, copyToClipboard] = useCopyToClipboard();

  const shareUrl = useMemo(() => {
    return generateShareableUrlWithSessionIds(sessions);
  }, [sessions]);

  return (
    <Dialog open={open}>
      <DialogTrigger asChild>
        <div>
          <ExternalLink />
          分享片單
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Sessions</DialogTitle>
          <DialogDescription>
            Copy the URL below to share your selected sessions with others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={shareUrl} readOnly className="w-full" />
          <Button variant="default" onClick={() => copyToClipboard(shareUrl)}>
            Copy to Clipboard
          </Button>
          {state.error ? (
            <p className="text-red-500">
              Unable to copy value: {state.error.message}
            </p>
          ) : (
            state.value && (
              <p className="text-green-500">Copied to clipboard!</p>
            )
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={close} >Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
