'use client';

import React, { Suspense } from 'react';
import { OfferBuilderForm } from '@/components/offer-builder/offer-builder-form';
import { imfexStore, useImfexStore } from '@/lib/store';
import { canWriteOffers } from '@/lib/rbac';
import { AccessDenied } from '@/components/ui/access-denied';

export default function NewOfferPage() {
  useImfexStore();
  if (!canWriteOffers(imfexStore.getCurrentRole())) {
    return <AccessDenied backHref="/offers" />;
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Вчитување...</div>}>
      <OfferBuilderForm />
    </Suspense>
  );
}
