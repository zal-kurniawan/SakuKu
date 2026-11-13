/**
 * Application Feature Flags
 */
export const isExcelImportEnabled =
  process.env.NEXT_PUBLIC_ENABLE_EXCEL_IMPORT === 'true';

export const isServerExcelImportEnabled =
  process.env.ENABLE_EXCEL_IMPORT === 'true' ||
  process.env.NEXT_PUBLIC_ENABLE_EXCEL_IMPORT === 'true';
