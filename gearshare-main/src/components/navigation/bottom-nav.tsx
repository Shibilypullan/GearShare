
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PlusSquare, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Home", icon: Home, path: "/home" },
  { name: "Explore", icon: Map, path: "/explore" },
  { name: "Share", icon: PlusSquare, path: "/share", isCenter: true },
  { name: "Messages", icon: MessageSquare, path: "/messages" },
  { name: "Profile", icon: User, path: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around items-center h-16 px-4 md:max-w-md md:mx-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link
            key={tab.name}
            href={tab.path}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground",
              tab.isCenter && "text-accent"
            )}
          >
            <tab.icon className={cn("h-6 w-6", tab.isCenter && "h-8 w-8")} />
            {!tab.isCenter && <span className="text-[10px] font-medium">{tab.name}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
