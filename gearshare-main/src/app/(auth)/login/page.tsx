"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, Loader2, Chrome } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
      router.push("/home");
    } catch (error: any) {
      console.error("Login Error:", error);
      let message = "Invalid credentials.";
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "Invalid email or password.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is not enabled in Firebase Console.";
      } else if (error.code === 'auth/invalid-credential') {
        message = "Invalid login credentials.";
      }

      toast({
        variant: "destructive",
        title: "Login failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userProfile = {
        id: user.uid,
        fullName: user.displayName || user.email?.split('@')[0],
        email: user.email,
        profilePhotoUrl: user.photoURL || "",
        trustScore: 5.0,
        memberSince: new Date().toISOString(),
        pointsBalance: 0,
        receiveTransactionNotifications: true,
        receiveMessageNotifications: true,
      };

      await setDoc(doc(db, "users", user.uid), userProfile, { merge: true });

      toast({
        title: "Logged in with Google",
        description: `Welcome back, ${userProfile.fullName}!`,
      });

      router.push("/home");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Sign In failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto px-6 py-12 pb-12">
      <div className="space-y-2 mb-10 text-center">
        <h1 className="text-4xl font-black text-primary font-headline tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground font-medium">Enter your credentials to access your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-bold text-primary ml-1">Email</Label>
          <div className="relative">
            <Mail className="absolute left-4 top-4 h-5 w-5 text-muted-foreground/50" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="pl-12 h-14 bg-white rounded-2xl border-none shadow-sm focus-visible:ring-accent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <Label htmlFor="password" className="font-bold text-primary">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-accent hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 h-5 w-5 text-muted-foreground/50" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-12 h-14 bg-white rounded-2xl border-none shadow-sm pr-12 focus-visible:ring-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button 
          type="submit" 
          size="lg" 
          className="w-full h-14 rounded-2xl text-md font-bold bg-primary hover:bg-primary/90 shadow-xl transition-all active:scale-[0.98]"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
        </Button>
      </form>

      <div className="mt-8 space-y-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
            <span className="bg-background px-4 text-muted-foreground/60">OR CONTINUE WITH</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn}
            className="h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-primary hover:bg-white hover:shadow-md transition-all active:scale-95"
          >
            <Chrome className="mr-2 h-5 w-5 text-[#4285F4]" />
            Google
          </Button>
          <Button variant="outline" className="h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-primary hover:bg-white hover:shadow-md transition-all active:scale-95">
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.96.95-2.44 1.78-3.99 1.72-1.58-.05-2.99-.78-3.94-1.62-1.12-1-2.23-2.64-2.23-4.75 0-3.08 2.39-5.4 5.39-5.4 1.33 0 2.5.54 3.22 1.25l-.01.01c-.13.13-.23.27-.3.42-.87 1.63-1.46 3.44-1.46 5.42 0 1.07.18 2.08.52 3.01-.13.11-.27.22-.4.32-.23.18-.46.36-.71.55l.02.09z" />
            </svg>
            Apple
          </Button>
        </div>
      </div>

      <div className="mt-auto pt-8 text-center">
        <p className="text-sm text-muted-foreground font-medium">
          Don't have an account?{" "}
          <Link href="/signup" className="font-bold text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
