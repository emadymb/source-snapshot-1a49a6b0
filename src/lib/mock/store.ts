// Shared in-memory mock store for the accounting UI.
// Subscribers re-render via useSyncExternalStore.

import { useSyncExternalStore } from "react";

export type Contact = {
  id: string;
  name: string;
  type: "customer" | "vendor" | "both";
  email: string;
  vat?: string;
  country: string;
  balance: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  vatRate: number;
  unit: string;
};

export type Account = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  balance: number;
};

export type InvoiceLine = {
  id: string;
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
};

export type Invoice = {
  id: string;
  number: string;
  contactId: string;
  issueDate: string; // ISO
  dueDate: string; // ISO
  status: "draft" | "sent" | "paid" | "overdue";
  lines: InvoiceLine[];
  notes?: string;
};

export type JournalLine = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
};

export type Journal = {
  id: string;
  number: string;
  date: string;
  memo: string;
  status: "draft" | "posted";
  lines: JournalLine[];
};

export type Expense = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  vatRate: number;
  status: "pending" | "approved" | "reimbursed";
};

type State = {
  contacts: Contact[];
  products: Product[];
  accounts: Account[];
  invoices: Invoice[];
  journals: Journal[];
  expenses: Expense[];
};

const uid = (p = "") => p + Math.random().toString(36).slice(2, 10);

