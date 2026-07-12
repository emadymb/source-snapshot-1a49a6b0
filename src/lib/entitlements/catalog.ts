// Canonical entitlements catalog. Every switch, quota, and gate in the app maps
// back here. Plans and workspaces store an "entitlement map" keyed by these ids.

export type EntitlementKind = "toggle" | "quota" | "select";

export type Module =
  | "core"
  | "accounting"
  | "pos"
  | "hrm"
  | "ai"
  | "documents"
  | "reports"
  | "finvoice"
  | "crm"
  | "banking"
  | "loyalty"
  | "firm";

export interface FeatureDef {
  id: string;
  module: Module;
  label: { en: string; ar: string };
  desc?: { en: string; ar: string };
  kind: EntitlementKind;
  /** Toggle default (bool), quota default (number), select default (string). */
  defaultValue: boolean | number | string;
  /** For selects. */
  options?: { value: string; label: { en: string; ar: string } }[];
  /** For quotas. */
  unit?: string;
  /** If this depends on another feature being on. */
  dependsOn?: string;
}

export const MODULES: { id: Module; label: { en: string; ar: string } }[] = [
  { id: "core",       label: { en: "Core",         ar: "الأساسيات" } },
  { id: "accounting", label: { en: "Accounting",   ar: "المحاسبة" } },
  { id: "pos",        label: { en: "POS",          ar: "نقاط البيع" } },
  { id: "hrm",        label: { en: "HRM & Payroll",ar: "الموارد البشرية" } },
  { id: "ai",         label: { en: "AI",           ar: "الذكاء الاصطناعي" } },
  { id: "documents",  label: { en: "Documents",    ar: "المستندات" } },
  { id: "reports",    label: { en: "Reports",      ar: "التقارير" } },
  { id: "finvoice",   label: { en: "E-Invoicing",  ar: "الفوترة الإلكترونية" } },
  { id: "crm",        label: { en: "CRM",          ar: "إدارة العملاء" } },
  { id: "banking",    label: { en: "Banking",      ar: "البنوك" } },
  { id: "loyalty",    label: { en: "Loyalty",      ar: "الولاء" } },
  { id: "firm",       label: { en: "Firm console", ar: "لوحة المكتب" } },
];

// ---------------- Features ----------------

