import { hashPassword } from "@/lib/crypto";
import { createUser } from "@/lib/db/repositories/users.repo";
import { createWorkspace } from "@/lib/db/repositories/workspaces.repo";
import { seedDefaultCategories, getCategoriesByWorkspaceId } from "@/lib/db/repositories/categories.repo";
import { createTransaction } from "@/lib/db/repositories/transactions.repo";
import type { Category, Transaction } from "@/types";

// ── random helpers ──────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── data pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Alex", "Jordan", "Casey", "Morgan", "Riley", "Taylor", "Drew", "Quinn",
  "Avery", "Blake", "Charlie", "Dana", "Emery", "Finley", "Gray", "Harper",
  "Indigo", "Jesse", "Kai", "Lane", "Marlowe", "Noel", "Ocean", "Parker",
  "Reese", "Sage", "Tatum", "Uma", "Val", "Wren",
];

const LAST_NAMES = [
  "Smith", "Chen", "Garcia", "Kim", "Patel", "Johnson", "Williams", "Brown",
  "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas",
  "Jackson", "White", "Harris", "Martin", "Thompson", "Young", "Robinson", "Lewis",
];

const CURRENCIES = [
  { currency: "USD", locale: "en-US" },
  { currency: "EUR", locale: "de-DE" },
  { currency: "GBP", locale: "en-GB" },
  { currency: "JPY", locale: "ja-JP" },
  { currency: "CAD", locale: "en-CA" },
  { currency: "AUD", locale: "en-AU" },
  { currency: "INR", locale: "en-IN" },
  { currency: "BRL", locale: "pt-BR" },
];

const WORKSPACE_NAMES = [
  "Personal Finance", "My Budget", "Monthly Expenses", "Home Budget",
  "Family Finances", "Daily Tracker", "Savings Plan", "Expense Log",
];

const TRANSACTION_DESCRIPTIONS: Record<string, string[]> = {
  "Food & Dining": [
    "Grocery run", "Coffee shop", "Restaurant dinner", "Takeout order",
    "Lunch with friends", "Bakery", "Food delivery", "Farmers market",
    "Sushi night", "Pizza Friday",
  ],
  "Transport": [
    "Gas station", "Uber ride", "Bus pass", "Parking fee",
    "Train ticket", "Car maintenance", "Toll charge", "Lyft",
    "Subway card top-up", "Airport taxi",
  ],
  "Shopping": [
    "Clothing store", "Online shopping", "Electronics", "Books",
    "Home decor", "Department store", "Amazon order", "Sporting goods",
    "Gift purchase", "Outlet mall",
  ],
  "Entertainment": [
    "Movie tickets", "Concert", "Streaming subscription", "Video game",
    "Sports event", "Museum visit", "Comedy show", "Escape room",
    "Bowling night", "Theme park",
  ],
  "Health": [
    "Pharmacy", "Doctor visit", "Gym membership", "Dental checkup",
    "Eye exam", "Vitamins", "Fitness class", "Health insurance",
    "Therapy session", "Medical supplies",
  ],
  "Housing": [
    "Rent payment", "Mortgage", "HOA fee", "Home repairs",
    "Furniture", "Cleaning supplies", "Plumber", "Electrician",
    "Lawn service", "Pest control",
  ],
  "Utilities": [
    "Electric bill", "Water bill", "Internet service", "Phone bill",
    "Gas bill", "Cable TV", "Trash pickup", "Recycling service",
  ],
  "Other Expense": [
    "Miscellaneous", "ATM withdrawal", "Bank fee", "Subscription",
    "Donation", "Pet supplies", "Haircut", "Laundry",
  ],
  "Salary": [
    "Monthly salary", "Bi-weekly paycheck", "Payroll deposit",
    "Direct deposit", "Salary advance",
  ],
  "Freelance": [
    "Client payment", "Consulting fee", "Freelance project",
    "Contract work", "Side project payout", "Invoice payment",
  ],
  "Investment": [
    "Dividend payment", "Stock sale", "Bond interest",
    "Rental income", "Capital gain", "ETF dividend",
  ],
  "Other Income": [
    "Cash gift", "Tax refund", "Bonus", "Cashback reward",
    "Rebate", "Sold item", "Referral bonus",
  ],
};

// ── personality archetypes ───────────────────────────────────────────────────

interface Personality {
  label: string;
  txPerMonth: [number, number];         // [min, max] transactions per month
  incomeFrequency: number;              // probability of income tx per month cycle
  expenseCategoryWeights: number[];     // weights for 8 expense categories
  incomeCategoryWeights: number[];      // weights for 4 income categories
  amountMultiplier: number;             // scales all amounts
  recurringChance: number;              // probability any tx is recurring
}

