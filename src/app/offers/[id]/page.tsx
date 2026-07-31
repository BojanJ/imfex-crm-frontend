'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { imfexStore, useImfexStore, getApiUrl } from '@/lib/store';
import { Offer } from '@/types';
import { OfferBuilderForm } from '@/components/offer-builder/offer-builder-form';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id;
  useImfexStore(); // Auto-subscribe to store state changes

  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // 1. Check local store
    const local = imfexStore.getOfferById(id);
    if (local) {
      setOffer(local);
      setIsLoading(false);
      return;
    }

    // 2. Fetch directly from backend API
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/offers/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          setOffer(data);
        } else {
          const storeFound = imfexStore.getOfferById(id);
          if (storeFound) setOffer(storeFound);
        }
      })
      .catch((err) => console.warn('Fetch offer notice:', err))
      .finally(() => setIsLoading(false));
  }, [id, imfexStore.isLoadedFromBackend, imfexStore.getOffers().length]);

  if (isLoading && !offer && !imfexStore.isLoadedFromBackend) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Loading offer details from database...</span>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm text-xs">
        <p className="text-sm font-bold text-red-500">Offer Record Not Found</p>
        <p className="text-muted-foreground">
          The requested quote (ID: <code className="font-mono">{id}</code>) does not exist or may have been deleted during a database reset.
        </p>
        <div className="pt-2">
          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Offers List
          </Link>
        </div>
      </div>
    );
  }

  return <OfferBuilderForm existingOffer={offer} />;
}
