'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { KpiCards } from '@/components/KpiCards';
import { WalletList, WalletItem } from '@/components/WalletList';
import { AddWalletModal } from '@/components/AddWalletModal';
import { TransferModal } from '@/components/TransferModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { CashflowChart, CashflowPayload } from '@/components/CashflowChart';
import { WalletDistributionChart } from '@/components/WalletDistributionChart';
import { BudgetLimitCard, BudgetItem } from '@/components/BudgetLimitCard';
import { TransactionTable, TransactionItem } from '@/components/TransactionTable';
import { BotGuideModal } from '@/components/BotGuideModal';
import { WhatsAppLinkerModal } from '@/components/WhatsAppLinkerModal';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import {
  getCachedData,
  mutateCache,
  invalidateDashboardCache,
} from '@/hooks/useSakuKuCache';

export default function DashboardPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toast = useToast();
  const currentYear = new Date().getFullYear();

  // State
  const [stats, setStats] = useState({
    totalNetWorth: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    cashflowHistory: [],
    walletDistribution: [],
  });

  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalTxCount, setTotalTxCount] = useState<number>(0);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [cashflowData, setCashflowData] = useState<CashflowPayload | undefined>(undefined);
  const [walletHistoryData, setWalletHistoryData] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<WalletItem | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<TransactionItem | null>(null);
  const [isEditTxOpen, setIsEditTxOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBotLinkerOpen, setIsBotLinkerOpen] = useState(false);

  // Load Data: Aggregated Single Initial Request (Replaces 7 simultaneous requests)
  const fetchData = useCallback(async () => {
    const dashboardUrl = `/api/dashboard?year=${currentYear}&txLimit=50&txPage=1`;
    const cached = getCachedData<any>(dashboardUrl);

    // 1. Instant Cache Hit (Stale-While-Revalidate with zero UI flicker)
    if (cached) {
      if (cached.stats) setStats(cached.stats);
      if (cached.wallets) setWallets(cached.wallets);
      if (cached.transactions) {
        setTransactions(cached.transactions.transactions || []);
        setTotalTxCount(cached.transactions.totalCount || 0);
      }
      if (cached.budgets) setBudgets(cached.budgets);
      if (cached.cashflow) setCashflowData(cached.cashflow);
      if (cached.walletHistory) setWalletHistoryData(cached.walletHistory);
      setLoading(false);
    }

    try {
      const res = await fetch(dashboardUrl);
      if (res.ok) {
        const json = await res.json();
        mutateCache(dashboardUrl, json);

        if (json.stats) setStats(json.stats);
        if (json.wallets) setWallets(json.wallets);
        if (json.transactions) {
          setTransactions(json.transactions.transactions || []);
          setTotalTxCount(json.transactions.totalCount || 0);
        }
        if (json.budgets) setBudgets(json.budgets);
        if (json.cashflow) setCashflowData(json.cashflow);
        if (json.walletHistory) setWalletHistoryData(json.walletHistory);
      }
    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mutation handler: Invalidates all dashboard caches and pulls fresh data
  const handleMutationSuccess = useCallback(async () => {
    invalidateDashboardCache();
    await fetchData();
  }, [fetchData]);

  // Live Single Source of Truth metrics derived directly from `wallets`:
  const liveNetWorth = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);

  const liveWalletDistribution = wallets
    .filter((w) => (w.balance || 0) > 0)
    .map((w) => ({
      name: w.name,
      value: w.balance,
      color: w.colorCode || '#3B82F6',
      type: w.type,
    }));

  // Wallet Actions
  const handleEditWallet = (wallet: WalletItem) => {
    setWalletToEdit(wallet);
    setIsAddWalletOpen(true);
  };

  const handleDeleteWallet = async (id: string) => {
    const isConfirmed = await confirm({
      title: t('dialog.deleteWalletTitle', 'Hapus Dompet?'),
      message: t(
        'dialog.deleteWalletDesc',
        'Hapus dompet ini beserta seluruh transaksinya? Tindakan ini tidak dapat dibatalkan.'
      ),
      confirmText: t('common.delete', 'Hapus'),
      cancelText: t('common.cancel', 'Batal'),
      variant: 'danger',
      icon: 'trash',
    });
    if (!isConfirmed) return;

    // Optimistic instant UI update
    setWallets((prev) => prev.filter((w) => w.id !== id));
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('dialog.walletDeleted', 'Dompet berhasil dihapus'));
        await handleMutationSuccess();
      } else {
        toast.error(t('dialog.walletDeleteFailed', 'Gagal menghapus dompet'));
        await handleMutationSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('dialog.walletDeleteFailed', 'Gagal menghapus dompet'));
      await handleMutationSuccess();
    }
  };

  const handleOpenTransfer = (fromId?: string) => {
    setTransferFromId(fromId);
    setIsTransferOpen(true);
  };

  // Transaction Actions
  const handleEditTransaction = (tx: TransactionItem) => {
    setTxToEdit(tx);
    setIsEditTxOpen(true);
  };

  const handleDeleteTransaction = async (id: string | number) => {
    // Optimistic instant UI update
    setTransactions((prev) => prev.filter((tx) => String(tx.id) !== String(id)));
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('dialog.txDeleted', 'Transaksi berhasil dihapus'));
        await handleMutationSuccess();
      } else {
        toast.error(t('dialog.txDeleteFailed', 'Gagal menghapus transaksi'));
        await handleMutationSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('dialog.txDeleteFailed', 'Gagal menghapus transaksi'));
      await handleMutationSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        onOpenTransfer={() => handleOpenTransfer()}
        onOpenAddTransaction={() => setIsAddTxOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenBotLinker={() => setIsBotLinkerOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards (Always in sync with liveNetWorth) */}
        <KpiCards stats={{ ...stats, totalNetWorth: liveNetWorth }} />

        {/* Wallets Grid */}
        <WalletList
          wallets={wallets}
          totalNetWorth={liveNetWorth}
          onAddWallet={() => {
            setWalletToEdit(null);
            setIsAddWalletOpen(true);
          }}
          onEditWallet={handleEditWallet}
          onDeleteWallet={handleDeleteWallet}
          onTransfer={handleOpenTransfer}
        />

        {/* Charts Section: 1 col on mobile/tablet, 2 cols on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <CashflowChart
            data={stats.cashflowHistory}
            initialCashflow={cashflowData}
          />
          <WalletDistributionChart
            data={liveWalletDistribution}
            availableYears={walletHistoryData?.availableYears}
          />
        </div>

        {/* Transactions & Budget Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionTable
              transactions={transactions}
              totalCount={totalTxCount}
              wallets={wallets}
              onDelete={handleDeleteTransaction}
              onEdit={handleEditTransaction}
              onRefresh={handleMutationSuccess}
            />
          </div>

          <div className="space-y-6">
            <BudgetLimitCard budgets={budgets} onRefresh={handleMutationSuccess} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>SakuKu • Personal Multi-Wallet Finance Tracker</p>
      </footer>

      {/* Modals */}
      <AddWalletModal
        isOpen={isAddWalletOpen}
        onClose={() => {
          setIsAddWalletOpen(false);
          setWalletToEdit(null);
        }}
        onSuccess={handleMutationSuccess}
        walletToEdit={walletToEdit}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={handleMutationSuccess}
        wallets={wallets}
        defaultFromWalletId={transferFromId}
      />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSuccess={handleMutationSuccess}
        wallets={wallets}
      />

      <EditTransactionModal
        isOpen={isEditTxOpen}
        onClose={() => {
          setIsEditTxOpen(false);
          setTxToEdit(null);
        }}
        onSuccess={handleMutationSuccess}
        wallets={wallets}
        transaction={txToEdit}
      />

      <BotGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <WhatsAppLinkerModal
        isOpen={isBotLinkerOpen}
        onClose={() => setIsBotLinkerOpen(false)}
      />
    </div>
  );
}
