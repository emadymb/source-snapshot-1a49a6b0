// Fiksu E-Invoice engine — SERVER ONLY.
//
// Wraps @e-invoice-eu/core (EN 16931 compliant) so Fiksu owns the full
// e-invoice pipeline (no Maventa / no PEPPOL 3rd-party). Emits UBL 2.1
// (PEPPOL BIS Billing 3.0 / Finvoice 3.0 compatible), XRechnung (UBL/CII)
// and Cross Industry Invoice (CII) — all valid against the EN 16931
// semantic model published by CEN, which the Finnish Tax Administration
// (Verohallinto) accepts alongside Finvoice.
//
// The library uses Node built-ins (tmp-promise, ajv, xmlbuilder2). Loaded
// lazily so the module can be imported from client-safe files without
// crashing the Cloudflare Workers preview build.
//
// Supported formats:
//   - "UBL"                → UBL 2.1 Invoice (EN 16931, PEPPOL BIS 3.0)
//   - "XRECHNUNG-UBL"      → XRechnung 3.x (UBL syntax)
//   - "XRECHNUNG-CII"      → XRechnung 3.x (CII syntax)
//   - "CII"                → UN/CEFACT Cross Industry Invoice
//   - "FINVOICE"           → Finnish national Finvoice 3.0 (see xml.server)

import type { XmlInvoice } from "@/lib/accounting/xml.server";

export type EInvoiceFormat =
  | "UBL"
  | "XRECHNUNG-UBL"
  | "XRECHNUNG-CII"
  | "CII"
  | "FINVOICE";

export const EN16931_FORMATS: EInvoiceFormat[] = [
  "UBL",
  "XRECHNUNG-UBL",
  "XRECHNUNG-CII",
  "CII",
];

const num = (cents: number) => (cents / 100).toFixed(2);
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Map a Fiksu XmlInvoice → the @e-invoice-eu/core UBL Invoice tree. */
function toUblInvoice(inv: XmlInvoice) {
  const cur = inv.currency;
  const lines = inv.lines.map((l, i) => ({
    "cbc:ID": String(i + 1),
    "cbc:InvoicedQuantity": String(l.qty),
    "cbc:InvoicedQuantity@unitCode": "C62",
    "cbc:LineExtensionAmount": num(l.lineTotalCents),
    "cbc:LineExtensionAmount@currencyID": cur,
    "cac:Item": {
      "cbc:Name": l.description,
      "cac:ClassifiedTaxCategory": {
        "cbc:ID": l.vatRate > 0 ? "S" : "Z",
        "cbc:Percent": String(l.vatRate),
        "cac:TaxScheme": { "cbc:ID": "VAT" },
      },
    },
    "cac:Price": {
      "cbc:PriceAmount": num(l.unitPriceCents),
      "cbc:PriceAmount@currencyID": cur,
    },
  }));

  // Aggregate VAT subtotals per rate.
  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const l of inv.lines) {
    const b = byRate.get(l.vatRate) ?? { taxable: 0, tax: 0 };
    b.taxable += l.lineTotalCents;
    b.tax += Math.round((l.lineTotalCents * l.vatRate) / 100);
    byRate.set(l.vatRate, b);
  }
  const taxSubtotals = [...byRate.entries()].map(([rate, v]) => ({
    "cbc:TaxableAmount": num(v.taxable),
    "cbc:TaxableAmount@currencyID": cur,
    "cbc:TaxAmount": num(v.tax),
    "cbc:TaxAmount@currencyID": cur,
    "cac:TaxCategory": {
      "cbc:ID": rate > 0 ? "S" : "Z",
      "cbc:Percent": String(rate),
      "cac:TaxScheme": { "cbc:ID": "VAT" },
    },
  }));

  const party = (p: XmlInvoice["seller"]) => ({
    "cac:Party": {
      "cac:PartyName": { "cbc:Name": p.name },
      "cac:PostalAddress": {
        "cbc:StreetName": p.address ?? "N/A",
        "cbc:CityName": "N/A",
        "cbc:PostalZone": "00000",
        "cac:Country": { "cbc:IdentificationCode": p.country ?? "FI" },
      },
      "cac:PartyTaxScheme": [
        {
          "cbc:CompanyID": p.vatId ?? "",
          "cac:TaxScheme": { "cbc:ID": "VAT" },
        },
      ],
      "cac:PartyLegalEntity": { "cbc:RegistrationName": p.name },
    },
  });

  return {
    "ubl:Invoice": {
      "cbc:CustomizationID":
        "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0",
      "cbc:ProfileID": "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      "cbc:ID": inv.number,
      "cbc:IssueDate": day(inv.issueDate),
      ...(inv.dueDate ? { "cbc:DueDate": day(inv.dueDate) } : {}),
      "cbc:InvoiceTypeCode": "380",
      ...(inv.notes ? { "cbc:Note": [inv.notes] } : {}),
      "cbc:DocumentCurrencyCode": inv.currency,
      "cac:AccountingSupplierParty": party(inv.seller),
      "cac:AccountingCustomerParty": party(inv.buyer),
      "cac:TaxTotal": [
        {
          "cbc:TaxAmount": num(inv.taxCents),
          "cbc:TaxAmount@currencyID": cur,
          "cac:TaxSubtotal": taxSubtotals,
        },
      ],
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": num(inv.subtotalCents),
        "cbc:LineExtensionAmount@currencyID": cur,
        "cbc:TaxExclusiveAmount": num(inv.subtotalCents),
        "cbc:TaxExclusiveAmount@currencyID": cur,
        "cbc:TaxInclusiveAmount": num(inv.totalCents),
        "cbc:TaxInclusiveAmount@currencyID": cur,
        "cbc:PayableAmount": num(inv.totalCents),
        "cbc:PayableAmount@currencyID": cur,
      },
      "cac:InvoiceLine": lines,
    },
  };
}

