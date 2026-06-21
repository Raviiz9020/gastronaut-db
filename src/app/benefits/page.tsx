
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Heart, 
    Users, 
    ChefHat, 
    Rocket, 
    Gift, 
    Star, 
    Package, 
    Store,
    LayoutDashboard,
    Sparkles,
    BarChart,
    Users2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const customerBenefits = [
  { icon: <ChefHat className="h-6 w-6 text-blue-400" />, title: "Discover Hidden Gems", description: "Explore unique dishes from talented home chefs and local shops you won't find anywhere else." },
  { icon: <Package className="h-6 w-6 text-green-400" />, title: "Order From Multiple Shops", description: "In a single order, get items delivered from several different vendors, saving you time and effort." },
  { icon: <Rocket className="h-6 w-6 text-red-400" />, title: "Real-Time Order Tracking", description: "Stay updated on your order's progress from the moment it's placed until it arrives." },
  { icon: <Gift className="h-6 w-6 text-yellow-400" />, title: "Access to Exclusive Specials", description: "Be the first to know about daily specials for breakfast, lunch, and dinner." },
  { icon: <Star className="h-6 w-6 text-amber-400" />, title: "Direct & Meaningful Feedback", description: "Rate individual items and vendors to help them improve and guide other customers." },
  { icon: <Users className="h-6 w-6 text-purple-400" />, title: "Support Your Community", description: "Every order directly supports a local entrepreneur and keeps value within our community." }
];

const vendorBenefits = [
  { icon: <Store className="h-6 w-6 text-blue-400" />, title: "Zero-Cost Digital Storefront", description: "Get your menu online and start selling without the cost of building your own website." },
  { icon: <LayoutDashboard className="h-6 w-6 text-green-400" />, title: "Go Live in Minutes", description: "An intuitive dashboard lets you manage your menu and availability with a single click." },
  { icon: <Sparkles className="h-6 w-6 text-yellow-400" />, title: "AI-Powered Menu Creation", description: "Use our AI to generate stunning, professional-quality images for your menu items and offers." },
  { icon: <Package className="h-6 w-6 text-red-400" />, title: "Flexible Order Management", description: "Manage both customer deliveries and Dine-In orders, update orders on the fly, and assign your own staff." },
  { icon: <BarChart className="h-6 w-6 text-purple-400" />, title: "Effortless Financial Tracking", description: "Monitor your revenue with simple, date-filtered reports that can be exported for your records." },
  { icon: <Users2 className="h-6 w-6 text-amber-400" />, title: "Boost Your Visibility", description: "Showcase your culinary skills to the entire community and attract new, local customers." }
];

const galleryImages = [
    { id: "img-7", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(7).jpeg?alt=media&token=e6d6120f-529a-40d9-8c86-93b91c38b9ff" },
    { id: "img-8", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM.jpeg?alt=media&token=8afbba4c-f697-46d9-bbe2-b79c89ee3d45" },
    { id: "img-1", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(1).jpeg?alt=media&token=7cd28b5f-1ac0-4c8a-8ab2-d1823ed5aa21" },
    { id: "img-2", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(2).jpeg?alt=media&token=1aedde35-1748-4ad4-86bd-99054b55abc2" },
    { id: "img-3", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(3).jpeg?alt=media&token=5035016a-a640-4d87-9ca5-560b130e7be0" },
    { id: "img-4", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(4).jpeg?alt=media&token=5951fcbc-6098-4319-b022-39df8da950c7" },
    { id: "img-5", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(5).jpeg?alt=media&token=52c9c9a7-a255-406a-8f49-59ee73a06216" },
    { id: "img-6", src: "https://firebasestorage.googleapis.com/v0/b/hyperdelivery-c381b.firebasestorage.app/o/Benefits%2FWhatsApp%20Image%202025-09-19%20at%205.23.24%20PM%20(6).jpeg?alt=media&token=b34ce5a0-c54a-45b9-a087-8a69617d20b4" }
];

const BenefitItem = ({ icon, title, description, index }: { icon: JSX.Element; title: string; description: string; index: number }) => (
  <motion.div
    className="flex items-start gap-4"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
  >
    <div className="flex-shrink-0 mt-1">{icon}</div>
    <div>
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </motion.div>
);

const ZoomedImageOverlay = ({
  selectedImage,
  onClose,
}: {
  selectedImage: { id: string; src: string } | null;
  onClose: () => void;
}) => {
  if (!selectedImage) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full h-full max-w-4xl max-h-[80vh]"
        layoutId={selectedImage.id}
      >
        <Image
          src={selectedImage.src}
          alt="Zoomed community gallery image"
          fill
          className="object-contain"
        />
      </motion.div>
    </motion.div>
  );
};


export default function BenefitsPage() {
  const titlePart1 = "Why You'll Love ";
  const titlePart2 = "HyperDelivery";
  const [selectedImage, setSelectedImage] = useState<{ id: string; src: string } | null>(null);
  
  const titleColors = [
    "text-red-500", "text-orange-500", "text-yellow-500", "text-green-500",
    "text-blue-500", "text-indigo-500", "text-purple-500", "text-pink-500",
    "text-red-400", "text-orange-400", "text-yellow-400", "text-green-400", "text-blue-400"
  ];


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
       <AnimatePresence>
        {selectedImage && <ZoomedImageOverlay selectedImage={selectedImage} onClose={() => setSelectedImage(null)} />}
      </AnimatePresence>
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <Card className="w-full max-w-5xl mx-auto bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Heart className="h-8 w-8 text-primary animate-pulse" />
                <div className="font-headline text-3xl sm:text-4xl text-primary">
                    <div>{titlePart1}</div>
                    <div className="flex justify-center overflow-hidden">
                        {titlePart2.split("").map((char, index) => (
                            <motion.span
                                key={`${char}-${index}`}
                                className={cn(titleColors[index % titleColors.length])}
                                initial={{ y: 0 }}
                                animate={{
                                    y: [0, -8, 0, -5, 0],
                                    scale: [1, 1.15, 1, 1.1, 1],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: index * 0.15,
                                    ease: 'easeInOut',
                                }}
                                style={{ whiteSpace: 'pre' }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </div>
                </div>
              </div>
              <CardDescription className="text-muted-foreground max-w-2xl mx-auto">
                HyperDelivery is built to empower our local community. Here’s how it benefits everyone.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 p-6 md:p-10">
              <div className="space-y-6">
                <h3 className="font-headline text-2xl text-center text-blue-400">For Our Customers</h3>
                <div className="space-y-6">
                  {customerBenefits.map((benefit, index) => (
                    <BenefitItem key={benefit.title} {...benefit} index={index} />
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                 <h3 className="font-headline text-2xl text-center text-green-400">For Our Vendors</h3>
                 <div className="space-y-6">
                  {vendorBenefits.map((benefit, index) => (
                    <BenefitItem key={benefit.title} {...benefit} index={index} />
                  ))}
                </div>
              </div>
            </CardContent>
             <CardFooter className="p-6 md:p-10 mt-6 flex-col items-center">
              <h3 className="font-headline text-2xl text-center text-primary mb-6">Have a look in our app</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                {galleryImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    layoutId={image.id}
                    className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg cursor-pointer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                    onClick={() => setSelectedImage(image)}
                  >
                    <Image
                      src={image.src}
                      alt={`Community gallery image ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </motion.div>
                ))}
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
