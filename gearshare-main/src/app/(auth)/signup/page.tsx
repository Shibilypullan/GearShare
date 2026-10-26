'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, ChevronDown, Mail, Lock, ShieldCheck, Chrome, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Prepare the user profile data
      const userProfile = {
        id: user.uid,
        fullName: email.split('@')[0], // Default name from email
        email: email,
        profilePhotoUrl: "",
        trustScore: 5.0,
        memberSince: new Date().toISOString(),
        pointsBalance: referralCode ? 50 : 0,
        receiveTransactionNotifications: true,
        receiveMessageNotifications: true,
      };

      // 3. Save the profile to Firestore
      await setDoc(doc(db, "users", user.uid), userProfile);

      toast({
        title: "Account created!",
        description: "Welcome to GearShare.",
      });

      router.push("/home");
    } catch (error: any) {
      console.error("Signup Error:", error);
      let message = "Something went wrong. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is not enabled in Firebase Console.";
      } else if (error.code === 'auth/api-key-not-valid') {
        message = "Firebase configuration issue. Please contact support.";
      }

      toast({
        variant: "destructive",
        title: "Sign up failed",
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
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative overflow-x-hidden pb-12">
      <header className="flex items-center justify-between p-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/50 transition-colors">
          <ArrowLeft className="h-6 w-6 text-primary" />
        </button>
        <h2 className="text-lg font-bold font-headline text-primary tracking-tight">Join GearShare</h2>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-6 pt-4 pb-12 overflow-y-auto">
        <div className="text-center space-y-2 mb-10 mt-4">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tight">Sign Up</h1>
          <p className="text-muted-foreground text-sm font-medium">Create your student profile to start sharing</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold text-primary ml-1">Campus Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 h-5 w-5 text-muted-foreground/50" />
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                className="h-14 bg-white rounded-2xl border-none shadow-sm pl-12 pr-4 focus-visible:ring-accent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-bold text-primary ml-1">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-muted-foreground/50" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                className="h-14 bg-white rounded-2xl border-none shadow-sm pl-12 pr-12 focus-visible:ring-accent"
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

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowReferral(!showReferral)}
              className="flex items-center justify-between w-full py-2 px-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Have a referral code?</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showReferral && "rotate-180")} />
            </button>
            {showReferral && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Input
                  placeholder="Enter code"
                  className="h-12 bg-white rounded-2xl border-none shadow-sm px-4"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
                <p className="text-[10px] text-accent font-bold mt-2 ml-1">GET 50 POINTS ON SIGNUP</p>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 rounded-2xl text-md font-bold bg-primary hover:bg-primary/90 shadow-xl transition-all active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
          </Button>
        </form>

        <div className="mt-12 space-y-8">
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
              type="button"
              variant="outline" 
              onClick={handleGoogleSignIn}
              className="h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-primary hover:bg-white hover:shadow-md transition-all active:scale-95"
            >
              <Chrome className="mr-2 h-5 w-5 text-[#4285F4]" />
              Google
            </Button>
            <Button variant="outline" className="h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-primary hover:bg-white hover:shadow-md transition-all active:scale-95">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Apple
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
