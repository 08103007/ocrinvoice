import { Pool } from 'pg';
import { supabase, DbInvoice } from './supabase';
import crypto from 'crypto';

let pool: Pool | null = null;
let isTableInitialized = false;

function getPgPool(): Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !process.env.PGHOST) {
    return null;
  }

  if (!pool) {
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
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'postgres',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      });
    }

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  return pool;
}

export function isUsingPostgres(): boolean {
  return !!(process.env.DATABASE_URL || process.env.PGHOST);
}

async function ensurePostgresTable(clientPool: Pool) {
  if (isTableInitialized) return;
  try {
    // Try to enable pgcrypto if possible (for gen_random_uuid)
    try {
      await clientPool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    } catch {
      // Ignore extension creation error if user lacks superuser permissions
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
    console.error('Failed to auto-create invoices table in PostgreSQL:', err);
    throw err;
  }
}

export async function dbGetInvoices() {
  const pg = getPgPool();
  if (pg) {
    await ensurePostgresTable(pg);
    const result = await pg.query(
      `SELECT * FROM public.invoices ORDER BY created_at DESC;`
    );
    return result.rows;
  }

  // Fallback to Supabase
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function dbInsertInvoice(record: DbInvoice) {
  const pg = getPgPool();
  if (pg) {
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

  // Fallback to Supabase
  const { data: inserted, error } = await supabase
    .from('invoices')
    .insert([record])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return inserted;
}

export async function dbDeleteInvoice(id: string) {
  const pg = getPgPool();
  if (pg) {
    await ensurePostgresTable(pg);
    await pg.query(`DELETE FROM public.invoices WHERE id = $1;`, [id]);
    return true;
  }

  // Fallback to Supabase
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
  return true;
}
