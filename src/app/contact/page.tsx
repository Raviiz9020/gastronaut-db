
'use client';

import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Building, Code } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ContactUsPage() {
  const title = "Contact Us";

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
                    <Phone className="h-8 w-8 text-primary animate-pulse"/>
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
                <CardDescription className="text-muted-foreground max-w-2xl mx-auto">
                    We’d love to hear from you! Whether you’re a customer, a vendor, or someone interested in building platforms like ours, our team is always here to help.
                </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-p:text-muted-foreground prose-h3:text-primary prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground mx-auto p-6 space-y-6">
                
                <div>
                    <h3 className="font-headline text-2xl mt-8">For Customers</h3>
                    <p>
                        Have a question about your order, delivery, or need quick support?
                        <br/>
                        👉 Reach out to us anytime at{' '}
                        <Link href="https://hyperdelivery.shop/vendor-details" target="_blank" className="text-blue-400 hover:underline">
                          hyperdelivery.shop/vendor-details
                        </Link>
                    </p>
                </div>

                <div>
                    <h3 className="font-headline text-2xl mt-8">For Vendors & Partners</h3>
                    <p>
                        We’re always looking to onboard new vendors who share our passion for quality and timely delivery. Partner with us and grow your business by reaching more customers every day.
                        <br/>
                        👉 Interested in becoming a vendor? Start your journey here:{' '}
                        <Link href="/admin/login" className="text-blue-400 hover:underline">
                          hyperdelivery.shop/admin/login
                        </Link>
                        <br/>
                        Or contact - <a href="tel:+917083609020" className="text-blue-400 hover:underline">+917083609020</a>
                    </p>
                </div>

                <div>
                    <h3 className="font-headline text-2xl mt-8">For Entrepreneurs / Developers</h3>
                    <p>
                        Thinking of creating a delivery platform like this for your own business? We can guide you on how to set up, scale, and manage a delivery system with the right technology stack.
                        <br/>
                        👉 Connect with us to learn more:{' '}
                        <a href="mailto:rvp.officework@gmail.com" className="text-blue-400 hover:underline">
                          rvp.officework@gmail.com
                        </a>
                    </p>
                </div>

                <p className="text-center font-semibold mt-12 !text-foreground">
                    We look forward to connecting with you! 🚀
                </p>

            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
