// HRM auxiliary mock store — tasks, holidays, reminders, memos, internal
// messages, and attendance clock-in state. Backed by localStorage and
// consumed by the HRM/Payroll module pages. Real payroll + employees +
// leaves already live in `src/lib/hrm.functions.ts` (Prisma + RLS).
import { useSyncExternalStore } from "react";

export type Task = { id: string; title: string; date: string; done: boolean; assignee?: string };
export type Holiday = { id: string; date: string; label: string };
export type Reminder = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  repeat: "once" | "daily" | "weekly" | "monthly";
};
export type Memo = { id: string; author: string; body: string; sharedWith: string; createdAt: number };
export type InternalMessage = {
  id: string;
  from: string;
  to: "all" | "firm" | "clients" | string;
  subject: string;
  body: string;
  createdAt: number;
};
export type AttendancePunch = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO
  clockOut?: string; // ISO
  note?: string;
};

type State = {
  tasks: Task[];
  holidays: Holiday[];
  reminders: Reminder[];
  memos: Memo[];
  messages: InternalMessage[];
  attendance: AttendancePunch[];
};

const KEY = "fiksu.hrm.store.v1";

function seed(): State {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const year = now.getFullYear();
  return {
    tasks: [
      { id: "t1", title: "مراجعة كشوف الرواتب لشهر يونيو", date: iso(now), done: false, assignee: "Aino" },
      { id: "t2", title: "توقيع عقد Sofia", date: iso(now), done: true, assignee: "Mikko" },
      { id: "t3", title: "إغلاق تقرير الحضور الأسبوعي", date: iso(new Date(now.getTime() + 864e5)), done: false },
    ],
    holidays: [
      { id: "h1", date: `${year}-01-01`, label: "رأس السنة" },
      { id: "h2", date: `${year}-05-01`, label: "عيد العمال" },
      { id: "h3", date: `${year}-06-21`, label: "منتصف الصيف Juhannus" },
      { id: "h4", date: `${year}-12-06`, label: "عيد استقلال فنلندا" },
      { id: "h5", date: `${year}-12-25`, label: "عيد الميلاد" },
    ],
    reminders: [
      { id: "r1", title: "دفع الضرائب الشهرية", date: iso(new Date(year, now.getMonth(), 12)), time: "10:00", repeat: "monthly" },
      { id: "r2", title: "اجتماع الفريق الأسبوعي", date: iso(now), time: "09:00", repeat: "weekly" },
    ],
    memos: [
      { id: "m1", author: "Firm Admin", body: "يرجى إرسال إيصالات المصروفات قبل نهاية الأسبوع.", sharedWith: "all", createdAt: Date.now() - 3 * 864e5 },
    ],
    messages: [
      { id: "im1", from: "Firm Admin", to: "all", subject: "إجازة منتصف الصيف", body: "المكتب مغلق يومي 20 و21 يونيو.", createdAt: Date.now() - 2 * 864e5 },
    ],
    attendance: [],
  };
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return { ...seed(), ...JSON.parse(raw) };
  } catch {
    return seed();
  }
}

let state: State = load();
const listeners = new Set<() => void>();
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const hrmStore = {
  getState: () => state,
  subscribe,

  addTask(input: Omit<Task, "id" | "done">) {
    state = { ...state, tasks: [{ ...input, id: uid("t"), done: false }, ...state.tasks] };
    persist();
  },
  toggleTask(id: string) {
    state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) };
    persist();
  },
  removeTask(id: string) {
    state = { ...state, tasks: state.tasks.filter((t) => t.id !== id) };
    persist();
  },

  addHoliday(input: Omit<Holiday, "id">) {
    state = { ...state, holidays: [{ ...input, id: uid("h") }, ...state.holidays] };
    persist();
  },
  removeHoliday(id: string) {
    state = { ...state, holidays: state.holidays.filter((h) => h.id !== id) };
    persist();
  },

  addReminder(input: Omit<Reminder, "id">) {
    state = { ...state, reminders: [{ ...input, id: uid("r") }, ...state.reminders] };
    persist();
  },
  removeReminder(id: string) {
    state = { ...state, reminders: state.reminders.filter((r) => r.id !== id) };
    persist();
  },

  addMemo(input: Omit<Memo, "id" | "createdAt">) {
    state = { ...state, memos: [{ ...input, id: uid("m"), createdAt: Date.now() }, ...state.memos] };
    persist();
  },
  removeMemo(id: string) {
    state = { ...state, memos: state.memos.filter((m) => m.id !== id) };
    persist();
  },

  sendMessage(input: Omit<InternalMessage, "id" | "createdAt">) {
    state = { ...state, messages: [{ ...input, id: uid("im"), createdAt: Date.now() }, ...state.messages] };
    persist();
  },
  removeMessage(id: string) {
    state = { ...state, messages: state.messages.filter((m) => m.id !== id) };
    persist();
  },

  clockIn(employeeId: string, employeeName: string, note?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const open = state.attendance.find((a) => a.employeeId === employeeId && a.date === today && !a.clockOut);
    if (open) return open;
    const punch: AttendancePunch = {
      id: uid("a"),
      employeeId,
      employeeName,
      date: today,
      clockIn: new Date().toISOString(),
      note,
    };
    state = { ...state, attendance: [punch, ...state.attendance] };
    persist();
    return punch;
  },
  clockOut(employeeId: string) {
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;
    const next = state.attendance.map((a) => {
      if (!changed && a.employeeId === employeeId && a.date === today && !a.clockOut) {
        changed = true;
        return { ...a, clockOut: new Date().toISOString() };
      }
      return a;
    });
    if (changed) {
      state = { ...state, attendance: next };
      persist();
    }
  },
};

export function useHrmStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function attendanceHours(a: AttendancePunch): number {
  if (!a.clockOut) return 0;
  return (new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 3_600_000;
}
