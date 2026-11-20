import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Collapses or expands the sidebar. It is rendered at the far left of the
 * sidebar's brand row while the sidebar is open and of the calendar header
 * while it is collapsed; both rows are h-16 with 16px left padding, so the
 * button stays on the same spot and a second click toggles straight back.
 */
export function SidebarToggle({ className }: { className?: string }) {
  const { open, isMobile, openMobile, toggleSidebar } = useSidebar();
  const visible = isMobile ? openMobile : open;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={visible ? "收合側欄" : "展開側欄"}
      aria-expanded={visible}
      className={cn("shrink-0", className)}
    >
      {visible ? <PanelLeftClose /> : <PanelLeftOpen />}
    </Button>
  );
}
