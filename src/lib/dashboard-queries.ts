import { prisma } from './prisma';
import { getMonthRange, getYearRange, getTimezoneDateParts } from './timezone';

export interface TransactionQueryOptions {
  walletId?: string | null;
  type?: string | null;
  category?: string | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  limit?: number;
}

/**
 * 1. Fetch Wallets Query
 */
export async function getWalletsQuery(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * 2. Fetch Stats & KPI Query
 */
export async function getStatsQuery(userId: string) {
  // 1. Wallets & Total Net Worth
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { balance: 'desc' },
  });

  const totalNetWorth = wallets.reduce((acc, w) => acc + w.balance, 0);

  // 2. Current Month Income & Expense
  const { startOfMonth, endOfMonth, year, month } = getMonthRange();

  const monthlyTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  monthlyTxs.forEach((tx) => {
    if (tx.type === 'INCOME') monthlyIncome += tx.amount;
    if (tx.type === 'EXPENSE') monthlyExpense += tx.amount;
  });

  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate =
    monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

  // 3. Last 6 Months Cashflow Chart Data (Optimized single query instead of 6 loops)
  const earliestDate = new Date(year, month - 6, 1);
  const { startOfMonth: sixMonthsStart } = getMonthRange(
    earliestDate.getFullYear(),
    earliestDate.getMonth() + 1
  );

  const sixMonthsTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: sixMonthsStart, lte: endOfMonth },
    },
  });

  const cashflowHistory = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const targetY = d.getFullYear();
    const targetM = d.getMonth() + 1;
    const { startOfMonth: mStart, endOfMonth: mEnd } = getMonthRange(targetY, targetM);

    let inc = 0;
    let exp = 0;
    sixMonthsTxs.forEach((t) => {
      const tTime = new Date(t.date).getTime();
      if (tTime >= mStart.getTime() && tTime <= mEnd.getTime()) {
        if (t.type === 'INCOME') inc += t.amount;
        if (t.type === 'EXPENSE') exp += t.amount;
      }
    });

    const label = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
    cashflowHistory.push({
      name: label,
      income: inc,
      expense: exp,
      net: inc - exp,
    });
  }

  // 4. Wallet Distribution for Pie Chart (Only active wallets with balance > 0)
  const walletDistribution = wallets
    .filter((w) => w.balance > 0)
    .map((w) => ({
      name: w.name,
      value: w.balance,
      color: w.colorCode,
      type: w.type,
    }));

  return {
    totalNetWorth,
    monthlyIncome,
    monthlyExpense,
    netSavings,
    savingsRate,
    cashflowHistory,
    walletDistribution,
  };
}

/**
 * 3. Fetch Full Year Cashflow Query
 */
export async function getCashflowQuery(userId: string, year?: number) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Get all available years from transactions for this user
  const txDates = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: 'asc' },
  });

  const yearsSet = new Set<number>();
  yearsSet.add(currentYear);
  txDates.forEach((tx) => {
    yearsSet.add(new Date(tx.date).getFullYear());
  });
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  // Selected year (defaults to current year)
  const selectedYear = year ? Number(year) : currentYear;

  // 2. Fetch full 12 months (Jan–Dec) data for the selected year in target timezone
  const { startOfYear, endOfYear } = getYearRange(selectedYear);

  const yearTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startOfYear, lte: endOfYear },
    },
  });

  const monthData = Array.from({ length: 12 }, (_, monthIdx) => {
    let income = 0;
    let expense = 0;

    yearTxs.forEach((tx) => {
      const txDate = new Date(tx.date);
      const { month } = getTimezoneDateParts(txDate);
      if (month === monthIdx + 1) {
        if (tx.type === 'INCOME') income += tx.amount;
        if (tx.type === 'EXPENSE') expense += tx.amount;
      }
    });

    return {
      month: monthIdx + 1,
      income,
      expense,
      net: income - expense,
    };
  });

  return {
    availableYears,
    selectedYear,
    months: monthData,
  };
}

/**
 * 4. Fetch Wallet History & Distribution Query
 */
