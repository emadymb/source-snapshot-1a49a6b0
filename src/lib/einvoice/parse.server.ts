// Extract summary fields from a UBL Invoice or Finvoice XML document.
// Uses regex-based parsing (no DOMParser in Workers) — good enough to
// classify inbound e-invoices for the AP inbox; the raw XML is stored
// verbatim for audit.

export interface ParsedEInvoice {
  format: "UBL" | "FINVOICE" | "CII" | "UNKNOWN";
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate?: string;
  currency: string;
  totalCents: number;
  taxCents: number;
  sellerName: string;
  sellerVatId?: string;
  buyerName?: string;
  buyerVatId?: string;
}

const grab = (xml: string, re: RegExp): string | undefined => {
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
};
const toCents = (v: string | undefined): number => {
  if (!v) return 0;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const dateOnly = (v: string | undefined): string => (v ? v.slice(0, 10) : new Date().toISOString().slice(0, 10));

export function parseEInvoiceXml(xml: string): ParsedEInvoice {
  const isUbl = /<(ubl:)?Invoice[\s>]/i.test(xml) || /xmlns.*ubl:schema:xsd:Invoice-2/.test(xml);
  const isCii = /<rsm:CrossIndustryInvoice/i.test(xml);
  const isFinvoice = /<Finvoice[\s>]/i.test(xml);

  if (isFinvoice) {
    return {
      format: "FINVOICE",
      invoiceNumber: grab(xml, /<InvoiceNumber>([^<]+)<\/InvoiceNumber>/) ?? "N/A",
      issueDate: (() => {
        const raw = grab(xml, /<InvoiceDate[^>]*>(\d{8})<\/InvoiceDate>/);
        return raw ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : new Date().toISOString().slice(0, 10);
      })(),
      currency: grab(xml, /AmountCurrencyIdentifier="([A-Z]{3})"/) ?? "EUR",
      totalCents: toCents(grab(xml, /<InvoiceTotalVatIncludedAmount[^>]*>([^<]+)<\/InvoiceTotalVatIncludedAmount>/)),
      taxCents: toCents(grab(xml, /<InvoiceTotalVatAmount[^>]*>([^<]+)<\/InvoiceTotalVatAmount>/)),
      sellerName: grab(xml, /<SellerOrganisationName>([^<]+)<\/SellerOrganisationName>/) ?? "Unknown",
      sellerVatId: grab(xml, /<SellerOrganisationTaxCode>([^<]+)<\/SellerOrganisationTaxCode>/),
      buyerName: grab(xml, /<BuyerOrganisationName>([^<]+)<\/BuyerOrganisationName>/),
      buyerVatId: grab(xml, /<BuyerOrganisationTaxCode>([^<]+)<\/BuyerOrganisationTaxCode>/),
    };
  }

  if (isUbl) {
    return {
      format: "UBL",
      invoiceNumber: grab(xml, /<cbc:ID>([^<]+)<\/cbc:ID>/) ?? "N/A",
      issueDate: dateOnly(grab(xml, /<cbc:IssueDate>([^<]+)<\/cbc:IssueDate>/)),
      dueDate: grab(xml, /<cbc:DueDate>([^<]+)<\/cbc:DueDate>/),
      currency: grab(xml, /<cbc:DocumentCurrencyCode>([^<]+)<\/cbc:DocumentCurrencyCode>/) ?? "EUR",
      totalCents: toCents(grab(xml, /<cbc:PayableAmount[^>]*>([^<]+)<\/cbc:PayableAmount>/)),
      taxCents: toCents(grab(xml, /<cac:TaxTotal>[\s\S]*?<cbc:TaxAmount[^>]*>([^<]+)<\/cbc:TaxAmount>/)),
      sellerName:
        grab(xml, /<cac:AccountingSupplierParty>[\s\S]*?<cac:PartyName>[\s\S]*?<cbc:Name>([^<]+)<\/cbc:Name>/) ??
        "Unknown",
      sellerVatId: grab(
        xml,
        /<cac:AccountingSupplierParty>[\s\S]*?<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID>([^<]+)<\/cbc:CompanyID>/,
      ),
      buyerName:
        grab(xml, /<cac:AccountingCustomerParty>[\s\S]*?<cac:PartyName>[\s\S]*?<cbc:Name>([^<]+)<\/cbc:Name>/) ??
        undefined,
      buyerVatId: grab(
        xml,
        /<cac:AccountingCustomerParty>[\s\S]*?<cac:PartyTaxScheme>[\s\S]*?<cbc:CompanyID>([^<]+)<\/cbc:CompanyID>/,
      ),
    };
  }

  if (isCii) {
    return {
      format: "CII",
      invoiceNumber: grab(xml, /<ram:ID>([^<]+)<\/ram:ID>/) ?? "N/A",
      issueDate: dateOnly(grab(xml, /<udt:DateTimeString[^>]*>(\d{8})<\/udt:DateTimeString>/)?.replace(
        /^(\d{4})(\d{2})(\d{2})$/,
        "$1-$2-$3",
      )),
      currency: grab(xml, /<ram:InvoiceCurrencyCode>([^<]+)<\/ram:InvoiceCurrencyCode>/) ?? "EUR",
      totalCents: toCents(grab(xml, /<ram:GrandTotalAmount[^>]*>([^<]+)<\/ram:GrandTotalAmount>/)),
      taxCents: toCents(grab(xml, /<ram:TaxTotalAmount[^>]*>([^<]+)<\/ram:TaxTotalAmount>/)),
      sellerName: grab(xml, /<ram:SellerTradeParty>[\s\S]*?<ram:Name>([^<]+)<\/ram:Name>/) ?? "Unknown",
      buyerName: grab(xml, /<ram:BuyerTradeParty>[\s\S]*?<ram:Name>([^<]+)<\/ram:Name>/),
    };
  }

  return {
    format: "UNKNOWN",
    invoiceNumber: "N/A",
    issueDate: new Date().toISOString().slice(0, 10),
    currency: "EUR",
    totalCents: 0,
    taxCents: 0,
    sellerName: "Unknown sender",
  };
}
