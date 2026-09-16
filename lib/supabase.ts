import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yimjtyjyxjkirtcgtrsx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_apZoWnqtyG9fSg2BRgqLaA_eKVOgJpT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbInvoice {
  id?: string;
  created_at?: string;
  file_name: string;
  seller?: string;
  tax_code?: string;
  address?: string;
  invoice_number?: string;
  invoice_serial?: string;
  invoice_date?: string;
  total_before_vat?: number | null;
  vat_rate?: string;
  vat_amount?: number | null;
  total_payment?: number | null;
  buyer?: string;
  buyer_tax_code?: string;
  payment_method?: string;
  items?: Array<Record<string, unknown>>;
  raw_data?: Record<string, unknown>;
}

export function mapInvoiceToDb(data: Record<string, unknown>, fileName: string): DbInvoice {
  const parseNum = (val: unknown): number | null => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.-]+/g, '');
      return clean !== '' ? Number(clean) : null;
    }
    return null;
  };

  return {
    file_name: fileName,
    seller: data.seller ? String(data.seller) : undefined,
    tax_code: data.taxCode ? String(data.taxCode) : undefined,
    address: data.address ? String(data.address) : undefined,
    invoice_number: data.invoiceNumber ? String(data.invoiceNumber) : undefined,
    invoice_serial: data.invoiceSerial ? String(data.invoiceSerial) : undefined,
    invoice_date: data.invoiceDate ? String(data.invoiceDate) : undefined,
    total_before_vat: parseNum(data.totalBeforeVAT),
    vat_rate: data.vatRate ? String(data.vatRate) : undefined,
    vat_amount: parseNum(data.vatAmount),
    total_payment: parseNum(data.totalPayment),
    buyer: data.buyer ? String(data.buyer) : undefined,
    buyer_tax_code: data.buyerTaxCode ? String(data.buyerTaxCode) : undefined,
    payment_method: data.paymentMethod ? String(data.paymentMethod) : undefined,
    items: (data.items as Array<Record<string, unknown>>) || [],
    raw_data: data,
  };
}
