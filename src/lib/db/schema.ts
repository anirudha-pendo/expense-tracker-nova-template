import type { DBSchema } from "idb";
import type { Category, Transaction, User, Workspace } from "@/types";

export interface ExpenseTrackerDBSchema extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: {
      "by-username": string;
    };
  };
  workspaces: {
    key: string;
    value: Workspace;
    indexes: {
      "by-userId": string;
    };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      "by-workspaceId": string;
      "by-date": string;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: {
      "by-workspaceId": string;
    };
  };
}
