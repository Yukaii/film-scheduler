import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "./BrandMark";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const REPO = "https://github.com/Yukaii/film-scheduler";
const CONTRIBUTORS = ["Yukaii", "Pastleo"];
// Other film-festival planners, also listed in the README
const ALTERNATIVES = [
  {
    href: "https://www.threads.com/@shihchin.0608/post/DdNuuehE4hi",
    name: "@shihchin.0608 的排片工具",
    note: "功能更完整的產品",
  },
  {
    href: "https://film-festival-planning.vercel.app/",
    name: "影展排片單小工具",
    note: "選片、排場次、一鍵分享行程",
  },
];

/** Quiet underlined link that strengthens on hover; external links open a new tab. */
function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-0.5 font-medium underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 border-b py-3 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-0">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
          <span className="size-12 shrink-0 overflow-hidden rounded-xl shadow-xs ring-1 ring-black/5 dark:ring-white/10">
            <LogoMark className="size-full" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg">Film Scheduler</DialogTitle>
            <DialogDescription>看電影排程小工具</DialogDescription>
          </div>
        </DialogHeader>

        <p className="mt-5 text-sm leading-relaxed text-foreground/85">
          去年排金馬影展馬拉松，光是排片單就花了好多時間。今年決定要優雅地排表，於是做了這個工具。
        </p>

        <dl className="mt-5 border-t text-sm">
          <Row label="原始碼">
            <TextLink href={REPO}>
              github.com/Yukaii/film-scheduler
              <ArrowUpRight className="size-3.5 text-muted-foreground" />
            </TextLink>
          </Row>
          <Row label="問題回報">
            遇到問題？到 GitHub{" "}
            <TextLink href={`${REPO}/issues`}>
              開一個 issue
              <ArrowUpRight className="size-3.5 text-muted-foreground" />
            </TextLink>
          </Row>
          <Row label="貢獻者">
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
              {CONTRIBUTORS.map((name) => (
                <li key={name}>
                  <TextLink href={`https://github.com/${name}`}>{name}</TextLink>
                </li>
              ))}
            </ul>
          </Row>
          <Row label="其他選擇">
            <p className="mb-1.5 text-muted-foreground">想要功能更完整的排片工具？也可以試試：</p>
            <ul className="space-y-1.5">
              {ALTERNATIVES.map(({ href, name, note }) => (
                <li key={href}>
                  <TextLink href={href}>
                    {name}
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </TextLink>
                  <span className="block text-xs text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          </Row>
          <Row label="授權">
            MIT<span className="text-muted-foreground">，歡迎自由使用、分享、改製與貢獻。</span>
          </Row>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
