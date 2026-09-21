-- Script tạo bảng invoices trong PostgreSQL (Tùy chọn - Hệ thống tự động khởi tạo khi chạy)
-- Bạn có thể chạy script này trong pgAdmin / DBeaver / psql nếu muốn tạo trước:

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

CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tax_code ON public.invoices (tax_code);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (invoice_number);
