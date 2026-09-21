import { NextResponse } from 'next/server';
import { getPgPool } from '@/lib/db';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl && !process.env.PGHOST) {
    return NextResponse.json({
      connected: false,
      error: 'Chưa cấu hình biến môi trường DATABASE_URL trong docker-compose.yml hoặc .env',
    });
  }

  try {
    const pg = getPgPool();
    const result = await pg.query('SELECT current_database(), current_user, version();');
    const dbName = result.rows[0]?.current_database;
    const dbUser = result.rows[0]?.current_user;

    // Check count of invoices table
    let invoiceCount = 0;
    try {
      const countRes = await pg.query('SELECT COUNT(*) FROM public.invoices;');
      invoiceCount = parseInt(countRes.rows[0]?.count || '0', 10);
    } catch {
      // Table might not exist yet before first insert
    }

    return NextResponse.json({
      connected: true,
      database: dbName,
      user: dbUser,
      invoiceCount,
      message: `Kết nối PostgreSQL thành công đến CSDL: "${dbName}"`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      connected: false,
      error: msg,
    }, { status: 500 });
  }
}
