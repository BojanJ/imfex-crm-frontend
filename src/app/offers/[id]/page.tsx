'use client';

import React, { useState, useEffect, use } from 'react';
import { imfexStore } from '@/lib/store';
import { Offer } from '@/types';
import { OfferBuilderForm } from '@/components/offer-builder/offer-builder-form';

export const dynamic = 'force-dynamic';

export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id;
  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    if (id) {
      const found = imfexStore.getOfferById(id);
      if (found) setOffer(found);
    }
  }, [id]);

  if (!offer) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        Loading offer details...
      </div>
    );
  }

  return <OfferBuilderForm existingOffer={offer} />;
}
