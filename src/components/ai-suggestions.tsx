
'use client';

import { useState } from 'react';
import type { MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';

interface AiSuggestionsProps {
  suggestions: MenuItem[];
  error: string | null;
  onSelectSuggestion: (item: MenuItem) => void;
}

export default function AiSuggestions({ suggestions, error, onSelectSuggestion }: AiSuggestionsProps) {

  if (!error && suggestions.length === 0) {
    return null;
  }

  return (
    <section className="my-4">
        <div className="text-center">
          {error && (
            <Alert variant="destructive" className="mt-6 text-left">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {suggestions.length > 0 && (
            <div className="mt-4">
              <Carousel opts={{
                align: "start",
                loop: true,
              }} className="w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto">
                <CarouselContent>
                  {suggestions.map((item, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1">
                      <Card 
                        className="overflow-hidden cursor-pointer hover:border-primary/60 transition-all bg-card/50"
                        onClick={() => onSelectSuggestion(item)}
                      >
                        <CardContent className="flex flex-col items-center justify-center p-2 gap-2">
                          <Image src={item.image} alt={item.name} width={150} height={84} data-ai-hint={item.aiHint} className="rounded-full aspect-square object-cover"/>
                          <h3 className="font-semibold text-sm">{item.name}</h3>
                        </CardContent>
                      </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-primary hover:bg-primary/10 hover:text-primary"/>
                <CarouselNext className="text-primary hover:bg-primary/10 hover:text-primary"/>
              </Carousel>
            </div>
          )}
        </div>
    </section>
  );
}
