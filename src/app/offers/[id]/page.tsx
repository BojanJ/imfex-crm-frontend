'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { imfexStore, useImfexStore } from '@/lib/store';
import { Offer } from '@/types';
import { OfferBuilderForm } from '@/components/offer-builder/offer-builder-form';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id;
  useImfexStore(); // Auto-subscribe to store updates on browser refresh

  const [offer, setOffer] = useState<Offer | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    if (id) {
      const found = imfexStore.getOfferById(id);
      if (found) {
        setOffer(found);
      }
      setHasAttemptedLoad(true);
    }
  }, [id, imfexStore.getOffers().length]);

  if (!offer) {
    if (!hasAttemptedLoad || imfexStore.getOffers().length === 0) {
      return (
        <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading offer details from database...</span>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <p className="text-sm font-bold text-red-500">Offer record not found.</p>
        <p className="text-xs text-muted-foreground">The requested quote may have been removed or does not exist.</p>
        <Link
          href="/offers"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Offers List
        </Link>
      </div>
    );
  }

  return <OfferBuilderForm existingOffer={offer} />;
}
