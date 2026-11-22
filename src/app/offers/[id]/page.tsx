'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { useOfferQuery } from '@/lib/queries';
import { OfferBuilderForm } from '@/components/offer-builder/offer-builder-form';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const id = resolvedParams?.id;
  const { data: offer, isLoading, isPending } = useOfferQuery(id);

  if ((isLoading || isPending) && !offer) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>{t('offers.loading_details')}</span>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm text-xs">
        <p className="text-sm font-bold text-red-500">{t('offers.not_found_title')}</p>
        <p className="text-muted-foreground">
          {t('offers.not_found_desc')} (<code className="font-mono">{id}</code>)
        </p>
        <div className="pt-2">
          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> {t('offers.return_to_list')}
          </Link>
        </div>
      </div>
    );
  }

  return <OfferBuilderForm existingOffer={offer} />;
}
