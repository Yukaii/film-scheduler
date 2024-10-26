"use client"

import React, { useMemo } from "react";
import { useCopyToClipboard } from "react-use";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateShareableUrlWithSessionIds } from "@/lib/utils";
import { Session } from "@/components/types";

interface ShareModalProps {
  sessions: Session[];
  open: boolean
  close: () => void
}

export function ShareModal({ sessions, open, close }: ShareModalProps) {
  const [state, copyToClipboard] = useCopyToClipboard();

  const shareUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return generateShareableUrlWithSessionIds(sessions);
    } else {
      return ''
    }
  }, [sessions]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享你的場次</DialogTitle>
          <DialogDescription>
            複製下方的網址以分享你選擇的場次給其他人。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={shareUrl} readOnly className="w-full" />
          <Button variant="default" onClick={() => copyToClipboard(shareUrl)}>
            複製到剪貼簿
          </Button>
          {state.error ? (
            <p className="text-red-500">
              無法複製值: {state.error.message}
            </p>
          ) : (
            state.value && (
              <p className="text-green-500">已複製到剪貼簿！</p>
            )
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={close}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
