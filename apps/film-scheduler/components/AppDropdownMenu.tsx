import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, ExternalLink } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

export function AppDropdownMenu() {
  const { openShareModal } = useAppContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="icon">
          <Menu />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem onClick={openShareModal}>
          <ExternalLink />
          分享片單
        </DropdownMenuItem>

        {/*
        <DropdownMenuItem>
          <Download />
          匯入匯出
        </DropdownMenuItem>
       */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
