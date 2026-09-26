export type DocumentKind = "invoice" | "quotation";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  tax: number;
}

export interface PartyDetails {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
}

export interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  logo: string;
}

export interface DocumentData {
  kind: DocumentKind;
  number: string;
  issueDate: string;
  endDate: string;
  company: CompanyDetails;
  customer: PartyDetails;
  items: LineItem[];
  notes: string;
  terms: string;
  payment: { upi: string; bank: string; account: string; ifsc: string };
}
