import * as React from "react";
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

interface TutorialStep {
  title: string;
  description: string;
  imageSrc: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Step 1: 在影片列表搜尋影片",
    description: "在影片列表選擇您想觀賞的影片",
    imageSrc: "/images/onboarding-1.jpg",
  },
  {
    title: "Step 2: 加到場次列表中",
    description: "點一下月曆上的灰色場次，新增到列表",
    imageSrc: "/images/onboarding-2.gif",
  },
  {
    title: "Step 3: 管理場次",
    description: "可以在「已選擇場次」管理新增的場次",
    imageSrc: "/images/onboarding-3.png",
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
      <DialogContent className="w-full max-w-sm md:max-w-md">
        {" "}
        {/* Responsive width */}
        <DialogHeader>
          <DialogTitle>歡迎使用導覽</DialogTitle>
        </DialogHeader>
        <Carousel className="w-full max-w-full mx-auto">
          {" "}
          {/* Responsive centering */}
          <CarouselContent>
            {tutorialSteps.map((step, index) => (
              <CarouselItem key={index} className="w-full">
                <div className="px-2 py-4 w-full">
                  <Card className="w-full">
                    <CardContent className="flex flex-col items-center space-y-3 p-4 md:p-6">
                      <img
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
