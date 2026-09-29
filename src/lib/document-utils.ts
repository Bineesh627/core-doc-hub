import type { DocumentData, DocumentKind, LineItem } from "@/types-document";

export function calculateItem(item: LineItem) {
  const base = Number(item.quantity || 0) * Number(item.rate || 0);
  const discount = base * (Number(item.discount || 0) / 100);
  const taxable = base - discount;
  const tax = taxable * (Number(item.tax || 0) / 100);
  return { base, discount, taxable, tax, total: taxable + tax };
}

export function calculateTotals(items: LineItem[]) {
  return items.reduce(
    (totals, item) => {
      const amount = calculateItem(item);
      totals.subtotal += amount.base;
      totals.discount += amount.discount;
      totals.tax += amount.tax;
      totals.total += amount.total;
      return totals;
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export function createInitialDocument(kind: DocumentKind): DocumentData {
  return {
    kind,
    number: kind === "invoice" ? "INV-0001" : "QT-0001",
    issueDate: "2026-09-26",
    endDate: kind === "invoice" ? "2026-10-10" : "2026-10-11",
    company: { name: "Your Company", address: "Business address", phone: "", email: "", website: "", gstin: "", logo: "" },
    customer: { name: "Customer name", company: "", address: "Customer address", phone: "", email: "", gstin: "" },
    items: [{ id: "item-1", description: "Professional services", quantity: 1, unit: "Project", rate: 15000, discount: 0, tax: 18 }],
    notes: "Thank you for your business.",
    terms: kind === "invoice" ? "Payment due by the date shown above." : "This quotation is valid until the date shown above.",
    payment: { upi: "", bank: "", account: "", ifsc: "" },
  };
}

export function documentSummary(data: DocumentData) {
  const totals = calculateTotals(data.items);
  const label = data.kind === "invoice" ? "Invoice" : "Quotation";
  return `${label} ${data.number} from ${data.company.name} for ${data.customer.name}. Total: ${money(totals.total)}.`;
}

export interface DocumentPage {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  items: LineItem[];
  startIndex: number;
  showTotals: boolean;
  showNotesTerms: boolean;
  showPayment: boolean;
}

export function paginateDocument(data: DocumentData): DocumentPage[] {
  const items = data.items;
  const getItemWeight = (item: LineItem) => ((item.description || "").length > 55 ? 2 : 1);

  const hasExtraBottom = Boolean(
    data.notes ||
    data.terms ||
    (data.kind === "invoice" && Object.values(data.payment).some(Boolean))
  );

  const singlePageCapacity = hasExtraBottom ? 7 : 8;
  const totalItemWeight = items.reduce((acc, it) => acc + getItemWeight(it), 0);

  if (totalItemWeight <= singlePageCapacity && items.length <= singlePageCapacity) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        items,
        startIndex: 0,
        showTotals: true,
        showNotesTerms: true,
        showPayment: true,
      },
    ];
  }

  const page1Capacity = 10;
  const middlePageCapacity = 13;
  const lastPageCapacity = hasExtraBottom ? 10 : 11;

  const pagesItems: LineItem[][] = [];
  let currentBatch: LineItem[] = [];
  let currentBatchWeight = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const w = getItemWeight(item);
    const isFirst = pagesItems.length === 0;
    const remainingAfterThis = items.length - i;
    const isLastCandidate = remainingAfterThis <= lastPageCapacity;

    const limit = isFirst
      ? (isLastCandidate && currentBatch.length + remainingAfterThis <= singlePageCapacity ? singlePageCapacity : page1Capacity)
      : (isLastCandidate ? lastPageCapacity : middlePageCapacity);

    if (currentBatch.length > 0 && (currentBatch.length >= limit || currentBatchWeight + w > limit + 1)) {
      pagesItems.push(currentBatch);
      currentBatch = [item];
      currentBatchWeight = w;
    } else {
      currentBatch.push(item);
      currentBatchWeight += w;
    }
  }

  if (currentBatch.length > 0) {
    pagesItems.push(currentBatch);
  }

  const totalPages = pagesItems.length;
  let runningIndex = 0;

  return pagesItems.map((pageItems, idx) => {
    const pageNumber = idx + 1;
    const isFirstPage = pageNumber === 1;
    const isLastPage = pageNumber === totalPages;
    const startIndex = runningIndex;
    runningIndex += pageItems.length;

    return {
      pageNumber,
      totalPages,
      isFirstPage,
      isLastPage,
      items: pageItems,
      startIndex,
      showTotals: isLastPage,
      showNotesTerms: isLastPage,
      showPayment: isLastPage,
    };
  });
}
