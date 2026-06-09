import { useCallback, useEffect, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  getTransactionsByWorkspaceId,
  updateTransaction,
} from "@/lib/db/repositories/transactions.repo";
import { getCategoriesByWorkspaceId } from "@/lib/db/repositories/categories.repo";
import type { Category, Transaction } from "@/types";

export interface TransactionWithCategory extends Transaction {
  categoryName: string;
  categoryColor: string;
}

export interface UseTransactionsReturn {
  transactions: TransactionWithCategory[];
  categories: Category[];
  isLoading: boolean;
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  editTransaction: (tx: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useTransactions(workspaceId: string): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txs, cats] = await Promise.all([
        getTransactionsByWorkspaceId(workspaceId),
        getCategoriesByWorkspaceId(workspaceId),
      ]);
      setTransactions(txs);
      setCategories(cats);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const transactionsWithCategory: TransactionWithCategory[] = transactions.map((t) => {
    const cat = categoryMap.get(t.categoryId);
    return {
      ...t,
      categoryName: cat?.name ?? "Uncategorized",
      categoryColor: cat?.color ?? "#6b7280",
    };
  });

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const full: Transaction = { ...tx, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      await createTransaction(full);
      await reload();
    },
    [reload]
  );

  const editTransaction = useCallback(
    async (tx: Transaction) => {
      const updated: Transaction = { ...tx, updatedAt: new Date().toISOString() };
      await updateTransaction(updated);
      await reload();
    },
    [reload]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      await reload();
    },
    [reload]
  );

  return {
    transactions: transactionsWithCategory,
    categories,
    isLoading,
    addTransaction,
    editTransaction,
    removeTransaction,
    reload,
  };
}
