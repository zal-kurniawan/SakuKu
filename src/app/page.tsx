'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { KpiCards } from '@/components/KpiCards';
import { WalletList, WalletItem } from '@/components/WalletList';
import { AddWalletModal } from '@/components/AddWalletModal';
import { TransferModal } from '@/components/TransferModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { CashflowChart } from '@/components/CashflowChart';
import { WalletDistributionChart } from '@/components/WalletDistributionChart';
import { BudgetLimitCard, BudgetItem } from '@/components/BudgetLimitCard';
import { TransactionTable, TransactionItem } from '@/components/TransactionTable';
import { BotGuideModal } from '@/components/BotGuideModal';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';

export default function DashboardPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toast = useToast();

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
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<WalletItem | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Load Data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, walletsRes, txRes, budgetRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/wallets'),
        fetch('/api/transactions?limit=1000'),
        fetch('/api/budgets'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (walletsRes.ok) setWallets(await walletsRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (budgetRes.ok) setBudgets(await budgetRes.json());
    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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
      title: t('dialog.deleteWalletTitle'),
      message: t('dialog.deleteWalletDesc'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      icon: 'trash',
    });
    if (!isConfirmed) return;

    // Optimistic instant UI update (re-renders KPI and Chart immediately)
    setWallets((prev) => prev.filter((w) => w.id !== id));
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('dialog.walletDeleted'));
        await fetchData();
      } else {
        toast.error(t('dialog.walletDeleteFailed'));
        await fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('dialog.walletDeleteFailed'));
      await fetchData();
    }
  };

  const handleOpenTransfer = (fromId?: string) => {
    setTransferFromId(fromId);
    setIsTransferOpen(true);
  };

  // Transaction Actions
  const handleDeleteTransaction = async (id: string | number) => {
    // Optimistic instant UI update
    setTransactions((prev) => prev.filter((tx) => String(tx.id) !== String(id)));
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('dialog.txDeleted'));
        await fetchData();
      } else {
        toast.error(t('dialog.txDeleteFailed'));
        await fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('dialog.txDeleteFailed'));
      await fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        onOpenTransfer={() => handleOpenTransfer()}
        onOpenAddTransaction={() => setIsAddTxOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
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
          <CashflowChart data={stats.cashflowHistory} />
          <WalletDistributionChart data={liveWalletDistribution} />
        </div>

        {/* Transactions & Budget Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionTable
              transactions={transactions}
              wallets={wallets}
              onDelete={handleDeleteTransaction}
              onRefresh={fetchData}
            />
          </div>

          <div className="space-y-6">
            <BudgetLimitCard budgets={budgets} onRefresh={fetchData} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          SakuKu • Personal Multi-Wallet Finance Tracker & WhatsApp Bot • Built with Baileys, Prisma & Next.js
        </p>
      </footer>

      {/* Modals */}
      <AddWalletModal
        isOpen={isAddWalletOpen}
        onClose={() => {
          setIsAddWalletOpen(false);
          setWalletToEdit(null);
        }}
        onSuccess={fetchData}
        walletToEdit={walletToEdit}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={fetchData}
        wallets={wallets}
        defaultFromWalletId={transferFromId}
      />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSuccess={fetchData}
        wallets={wallets}
      />

      <BotGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
