'use client';

import React from 'react';
import { Offer, Product } from '@/types';

interface PrintableOfferDocumentProps {
  offer: Offer;
  products?: Product[];
}

export const PrintableOfferDocument: React.FC<PrintableOfferDocumentProps> = ({
  offer,
  products = [],
}) => {
  return (
    <div
      id="printable-offer-document"
      className="w-full max-w-[800px] mx-auto bg-white text-slate-800 p-8 sm:p-10 font-sans text-xs shadow-md border border-slate-200 rounded-sm leading-relaxed"
      style={{ minHeight: '1120px' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-wider text-blue-600">IMFEX</h1>
          <p className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">
            INDUSTRIAL & RESIDENTIAL DOORS, WINDOWS & SHUTTERS
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-600 leading-snug">
          <p className="font-bold text-slate-900 text-xs">IMFEX Solutions Ltd.</p>
          <p>100 Commercial Boulevard, Suite 400</p>
          <p>Tax VAT ID: EX-99201928</p>
          <p>Email: info@imfex.com | Web: www.imfex.com</p>
        </div>
      </div>

      {/* Customer & Offer Details Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Customer Info */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-1">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
            CUSTOMER INFORMATION
          </p>
          <p className="font-bold text-sm text-slate-900">
            {offer.customer?.companyName || offer.customer?.name || 'Valued Customer'}
          </p>
          {offer.customer?.taxId && (
            <p className="text-slate-700">
              <span className="font-semibold">VAT / Tax ID:</span> {offer.customer.taxId}
            </p>
          )}
          {offer.customer?.email && (
            <p className="text-slate-700">
              <span className="font-semibold">Email:</span> {offer.customer.email}
            </p>
          )}
          {offer.customer?.phone && (
            <p className="text-slate-700">
              <span className="font-semibold">Phone:</span> {offer.customer.phone}
            </p>
          )}
          <p className="text-slate-700">
            <span className="font-semibold">Address:</span>{' '}
            {[offer.customer?.address, offer.customer?.city].filter(Boolean).join(', ') || 'N/A'}
          </p>
        </div>

        {/* Offer Metadata */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-1">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
            OFFER SPECIFICATIONS
          </p>
          <p className="text-slate-700">
            <span className="font-semibold">Offer Number:</span>{' '}
            <span className="font-bold text-blue-600">{offer.offerNumber}</span>
          </p>
          <p className="text-slate-700">
            <span className="font-semibold">Date Created:</span>{' '}
            {new Date(offer.createdAt).toLocaleDateString()}
          </p>
          <p className="text-slate-700">
            <span className="font-semibold">Valid Until:</span>{' '}
            {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : '30 Days from issue'}
          </p>
          <p className="text-slate-700">
            <span className="font-semibold">Status:</span>{' '}
            <span className="font-bold text-slate-900">{offer.status}</span>
          </p>
          <p className="text-slate-700">
            <span className="font-semibold">Tax Rate:</span> {offer.taxRate}% VAT
          </p>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mb-6 overflow-hidden border border-slate-200 rounded-md">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2.5 text-center w-8">#</th>
              <th className="p-2.5">Description & Specifications</th>
              <th className="p-2.5 text-center w-28">Dimensions (W x H)</th>
              <th className="p-2.5 text-center w-12">Qty</th>
              <th className="p-2.5 text-right w-20">Unit (€)</th>
              <th className="p-2.5 text-right w-24">Total (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {offer.items.map((item, idx) => {
              const product = products.find((p) => p.id === item.productId);
              const model = product?.models.find((m) => m.id === item.productModelId);

              const specSummary = item.specifications
                .map((s) => {
                  const key = product?.specificationKeys.find((k) => k.id === s.specificationKeyId);
                  const opt = key?.options.find((o) => o.id === s.specificationOptionId);
                  return `${key?.name || 'Spec'}: ${opt?.label || s.customValue || 'Selected'}`;
                })
                .join(' | ');

              return (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900 text-xs">
                      {item.customTitle || (product ? `${product.name} - ${model?.name || ''}` : 'Custom Item')}
                    </p>
                    <div className="flex gap-1 my-1">
                      {item.serviceTypes.map((st) => (
                        <span
                          key={st}
                          className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                    {specSummary ? (
                      <p className="text-[10px] text-slate-500 italic mt-0.5">{specSummary}</p>
                    ) : null}
                  </td>
                  <td className="p-2.5 text-center font-medium text-slate-600">
                    {item.widthMm && item.heightMm ? `${item.widthMm} x ${item.heightMm} mm` : '-'}
                  </td>
                  <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                  <td className="p-2.5 text-right font-medium">€{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">
                    €{Number(item.totalPrice).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Breakdown */}
      <div className="flex justify-end mb-8">
        <div className="w-64 bg-slate-50 border border-slate-200 p-4 rounded-md space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-bold text-slate-900">€{Number(offer.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax ({offer.taxRate}%):</span>
            <span className="font-bold text-slate-900">€{Number(offer.taxAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-blue-600 pt-2 font-black text-sm text-slate-900">
            <span>TOTAL AMOUNT:</span>
            <span className="text-blue-600">€{Number(offer.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-slate-100 p-4 rounded-md border border-slate-200 mb-6 text-[10px] text-slate-600 space-y-1">
        <p className="font-bold text-slate-800 uppercase">TERMS & CONDITIONS</p>
        <p>1. Offer is valid until {offer.validUntil || '30 days from creation date'}.</p>
        <p>2. Payment terms: 50% deposit upon order confirmation, 50% upon delivery/installation completion.</p>
        <p>3. Standard warranty of 24 months applies to all structural product components and drives.</p>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400">
        <p>IMFEX CRM Engine • Official Quotation</p>
        <p>Page 1 of 1</p>
      </div>
    </div>
  );
};
