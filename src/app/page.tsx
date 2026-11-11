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

export default function DashboardPage() {
  const { t } = useTranslation();

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
        fetch('/api/transactions?limit=100'),
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

  // Wallet Actions
  const handleEditWallet = (wallet: WalletItem) => {
    setWalletToEdit(wallet);
    setIsAddWalletOpen(true);
  };

  const handleDeleteWallet = async (id: string) => {
    if (!confirm('Hapus dompet ini beserta seluruh transaksinya?')) return;
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenTransfer = (fromId?: string) => {
    setTransferFromId(fromId);
    setIsTransferOpen(true);
  };

  // Transaction Actions
  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
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
        {/* KPI Cards */}
        <KpiCards stats={stats} />

        {/* Wallets Grid */}
        <WalletList
          wallets={wallets}
          totalNetWorth={stats.totalNetWorth}
          onAddWallet={() => {
            setWalletToEdit(null);
            setIsAddWalletOpen(true);
          }}
          onEditWallet={handleEditWallet}
          onDeleteWallet={handleDeleteWallet}
          onTransfer={handleOpenTransfer}
        />

        {/* Charts & Budget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CashflowChart data={stats.cashflowHistory} />
            <TransactionTable
              transactions={transactions}
              wallets={wallets}
              onDelete={handleDeleteTransaction}
              onRefresh={fetchData}
            />
          </div>

          <div className="space-y-6">
            <WalletDistributionChart data={stats.walletDistribution} />
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
