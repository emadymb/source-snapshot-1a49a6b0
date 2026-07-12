// E-invoice XML generation. SERVER ONLY.
//
// Produces UBL 2.1 (EN 16931 / PEPPOL BIS Billing 3.0) and Finvoice 3.0
// documents from an invoice + its line items. Pure string building — no
// external dependencies, edge-compatible.

export interface XmlParty {
  name: string;
  vatId?: string | null;
  country?: string | null;
  address?: string | null;
}

export interface XmlLine {
  description: string;
  qty: number;
  unitPriceCents: number;
  vatRate: number;
  lineTotalCents: number;
}

export interface XmlInvoice {
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes?: string | null;
  seller: XmlParty;
  buyer: XmlParty;
  lines: XmlLine[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const eur = (cents: number) => (cents / 100).toFixed(2);
const day = (d: Date) => d.toISOString().slice(0, 10);

/** UBL 2.1 Invoice (PEPPOL BIS Billing 3.0 compatible). */
export function buildUbl(inv: XmlInvoice): string {
  const lines = inv.lines
    .map((l, i) => {
      const lineExVat = l.lineTotalCents;
      return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${l.qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${inv.currency}">${eur(lineExVat)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${l.vatRate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${inv.currency}">${eur(l.unitPriceCents)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    })
    .join("\n");

  const party = (tag: string, p: XmlParty) => `  <cac:${tag}>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(p.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(p.address ?? "")}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>${esc(p.country ?? "FI")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(p.vatId ?? "")}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:${tag}>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(inv.number)}</cbc:ID>
  <cbc:IssueDate>${day(inv.issueDate)}</cbc:IssueDate>
  ${inv.dueDate ? `<cbc:DueDate>${day(inv.dueDate)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${inv.currency}</cbc:DocumentCurrencyCode>
  ${inv.notes ? `<cbc:Note>${esc(inv.notes)}</cbc:Note>` : ""}
${party("AccountingSupplierParty", inv.seller)}
${party("AccountingCustomerParty", inv.buyer)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${inv.currency}">${eur(inv.taxCents)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${inv.currency}">${eur(inv.subtotalCents)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${inv.currency}">${eur(inv.subtotalCents)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${inv.currency}">${eur(inv.totalCents)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${inv.currency}">${eur(inv.totalCents)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}

/** Finvoice 3.0 (Finnish standard). Simplified but structurally valid. */
export function buildFinvoice(inv: XmlInvoice): string {
  const rows = inv.lines
    .map(
      (l) => `  <InvoiceRow>
    <ArticleName>${esc(l.description)}</ArticleName>
    <DeliveredQuantity QuantityUnitCode="kpl">${l.qty}</DeliveredQuantity>
    <UnitPriceAmount AmountCurrencyIdentifier="${inv.currency}">${eur(l.unitPriceCents)}</UnitPriceAmount>
    <RowVatRatePercent>${l.vatRate}</RowVatRatePercent>
    <RowAmount AmountCurrencyIdentifier="${inv.currency}">${eur(l.lineTotalCents)}</RowAmount>
  </InvoiceRow>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Finvoice Version="3.0">
  <SellerPartyDetails>
    <SellerOrganisationName>${esc(inv.seller.name)}</SellerOrganisationName>
    <SellerOrganisationTaxCode>${esc(inv.seller.vatId ?? "")}</SellerOrganisationTaxCode>
  </SellerPartyDetails>
  <BuyerPartyDetails>
    <BuyerOrganisationName>${esc(inv.buyer.name)}</BuyerOrganisationName>
    <BuyerOrganisationTaxCode>${esc(inv.buyer.vatId ?? "")}</BuyerOrganisationTaxCode>
  </BuyerPartyDetails>
  <InvoiceDetails>
    <InvoiceTypeCode>INV01</InvoiceTypeCode>
    <InvoiceNumber>${esc(inv.number)}</InvoiceNumber>
    <InvoiceDate Format="CCYYMMDD">${day(inv.issueDate).replace(/-/g, "")}</InvoiceDate>
    <InvoiceTotalVatExcludedAmount AmountCurrencyIdentifier="${inv.currency}">${eur(inv.subtotalCents)}</InvoiceTotalVatExcludedAmount>
    <InvoiceTotalVatAmount AmountCurrencyIdentifier="${inv.currency}">${eur(inv.taxCents)}</InvoiceTotalVatAmount>
    <InvoiceTotalVatIncludedAmount AmountCurrencyIdentifier="${inv.currency}">${eur(inv.totalCents)}</InvoiceTotalVatIncludedAmount>
  </InvoiceDetails>
${rows}
</Finvoice>`;
}

/** Minimal well-formedness validation (balanced tags, non-empty). */
export function validateXml(xml: string): { valid: boolean; error?: string } {
  if (!xml.trim().startsWith("<?xml")) return { valid: false, error: "Missing XML declaration" };
  const opens = (xml.match(/<[a-zA-Z]/g) ?? []).length;
  const closes = (xml.match(/<\/[a-zA-Z]/g) ?? []).length;
  const selfClose = (xml.match(/\/>/g) ?? []).length;
  if (opens - selfClose !== closes) return { valid: false, error: "Unbalanced tags" };
  return { valid: true };
}
