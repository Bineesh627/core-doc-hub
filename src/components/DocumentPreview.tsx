import type { DocumentData } from "@/types-document";
import { calculateItem, calculateTotals, money, paginateDocument } from "@/lib/document-utils";

export function DocumentPreview({ data, watermark }: { data: DocumentData; watermark: boolean }) {
  const totals = calculateTotals(data.items);
  const label = data.kind === "invoice" ? "INVOICE" : "QUOTATION";
  const pages = paginateDocument(data);

  return (
    <div className="flex w-full flex-col items-center gap-8 py-3">
      {pages.map((page) => (
        <div key={page.pageNumber} className="flex w-full max-w-[760px] flex-col items-center">
          {pages.length > 1 && (
            <div className="mb-2 flex w-full items-center justify-between px-1 text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                Sheet {page.pageNumber} of {pages.length}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                A4 Standard
              </span>
            </div>
          )}

          <article
            id={page.isFirstPage ? "document-preview" : `document-preview-${page.pageNumber}`}
            className="relative mx-auto flex aspect-[210/297] w-full flex-col justify-between overflow-hidden rounded-md border border-border/60 bg-document p-[6%] text-[10px] leading-relaxed text-document-foreground shadow-document"
          >
            {/* Upper Content Area */}
            <div className="flex flex-col">
              {page.isFirstPage ? (
                <>
                  {/* Modern Header */}
                  <header className="flex items-start justify-between gap-6 border-b border-document-line pb-5">
                    <div className="flex min-w-0 items-start gap-3.5">
                      {data.company.logo ? (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-document-line bg-white p-1 shadow-xs">
                          <img
                            src={data.company.logo}
                            alt="Company logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-black tracking-tight text-document-foreground">
                          {data.company.name || "Your Company"}
                        </h2>
                        {data.company.address && (
                          <p className="mt-0.5 whitespace-pre-line text-[10px] leading-4 text-document-muted">
                            {data.company.address}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9.5px] text-document-muted">
                          {data.company.phone && <span>Tel: {data.company.phone}</span>}
                          {data.company.email && <span>Email: {data.company.email}</span>}
                          {data.company.website && <span>{data.company.website}</span>}
                        </div>
                        {data.company.gstin && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded bg-document-soft px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                            <span>GSTIN:</span>
                            <span className="font-mono text-document-foreground">{data.company.gstin}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      <span className="inline-block rounded-md bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
                        {label}
                      </span>
                      <span className="mt-1 font-mono text-xs font-bold text-foreground">
                        #{data.number}
                      </span>
                    </div>
                  </header>

                  {/* Client & Document Overview Panels */}
                  <section className="grid grid-cols-2 gap-3.5 py-4">
                    {/* Billed To Card */}
                    <div className="flex flex-col justify-between rounded-lg border border-document-line/80 bg-document-soft/40 p-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Billed To
                        </div>
                        <p className="mt-1 text-xs font-bold text-foreground">
                          {data.customer.name || "Customer name"}
                        </p>
                        {data.customer.company && (
                          <p className="text-[10px] font-medium text-document-muted">{data.customer.company}</p>
                        )}
                        {data.customer.address && (
                          <p className="mt-0.5 whitespace-pre-line text-[9.5px] leading-4 text-document-muted">
                            {data.customer.address}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 space-y-0.5 text-[9px] text-document-muted">
                        {[data.customer.phone && `Tel: ${data.customer.phone}`, data.customer.email && `Email: ${data.customer.email}`]
                          .filter(Boolean)
                          .join(" · ")}
                        {data.customer.gstin && (
                          <div className="font-medium">
                            GSTIN: <span className="font-mono font-semibold text-foreground">{data.customer.gstin}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Document Details Card */}
                    <div className="flex flex-col justify-between rounded-lg border border-document-line/80 bg-document-soft/40 p-3">
                      <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Document Overview
                      </div>
                      <div className="my-auto space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between border-b border-document-line/60 pb-1">
                          <span className="text-document-muted">{label} Date</span>
                          <span className="font-semibold text-foreground">{data.issueDate}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-document-line/60 pb-1">
                          <span className="text-document-muted">
                            {data.kind === "invoice" ? "Due Date" : "Valid Until"}
                          </span>
                          <span className="font-semibold text-foreground">{data.endDate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-document-muted">Currency</span>
                          <span className="font-semibold text-foreground">INR (₹)</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <header className="mb-4 flex items-center justify-between rounded-lg border border-document-line bg-document-soft/40 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {label} #{data.number}
                    </span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                      Sheet {page.pageNumber} of {pages.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-document-muted">
                    Billed to: <strong className="text-foreground">{data.customer.name || "Customer"}</strong>
                  </span>
                </header>
              )}

              {/* Items Table */}
              <div className="w-full overflow-hidden rounded-lg border border-document-line">
                <table className="w-full table-fixed text-left text-[10px]">
                  <thead className="bg-document-soft text-document-muted">
                    <tr className="border-b border-document-line">
                      <th className="w-[42%] px-3 py-2 font-bold uppercase tracking-wider text-primary">
                        Description
                      </th>
                      <th className="w-[12%] px-3 py-2 text-right font-bold uppercase tracking-wider text-primary">
                        Qty
                      </th>
                      <th className="w-[16%] px-3 py-2 text-right font-bold uppercase tracking-wider text-primary">
                        Rate
                      </th>
                      <th className="w-[12%] px-3 py-2 text-right font-bold uppercase tracking-wider text-primary">
                        Tax
                      </th>
                      <th className="w-[18%] px-3 py-2 text-right font-bold uppercase tracking-wider text-primary">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-document-line">
                    {page.items.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-document-soft/20">
                        <td className="break-words px-3 py-2 font-medium">
                          <span className="text-foreground">{item.description || "Item"}</span>
                          <span className="mt-0.5 block text-[9px] font-normal text-document-muted">
                            {item.unit}
                            {item.discount ? ` · ${item.discount}% off` : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">{money(item.rate)}</td>
                        <td className="px-3 py-2 text-right font-mono text-document-muted">{item.tax}%</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                          {money(calculateItem(item).total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Block (Last Page) */}
              {page.showTotals && (
                <section className="ml-auto mt-3.5 w-full max-w-[280px] overflow-hidden rounded-lg border border-document-line bg-document-soft/30 text-[10px]">
                  <div className="space-y-1.5 p-3">
                    <div className="flex justify-between text-document-muted">
                      <span>Subtotal</span>
                      <span className="font-mono font-medium text-foreground">{money(totals.subtotal)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Discount</span>
                        <span className="font-mono font-medium">− {money(totals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-document-muted">
                      <span>Tax Amount</span>
                      <span className="font-mono font-medium text-foreground">{money(totals.tax)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-primary/20 bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs">
                    <span className="uppercase tracking-wider">Total Due</span>
                    <span className="font-mono text-sm font-extrabold">{money(totals.total)}</span>
                  </div>
                </section>
              )}

              {/* Payment Details (Last Page for Invoice) */}
              {page.showPayment && data.kind === "invoice" && Object.values(data.payment).some(Boolean) && (
                <section className="mt-3.5 rounded-lg border border-document-line bg-document-soft/40 p-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Payment & Bank Details
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px] sm:grid-cols-4">
                    {data.payment.bank && (
                      <div className="rounded border border-document-line/60 bg-white p-1.5">
                        <span className="block text-[8px] font-bold uppercase text-document-muted">Bank Name</span>
                        <span className="font-semibold text-foreground">{data.payment.bank}</span>
                      </div>
                    )}
                    {data.payment.account && (
                      <div className="rounded border border-document-line/60 bg-white p-1.5">
                        <span className="block text-[8px] font-bold uppercase text-document-muted">Account No</span>
                        <span className="font-mono font-bold text-foreground">{data.payment.account}</span>
                      </div>
                    )}
                    {data.payment.ifsc && (
                      <div className="rounded border border-document-line/60 bg-white p-1.5">
                        <span className="block text-[8px] font-bold uppercase text-document-muted">IFSC Code</span>
                        <span className="font-mono font-bold text-foreground">{data.payment.ifsc}</span>
                      </div>
                    )}
                    {data.payment.upi && (
                      <div className="rounded border border-document-line/60 bg-white p-1.5">
                        <span className="block text-[8px] font-bold uppercase text-document-muted">UPI ID</span>
                        <span className="font-mono font-bold text-primary">{data.payment.upi}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Notes & Terms (Last Page) */}
              {page.showNotesTerms && (data.notes || data.terms) && (
                <section className="mt-3.5 grid grid-cols-2 gap-3 text-[9.5px] leading-4">
                  {data.notes && (
                    <div className="rounded-lg border border-document-line/80 bg-document-soft/25 p-2.5">
                      <p className="text-[8.5px] font-bold uppercase tracking-wider text-primary">Notes</p>
                      <p className="mt-0.5 whitespace-pre-line text-document-muted">{data.notes}</p>
                    </div>
                  )}
                  {data.terms && (
                    <div className="rounded-lg border border-document-line/80 bg-document-soft/25 p-2.5">
                      <p className="text-[8.5px] font-bold uppercase tracking-wider text-primary">Terms & Conditions</p>
                      <p className="mt-0.5 whitespace-pre-line text-document-muted">{data.terms}</p>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Bottom Footer of each A4 Sheet */}
            <div className="mt-auto flex items-center justify-between border-t border-document-line/70 pt-2.5 text-[9.5px] text-document-muted">
              <span>Thank you for your business.</span>
              {watermark && (
                <div className="flex items-center gap-1 font-semibold text-document-muted">
                  <img src="/coredoc-logo.png" alt="" className="h-3.5 w-3.5 object-contain" />
                  Created with CoreDoc
                </div>
              )}
              <span className="font-medium">
                Page {page.pageNumber} of {pages.length}
              </span>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