export const FEATURES: FeatureDef[] = [
  // core
  { id: "core.workspaces",     module: "core", kind: "quota",  defaultValue: 1,  unit: "workspace",
    label: { en: "Workspaces",     ar: "المساحات" } },
  { id: "core.users",          module: "core", kind: "quota",  defaultValue: 5,  unit: "user",
    label: { en: "Users",          ar: "المستخدمون" } },
  { id: "core.companies",      module: "core", kind: "quota",  defaultValue: 1,  unit: "company",
    label: { en: "Companies",      ar: "الشركات" } },
  { id: "core.multiCurrency",  module: "core", kind: "toggle", defaultValue: false,
    label: { en: "Multi-currency", ar: "تعدد العملات" } },
  { id: "core.branding",       module: "core", kind: "toggle", defaultValue: false,
    label: { en: "Custom branding", ar: "هوية مخصصة" } },
  { id: "core.api",            module: "core", kind: "toggle", defaultValue: false,
    label: { en: "Public API access", ar: "الوصول عبر API" } },

  // accounting
  { id: "accounting.ledger",       module: "accounting", kind: "toggle", defaultValue: true,
    label: { en: "General ledger", ar: "دفتر الأستاذ" } },
  { id: "accounting.invoices",     module: "accounting", kind: "quota",  defaultValue: 200, unit: "/month",
    label: { en: "Invoices",       ar: "الفواتير" } },
  { id: "accounting.quotations",   module: "accounting", kind: "toggle", defaultValue: true,
    label: { en: "Quotations",     ar: "عروض الأسعار" } },
  { id: "accounting.purchases",    module: "accounting", kind: "toggle", defaultValue: true,
    label: { en: "Purchases",      ar: "المشتريات" } },
  { id: "accounting.expenses",     module: "accounting", kind: "toggle", defaultValue: true,
    label: { en: "Expenses",       ar: "المصروفات" } },
  { id: "accounting.inventory",    module: "accounting", kind: "toggle", defaultValue: false,
    label: { en: "Inventory",      ar: "المخزون" } },
  { id: "accounting.cashBoxes",    module: "accounting", kind: "toggle", defaultValue: false,
    label: { en: "Cash boxes",     ar: "الصناديق النقدية" } },
  { id: "accounting.journals",     module: "accounting", kind: "toggle", defaultValue: true,
    label: { en: "Journals",       ar: "قيود اليومية" } },

  // pos
  { id: "pos.enabled",        module: "pos", kind: "toggle", defaultValue: false,
    label: { en: "POS terminals",  ar: "أجهزة نقاط البيع" } },
  { id: "pos.terminals",      module: "pos", kind: "quota",  defaultValue: 0, unit: "terminal", dependsOn: "pos.enabled",
    label: { en: "POS terminals", ar: "عدد الأجهزة" } },
  { id: "pos.cards",          module: "pos", kind: "toggle", defaultValue: false, dependsOn: "pos.enabled",
    label: { en: "Gift & prepaid cards", ar: "بطاقات الهدايا والدفع المسبق" } },

  // hrm
  { id: "hrm.employees",      module: "hrm", kind: "quota",  defaultValue: 0,  unit: "employee",
    label: { en: "Employees",     ar: "الموظفون" } },
  { id: "hrm.payroll",        module: "hrm", kind: "toggle", defaultValue: false,
    label: { en: "Payroll runs",  ar: "كشوف المرتبات" } },
  { id: "hrm.attendance",     module: "hrm", kind: "toggle", defaultValue: false,
    label: { en: "Attendance",    ar: "الحضور" } },
  { id: "hrm.commissions",    module: "hrm", kind: "toggle", defaultValue: false,
    label: { en: "Commissions",   ar: "العمولات" } },

  // ai
  { id: "ai.chat",            module: "ai", kind: "toggle", defaultValue: false,
    label: { en: "AI assistant chat", ar: "المساعد الذكي" } },
  { id: "ai.ocr",             module: "ai", kind: "quota",  defaultValue: 100, unit: "scans/mo",
    label: { en: "OCR receipt scans", ar: "مسح الفواتير OCR" } },
  { id: "ai.drafts",          module: "ai", kind: "toggle", defaultValue: false,
    label: { en: "AI journal drafts", ar: "مسودات القيود بالذكاء" } },
  { id: "ai.insights",        module: "ai", kind: "toggle", defaultValue: false,
    label: { en: "AI insights",   ar: "رؤى ذكية" } },
  { id: "ai.model",           module: "ai", kind: "select", defaultValue: "flash",
    options: [
      { value: "flash",  label: { en: "Flash (fast)",    ar: "سريع" } },
      { value: "pro",    label: { en: "Pro (balanced)",  ar: "متوازن" } },
      { value: "ultra",  label: { en: "Ultra (premium)", ar: "متقدم" } },
    ],
    label: { en: "AI model tier", ar: "طبقة نموذج الذكاء" } },

  // documents
  { id: "documents.enabled",  module: "documents", kind: "toggle", defaultValue: true,
    label: { en: "Documents vault", ar: "خزانة المستندات" } },
  { id: "documents.storage",  module: "documents", kind: "quota",  defaultValue: 5, unit: "GB",
    label: { en: "Storage",         ar: "التخزين" } },

  // reports
  { id: "reports.standard",   module: "reports", kind: "toggle", defaultValue: true,
    label: { en: "Standard reports", ar: "التقارير القياسية" } },
  { id: "reports.custom",     module: "reports", kind: "toggle", defaultValue: false,
    label: { en: "Custom report builder", ar: "منشئ تقارير مخصص" } },
  { id: "reports.analytics",  module: "reports", kind: "toggle", defaultValue: false,
    label: { en: "Advanced analytics", ar: "تحليلات متقدمة" } },

  // finvoice
  { id: "finvoice.send",      module: "finvoice", kind: "toggle", defaultValue: false,
    label: { en: "Send Finvoice e-invoices", ar: "إرسال فواتير Finvoice" } },
  { id: "finvoice.receive",   module: "finvoice", kind: "toggle", defaultValue: false,
    label: { en: "Receive e-invoices", ar: "استلام الفواتير الإلكترونية" } },
  { id: "finvoice.procountor",module: "finvoice", kind: "toggle", defaultValue: false,
    label: { en: "Procountor export", ar: "تصدير Procountor" } },

  // crm
  { id: "crm.enabled",        module: "crm", kind: "toggle", defaultValue: false,
    label: { en: "CRM contacts & pipeline", ar: "CRM جهات وأنبوب مبيعات" } },
  { id: "crm.emailAutomation",module: "crm", kind: "toggle", defaultValue: false, dependsOn: "crm.enabled",
    label: { en: "Email automation", ar: "أتمتة البريد" } },

  // banking
  { id: "banking.feeds",      module: "banking", kind: "toggle", defaultValue: false,
    label: { en: "Bank feeds",     ar: "روابط البنوك" } },
  { id: "banking.reconcile",  module: "banking", kind: "toggle", defaultValue: false, dependsOn: "banking.feeds",
    label: { en: "Auto reconciliation", ar: "التسوية التلقائية" } },

  // loyalty
  { id: "loyalty.enabled",    module: "loyalty", kind: "toggle", defaultValue: false,
    label: { en: "Loyalty program", ar: "برنامج الولاء" } },

  // firm console (advisor-only surfaces)
  { id: "firm.reports",       module: "firm", kind: "toggle", defaultValue: false,
    label: { en: "Practice analytics", ar: "تحليلات المكتب" } },
  { id: "firm.time",          module: "firm", kind: "toggle", defaultValue: false,
    label: { en: "Time tracking",     ar: "تتبع الوقت" } },
  { id: "firm.documents",     module: "firm", kind: "toggle", defaultValue: true,
    label: { en: "Client documents vault", ar: "خزنة مستندات العملاء" } },
  { id: "firm.documents.ocr", module: "firm", kind: "toggle", defaultValue: false, dependsOn: "firm.documents",
    label: { en: "OCR & data extraction", ar: "استخراج البيانات OCR" } },
  { id: "firm.documents.export", module: "firm", kind: "toggle", defaultValue: false, dependsOn: "firm.documents",
    label: { en: "Excel export of extracted data", ar: "تصدير البيانات المستخرجة كإكسل" } },
];

