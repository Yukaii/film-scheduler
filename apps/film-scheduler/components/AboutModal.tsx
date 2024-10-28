import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>關於此專案</DialogTitle>
          <DialogDescription>
            因為去年排金馬影展馬拉松花了許多時間排片單，今年絕對要優雅的排表！於是就做了這個專案
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* GitHub Repository Link */}
          <section>
            <h3 className="text-lg font-semibold">GitHub</h3>
            <p className="text-sm text-muted-foreground">
              查看此專案的原始碼：
            </p>
            <a
              href="https://github.com/Yukaii/film-scheduler"
              rel="noreferrer noopener"
            >
              <Button variant="link" className="flex items-center mt-2">
                <ExternalLink className="mr-2" />
                github.com/Yukaii/film-scheduler
              </Button>
            </a>
          </section>

          {/* Bugs Report Link */}
          <section>
            <h3 className="text-lg font-semibold">問題回報</h3>
            <p className="text-sm text-muted-foreground">
              如果遇到任何問題，請前往 GitHub 提交 issue：
            </p>
            <a
              href="https://github.com/Yukaii/film-scheduler/issues"
              rel="noreferrer noopener"
            >
              <Button variant="link" className="flex items-center mt-2">
                <ExternalLink className="mr-2" />
                回報問題
              </Button>
            </a>
          </section>

          {/* Contributors */}
          <section>
            <h3 className="text-lg font-semibold">貢獻者</h3>
            <p className="text-sm text-muted-foreground">
              感謝所有對此專案做出貢獻的成員：
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
              <li>
                <a
                  href="https://github.com/Yukaii"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Yukaii
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Pastleo"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Pastleo
                </a>
              </li>
            </ul>
          </section>

          {/* License */}
          <section>
            <h3 className="text-lg font-semibold">授權</h3>
            <p className="text-sm text-muted-foreground">
              本專案使用 MIT 授權，歡迎自由使用、分享、改製、貢獻。
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
