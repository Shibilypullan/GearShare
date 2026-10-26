'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Camera, 
  Plus, 
  Sparkles, 
  MapPin, 
  ChevronRight, 
  X,
  Loader2,
  Trash2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { generateItemDescription } from '@/ai/flows/ai-description-writer';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Load map picker dynamically
const MapPicker = dynamic(() => import('@/components/share/map-picker'), {
  ssr: false,
  loading: () => <div className="h-48 w-full bg-muted animate-pulse rounded-2xl" />
});

const CATEGORIES = ["Books", "Calculators", "Electronics", "Cameras", "Lab Gear", "Sports", "Other"];

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export default function SharePage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Location Search State
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    description: '',
    pricePerDay: '',
    pickupLocation: '',
    condition: 'Excellent',
    latitude: 10.0274, // Software Block, CUSAT
    longitude: 76.3288
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch location suggestions as user types
  useEffect(() => {
    if (!formData.pickupLocation.trim() || formData.pickupLocation.length < 3 || !showSuggestions) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.pickupLocation)}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setLocationSuggestions(data);
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.pickupLocation, showSuggestions]);

  const handleSelectLocation = (lat: string, lon: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      pickupLocation: name.split(',')[0]
    }));
    setShowSuggestions(false);
    toast({
      title: "Location Pinned",
      description: `Map updated to ${name.split(',')[0]}`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (photos.length >= 4) {
        toast({
          title: "Limit reached",
          description: "You can only upload up to 4 photos.",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAI = async () => {
    if (!formData.itemName || !formData.category) {
      toast({
        title: "Information missing",
        description: "Please provide an item name and category first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateItemDescription({
        itemName: formData.itemName,
        category: formData.category,
        keywords: [formData.condition]
      });
      setFormData(prev => ({ ...prev, description: result.description }));
      toast({
        title: "Description generated!",
        description: "AI has crafted a compelling description for you.",
      });
    } catch (error: any) {
      toast({
        title: "AI failed",
        description: "Could not generate description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast({ title: "Please login", variant: "destructive" });
      return;
    }

    if (photos.length === 0) {
      toast({
        title: "Photo required",
        description: "Please upload at least one photo of the item.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const listingData = {
        ownerId: auth.currentUser.uid,
        categoryId: formData.category,
        name: formData.itemName,
        description: formData.description,
        pricePerDay: parseFloat(formData.pricePerDay || '0'),
        isFree: parseFloat(formData.pricePerDay || '0') === 0,
        pickupLocationAddress: formData.pickupLocation || 'Main Campus',
        condition: formData.condition,
        photoUrls: photos,
        latitude: formData.latitude,
        longitude: formData.longitude,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "items"), listingData);
      
      toast({
        title: "Success!",
        description: "Your item is now live in the marketplace.",
      });
      router.push("/home");
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-24">
      {/* Header */}
      <div className="p-6 bg-background sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight">Share Gear</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
            List an item for the campus
          </p>
        </div>
        <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors">
          <X className="h-6 w-6 text-primary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 space-y-8">
        {/* Photos Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Label className="font-bold text-primary">Photos</Label>
            <span className="text-[10px] text-muted-foreground uppercase font-black">{photos.length} / 4</span>
          </div>
          
          <div className="flex space-x-3 overflow-x-auto pb-2 hide-scrollbar">
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-32 w-32 shrink-0 bg-white rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center space-y-2 hover:border-accent hover:bg-accent/5 transition-all group"
            >
              <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-accent/20 transition-colors">
                <Camera className="h-6 w-6 text-primary group-hover:text-accent" />
              </div>
              <span className="text-[10px] font-bold text-primary">Add Photo</span>
            </button>

            {photos.map((photo, index) => (
              <div key={index} className="relative h-32 w-32 shrink-0 bg-muted/30 rounded-3xl overflow-hidden shadow-sm border border-border/50">
                <Image 
                  src={photo} 
                  alt={`Upload ${index}`} 
                  fill 
                  className="object-cover"
                />
                <button 
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="itemName" className="font-bold text-primary ml-1">What are you sharing?</Label>
            <Input 
              id="itemName"
              placeholder="e.g. Scientific Calculator"
              className="h-14 bg-white rounded-2xl border-none shadow-sm px-5"
              value={formData.itemName}
              onChange={(e) => handleInputChange('itemName', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-primary ml-1">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => handleInputChange('category', v)}
            >
              <SelectTrigger className="h-14 bg-white rounded-2xl border-none shadow-sm px-5">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="rounded-xl">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="description" className="font-bold text-primary">Description</Label>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="text-accent hover:text-accent/80 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5"
              >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Write
              </Button>
            </div>
            <Textarea 
              id="description"
              placeholder="Tell students more about the item..."
              className="min-h-[120px] bg-white rounded-3xl border-none shadow-sm p-5 resize-none"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Label className="font-bold text-primary">Set Item Location</Label>
            <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent font-black uppercase">Search or Tap Map</Badge>
          </div>
          <div className="h-60 rounded-[32px] overflow-hidden shadow-sm border border-border/10">
            <MapPicker 
              lat={formData.latitude} 
              lng={formData.longitude} 
              onLocationChange={(lat, lng) => {
                handleInputChange('latitude', lat);
                handleInputChange('longitude', lng);
              }} 
            />
          </div>
          
          <div className="relative" ref={suggestionRef}>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm">
              <div className="p-2.5 bg-accent/10 rounded-xl">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <Input 
                placeholder="Search campus location (e.g. Software Block)"
                className="h-10 border-none shadow-none focus-visible:ring-0 text-xs font-bold"
                value={formData.pickupLocation}
                onChange={(e) => {
                  handleInputChange('pickupLocation', e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
            </div>

            {/* Location Suggestions Dropdown */}
            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-border/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-[1000]">
                <div className="p-2">
                  <p className="px-3 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/10 mb-1">
                    Select Match
                  </p>
                  {locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => handleSelectLocation(suggestion.lat, suggestion.lon, suggestion.display_name)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors rounded-xl text-left group"
                    >
                      <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                        <MapPin className="h-3 w-3 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary truncate">
                          {suggestion.display_name.split(',')[0]}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {suggestion.display_name.split(',').slice(1).join(',')}
                        </p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price" className="font-bold text-primary ml-1">Price / Day (₹)</Label>
            <div className="relative">
              <Input 
                id="price"
                type="number"
                placeholder="0"
                className="h-14 bg-white rounded-2xl border-none shadow-sm pl-10"
                value={formData.pricePerDay}
                onChange={(e) => handleInputChange('pricePerDay', e.target.value)}
                required
              />
              <span className="absolute left-4 top-4 font-bold text-primary opacity-50">₹</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-primary ml-1">Condition</Label>
            <Select 
              value={formData.condition} 
              onValueChange={(v) => handleInputChange('condition', v)}
            >
              <SelectTrigger className="h-14 bg-white rounded-2xl border-none shadow-sm px-5">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="New" className="rounded-xl">New</SelectItem>
                <SelectItem value="Excellent" className="rounded-xl">Excellent</SelectItem>
                <SelectItem value="Good" className="rounded-xl">Good</SelectItem>
                <SelectItem value="Fair" className="rounded-xl">Fair</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            size="lg" 
            disabled={isLoading}
            className="w-full h-16 rounded-[24px] text-lg font-black bg-primary hover:bg-primary/90 shadow-2xl transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                Confirm Listing
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
