import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Captured from the app by `pnpm --filter film-scheduler capture:tutorial`
import onboarding1 from "@/public/images/onboarding-1.png";
import onboarding1Dark from "@/public/images/onboarding-1-dark.png";
import onboarding2 from "@/public/images/onboarding-2.png";
import onboarding2Dark from "@/public/images/onboarding-2-dark.png";
import onboarding3 from "@/public/images/onboarding-3.png";
import onboarding3Dark from "@/public/images/onboarding-3-dark.png";
import onboarding4 from "@/public/images/onboarding-4.png";
import onboarding4Dark from "@/public/images/onboarding-4-dark.png";

interface TutorialStep {
  title: string;
  description: string;
  image: { light: StaticImageData; dark: StaticImageData };
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Step 1: 搜尋影片",
    description: "在「影片」分頁搜尋並點開影片，月曆上會以灰色顯示它的所有場次",
    image: { light: onboarding1, dark: onboarding1Dark },
  },
  {
    title: "Step 2: 加入場次",
    description: "點一下月曆上的灰色場次，就會加進你的片單",
    image: { light: onboarding2, dark: onboarding2Dark },
  },
  {
    title: "Step 3: 管理片單",
    description: "在「我的片單」依日期查看已選的場次，時間重疊會標示出來",
    image: { light: onboarding3, dark: onboarding3Dark },
  },
  {
    title: "Step 4: 分享片單",
    description: "在分享選單複製連結傳給朋友，或下載 .ics 匯入你的行事曆",
    image: { light: onboarding4, dark: onboarding4Dark },
  },
];

interface OnboardTutorialModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardTutorialModal({
  open,
  onClose,
}: OnboardTutorialModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md md:max-w-lg">
        {" "}
        {/* Responsive width */}
        <DialogHeader>
          <DialogTitle>使用教學</DialogTitle>
        </DialogHeader>
        <Carousel>
          {" "}
          {/* Responsive centering */}
          <CarouselContent>
            {tutorialSteps.map((step, index) => (
              <CarouselItem key={index} className="w-full">
                <div className="px-2 py-4 w-full">
                  <Card className="w-full">
                    <CardContent className="flex flex-col items-center space-y-3 p-4 md:p-6">
                      {/* One screenshot per theme; CSS shows the matching one */}
                      <Image
                        priority
                        src={step.image.light}
                        alt={step.title}
                        className="aspect-video max-h-40 md:max-h-48 w-full object-contain dark:hidden"
                      />
                      <Image
                        priority
                        src={step.image.dark}
                        alt=""
                        className="hidden aspect-video max-h-40 md:max-h-48 w-full object-contain dark:block"
                      />
                      <h2 className="text-base md:text-lg font-semibold text-center">
                        {step.title}
                      </h2>
                      <p className="text-xs md:text-sm text-muted-foreground text-center">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <DialogFooter>
          <Button variant="default" onClick={onClose}>
            開始使用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
