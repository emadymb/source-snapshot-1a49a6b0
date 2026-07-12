الطلب كبير جداً (39 ملفاً تستخدم mock data عبر بوابة الشركة، لوحة الـSuper Admin، وواجهات العميل المحاسبية). سأنفذ على 3 مراحل، وأبدأ فوراً بالمرحلة 1 لأنها الأثر الأكبر ومتوافقة تماماً مع طلبك عن الـOCR.

## المرحلة 1 — OCR حقيقي → CSV محاسبي فنلندي للمحاسب (تنفيذ فوري)

**الهدف:** رفع الإيصال → استخراج نص (Tesseract محلي + AI fallback) → تحليل ذكي عبر Lovable AI (Gemini) لاستخراج الحقول الفنلندية → توليد CSV → حفظه في DB وإرساله للمحاسب.

- إضافة جدول `receipt_extractions` في Prisma (companyId, workspaceId, uploadedBy, imageUrl, rawText, parsedRows JSON, csvContent, status, accountantNoteId).
- ملف server function جديد `src/lib/ocr.functions.ts`:
  - `extractReceiptToCsv({ imageBase64, workspaceId, companyId })`
  - يستخدم Tesseract على السيرفر (نص خام) ثم `generateText` مع `Output.object` عبر Lovable AI Gateway (`google/gemini-2.5-flash`) لاستخراج مصفوفة سطور بالحقول:
    - `Pvm` (Date, ISO), `Tili` (Account code)، `Debet`، `Kredit`، `Kohdennus`، `Alv` (%)، `Asiakas/Toimittaja`، `Selite`
  - يبني CSV بترتيب: `Pvm;Tili;Debet;Kredit;Kohdennus;Alv;Asiakas/Toimittaja;Selite` (فاصلة منقوطة — القياسي الفنلندي)، مع BOM لدعم Excel.
  - يخزّن السجل في `receipt_extractions` وينشئ رسالة/مهمة للمحاسب المسؤول عن الـworkspace مع مرفق CSV (يوجد جدول Messages بالفعل).
- استبدال `src/components/ai/OcrUploader.tsx`:
  - يستدعي `extractReceiptToCsv` مباشرة عند اختيار الملف (بدون انتظار مراجعة).
  - يعرض جدول الأسطر المستخرجة + زر "تحميل CSV" وحالة "تم الإرسال للمحاسب ✓".
- إزالة `aiStore.logUsage` (mock) واستبدالها بجدول `ai_usage_logs` حقيقي.

## المرحلة 2 — تفعيل الذكاء الاصطناعي بالكامل

- التحقق من وجود `LOVABLE_API_KEY` (سأنشئه إن لم يوجد). و اكتب `LOVABLE_API_KEY في ملف ال installation so i can use it whem I run the project in my laptop`
- `/api/chat` و `client.ai.chat.tsx` مربوطان فعلياً بـLovable AI — أحذف `mockAI` وأمرر السياق الحقيقي (المعاملات الأخيرة للشركة من DB) داخل system prompt.
- إضافة أداة `record_expense` تنفيذية حقيقية: تكتب في جدول `expenses` بدل المسودة الوهمية.
- تفعيل تحليلات الاستخدام (`super.ai.dashboard`, `super.ai.conversations`) من الجداول الحقيقية.

## المرحلة 3 — حذف mock data من الواجهات (متدرج)

نظراً لأن 39 ملفاً تعتمد على `src/lib/mock/*`، سأحذف على دفعات (كل دفعة قابلة للاختبار):

- **دفعة A** — بوابة العميل المحاسبية (12 ملف): journals, ledger, expenses, invoices, contacts, products, accounts, sales, hrm, attendance, holidays, memos → استخدام server functions الموجودة (`accounting.functions.ts`, `hrm.functions.ts`) بدل `mockStore`.
- **دفعة B** — بوابة الشركة المحاسبية (11 ملف): firm.clients/engagements/tasks/time/staff/roles/audit/reports/invoices/documents/settings → `firm.functions.ts`.
- **دفعة C** — Super Admin (6 ملف): cms + ai dashboards → `cms.functions.ts` + `saas.functions.ts`.
- **دفعة D** — حذف مجلد `src/lib/mock/` بالكامل وأي `mockStore`/`aiStore`/`cmsStore` باقٍ.
- إضافة seed حقيقي في `prisma/seed.ts` (يوجد بالفعل) لبيانات تجريبية أولية لحساب المستخدم الأول عند التسجيل، بدل الـmock.

## Technical details

- CSV encoding: UTF-8 with BOM (`\uFEFF`) + `;` delimiter (Finnish locale).
- Zod schema لكل سطر:
  ```ts
  z.object({
    pvm: z.string(), tili: z.string(), debet: z.number().nullable(),
    kredit: z.number().nullable(), kohdennus: z.string().nullable(),
    alv: z.number().nullable(), asiakasToimittaja: z.string().nullable(),
    selite: z.string(),
  })
  ```
- OCR fallback: إذا فشل Tesseract على السيرفر → إرسال صورة base64 كـ image_url إلى `google/gemini-2.5-flash` مباشرة لاستخراج الحقول (vision).
- Prisma migration جديدة `00000000000005_receipt_extractions` + GRANTs + RLS.
- `structuredOutputs: false` (Gemini)، مع fallback parsing عبر `NoObjectGeneratedError`.

## استفسار قبل البدء

هل تريد أن أبدأ بالمرحلة 1 الآن (OCR→CSV — أقصر مسار لقيمة فورية)، ثم أتابع بالمرحلة 2 و3 على رسائل لاحقة؟ أو تفضّل أن أنفذ كل شيء في هذه الجلسة (سيستغرق وقتاً أطول بكثير وقد يتطلب عدة تدويرات لتصحيح الأخطاء)؟