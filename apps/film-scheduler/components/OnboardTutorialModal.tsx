/* eslint-disable @next/next/no-img-element */
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

import onboarding1Src from "@/public/images/onboarding-1.jpg";
import onboarding2Src from "@/public/images/onboarding-2.gif";
import onboarding3Src from "@/public/images/onboarding-3.png";
import onboarding4Src from "@/public/images/onboarding-4.png";

interface TutorialStep {
  title: string;
  description: string;
  imageSrc: StaticImageData;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Step 1: 在影片列表搜尋影片",
    description: "在影片列表選擇您想觀賞的影片",
    imageSrc: onboarding1Src,
  },
  {
    title: "Step 2: 加到場次列表中",
    description: "點一下月曆上的灰色場次，新增到列表",
    imageSrc: onboarding2Src,
  },
  {
    title: "Step 3: 管理場次",
    description: "可以在「已選擇場次」管理新增的場次",
    imageSrc: onboarding3Src,
  },
  {
    title: "分享場次",
    description: "您可以在分享選單分享連結，或是下載 ics 檔案匯入到行事曆",
    imageSrc: onboarding4Src,
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
                      <Image
                        priority
                        src={step.imageSrc}
                        alt={step.title}
                        className="aspect-video max-h-40 md:max-h-48 w-full object-contain"
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
