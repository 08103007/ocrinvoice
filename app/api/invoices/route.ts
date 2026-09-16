import { NextResponse } from 'next/server';
import { supabase, mapInvoiceToDb } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map database records back to frontend format
    const invoices = (data || []).map((row) => ({
      id: row.id,
      fileName: row.file_name,
      processedAt: row.created_at,
      data: {
        seller: row.seller,
        taxCode: row.tax_code,
        address: row.address,
        invoiceNumber: row.invoice_number,
        invoiceSerial: row.invoice_serial,
        invoiceDate: row.invoice_date,
        totalBeforeVAT: row.total_before_vat,
        vatRate: row.vat_rate,
        vatAmount: row.vat_amount,
        totalPayment: row.total_payment,
        buyer: row.buyer,
        buyerTaxCode: row.buyer_tax_code,
        paymentMethod: row.payment_method,
        items: row.items || [],
        ...(row.raw_data || {}),
      },
    }));

    return NextResponse.json({ success: true, invoices });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, fileName } = body;

    if (!data) {
      return NextResponse.json({ error: 'Missing invoice data' }, { status: 400 });
    }

    const dbRecord = mapInvoiceToDb(data, fileName || 'invoice.pdf');
    const { data: inserted, error } = await supabase
      .from('invoices')
      .insert([dbRecord])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, invoice: inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
