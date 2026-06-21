
'use client';

import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Home, Building, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AboutUsPage() {
  const title = "About Us";

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <Card className="w-full max-w-4xl mx-auto bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Star className="h-8 w-8 text-primary animate-pulse"/>
                    <CardTitle className="font-headline text-5xl text-primary flex overflow-hidden">
                      {title.split("").map((char, i) => (
                        <motion.span
                          key={`${char}-${i}`}
                          initial={{ y: 0 }}
                          animate={{ y: [0, -10, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: 'easeInOut'
                          }}
                          style={{ whiteSpace: 'pre' }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="prose prose-invert prose-p:text-muted-foreground prose-h2:text-primary prose-h3:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground mx-auto p-6">
                <p>
                    <strong>Welcome to <Link href="https://hyperdelivery.shop/" target="_blank" className="text-primary hover:underline">HyperDelivery</Link></strong> — your neighborhood delivery platform, built specially for the vibrant community of <strong>Life Republic</strong>.
                </p>
                <p>
                    At HyperDelivery, we believe some of the best meals and freshest ingredients are just a few buildings away. Our mission is to support <strong>home chefs, local chicken and fish vendors</strong>, and every small food business within our township. Whether you're cooking out of passion or running a humble shop, we're here to help you grow.
                </p>
                <p>
                    We aim to <strong>onboard every local shop and passionate cook in Life Republic</strong>, offering a digital platform to showcase your talent without worrying about advertising or tech.
                </p>

                <h3 className="font-headline text-2xl mt-8">What We Do</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Create visibility for your food or shop on <Link href="https://hyperdelivery.shop/" target="_blank" className="text-primary hover:underline">hyperdelivery.shop</Link></li>
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
                  <p>directly visit: <Link href="https://hyperdelivery.shop/" target="_blank" className="text-primary font-bold hover:underline">https://hyperdelivery.shop</Link></p>
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