export function featureById(id: string): FeatureDef | undefined {
  return FEATURES.find((f) => f.id === id);
}

// ---------------- Plans (canonical presets) ----------------

export type EntitlementMap = Record<string, boolean | number | string>;

export interface CatalogPlan {
  id: string;
  name: string;
  price: number;   // EUR / month
  tagline: { en: string; ar: string };
  entitlements: EntitlementMap;
}

function pick(overrides: EntitlementMap): EntitlementMap {
  const map: EntitlementMap = {};
  for (const f of FEATURES) map[f.id] = f.defaultValue;
  return { ...map, ...overrides };
}

export const CATALOG_PLANS: CatalogPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    tagline: { en: "Solo & micro businesses", ar: "الأعمال الفردية والصغيرة جداً" },
    entitlements: pick({
      "core.users": 3,
      "core.companies": 1,
      "accounting.invoices": 200,
      "ai.ocr": 100,
      "documents.storage": 5,
    }),
  },
  {
    id: "growth",
    name: "Growth",
    price: 89,
    tagline: { en: "Growing SMEs with AI", ar: "الشركات النامية بالذكاء" },
    entitlements: pick({
      "core.users": 10,
      "core.companies": 2,
      "accounting.invoices": 2000,
      "accounting.inventory": true,
      "accounting.cashBoxes": true,
      "hrm.employees": 15,
      "hrm.payroll": true,
      "hrm.attendance": true,
      "ai.chat": true,
      "ai.ocr": 500,
      "ai.drafts": true,
      "ai.insights": true,
      "ai.model": "pro",
      "documents.storage": 25,
      "reports.custom": true,
      "banking.feeds": true,
      "banking.reconcile": true,
      "finvoice.send": true,
      "finvoice.receive": true,
      "firm.time": true,
    }),
  },
  {
    id: "scale",
    name: "Scale",
    price: 249,
    tagline: { en: "Multi-entity & POS", ar: "متعدد الشركات ونقاط البيع" },
    entitlements: pick({
      "core.users": 50,
      "core.companies": 10,
      "core.multiCurrency": true,
      "core.branding": true,
      "core.api": true,
      "accounting.invoices": 20000,
      "accounting.inventory": true,
      "accounting.cashBoxes": true,
      "pos.enabled": true,
      "pos.terminals": 5,
      "pos.cards": true,
      "hrm.employees": 100,
      "hrm.payroll": true,
      "hrm.attendance": true,
      "hrm.commissions": true,
      "ai.chat": true,
      "ai.ocr": 5000,
      "ai.drafts": true,
      "ai.insights": true,
      "ai.model": "pro",
      "documents.storage": 200,
      "reports.custom": true,
      "reports.analytics": true,
      "finvoice.send": true,
      "finvoice.receive": true,
      "finvoice.procountor": true,
      "crm.enabled": true,
      "crm.emailAutomation": true,
      "banking.feeds": true,
      "banking.reconcile": true,
      "loyalty.enabled": true,
      "firm.reports": true,
      "firm.time": true,
      "firm.documents.ocr": true,
    }),
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 9990,
    tagline: { en: "Whitelabel & unlimited", ar: "بلا حدود مع علامتك" },
    entitlements: pick({
      "core.workspaces": 999,
      "core.users": 999,
      "core.companies": 999,
      "core.multiCurrency": true,
      "core.branding": true,
      "core.api": true,
      "accounting.invoices": 999999,
      "accounting.inventory": true,
      "accounting.cashBoxes": true,
      "pos.enabled": true,
      "pos.terminals": 100,
      "pos.cards": true,
      "hrm.employees": 999,
      "hrm.payroll": true,
      "hrm.attendance": true,
      "hrm.commissions": true,
      "ai.chat": true,
      "ai.ocr": 999999,
      "ai.drafts": true,
      "ai.insights": true,
      "ai.model": "ultra",
      "documents.storage": 2000,
      "reports.custom": true,
      "reports.analytics": true,
      "finvoice.send": true,
      "finvoice.receive": true,
      "finvoice.procountor": true,
      "crm.enabled": true,
      "crm.emailAutomation": true,
      "banking.feeds": true,
      "banking.reconcile": true,
      "loyalty.enabled": true,
      "firm.reports": true,
      "firm.time": true,
      "firm.documents.ocr": true,
      "firm.documents.export": true,
    }),
  },
];

export function planById(id: string): CatalogPlan | undefined {
  return CATALOG_PLANS.find((p) => p.id === id);
}
