-- Script tạo bảng hóa đơn trong Supabase
-- Copy và chạy script này trong tab SQL Editor trên Supabase Dashboard (https://supabase.com/dashboard/project/yimjtyjyxjkirtcgtrsx/sql)

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
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

-- Bật Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép đọc và ghi đối với anon / publishable key
CREATE POLICY "Allow public read access" ON public.invoices
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.invoices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.invoices
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON public.invoices
    FOR DELETE USING (true);
