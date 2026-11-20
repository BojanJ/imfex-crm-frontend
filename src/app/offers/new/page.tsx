'use client';

import React, { Suspense } from 'react';
import { OfferBuilderForm } from '@/components/offer-builder/offer-builder-form';

export default function NewOfferPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Вчитување...</div>}>
      <OfferBuilderForm />
    </Suspense>
  );
}
