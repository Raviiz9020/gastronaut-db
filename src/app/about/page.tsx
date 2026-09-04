
'use client';

import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AboutUsPage() {
  const words = ["About", "Us"];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <div className="mb-4">
            <Link href="/" passHref>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-full border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-xs"
                aria-label="Back to Home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Card className="w-full bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
            <CardHeader className="text-center px-4 sm:px-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse flex-shrink-0" />
                <CardTitle className="font-headline text-2xl sm:text-4xl md:text-5xl text-primary flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  {words.map((word, wordIndex) => (
                    <span key={wordIndex} className="inline-flex">
                      {word.split("").map((char, charIndex) => (
                        <motion.span
                          key={`${char}-${charIndex}`}
                          initial={{ y: 0 }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: (wordIndex * 4 + charIndex) * 0.08,
                            ease: 'easeInOut'
                          }}
                          style={{ whiteSpace: 'pre' }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </span>
                  ))}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-invert prose-p:text-muted-foreground prose-h2:text-primary prose-h3:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground mx-auto p-6">
              <p>
                <strong>Welcome to <Link href="https://hyperdelivery.in/" target="_blank" className="text-primary hover:underline">HyperDelivery</Link></strong> — your neighborhood delivery platform, built specially for the vibrant community of <strong>Life Republic</strong>.
              </p>
              <p>
                At HyperDelivery, we believe some of the best meals and freshest ingredients are just a few buildings away. Our mission is to support <strong>home chefs, local chicken and fish vendors</strong>, and every small food business within our township. Whether you're cooking out of passion or running a humble shop, we're here to help you grow.
              </p>
              <p>
                We aim to <strong>onboard every local shop and passionate cook in Life Republic</strong>, offering a digital platform to showcase your talent without worrying about advertising or tech.
              </p>

              <h3 className="font-headline text-2xl mt-8">What We Do</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create visibility for your food or shop on <Link href="https://hyperdelivery.in/" target="_blank" className="text-primary hover:underline">hyperdelivery.in</Link></li>
                <li>Make it easy for neighbors to order from neighbors</li>
                <li>Handle delivery coordination within the society</li>
                <li>In a single order, we deliver items from multiple vendors</li>
              </ul>

              <h3 className="font-headline text-2xl mt-8">Why It Matters</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Support Local Talent:</strong> You don’t need a big budget to start selling what you love to cook or prepare.</li>
                <li><strong>Strengthen Community:</strong> Every order supports a fellow resident and keeps value within our community.</li>
                <li><strong>Barrier-Free Entry:</strong> No storefront, no tech knowledge, just your skills and our platform.</li>
              </ul>

              <p className="mt-6">
                Whether you're a resident with a signature recipe, a fish seller at the society gate, or a local chicken shop—<strong>HyperDelivery is for you.</strong> Let’s make our township a self-sustained, flavor-rich community.
              </p>

              <div className="text-center mt-12">
                <p>directly visit: <Link href="https://hyperdelivery.in/" target="_blank" className="text-primary font-bold hover:underline">https://hyperdelivery.in</Link></p>
              </div>

              <p className="text-center font-semibold mt-12">
                Let’s deliver more than food. Let’s deliver opportunity, flavor, and community—together.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
