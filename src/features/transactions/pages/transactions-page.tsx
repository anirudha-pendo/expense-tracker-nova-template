import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/shared/components/app-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthContext } from "@/features/auth/hooks/auth-context";
import { useTransactions } from "../hooks/use-transactions";
import { TransactionTable } from "../components/transaction-table";
import { TransactionForm } from "../components/transaction-form";
import { TransactionFiltersBar, type TransactionFilters } from "../components/transaction-filters";
import { DeleteTransactionDialog } from "../components/delete-transaction-dialog";
import type { TransactionWithCategory } from "../hooks/use-transactions";
import type { TransactionFormValues } from "../schemas/transaction.schema";
import type { Transaction } from "@/types";

export function TransactionsPage() {
  const { workspace } = useAuthContext();
  const { transactions, categories, isLoading, addTransaction, editTransaction, removeTransaction } =
    useTransactions(workspace!.id);

  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionWithCategory | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionWithCategory | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({
    search: "",
    type: "all",
    categoryId: "",
    month: "",
  });

  const currency = workspace?.currency ?? "USD";
  const locale = workspace?.locale ?? "en-US";

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.search && !tx.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.type !== "all" && tx.type !== filters.type) return false;
      if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
      if (filters.month) {
        const txMonth = tx.date.slice(0, 7);
        if (txMonth !== filters.month) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  async function handleAdd(values: TransactionFormValues) {
    try {
      await addTransaction({ ...values, workspaceId: workspace!.id, notes: values.notes ?? "" });
      setShowForm(false);
      toast.success("Transaction added");
    } catch {
      toast.error("Failed to add transaction");
    }
  }

  async function handleEdit(values: TransactionFormValues) {
    if (!editingTx) return;
    try {
      const updated: Transaction = {
        ...editingTx,
        ...values,
        notes: values.notes ?? "",
        date: values.date,
      };
      await editTransaction(updated);
      setEditingTx(null);
      toast.success("Transaction updated");
    } catch {
      toast.error("Failed to update transaction");
    }
  }

  async function handleDelete() {
    if (!deletingTx) return;
    try {
      await removeTransaction(deletingTx.id);
      setDeletingTx(null);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    }
  }

  return (
    <AppLayout
      title="Transactions"
      actions={
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus data-icon="inline-start" />
          Add Transaction
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TransactionFiltersBar
          filters={filters}
          categories={categories}
          onChange={setFilters}
        />

        <TransactionTable
          transactions={filteredTransactions}
          currency={currency}
          locale={locale}
          isLoading={isLoading}
          onEdit={setEditingTx}
          onDelete={setDeletingTx}
        />
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTx} onOpenChange={(o) => !o && setEditingTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTx && (
            <TransactionForm
              categories={categories}
              defaultValues={editingTx}
              onSubmit={handleEdit}
              onCancel={() => setEditingTx(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteTransactionDialog
        open={!!deletingTx}
        description={deletingTx?.description ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeletingTx(null)}
      />
    </AppLayout>
  );
}
