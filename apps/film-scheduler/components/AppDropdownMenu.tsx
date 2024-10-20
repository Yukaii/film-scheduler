import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, ExternalLink, Download } from "lucide-react";

export function AppDropdownMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="icon">
          <Menu />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem>
          <ExternalLink />
          分享片單
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download />
          匯入匯出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
