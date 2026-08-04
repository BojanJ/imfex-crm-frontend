'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Offer, Product } from '@/types';

// Register clean font styles
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 12,
    marginBottom: 18,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  companyMeta: {
    textAlign: 'right',
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.3,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  boxPanel: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  textRow: {
    fontSize: 8.5,
    marginBottom: 2.5,
    color: '#334155',
  },
  label: {
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontWeight: 'bold',
    fontSize: 8.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  colNo: { width: '6%', textAlign: 'center' },
  colDesc: { width: '48%' },
  colDim: { width: '16%', textAlign: 'center' },
  colQty: { width: '8%', textAlign: 'center' },
  colPrice: { width: '11%', textAlign: 'right' },
  colTotal: { width: '11%', textAlign: 'right' },
  itemTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  itemSpecs: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 1.2,
  },
  badgeList: {
    flexDirection: 'row',
    marginTop: 3,
  },
  badge: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 7,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalsBox: {
    width: '40%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 8.5,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#2563eb',
    paddingTop: 6,
    marginTop: 4,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: '#94a3b8',
  },
});

interface OfferPdfDocumentProps {
  offer: Offer;
  products?: Product[];
}

export const OfferPdfDocument: React.FC<OfferPdfDocumentProps> = ({ offer, products = [] }) => {
  return (
    <Document title={`IMFEX Offer ${offer.offerNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.logoText}>IMFEX</Text>
            <Text style={styles.tagline}>INDUSTRIAL & RESIDENTIAL DOORS, WINDOWS & SHUTTERS</Text>
          </View>
          <View style={styles.companyMeta}>
            <Text style={{ fontWeight: 'bold', fontSize: 9, color: '#0f172a' }}>IMFEX Solutions Ltd.</Text>
            <Text>100 Commercial Boulevard, Suite 400</Text>
            <Text>Tax VAT ID: EX-99201928</Text>
            <Text>Email: info@imfex.com | Web: www.imfex.com</Text>
          </View>
        </View>

        {/* Customer & Offer Meta */}
        <View style={styles.infoGrid}>
          <View style={styles.boxPanel}>
            <Text style={styles.boxTitle}>CUSTOMER INFORMATION</Text>
            <Text style={[styles.textRow, { fontWeight: 'bold', fontSize: 10, color: '#0f172a' }]}>
              {offer.customer?.companyName || offer.customer?.name || 'Valued Customer'}
            </Text>
            {offer.customer?.taxId && (
              <Text style={styles.textRow}>
                <Text style={styles.label}>Tax / VAT ID: </Text>
                {offer.customer.taxId}
              </Text>
            )}
            {offer.customer?.email && (
              <Text style={styles.textRow}>
                <Text style={styles.label}>Email: </Text>
                {offer.customer.email}
              </Text>
            )}
            {offer.customer?.phone && (
              <Text style={styles.textRow}>
                <Text style={styles.label}>Phone: </Text>
                {offer.customer.phone}
              </Text>
            )}
            <Text style={styles.textRow}>
              <Text style={styles.label}>Address: </Text>
              {[offer.customer?.address, offer.customer?.city].filter(Boolean).join(', ') || 'N/A'}
            </Text>
          </View>

          <View style={styles.boxPanel}>
            <Text style={styles.boxTitle}>OFFER SPECIFICATIONS</Text>
            <Text style={styles.textRow}>
              <Text style={styles.label}>Offer Number: </Text>
              {offer.offerNumber}
            </Text>
            <Text style={styles.textRow}>
              <Text style={styles.label}>Date Created: </Text>
              {new Date(offer.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.textRow}>
              <Text style={styles.label}>Valid Until: </Text>
              {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : '30 Days from issue'}
            </Text>
            <Text style={styles.textRow}>
              <Text style={styles.label}>Status: </Text>
              {offer.status}
            </Text>
            <Text style={styles.textRow}>
              <Text style={styles.label}>Tax Rate: </Text>
              {offer.taxRate}% VAT
            </Text>
          </View>
        </View>

        {/* Itemized Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colDesc}>DESCRIPTION & SPECIFICATIONS</Text>
            <Text style={styles.colDim}>DIMENSIONS (W x H)</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colPrice}>UNIT (€)</Text>
            <Text style={styles.colTotal}>TOTAL (€)</Text>
          </View>

          {offer.items.map((item, idx) => {
            const product = products.find((p) => p.id === item.productId);
            const model = product?.models.find((m) => m.id === item.productModelId);

            // Spec text formatting
            const specSummary = (item.specifications || []).map((s) => {
              const key = product?.specificationKeys.find((k) => k.id === s.specificationKeyId);
              const opt = key?.options.find((o) => o.id === s.specificationOptionId);
              return `${key?.name || 'Spec'}: ${opt?.label || s.customValue || 'Selected'}`;
            }).join(' | ');

            return (
              <View key={item.id || idx} style={styles.tableRow}>
                <Text style={styles.colNo}>{idx + 1}</Text>

                <View style={styles.colDesc}>
                  <Text style={styles.itemTitle}>
                    {item.customTitle || (product ? `${product.name} - ${model?.name || ''}` : 'Custom Item')}
                  </Text>
                  
                  {/* Scope badges */}
                  <View style={styles.badgeList}>
                    {item.serviceTypes.map((st) => (
                      <Text key={st} style={styles.badge}>
                        {st}
                      </Text>
                    ))}
                  </View>

                  {specSummary ? (
                    <Text style={styles.itemSpecs}>{specSummary}</Text>
                  ) : null}
                </View>

                <Text style={styles.colDim}>
                  {item.widthMm && item.heightMm ? `${item.widthMm} x ${item.heightMm} mm` : '-'}
                </Text>
                
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{Number(item.unitPrice || 0).toFixed(2)} €</Text>
                <Text style={styles.colTotal}>{Number(item.totalPrice || 0).toFixed(2)} €</Text>
              </View>
            );
          })}
        </View>

        {/* Totals Box */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.summaryRow}>
              <Text style={{ color: '#475569' }}>Subtotal:</Text>
              <Text style={{ fontWeight: 'bold' }}>{Number(offer.subtotal || 0).toFixed(2)} €</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ color: '#475569' }}>Tax ({offer.taxRate || 18}%):</Text>
              <Text style={{ fontWeight: 'bold' }}>{Number(offer.taxAmount || 0).toFixed(2)} €</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>TOTAL AMOUNT:</Text>
              <Text style={{ color: '#2563eb' }}>{Number(offer.totalAmount || 0).toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* Terms Note */}
        <View style={{ marginTop: 24, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 4 }}>
          <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#334155', marginBottom: 2 }}>
            TERMS & CONDITIONS
          </Text>
          <Text style={{ fontSize: 7, color: '#64748b', lineHeight: 1.3 }}>
            1. Offer is valid until {offer.validUntil || '30 days from creation date'}.
            2. Payment terms: 50% deposit upon order confirmation, 50% upon delivery/installation completion.
            3. Standard warranty of 24 months applies to all structural product components and motors.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>IMFEX CRM Engine • Generated Document</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};
