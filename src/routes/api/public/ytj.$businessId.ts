import { createFileRoute } from "@tanstack/react-router";

// Public proxy to the Finnish Business Information System (YTJ/PRH avoindata).
// Docs: https://avoindata.prh.fi/ytj_en.html   API: /opendata-ytj-api/v3/companies/{businessId}
// The proxy exists to avoid browser CORS issues and to normalize the response
// shape our UI uses. It also falls back to a small mock catalog for demo IDs
// so the wizard works even if the upstream API is briefly unavailable.

const MOCK: Record<string, unknown> = {
  "2417581-8": {
    businessId: "2417581-8", name: "Kesko Oyj", legalForm: "Public limited company (Oyj)",
    registrationDate: "1940-09-24", status: "Active",
    street: "Työpajankatu 12", postalCode: "00580", city: "Helsinki", country: "FI",
    industry: "Wholesale & retail (G)",
    vatRegistered: true, employerRegistered: true, prepaymentRegistered: true, source: "mock",
  },
  "1927400-1": {
    businessId: "1927400-1", name: "Nokia Oyj", legalForm: "Public limited company (Oyj)",
    registrationDate: "1967-04-05", status: "Active",
    street: "Karakaari 7", postalCode: "02610", city: "Espoo", country: "FI",
    industry: "Manufacturing (C)",
    vatRegistered: true, employerRegistered: true, prepaymentRegistered: true, source: "mock",
  },
  "1234567-8": {
    businessId: "1234567-8", name: "Lindqvist Consulting Oy", legalForm: "Limited liability company (Oy)",
    registrationDate: "2019-06-12", status: "Active",
    street: "Aleksanterinkatu 15", postalCode: "00100", city: "Helsinki", country: "FI",
    industry: "Accounting & bookkeeping (M6920)",
    vatRegistered: true, employerRegistered: true, prepaymentRegistered: false, source: "mock",
  },
};

const YID = /^\d{7}-\d$/;

interface PRHCompany {
  businessId?: { value?: string };
  names?: Array<{ name?: string; type?: string; registrationDate?: string; endDate?: string | null }>;
  companyForms?: Array<{ descriptions?: Array<{ languageCode?: string; description?: string }>; registrationDate?: string; endDate?: string | null }>;
  registrationDate?: string;
  status?: string;
  addresses?: Array<{ street?: string; postCode?: string; postOffices?: Array<{ languageCode?: string; city?: string }>; country?: string; type?: number; endDate?: string | null }>;
  mainBusinessLine?: { descriptions?: Array<{ languageCode?: string; description?: string }>; typeCodeSet?: string; type?: string };
  registeredEntries?: Array<{ type?: string | number; description?: string; descriptions?: Array<{ languageCode?: string; description?: string }>; register?: string | number; authority?: string | number; registrationDate?: string; endDate?: string | null }>;
}

function pickLang<T extends { languageCode?: string }>(arr: T[] | undefined, lang = "3"): T | undefined {
  if (!arr?.length) return undefined;
  return arr.find((x) => x.languageCode === lang) ?? arr.find((x) => x.languageCode === "1") ?? arr[0];
}

function normalize(payload: unknown): Record<string, unknown> | null {
  // v3 returns either a single object or `{ companies: [...] }` depending on endpoint.
  const root = payload as { companies?: PRHCompany[] } | PRHCompany;
  const c: PRHCompany | undefined = Array.isArray((root as { companies?: PRHCompany[] }).companies)
    ? (root as { companies: PRHCompany[] }).companies[0]
    : (root as PRHCompany);
  if (!c) return null;

  const currentName = c.names?.find((n) => !n.endDate) ?? c.names?.[0];
  const currentForm = c.companyForms?.find((f) => !f.endDate) ?? c.companyForms?.[0];
  const form = pickLang(currentForm?.descriptions)?.description ?? "";
  const addr = c.addresses?.find((a) => !a.endDate && a.type === 1) ?? c.addresses?.find((a) => !a.endDate) ?? c.addresses?.[0];
  const city = pickLang(addr?.postOffices)?.city ?? "";
  const industry = pickLang(c.mainBusinessLine?.descriptions)?.description ?? "";

  const hasEntry = (needle: string) =>
    !!c.registeredEntries?.some((e) => !e.endDate && ((typeof e.description === "string" && e.description.toLowerCase().includes(needle))
      || pickLang(e.descriptions)?.description?.toLowerCase().includes(needle)));

  return {
    businessId: c.businessId?.value ?? "",
    name: currentName?.name ?? "",
    legalForm: form,
    registrationDate: c.registrationDate ?? currentName?.registrationDate ?? "",
    status: c.status ?? "Active",
    street: addr?.street ?? "",
    postalCode: addr?.postCode ?? "",
    city,
    country: addr?.country ?? "FI",
    industry,
    vatRegistered: hasEntry("value added tax") || hasEntry("arvonlisä") || hasEntry("vat"),
    employerRegistered: hasEntry("employer") || hasEntry("työnantaja"),
    prepaymentRegistered: hasEntry("prepayment") || hasEntry("ennakkoperint"),
    source: "prh",
  };
}

export const Route = createFileRoute("/api/public/ytj/$businessId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = String(params.businessId ?? "").trim();
        if (!YID.test(id)) {
          return Response.json({ error: "invalid_business_id", hint: "Format is 1234567-8" }, { status: 400 });
        }

        try {
          const url = `https://avoindata.prh.fi/opendata-ytj-api/v3/companies/${encodeURIComponent(id)}`;
          const upstream = await fetch(url, { headers: { accept: "application/json" } });
          if (upstream.ok) {
            const json = await upstream.json();
            const norm = normalize(json);
            if (norm && norm.name) return Response.json(norm);
          }
        } catch {
          // fall through to mock
        }

        const mocked = MOCK[id];
        if (mocked) return Response.json(mocked);
        return Response.json({ error: "not_found" }, { status: 404 });
      },
    },
  },
});
