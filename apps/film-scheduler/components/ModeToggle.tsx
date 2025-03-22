"use client";

import * as React from "react";
import { Moon, Sun, Cog } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TooltipTrigger,
  TooltipProvider,
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={100} skipDelayDuration={100}>
        <Tooltip>
          <TooltipTrigger>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">切換主題</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>切換主題</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          亮色主題
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          暗色主題
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Cog className="mr-2 h-4 w-4" />
          根據系統
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
