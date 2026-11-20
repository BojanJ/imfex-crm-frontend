'use client';

import React from 'react';

interface PageLoadingSkeletonProps {
  cards?: number;
  rows?: number;
}

export const PageLoadingSkeleton: React.FC<PageLoadingSkeletonProps> = ({
  cards = 4,
  rows = 5,
}) => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Се вчитуваат податоците...">
      {/* Header skeleton */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <div className="h-6 w-56 bg-muted rounded-lg" />
          <div className="h-3.5 w-80 max-w-full bg-muted/70 rounded" />
        </div>
        <div className="h-9 w-36 bg-muted rounded-xl shrink-0" />
      </div>

      {/* KPI cards skeleton */}
      {cards > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded-xl" />
              </div>
              <div className="h-7 w-28 bg-muted rounded-lg" />
              <div className="h-3 w-36 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Table / content skeleton */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="h-4 w-44 bg-muted rounded" />
        <div className="space-y-2.5 pt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-muted/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};