function initial(): State {
  const contacts: Contact[] = [
    { id: "c1", name: "Lindqvist Oy", type: "customer", email: "billing@lindqvist.fi", vat: "FI12345671", country: "FI", balance: 3480 },
    { id: "c2", name: "Aalto Design Ltd", type: "customer", email: "hello@aaltodesign.fi", vat: "FI22314455", country: "FI", balance: 1240 },
    { id: "c3", name: "Kiviranta & Co", type: "customer", email: "ap@kiviranta.fi", vat: "FI87451233", country: "FI", balance: 0 },
    { id: "c4", name: "Nordea Bank", type: "vendor", email: "corp@nordea.fi", country: "FI", balance: -180 },
    { id: "c5", name: "K-Supermarket", type: "vendor", email: "invoices@k-market.fi", country: "FI", balance: -420 },
    { id: "c6", name: "Fortum Energy", type: "vendor", email: "billing@fortum.com", country: "FI", balance: -960 },
    { id: "c7", name: "Elisa Oyj", type: "vendor", email: "b2b@elisa.fi", country: "FI", balance: -145 },
    { id: "c8", name: "Nokia Solutions", type: "both", email: "ap@nokia.com", vat: "FI09140687", country: "FI", balance: 2100 },
  ];
  const products: Product[] = [
    { id: "p1", sku: "CONS-01", name: "Consulting hour — Senior", price: 145, cost: 60, stock: 999, vatRate: 24, unit: "h" },
    { id: "p2", sku: "CONS-02", name: "Consulting hour — Junior", price: 85, cost: 35, stock: 999, vatRate: 24, unit: "h" },
    { id: "p3", sku: "DEV-01", name: "Development sprint (2 weeks)", price: 12800, cost: 5400, stock: 999, vatRate: 24, unit: "pcs" },
    { id: "p4", sku: "AUDIT-01", name: "Annual audit package", price: 3200, cost: 900, stock: 999, vatRate: 0, unit: "pcs" },
    { id: "p5", sku: "HW-01", name: "MacBook Pro 14", price: 2490, cost: 2050, stock: 6, vatRate: 24, unit: "pcs" },
    { id: "p6", sku: "HW-02", name: "Dell UltraSharp 27", price: 620, cost: 480, stock: 14, vatRate: 24, unit: "pcs" },
    { id: "p7", sku: "SUB-01", name: "Momken subscription — Pro", price: 99, cost: 0, stock: 999, vatRate: 24, unit: "mo" },
  ];
  const accounts: Account[] = [
    { id: "a1000", code: "1000", name: "Cash", type: "asset", balance: 24800 },
    { id: "a1010", code: "1010", name: "Business bank — Nordea", type: "asset", balance: 188140 },
    { id: "a1200", code: "1200", name: "Accounts receivable", type: "asset", balance: 6820 },
    { id: "a1500", code: "1500", name: "Inventory", type: "asset", balance: 21400 },
    { id: "a2000", code: "2000", name: "Accounts payable", type: "liability", balance: 1705 },
    { id: "a2200", code: "2200", name: "VAT payable", type: "liability", balance: 4980 },
    { id: "a3000", code: "3000", name: "Owner's equity", type: "equity", balance: 45000 },
    { id: "a4000", code: "4000", name: "Sales revenue", type: "income", balance: 148200 },
    { id: "a4100", code: "4100", name: "Consulting revenue", type: "income", balance: 62400 },
    { id: "a5000", code: "5000", name: "Cost of goods sold", type: "expense", balance: 42800 },
    { id: "a6100", code: "6100", name: "Salaries", type: "expense", balance: 58200 },
    { id: "a6200", code: "6200", name: "Rent", type: "expense", balance: 14400 },
    { id: "a6300", code: "6300", name: "Utilities", type: "expense", balance: 3980 },
    { id: "a6400", code: "6400", name: "Software subscriptions", type: "expense", balance: 6120 },
  ];

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const daysAhead = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

  const invoices: Invoice[] = [
    {
      id: "inv1", number: "INV-2411", contactId: "c1", issueDate: daysAgo(28), dueDate: daysAgo(-2), status: "paid",
      lines: [{ id: uid(), productId: "p1", description: "Consulting hour — Senior", qty: 24, unitPrice: 145, vatRate: 24 }],
    },
    {
      id: "inv2", number: "INV-2412", contactId: "c2", issueDate: daysAgo(18), dueDate: daysAhead(12), status: "sent",
      lines: [{ id: uid(), productId: "p3", description: "Development sprint (2 weeks)", qty: 1, unitPrice: 12800, vatRate: 24 }],
    },
    {
      id: "inv3", number: "INV-2413", contactId: "c3", issueDate: daysAgo(10), dueDate: daysAhead(20), status: "sent",
      lines: [
        { id: uid(), productId: "p2", description: "Consulting hour — Junior", qty: 12, unitPrice: 85, vatRate: 24 },
        { id: uid(), productId: "p7", description: "Momken subscription — Pro", qty: 3, unitPrice: 99, vatRate: 24 },
      ],
    },
    {
      id: "inv4", number: "INV-2414", contactId: "c8", issueDate: daysAgo(45), dueDate: daysAgo(15), status: "overdue",
      lines: [{ id: uid(), productId: "p4", description: "Annual audit package", qty: 1, unitPrice: 3200, vatRate: 0 }],
    },
    {
      id: "inv5", number: "INV-2415", contactId: "c1", issueDate: daysAgo(4), dueDate: daysAhead(26), status: "sent",
      lines: [{ id: uid(), productId: "p5", description: "MacBook Pro 14", qty: 1, unitPrice: 2490, vatRate: 24 }],
    },
    {
      id: "inv6", number: "INV-2416", contactId: "c2", issueDate: daysAgo(1), dueDate: daysAhead(29), status: "draft",
      lines: [{ id: uid(), productId: "p6", description: "Dell UltraSharp 27", qty: 2, unitPrice: 620, vatRate: 24 }],
    },
  ];

  const journals: Journal[] = [
    {
      id: "j1", number: "JV-0021", date: daysAgo(3), memo: "March rent — Aleksanterinkatu 15", status: "posted",
      lines: [
        { id: uid(), accountId: "a6200", debit: 1200, credit: 0, memo: "Rent" },
        { id: uid(), accountId: "a1010", debit: 0, credit: 1200, memo: "Nordea" },
      ],
    },
    {
      id: "j2", number: "JV-0022", date: daysAgo(2), memo: "Bank interest received", status: "posted",
      lines: [
        { id: uid(), accountId: "a1010", debit: 42.1, credit: 0 },
        { id: uid(), accountId: "a4000", debit: 0, credit: 42.1 },
      ],
    },
    {
      id: "j3", number: "JV-0023", date: daysAgo(1), memo: "Payroll accrual — March", status: "draft",
      lines: [
        { id: uid(), accountId: "a6100", debit: 18400, credit: 0 },
        { id: uid(), accountId: "a2000", debit: 0, credit: 18400 },
      ],
    },
  ];

  const expenses: Expense[] = [
    { id: "e1", date: daysAgo(2), vendor: "K-Supermarket", category: "Groceries", amount: 48.2, vatRate: 14, status: "approved" },
    { id: "e2", date: daysAgo(4), vendor: "Fortum Energy", category: "Utilities", amount: 312.4, vatRate: 24, status: "reimbursed" },
    { id: "e3", date: daysAgo(6), vendor: "Elisa Oyj", category: "Telecom", amount: 145.0, vatRate: 24, status: "pending" },
    { id: "e4", date: daysAgo(9), vendor: "Uber", category: "Travel", amount: 22.9, vatRate: 10, status: "approved" },
    { id: "e5", date: daysAgo(12), vendor: "Amazon Web Services", category: "Software", amount: 480.5, vatRate: 24, status: "reimbursed" },
    { id: "e6", date: daysAgo(15), vendor: "Finnair", category: "Travel", amount: 640, vatRate: 10, status: "reimbursed" },
  ];

  return { contacts, products, accounts, invoices, journals, expenses };
}

