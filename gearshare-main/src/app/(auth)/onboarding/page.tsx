
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const slides = [
  {
    id: "slide1",
    title: "Save Money",
    description: "Borrow essential campus resources from fellow students instead of buying new.",
    imageId: "onboarding-1",
  },
  {
    id: "slide2",
    title: "Rent Gear",
    description: "Need a camera for the weekend? Or a lab coat for a day? Find it all here.",
    imageId: "onboarding-2",
  },
  {
    id: "slide3",
    title: "Join the Community",
    description: "Help others and earn rewards while sharing what you don't use every day.",
    imageId: "onboarding-3",
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push("/login");
    }
  };

  const currentData = slides[currentSlide];
  const placeholder = PlaceHolderImages.find((img) => img.id === currentData.imageId);

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto">
      <div className="flex justify-end p-6">
        <button
          onClick={() => router.push("/login")}
          className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-8">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl mb-4">
          {placeholder && (
            <Image
              src={placeholder.imageUrl}
              alt={placeholder.description}
              fill
              className="object-cover"
              data-ai-hint={placeholder.imageHint}
            />
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-primary font-headline">
            {currentData.title}
          </h1>
          <p className="text-muted-foreground text-lg px-2">
            {currentData.description}
          </p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="flex justify-center space-x-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                currentSlide === idx ? "w-8 bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          size="lg"
          className="w-full h-14 rounded-2xl text-lg font-semibold flex items-center justify-center gap-2"
        >
          {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