export async function getWalletHistoryQuery(
  userId: string,
  monthParam?: string | null,
  yearParam?: string | null
) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Available years
  const txDates = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: 'asc' },
  });

  const yearsSet = new Set<number>();
  yearsSet.add(currentYear);
  txDates.forEach((tx) => {
    yearsSet.add(new Date(tx.date).getFullYear());
  });
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  // 2. Fetch current wallets
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { balance: 'desc' },
  });

  // If "current" mode or parameters not set, return live balances
  if (!monthParam || monthParam === 'current' || !yearParam) {
    const distribution = wallets.map((w) => ({
      id: w.id,
      name: w.name,
      value: Math.max(0, w.balance),
      color: w.colorCode || '#3B82F6',
      type: w.type,
    }));

    return {
      availableYears,
      isHistorical: false,
      wallets: distribution,
    };
  }

  // Historical calculation
  const targetMonth = parseInt(monthParam, 10); // 1-12
  const targetYear = parseInt(yearParam, 10);

  // End date of the selected month in application timezone
  const { endOfMonth } = getMonthRange(targetYear, targetMonth);

  // Fetch transactions occurring strictly AFTER the selected month-end
  const subsequentTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gt: endOfMonth },
    },
  });

  // Create a mutable balance map initialized with current wallet balance
  const balanceMap: { [walletId: string]: number } = {};
  wallets.forEach((w) => {
    balanceMap[w.id] = w.balance;
  });

  // Rollback every subsequent transaction to calculate balance as of endOfMonth
  subsequentTxs.forEach((tx) => {
    if (tx.type === 'EXPENSE') {
      if (balanceMap[tx.walletId] !== undefined) {
        balanceMap[tx.walletId] += tx.amount;
      }
    } else if (tx.type === 'INCOME') {
      if (balanceMap[tx.walletId] !== undefined) {
        balanceMap[tx.walletId] -= tx.amount;
      }
    } else if (tx.type === 'TRANSFER') {
      if (balanceMap[tx.walletId] !== undefined) {
        balanceMap[tx.walletId] += tx.amount;
      }
      if (tx.destinationWalletId && balanceMap[tx.destinationWalletId] !== undefined) {
        balanceMap[tx.destinationWalletId] -= tx.amount;
      }
    }
  });

  const distribution = wallets.map((w) => ({
    id: w.id,
    name: w.name,
    value: Math.max(0, balanceMap[w.id] ?? 0),
    color: w.colorCode || '#3B82F6',
    type: w.type,
  }));

  return {
    availableYears,
    isHistorical: true,
    wallets: distribution,
  };
}

/**
 * 5. Fetch Budgets Query
 */
export async function getBudgetsQuery(userId: string, month?: number, year?: number) {
  const current = getMonthRange();
  const targetMonth = month || current.month;
  const targetYear = year || current.year;

  const { startOfMonth, endOfMonth } = getMonthRange(targetYear, targetMonth);

  // Fetch budget limits
  const budgets = await prisma.budgetLimit.findMany({
    where: { userId, month: targetMonth, year: targetYear },
  });

  // Fetch actual expenses per category this month
  const expenseGroups = await prisma.transaction.groupBy({
    by: ['category'],
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  });

  const expenseMap = new Map<string, number>();
  expenseGroups.forEach((eg) => {
    expenseMap.set(eg.category, eg._sum.amount || 0);
  });

  // Merge budgets with spent amount
  const result = budgets.map((b) => {
    const spent = expenseMap.get(b.category) || 0;
    const percentage = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
    let status: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';
    if (percentage >= 100) status = 'DANGER';
    else if (percentage >= 75) status = 'WARNING';

    return {
      id: b.id,
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spent,
      remaining: Math.max(0, b.monthlyLimit - spent),
      percentage: Math.round(percentage),
      status,
      month: b.month,
      year: b.year,
    };
  });

  return result;
}

/**
 * 6. Fetch Transactions Query (with server-side filtering & pagination)
 */
export async function getTransactionsQuery(
  userId: string,
  options: TransactionQueryOptions = {}
) {
  const {
    walletId,
    type,
    category,
    search,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50,
  } = options;

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.max(1, Number(limit) || 50);
  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause: any = {
    userId,
  };

  if (walletId && walletId !== 'all') {
    whereClause.OR = [{ walletId }, { destinationWalletId: walletId }];
  }

  if (type && type !== 'all') {
    whereClause.type = type;
  }

  if (category && category !== 'all') {
    whereClause.category = category;
  }

  if (dateFrom || dateTo) {
    whereClause.date = {};
    if (dateFrom) {
      whereClause.date.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo) {
      whereClause.date.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
  }

  if (search && search.trim()) {
    whereClause.title = {
      contains: search.trim(),
      mode: 'insensitive',
    };
  }

  const [totalCount, transactions] = await Promise.all([
    prisma.transaction.count({ where: whereClause }),
    prisma.transaction.findMany({
      where: whereClause,
      include: {
        wallet: true,
        destinationWallet: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: parsedLimit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / parsedLimit));

  return {
    transactions,
    totalCount,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
  };
}