let state: State = initial();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(mut: (s: State) => State) {
  state = mut(state);
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export const store = {
  get: () => state,
  // Contacts
  upsertContact(c: Omit<Contact, "id"> & { id?: string }) {
    set((s) => {
      const id = c.id ?? uid("c");
      const existing = s.contacts.find((x) => x.id === id);
      const next = { ...c, id } as Contact;
      return { ...s, contacts: existing ? s.contacts.map((x) => (x.id === id ? next : x)) : [next, ...s.contacts] };
    });
  },
  deleteContact(id: string) { set((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) })); },
  // Products
  upsertProduct(p: Omit<Product, "id"> & { id?: string }) {
    set((s) => {
      const id = p.id ?? uid("p");
      const existing = s.products.find((x) => x.id === id);
      const next = { ...p, id } as Product;
      return { ...s, products: existing ? s.products.map((x) => (x.id === id ? next : x)) : [next, ...s.products] };
    });
  },
  deleteProduct(id: string) { set((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })); },
  // Accounts
  upsertAccount(a: Omit<Account, "id"> & { id?: string }) {
    set((s) => {
      const id = a.id ?? uid("a");
      const existing = s.accounts.find((x) => x.id === id);
      const next = { ...a, id } as Account;
      return { ...s, accounts: existing ? s.accounts.map((x) => (x.id === id ? next : x)) : [...s.accounts, next] };
    });
  },
  deleteAccount(id: string) { set((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) })); },
  // Invoices
  upsertInvoice(inv: Omit<Invoice, "id" | "number"> & { id?: string; number?: string }) {
    set((s) => {
      const id = inv.id ?? uid("inv");
      const existing = s.invoices.find((x) => x.id === id);
      const number = inv.number ?? `INV-${String(2417 + s.invoices.length).padStart(4, "0")}`;
      const next = { ...inv, id, number } as Invoice;
      return { ...s, invoices: existing ? s.invoices.map((x) => (x.id === id ? next : x)) : [next, ...s.invoices] };
    });
  },
  deleteInvoice(id: string) { set((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) })); },
  setInvoiceStatus(id: string, status: Invoice["status"]) {
    set((s) => ({ ...s, invoices: s.invoices.map((i) => (i.id === id ? { ...i, status } : i)) }));
  },
  // Journals
  upsertJournal(j: Omit<Journal, "id" | "number"> & { id?: string; number?: string }) {
    set((s) => {
      const id = j.id ?? uid("j");
      const existing = s.journals.find((x) => x.id === id);
      const number = j.number ?? `JV-${String(24 + s.journals.length).padStart(4, "0")}`;
      const next = { ...j, id, number } as Journal;
      return { ...s, journals: existing ? s.journals.map((x) => (x.id === id ? next : x)) : [next, ...s.journals] };
    });
  },
  deleteJournal(id: string) { set((s) => ({ ...s, journals: s.journals.filter((j) => j.id !== id) })); },
  postJournal(id: string) {
    set((s) => ({ ...s, journals: s.journals.map((j) => (j.id === id ? { ...j, status: "posted" as const } : j)) }));
  },
  // Expenses
  upsertExpense(e: Omit<Expense, "id"> & { id?: string }) {
    set((s) => {
      const id = e.id ?? uid("e");
      const existing = s.expenses.find((x) => x.id === id);
      const next = { ...e, id } as Expense;
      return { ...s, expenses: existing ? s.expenses.map((x) => (x.id === id ? next : x)) : [next, ...s.expenses] };
    });
  },
  deleteExpense(id: string) { set((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) })); },
};

// Derived helpers
export function invoiceTotal(inv: Invoice) {
  const sub = inv.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const vat = inv.lines.reduce((a, l) => a + l.qty * l.unitPrice * (l.vatRate / 100), 0);
  return { subtotal: sub, vat, total: sub + vat };
}

export const fmt = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });