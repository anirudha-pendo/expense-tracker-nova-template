import { openDB, type IDBPDatabase } from "idb";
import type { ExpenseTrackerDBSchema } from "./schema";

const DB_NAME = "expense-tracker";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ExpenseTrackerDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<ExpenseTrackerDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ExpenseTrackerDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const userStore = db.createObjectStore("users", { keyPath: "id" });
      userStore.createIndex("by-username", "username", { unique: true });

      const workspaceStore = db.createObjectStore("workspaces", { keyPath: "id" });
      workspaceStore.createIndex("by-userId", "userId");

      const transactionStore = db.createObjectStore("transactions", { keyPath: "id" });
      transactionStore.createIndex("by-workspaceId", "workspaceId");
      transactionStore.createIndex("by-date", "date");

      const categoryStore = db.createObjectStore("categories", { keyPath: "id" });
      categoryStore.createIndex("by-workspaceId", "workspaceId");
    },
  });

  return dbInstance;
}