const silentLogger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  fatal: () => {},
  verbose: () => {},
};

/** Generate an EN 16931 compliant XML e-invoice. */
export async function generateEInvoiceXml(
  inv: XmlInvoice,
  format: EInvoiceFormat,
): Promise<string> {
  if (format === "FINVOICE") {
    const { buildFinvoice } = await import("@/lib/accounting/xml.server");
    return buildFinvoice(inv);
  }

  const core = await import("@e-invoice-eu/core");
  const service = new core.InvoiceService(silentLogger as never);
  const input = toUblInvoice(inv) as never;
  const out = await service.generate(input, {
    format,
    lang: "en",
    noWarnings: true,
  });
  if (typeof out !== "string") throw new Error("Expected XML output");
  return out;
}

export function listEInvoiceFormats(): Array<{
  id: EInvoiceFormat;
  label: string;
  syntax: "UBL" | "CII" | "Finvoice";
  description: string;
}> {
  return [
    {
      id: "UBL",
      label: "UBL 2.1 — PEPPOL BIS 3.0",
      syntax: "UBL",
      description: "EN 16931 semantic model, PEPPOL Access Point ready.",
    },
    {
      id: "FINVOICE",
      label: "Finvoice 3.0 (Finnish)",
      syntax: "Finvoice",
      description: "Finanssiala ry Finnish national e-invoice standard.",
    },
    {
      id: "XRECHNUNG-UBL",
      label: "XRechnung 3 (UBL)",
      syntax: "UBL",
      description: "German public-sector CIUS of EN 16931.",
    },
    {
      id: "XRECHNUNG-CII",
      label: "XRechnung 3 (CII)",
      syntax: "CII",
      description: "German public-sector CIUS, CII syntax.",
    },
    {
      id: "CII",
      label: "UN/CEFACT CII D16B",
      syntax: "CII",
      description: "Cross Industry Invoice, EN 16931 compliant.",
    },
  ];
}
