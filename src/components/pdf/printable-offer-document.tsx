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
  const customerName = offer.customer?.companyName || offer.customer?.name || 'Почитуван Клиент';
  const customerCity = offer.customer?.city || 'Скопје';
  const customerPhone = offer.customer?.phone || '+389 70 123 456';
  const customerEmail = offer.customer?.email || 'client@imfex.com';

  const dateCreated = offer.createdAt
    ? new Date(offer.createdAt).toLocaleDateString('mk-MK')
    : new Date().toLocaleDateString('mk-MK');

  const validUntil = offer.validUntil
    ? new Date(offer.validUntil).toLocaleDateString('mk-MK')
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('mk-MK');

  const firstItem = offer.items?.[0];
  const firstProduct = products.find((p) => p.id === firstItem?.productId);
  const firstModel = firstProduct?.models.find((m) => m.id === firstItem?.productModelId);

  return (
    <div id="printable-offer-document" className="w-full max-w-[800px] mx-auto bg-white text-slate-800 font-sans leading-relaxed">
      
      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE COVER PAGE */}
      {/* ========================================================================= */}
      <div className="w-full min-h-[1120px] bg-[#0b1329] text-white p-10 flex flex-col justify-between relative overflow-hidden page-break-after">
        {/* Top Brand Block */}
        <div className="text-center pt-8 space-y-3 z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mb-2">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v3H4V4zm0 6h12v3H4v-3zm0 6h8v3H4v-3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase">IMFEX</h1>
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1px] w-12 bg-blue-400/60" />
            <span className="text-xs font-bold tracking-widest text-blue-300 uppercase">GROUP</span>
            <span className="h-[1px] w-12 bg-blue-400/60" />
          </div>
          <p className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
            SOLUTIONS BUILT TO LAST.
          </p>
        </div>

        {/* Center Title Block */}
        <div className="text-center space-y-4 my-auto z-10">
          <h2 className="text-3xl font-black tracking-tight text-white uppercase">
            ТЕХНИЧКА И<br />КОМЕРЦИЈАЛНА ПОНУДА
          </h2>
          <p className="text-sm font-semibold text-slate-300">
            Професионално решение за вашиот објект
          </p>

          {/* Metadata Cards Grid (3 Pills) */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-6 text-xs">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-xl text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">БРОЈ НА ПОНУДА</p>
              <p className="text-sm font-black text-white font-mono mt-0.5">{offer.offerNumber}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-xl text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">ДА ТУМ</p>
              <p className="text-sm font-black text-white font-mono mt-0.5">{dateCreated}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-xl text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">ВАЖИ ДО</p>
              <p className="text-sm font-black text-white font-mono mt-0.5">{validUntil}</p>
            </div>
          </div>
        </div>

        {/* Decorative Garage Door Graphic Placeholder Card */}
        <div className="relative w-full h-48 rounded-2xl bg-gradient-to-t from-slate-900 via-slate-800 to-slate-900 border border-white/10 p-6 flex flex-col justify-end shadow-2xl z-10 my-4">
          <div className="absolute inset-0 bg-slate-950/40 rounded-2xl" />
          <div className="relative z-10 space-y-1">
            <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
              {firstProduct?.name || 'Премиум Системи'}
            </span>
            <p className="text-xs text-slate-300 font-semibold">
              Алуминиумски и челични сегментни врати, прозорци и автоматика.
            </p>
          </div>
        </div>

        {/* Customer Floating Card Banner */}
        <div className="bg-white text-slate-900 p-5 rounded-2xl shadow-2xl z-10 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">ПОДГОТВЕНО ЗА</p>
            <p className="text-base font-black text-slate-900 mt-0.5">{customerName}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              📍 {customerCity} &nbsp;|&nbsp; 📞 {customerPhone} &nbsp;|&nbsp; ✉️ {customerEmail}
            </p>
          </div>
          <div className="text-right border-l border-slate-200 pl-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">ПОДГОТВЕНО ОД</p>
            <p className="text-xs font-black text-slate-900">IMFEX CRM Sales Team</p>
            <p className="text-[10px] font-semibold text-slate-500">Sales Consultant</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: TECHNICAL SPECIFICATION */}
      {/* ========================================================================= */}
      <div className="w-full min-h-[1120px] bg-white text-slate-800 p-10 flex flex-col justify-between page-break-after">
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                iF
              </div>
              <span className="font-black text-sm tracking-wider text-slate-900">IMFEX GROUP</span>
            </div>
            <span className="font-bold text-xs text-slate-500 font-mono">ПОНУДА {offer.offerNumber}</span>
          </div>

          {/* Section Title */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">ТЕХНИЧКА СПЕЦИФИКАЦИЈА</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Конфигурација на понуденото решение</p>
          </div>

          {/* Key Parameters Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ВКУПНО СТАВКИ</p>
              <p className="font-black text-slate-900 text-sm mt-0.5">{offer.items?.length || 0} Конфигурирани ставки</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ГЛАВЕН ПРОИЗВОД</p>
              <p className="font-black text-slate-900 text-sm mt-0.5">{firstProduct?.name || 'IMFEX Системи'}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">МОДЕЛ</p>
              <p className="font-black text-slate-900 text-sm mt-0.5">{firstModel?.name || 'Премиум Конфигурација'}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ДИМЕНЗИИ НА ГЛАВНА СТАВКА</p>
              <p className="font-black text-slate-900 text-sm mt-0.5">
                {firstItem?.widthMm && firstItem?.heightMm ? `${firstItem.widthMm} x ${firstItem.heightMm} mm` : 'По барање'}
              </p>
            </div>
          </div>

          {/* Detailed Configuration per Item */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              ДЕТАЛНА ТЕХНИЧКА СПЕЦИФИКАЦИЈА ПО СТАВКИ
            </h3>
            
            {offer.items.map((item, idx) => {
              const product = products.find((p) => p.id === item.productId);
              const model = product?.models.find((m) => m.id === item.productModelId);
              const specs = (item.specifications && item.specifications.length > 0)
                ? item.specifications
                : ((item as any).offerItemSpecifications || []);

              return (
                <div key={item.id || idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                        СТАВКА #{idx + 1}
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        {item.customTitle || (product ? `${product.name} ${model ? `- ${model.name}` : ''}` : 'Понудена ставка')}
                      </h4>
                    </div>
                    {item.widthMm && item.heightMm && (
                      <span className="bg-slate-900 text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        {item.widthMm} x {item.heightMm} mm
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {item.serviceTypes.map((st) => (
                      <span key={st} className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                        {st}
                      </span>
                    ))}
                  </div>

                  {specs.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                      <table className="w-full text-left divide-y divide-slate-100">
                        <tbody className="divide-y divide-slate-100">
                          {specs.map((s: any, sIdx: number) => {
                            const key = product?.specificationKeys.find((k) => k.id === s.specificationKeyId);
                            const opt = key?.options.find((o) => o.id === s.specificationOptionId);
                            const label = opt?.label || s.customValue || 'Избрано';
                            return (
                              <tr key={sIdx} className={sIdx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                                <td className="p-2.5 font-bold text-slate-700 w-1/2">{key?.name || 'Спецификација'}</td>
                                <td className="p-2.5 font-black text-slate-900">{label}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Стандардна спецификација согласно спецификациите на производителот.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-medium">
          <span>IMFEX GROUP - Solutions Built To Last.</span>
          <span>Страна 2</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: COMMERCIAL OVERVIEW & FINANCIALS */}
      {/* ========================================================================= */}
      <div className="w-full min-h-[1120px] bg-white text-slate-800 p-10 flex flex-col justify-between page-break-after">
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                iF
              </div>
              <span className="font-black text-sm tracking-wider text-slate-900">IMFEX GROUP</span>
            </div>
            <span className="font-bold text-xs text-slate-500 font-mono">ПОНУДА {offer.offerNumber}</span>
          </div>

          {/* Section Title */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">КОМЕРЦИЈАЛЕН ПРЕГЛЕД</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Финални ставки повлечени директно од вашата понуда</p>
          </div>

          {/* Commercial Financial Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white font-black uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-center w-10">#</th>
                  <th className="p-3">ОПИС И СПЕЦИФИКАЦИЈА</th>
                  <th className="p-3 text-center w-16">КОЛ.</th>
                  <th className="p-3 text-right w-28">ЕД. ЦЕНА</th>
                  <th className="p-3 text-right w-32">ВКУПНО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {offer.items.map((item, idx) => {
                  const product = products.find((p) => p.id === item.productId);
                  const model = product?.models.find((m) => m.id === item.productModelId);
                  const specs = (item.specifications && item.specifications.length > 0)
                    ? item.specifications
                    : ((item as any).offerItemSpecifications || []);

                  const specSummary = specs.map((s: any) => {
                    const key = product?.specificationKeys.find((k) => k.id === s.specificationKeyId);
                    const opt = key?.options.find((o) => o.id === s.specificationOptionId);
                    return `${key?.name || 'Спецификација'}: ${opt?.label || s.customValue || 'Избрано'}`;
                  }).join(' | ');

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <p className="font-black text-slate-900 text-xs">
                          {item.customTitle || (product ? `${product.name} - ${model?.name || ''}` : 'Ставка')}
                        </p>
                        {item.widthMm && item.heightMm && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Димензии: {item.widthMm} x {item.heightMm} mm
                          </p>
                        )}
                        {specSummary ? (
                          <p className="text-[10px] text-slate-600 font-medium mt-0.5 bg-slate-100/70 p-1 rounded">
                            {specSummary}
                          </p>
                        ) : null}
                        <div className="flex gap-1 mt-1">
                          {item.serviceTypes.map((st) => (
                            <span key={st} className="bg-slate-100 text-slate-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200">
                              {st}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-extrabold text-slate-800">{item.quantity}</td>
                      <td className="p-3 text-right font-medium text-slate-700">€{Number(item.unitPrice || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-slate-900">€{Number(item.totalPrice || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotals */}
          <div className="flex flex-col items-end space-y-1 text-xs pt-2">
            <div className="flex justify-between w-64 text-slate-600 font-bold">
              <span>Меѓузбир:</span>
              <span>€{Number(offer.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-600 font-bold">
              <span>ДДВ ({offer.taxRate || 18}%):</span>
              <span>€{Number(offer.taxAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* High Impact Total Dark Banner */}
          <div className="bg-[#0b1329] text-white p-6 rounded-2xl flex items-center justify-between shadow-xl my-4">
            <span className="text-xl font-black tracking-wider uppercase">ВКУПНО:</span>
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              €{Number(offer.totalAmount || 0).toFixed(2)}
            </span>
          </div>

          {/* Payment & Delivery Terms Grid (3 Cards) */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ПЛАЌАЊЕ И РОКОВИ</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">НАЧИН НА ПЛАЌАЊЕ</p>
                <p className="font-black text-slate-900 mt-1">50% аванс</p>
                <p className="text-[10px] text-slate-500 font-semibold">50% пред испорака</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">РОК НА ИСПОРАКА</p>
                <p className="font-black text-slate-900 mt-1">4-6 недели</p>
                <p className="text-[10px] text-slate-500 font-semibold">по прием на аванс</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ГАРАНЦИЈА</p>
                <p className="font-black text-slate-900 mt-1">24 месеци</p>
                <p className="text-[10px] text-slate-500 font-semibold">според условите</p>
              </div>
            </div>
          </div>

          {/* Important Note Box */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-1">
            <p className="font-black text-slate-900 uppercase tracking-wider">ВАЖНА ЗАБЕЛЕШКА</p>
            <p className="text-slate-600 font-medium leading-relaxed">
              Точните цени, ДДВ третманот, валутата, роковите и условите се контролираат и генерираат автоматски од оперативниот систем <strong>IMFEX Enterprise OS</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-medium">
          <span>IMFEX GROUP - Solutions Built To Last.</span>
          <span>Страна 3</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4: TERMS, CUSTOMER SIGN-OFF & CONTACT */}
      {/* ========================================================================= */}
      <div className="w-full min-h-[1120px] bg-white text-slate-800 p-10 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                iF
              </div>
              <span className="font-black text-sm tracking-wider text-slate-900">IMFEX GROUP</span>
            </div>
            <span className="font-bold text-xs text-slate-500 font-mono">ПОНУДА {offer.offerNumber}</span>
          </div>

          {/* Section Title */}
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">УСЛОВИ И СЛЕДНИ ЧЕКОРИ</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Оперативна процедура за реализација на проектот</p>
          </div>

          {/* 4-Step Process Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-200">
            <div className="flex items-center p-3.5 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center mr-3 shrink-0">
                1
              </div>
              <div>
                <p className="font-black text-slate-900">Прифаќање на понуда</p>
                <p className="text-slate-600 text-[11px]">Понудата се смета за прифатена по писмена потврда и уплата на договорениот аванс.</p>
              </div>
            </div>
            <div className="flex items-center p-3.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center mr-3 shrink-0">
                2
              </div>
              <div>
                <p className="font-black text-slate-900">Техничка проверка</p>
                <p className="text-slate-600 text-[11px]">Пред производство се потврдуваат мерките, условите за монтажа и финалната конфигурација.</p>
              </div>
            </div>
            <div className="flex items-center p-3.5 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center mr-3 shrink-0">
                3
              </div>
              <div>
                <p className="font-black text-slate-900">Испорака и монтажа</p>
                <p className="text-slate-600 text-[11px]">Терминот се координира со клиентот по пристигнување на опремата и контрола на квалитетот.</p>
              </div>
            </div>
            <div className="flex items-center p-3.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center mr-3 shrink-0">
                4
              </div>
              <div>
                <p className="font-black text-slate-900">Гаранција и сервис</p>
                <p className="text-slate-600 text-[11px]">Гаранцијата важи согласно гарантните услови и правилното користење на производот.</p>
              </div>
            </div>
          </div>

          {/* Customer Sign-off Block */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4 pt-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ПОТВРДА ОД КЛИЕНТ</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="border-b border-slate-300 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ИМЕ И ПРЕЗИМЕ</p>
                <p className="font-bold text-slate-900 mt-1">{customerName}</p>
              </div>
              <div className="border-b border-slate-300 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ДАТУМ</p>
                <p className="font-bold text-slate-900 mt-1">__ . __ . 2026</p>
              </div>
              <div className="border-b border-slate-300 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ПОТПИС</p>
                <p className="font-bold text-slate-900 mt-1">__________________</p>
              </div>
            </div>
          </div>

          {/* Full-width Dark Navy Footer Banner */}
          <div className="bg-[#0b1329] text-white p-6 rounded-2xl flex items-center justify-between shadow-xl mt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white text-slate-900 font-black text-[10px] flex items-center justify-center">
                  iF
                </div>
                <span className="font-black text-sm tracking-wider text-white">IMFEX GROUP</span>
              </div>
              <p className="text-[11px] text-slate-300">📍 Ул. Качанички Пат бб, Скопје</p>
              <p className="text-[11px] text-slate-300">📞 Тел: +389 2 3123 456 &nbsp;|&nbsp; ✉️ info@imfex.com</p>
              <p className="text-[11px] text-blue-400 font-bold">🌐 Web: www.imfexgroup.mk</p>
            </div>

            <div className="bg-white/10 border border-white/20 p-3 rounded-xl text-center space-y-1">
              <div className="w-16 h-16 bg-white mx-auto rounded-lg flex items-center justify-center p-1">
                <svg className="w-14 h-14 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v3h-3v-3zm0 5h3v3h-3v-3z" />
                </svg>
              </div>
              <p className="text-[9px] font-bold text-slate-300">Скенирајте за веб страна</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-medium">
          <span>Ова е официјална комерцијална понуда генерирана од IMFEX Enterprise OS.</span>
          <span>Страна 4</span>
        </div>
      </div>

    </div>
  );
};
