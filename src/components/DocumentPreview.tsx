import type { DocumentData } from "@/types-document";
import { calculateItem, calculateTotals, money } from "@/lib/document-utils";
import markAsset from "@/assets/coredoc-logo.png.asset.json";

export function DocumentPreview({ data, watermark }: { data: DocumentData; watermark: boolean }) {
  const totals = calculateTotals(data.items);
  const label = data.kind === "invoice" ? "INVOICE" : "QUOTATION";
  return (
    <article id="document-preview" className="relative mx-auto aspect-[210/297] w-full max-w-[760px] overflow-hidden bg-document p-[5%] pb-[10%] text-document-foreground shadow-document">
      <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-7">
        <div className="flex min-w-0 items-start gap-4">
           {data.company.logo && <img src={data.company.logo} alt="Company logo" className="h-16 w-16 shrink-0 object-contain" />}
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-document-foreground">{data.company.name || "Your Company"}</h2>
            <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-document-muted">{data.company.address}</p>
            <p className="text-[11px] leading-5 text-document-muted">{[data.company.phone, data.company.email].filter(Boolean).join(" · ")}</p>
            <p className="text-[11px] leading-5 text-document-muted">{[data.company.website, data.company.gstin && `GSTIN: ${data.company.gstin}`].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h1 className="text-2xl font-bold tracking-wide text-primary">{label}</h1>
          <p className="mt-2 text-xs font-semibold">#{data.number}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 py-7">
        <div>
          <p className="document-label">BILL TO</p>
          <p className="mt-2 text-sm font-bold">{data.customer.name || "Customer name"}</p>
          <p className="text-xs">{data.customer.company}</p>
          <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-document-muted">{data.customer.address}</p>
          <p className="text-[11px] leading-5 text-document-muted">{[data.customer.phone, data.customer.email].filter(Boolean).join(" · ")}</p>
          {data.customer.gstin && <p className="text-[11px] text-document-muted">GSTIN: {data.customer.gstin}</p>}
        </div>
        <dl className="ml-auto grid w-full max-w-[220px] grid-cols-2 gap-y-2 text-xs">
          <dt className="text-document-muted">{data.kind === "invoice" ? "Invoice date" : "Quotation date"}</dt><dd className="text-right font-medium">{data.issueDate}</dd>
          <dt className="text-document-muted">{data.kind === "invoice" ? "Due date" : "Valid until"}</dt><dd className="text-right font-medium">{data.endDate}</dd>
        </dl>
      </section>

      <div className="min-h-[250px]">
        <table className="w-full table-fixed text-left text-[11px]">
          <thead className="bg-document-soft text-document-muted"><tr><th className="w-[40%] p-2.5 font-semibold">DESCRIPTION</th><th className="p-2.5 text-right font-semibold">QTY</th><th className="p-2.5 text-right font-semibold">RATE</th><th className="p-2.5 text-right font-semibold">TAX</th><th className="p-2.5 text-right font-semibold">AMOUNT</th></tr></thead>
          <tbody>{data.items.map((item) => <tr key={item.id} className="border-b border-document-line"><td className="break-words p-2.5 font-medium">{item.description || "Item"}<span className="block text-[10px] font-normal text-document-muted">{item.unit}{item.discount ? ` · ${item.discount}% off` : ""}</span></td><td className="p-2.5 text-right">{item.quantity}</td><td className="p-2.5 text-right">{money(item.rate)}</td><td className="p-2.5 text-right">{item.tax}%</td><td className="p-2.5 text-right font-semibold">{money(calculateItem(item).total)}</td></tr>)}</tbody>
        </table>
      </div>

      <section className="ml-auto mt-5 w-full max-w-[280px] text-xs">
        <div className="summary-row"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
        {totals.discount > 0 && <div className="summary-row"><span>Discount</span><span>− {money(totals.discount)}</span></div>}
        <div className="summary-row"><span>Tax</span><span>{money(totals.tax)}</span></div>
        <div className="mt-2 flex items-center justify-between bg-primary p-3 text-sm font-bold text-primary-foreground"><span>TOTAL</span><span>{money(totals.total)}</span></div>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-8 border-t border-document-line pt-5 text-[10px] leading-4">
        <div>{data.notes && <><p className="document-label">NOTES</p><p className="mt-1 whitespace-pre-line text-document-muted">{data.notes}</p></>}</div>
        <div>{data.terms && <><p className="document-label">TERMS & CONDITIONS</p><p className="mt-1 whitespace-pre-line text-document-muted">{data.terms}</p></>}</div>
      </section>
      {data.kind === "invoice" && Object.values(data.payment).some(Boolean) && <section className="mt-5 text-[10px]"><p className="document-label">PAYMENT DETAILS</p><p className="mt-1 text-document-muted">{[data.payment.upi && `UPI: ${data.payment.upi}`, data.payment.bank, data.payment.account && `A/C: ${data.payment.account}`, data.payment.ifsc && `IFSC: ${data.payment.ifsc}`].filter(Boolean).join(" · ")}</p></section>}
       <footer className="mt-8 text-center text-[10px] font-medium text-document-muted">Thank you for your business.</footer>
       {watermark && <div className="absolute inset-x-0 bottom-[3%] flex items-center justify-center gap-1 text-[10px] font-semibold text-document-muted"><img src={markAsset.url} alt="" className="h-4 w-4 object-contain" />Created with CoreDoc</div>}
    </article>
  );
}
