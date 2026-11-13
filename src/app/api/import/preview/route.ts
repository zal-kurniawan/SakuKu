import { NextResponse } from 'next/server';
import { parseExcelWorkbook } from '@/lib/excel-parser';

export async function POST(req: Request) {
  try {
    if (
      process.env.ENABLE_EXCEL_IMPORT !== 'true' &&
      process.env.NEXT_PUBLIC_ENABLE_EXCEL_IMPORT !== 'true'
    ) {
      return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Berkas Excel (.xlsx / .xls / .csv) tidak ditemukan.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse & clean Excel dataset
    const result = parseExcelWorkbook(buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      summary: result.summary,
      detectedWallets: result.detectedWallets,
      initialBalances: result.initialBalances,
      preview: result.transactions.slice(0, 20),
      totalTransactions: result.transactions.length,
      // Provide full cleaned data so frontend can stream or send in chunks to commit
      transactions: result.transactions,
    });
  } catch (error: any) {
    console.error('Error parsing Excel file:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses berkas Excel.' },
      { status: 500 }
    );
  }
}
