import { Pool } from 'pg';
import crypto from 'crypto';

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
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.-]+/g, '');
      return clean !== '' && !isNaN(Number(clean)) ? Number(clean) : null;
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

let pool: Pool | null = null;
let isTableInitialized = false;

export function getPgPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'postgres',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      });
    }

    pool.on('error', (err) => {
      console.error('Lỗi kết nối PostgreSQL client:', err);
    });
  }

  return pool;
}

async function ensurePostgresTable(clientPool: Pool) {
  if (isTableInitialized) return;
  try {
    try {
      await clientPool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    } catch {
      // Bỏ qua nếu user không có quyền superuser
    }

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.invoices (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        file_name TEXT NOT NULL,
        seller TEXT,
        tax_code TEXT,
        address TEXT,
        invoice_number TEXT,
        invoice_serial TEXT,
        invoice_date TEXT,
        total_before_vat NUMERIC,
        vat_rate TEXT,
        vat_amount NUMERIC,
        total_payment NUMERIC,
        buyer TEXT,
        buyer_tax_code TEXT,
        payment_method TEXT,
        items JSONB DEFAULT '[]'::jsonb,
        raw_data JSONB DEFAULT '{}'::jsonb
      );
    `;
    await clientPool.query(createTableQuery);
    isTableInitialized = true;
  } catch (err) {
    console.error('Không thể tự tạo bảng invoices trong PostgreSQL:', err);
    throw new Error(`Lỗi kết nối CSDL PostgreSQL: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function dbGetInvoices() {
  const pg = getPgPool();
  await ensurePostgresTable(pg);
  const result = await pg.query(
    `SELECT * FROM public.invoices ORDER BY created_at DESC;`
  );
  return result.rows;
}

export async function dbInsertInvoice(record: DbInvoice) {
  const pg = getPgPool();
  await ensurePostgresTable(pg);
  const id = record.id || crypto.randomUUID();
  const query = `
    INSERT INTO public.invoices (
      id, file_name, seller, tax_code, address,
      invoice_number, invoice_serial, invoice_date,
      total_before_vat, vat_rate, vat_amount, total_payment,
      buyer, buyer_tax_code, payment_method, items, raw_data
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16, $17
    ) RETURNING *;
  `;
  const values = [
    id,
    record.file_name,
    record.seller || null,
    record.tax_code || null,
    record.address || null,
    record.invoice_number || null,
    record.invoice_serial || null,
    record.invoice_date || null,
    record.total_before_vat !== undefined ? record.total_before_vat : null,
    record.vat_rate || null,
    record.vat_amount !== undefined ? record.vat_amount : null,
    record.total_payment !== undefined ? record.total_payment : null,
    record.buyer || null,
    record.buyer_tax_code || null,
    record.payment_method || null,
    JSON.stringify(record.items || []),
    JSON.stringify(record.raw_data || {}),
  ];

  const result = await pg.query(query, values);
  return result.rows[0];
}

export async function dbDeleteInvoice(id: string) {
  const pg = getPgPool();
  await ensurePostgresTable(pg);
  await pg.query(`DELETE FROM public.invoices WHERE id = $1;`, [id]);
  return true;
}
