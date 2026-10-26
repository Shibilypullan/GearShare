
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