const PERSONALITIES: Personality[] = [
  {
    label: "frugal",
    txPerMonth: [5, 15],
    incomeFrequency: 0.8,
    expenseCategoryWeights: [3, 1, 0.5, 0.2, 1, 2, 1.5, 0.5],
    incomeCategoryWeights: [5, 1, 0.5, 0.5],
    amountMultiplier: 0.6,
    recurringChance: 0.15,
  },
  {
    label: "average",
    txPerMonth: [10, 25],
    incomeFrequency: 1.0,
    expenseCategoryWeights: [2.5, 1.5, 2, 1, 1, 2, 1, 1],
    incomeCategoryWeights: [4, 2, 1, 0.5],
    amountMultiplier: 1.0,
    recurringChance: 0.2,
  },
  {
    label: "spender",
    txPerMonth: [20, 45],
    incomeFrequency: 1.2,
    expenseCategoryWeights: [2, 2, 4, 3, 1, 2, 1, 2],
    incomeCategoryWeights: [3, 3, 2, 1],
    amountMultiplier: 1.8,
    recurringChance: 0.25,
  },
  {
    label: "investor",
    txPerMonth: [8, 20],
    incomeFrequency: 1.5,
    expenseCategoryWeights: [2, 1, 1, 0.5, 1.5, 2, 1.5, 0.5],
    incomeCategoryWeights: [3, 1, 4, 1],
    amountMultiplier: 1.2,
    recurringChance: 0.3,
  },
  {
    label: "freelancer",
    txPerMonth: [12, 30],
    incomeFrequency: 1.8,
    expenseCategoryWeights: [2, 2, 1.5, 1, 1.5, 1.5, 1, 1.5],
    incomeCategoryWeights: [1, 5, 1, 1],
    amountMultiplier: 1.1,
    recurringChance: 0.2,
  },
];

// ── amount ranges per category ───────────────────────────────────────────────

const AMOUNT_RANGES: Record<string, [number, number]> = {
  "Food & Dining":  [8, 120],
  "Transport":      [5, 80],
  "Shopping":       [15, 300],
  "Entertainment":  [10, 150],
  "Health":         [20, 200],
  "Housing":        [500, 2500],
  "Utilities":      [30, 200],
  "Other Expense":  [5, 100],
  "Salary":         [2000, 8000],
  "Freelance":      [200, 3000],
  "Investment":     [50, 2000],
  "Other Income":   [20, 500],
};

// ── core bot logic ───────────────────────────────────────────────────────────

export interface BotConfig {
  userCount: number;
  monthsBack: number;
}

export interface BotProgress {
  type: "info" | "success" | "error" | "done";
  message: string;
}

export async function runBot(
  config: BotConfig,
  onProgress: (p: BotProgress) => void
): Promise<void> {
  const { userCount, monthsBack } = config;

  for (let i = 0; i < userCount; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const displayName = `${firstName} ${lastName}`;
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randInt(10, 999)}`;
    const password = "Bot@12345";
    const personality = pick(PERSONALITIES);
    const { currency, locale } = pick(CURRENCIES);

    onProgress({ type: "info", message: `[User ${i + 1}/${userCount}] Creating "${displayName}" (${username}) — personality: ${personality.label}` });

    try {
      // 1. create user
      const userId = crypto.randomUUID();
      const { hash, salt } = await hashPassword(password);
      const initials = (firstName[0] + lastName[0]).toUpperCase();
      const now = new Date().toISOString();

      await createUser({
        id: userId,
        username,
        displayName,
        avatarInitials: initials,
        passwordHash: hash,
        salt,
        createdAt: now,
      });

      // 2. create workspace
      const workspaceId = crypto.randomUUID();
      await createWorkspace({
        id: workspaceId,
        userId,
        name: pick(WORKSPACE_NAMES),
        currency,
        locale,
        createdAt: now,
      });

      // 3. seed categories
      await seedDefaultCategories(workspaceId);
      const categories = await getCategoriesByWorkspaceId(workspaceId);
      const expenseCats = categories.filter(c => c.scope === "expense" || c.scope === "both");
      const incomeCats = categories.filter(c => c.scope === "income" || c.scope === "both");

      // 4. generate transactions across past N months
      let txCount = 0;
      const today = new Date();

      for (let m = monthsBack - 1; m >= 0; m--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const txThisMonth = randInt(...personality.txPerMonth);

        // income: one or two income events per month based on frequency
        const incomeEvents = Math.random() < personality.incomeFrequency ? randInt(1, 2) : 0;
        for (let ie = 0; ie < incomeEvents; ie++) {
          const cat = weightedPick(incomeCats, personality.incomeCategoryWeights.slice(0, incomeCats.length));
          await writeTransaction(workspaceId, cat, "income", personality, monthDate, daysInMonth);
          txCount++;
        }

        // expenses
        for (let t = 0; t < txThisMonth; t++) {
          const cat = weightedPick(expenseCats, personality.expenseCategoryWeights.slice(0, expenseCats.length));
          await writeTransaction(workspaceId, cat, "expense", personality, monthDate, daysInMonth);
          txCount++;
        }
      }

      onProgress({ type: "success", message: `[User ${i + 1}/${userCount}] Done — ${txCount} transactions created` });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onProgress({ type: "error", message: `[User ${i + 1}/${userCount}] Failed: ${msg}` });
    }
  }

  onProgress({ type: "done", message: `Bot finished. ${userCount} user(s) generated.` });
}

async function writeTransaction(
  workspaceId: string,
  cat: Category,
  type: "income" | "expense",
  personality: Personality,
  monthDate: Date,
  daysInMonth: number
): Promise<void> {
  const descriptions = TRANSACTION_DESCRIPTIONS[cat.name] ?? ["Transaction"];
  const [amtMin, amtMax] = AMOUNT_RANGES[cat.name] ?? [10, 100];
  const rawAmount = rand(amtMin, amtMax) * personality.amountMultiplier;
  const amount = Math.round(rawAmount * 100) / 100;

  const day = randInt(1, daysInMonth);
  const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
  const dateStr = date.toISOString().split("T")[0];
  const now = new Date().toISOString();

  const tx: Transaction = {
    id: crypto.randomUUID(),
    workspaceId,
    type,
    amount,
    categoryId: cat.id,
    description: pick(descriptions),
    date: dateStr,
    isRecurring: Math.random() < personality.recurringChance,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };

  await createTransaction(tx);
}
