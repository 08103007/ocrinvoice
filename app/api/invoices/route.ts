import { NextResponse } from 'next/server';
import { dbGetInvoices, dbInsertInvoice, dbDeleteInvoice, mapInvoiceToDb } from '@/lib/db';

export async function GET() {
  try {
    const data = await dbGetInvoices();

    // Map database records back to frontend format
    const invoices = (data || []).map((row: any) => {
      let rawData = row.raw_data;
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData);
        } catch {
          rawData = {};
        }
      }
      let items = row.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch {
          items = [];
        }
      }

      return {
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
          totalBeforeVAT: row.total_before_vat !== null ? Number(row.total_before_vat) : null,
          vatRate: row.vat_rate,
          vatAmount: row.vat_amount !== null ? Number(row.vat_amount) : null,
          totalPayment: row.total_payment !== null ? Number(row.total_payment) : null,
          buyer: row.buyer,
          buyerTaxCode: row.buyer_tax_code,
          paymentMethod: row.payment_method,
          items: items || [],
          ...(rawData || {}),
        },
      };
    });

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
    const inserted = await dbInsertInvoice(dbRecord);

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

    await dbDeleteInvoice(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
