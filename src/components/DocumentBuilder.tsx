import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Plus, Save, Share2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/Button";
import { DocumentPreview } from "@/components/DocumentPreview";
import { calculateItem, calculateTotals, createInitialDocument, documentSummary, money } from "@/lib/document-utils";
import type { CompanyDetails, DocumentData, DocumentKind, LineItem, PartyDetails } from "@/types-document";

const inputClass = "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const taxOptions = [0, 5, 12, 18, 28];

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-xs font-semibold text-foreground">{label}<input className={inputClass} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function DocumentBuilder({ kind }: { kind: DocumentKind }) {
  const [data, setData] = useState<DocumentData>(() => createInitialDocument(kind));
  const [notice, setNotice] = useState("");
  const [watermark, setWatermark] = useState(true);
  const label = kind === "invoice" ? "Invoice" : "Quotation";

  useEffect(() => {
    const saved = window.localStorage.getItem("coredoc-company");
    if (!saved) return;
    try { setData((current) => ({ ...current, company: { ...current.company, ...JSON.parse(saved), logo: "" } })); } catch { /* ignore invalid local data */ }
  }, []);

  const setCompany = (key: keyof CompanyDetails, value: string) => setData((current) => ({ ...current, company: { ...current.company, [key]: value } }));
  const setCustomer = (key: keyof PartyDetails, value: string) => setData((current) => ({ ...current, customer: { ...current.customer, [key]: value } }));
  const setItem = (id: string, key: keyof LineItem, value: string) => setData((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: key === "description" || key === "unit" ? value : Number(value) } : item) }));
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2600); };

  const saveCompany = () => {
    const { logo, ...details } = data.company;
    window.localStorage.setItem("coredoc-company", JSON.stringify(details));
    flash("Business details saved on this device.");
  };

  const clearCompany = () => {
    window.localStorage.removeItem("coredoc-company");
    setData((current) => ({ ...current, company: createInitialDocument(kind).company }));
    flash("Saved business details cleared.");
  };

  const makePdf = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const totals = calculateTotals(data.items);
    const title = label.toUpperCase();
    if (data.company.logo) {
      try { pdf.addImage(data.company.logo, 20, 13, 18, 18, undefined, "FAST"); } catch { /* Unsupported image formats are omitted from PDF only. */ }
    }
    pdf.setTextColor(18, 94, 180); pdf.setFontSize(25); pdf.setFont("helvetica", "bold"); pdf.text(title, 190, 22, { align: "right" });
    const companyX = data.company.logo ? 43 : 20;
    pdf.setTextColor(20, 31, 48); pdf.setFontSize(16); pdf.text(data.company.name || "Your Company", companyX, 22);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(91, 105, 123);
    pdf.text(pdf.splitTextToSize(data.company.address || "", 70), companyX, 29); pdf.text([data.company.phone, data.company.email].filter(Boolean).join(" | "), companyX, 42);
    pdf.setDrawColor(18, 94, 180); pdf.setLineWidth(0.7); pdf.line(20, 50, 190, 50);
    pdf.setTextColor(20, 31, 48); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text("BILL TO", 20, 62); pdf.text(`#${data.number}`, 190, 31, { align: "right" });
    pdf.setFont("helvetica", "normal"); pdf.text(data.customer.name || "Customer", 20, 69); pdf.setTextColor(91, 105, 123); pdf.text(data.customer.company || "", 20, 75); pdf.text(pdf.splitTextToSize(data.customer.address || "", 75), 20, 81);
    pdf.setTextColor(20, 31, 48); pdf.text(`${label} date: ${data.issueDate}`, 190, 62, { align: "right" }); pdf.text(`${kind === "invoice" ? "Due date" : "Valid until"}: ${data.endDate}`, 190, 69, { align: "right" });
    let y = 100; pdf.setFillColor(237, 245, 255); pdf.rect(20, y - 6, 170, 9, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text("DESCRIPTION", 23, y); pdf.text("QTY", 108, y, { align: "right" }); pdf.text("RATE", 138, y, { align: "right" }); pdf.text("TAX", 157, y, { align: "right" }); pdf.text("AMOUNT", 187, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    data.items.forEach((item) => { y += 10; pdf.text((item.description || "Item").slice(0, 44), 23, y); pdf.text(String(item.quantity), 108, y, { align: "right" }); pdf.text(money(item.rate).replace("₹", "Rs. "), 138, y, { align: "right" }); pdf.text(`${item.tax}%`, 157, y, { align: "right" }); pdf.text(money(calculateItem(item).total).replace("₹", "Rs. "), 187, y, { align: "right" }); pdf.setDrawColor(225); pdf.line(20, y + 4, 190, y + 4); });
    y = Math.max(y + 18, 145); pdf.text("Subtotal", 145, y); pdf.text(money(totals.subtotal).replace("₹", "Rs. "), 187, y, { align: "right" }); y += 7; pdf.text("Discount", 145, y); pdf.text(`- ${money(totals.discount).replace("₹", "Rs. ")}`, 187, y, { align: "right" }); y += 7; pdf.text("Tax", 145, y); pdf.text(money(totals.tax).replace("₹", "Rs. "), 187, y, { align: "right" }); y += 10; pdf.setFillColor(18, 94, 180); pdf.rect(140, y - 6, 50, 10, "F"); pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.text("TOTAL", 144, y); pdf.text(money(totals.total).replace("₹", "Rs. "), 187, y, { align: "right" });
    pdf.setTextColor(20, 31, 48); pdf.setFontSize(8); y += 25; if (data.notes) { pdf.setFont("helvetica", "bold"); pdf.text("NOTES", 20, y); pdf.setFont("helvetica", "normal"); pdf.setTextColor(91, 105, 123); pdf.text(pdf.splitTextToSize(data.notes, 75), 20, y + 6); }
    if (data.terms) { pdf.setTextColor(20, 31, 48); pdf.setFont("helvetica", "bold"); pdf.text("TERMS & CONDITIONS", 110, y); pdf.setFont("helvetica", "normal"); pdf.setTextColor(91, 105, 123); pdf.text(pdf.splitTextToSize(data.terms, 80), 110, y + 6); }
    if (watermark) {
      try {
        const response = await fetch("/coredoc-logo.png");
        if (response.ok) {
          const blob = await response.blob();
          const logoData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          pdf.addImage(logoData, "PNG", 77, 282, 5, 5);
        }
      } catch { /* Text watermark still appears if the image cannot load. */ }
      pdf.setTextColor(91, 105, 123); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text("Created with CoreDoc", 85, 286);
    }
    return pdf;
  };

  const download = async () => { const pdf = await makePdf(); pdf.save(`${label}-${data.number}.pdf`); flash(`${label} downloaded.`); };
  const share = async () => {
    const pdf = await makePdf(); const file = new File([pdf.output("blob")], `${label}-${data.number}.pdf`, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ title: `${label} ${data.number}`, text: documentSummary(data), files: [file] }); return; }
    await navigator.clipboard.writeText(documentSummary(data)); flash("Document summary copied. Download the PDF to share it.");
  };

  return <main className="min-h-screen bg-workspace">
    <header className="border-b border-border bg-background"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"><Link to="/" className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /><img src="/coredoc-logo.png" alt="CoreDoc" className="h-8 w-8 object-contain" />CoreDoc</Link><div className="flex w-full items-center gap-2 sm:w-auto"><Button variant="secondary" className="flex-1 sm:flex-none" onClick={share}><Share2 className="h-4 w-4" />Share</Button><Button className="flex-1 sm:flex-none" onClick={download}><Download className="h-4 w-4" />Download PDF</Button></div></div></header>
    {notice && <div role="status" className="fixed right-4 top-20 z-20 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">{notice}</div>}
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-widest text-primary">Document builder</p><h1 className="mt-1 text-2xl font-bold text-foreground">Create {label}</h1><p className="mt-1 text-sm text-muted-foreground">Changes appear in the preview instantly.</p></div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(520px,0.9fr)_minmax(580px,1.1fr)]">
        <div className="space-y-4">
          <FormSection title="Document details"><div className="grid gap-4 sm:grid-cols-3"><Field label={`${label} number`} value={data.number} onChange={(value) => setData((c) => ({ ...c, number: value }))} /><Field label={`${label} date`} type="date" value={data.issueDate} onChange={(value) => setData((c) => ({ ...c, issueDate: value }))} /><Field label={kind === "invoice" ? "Due date" : "Valid until"} type="date" value={data.endDate} onChange={(value) => setData((c) => ({ ...c, endDate: value }))} /></div></FormSection>
          <FormSection title="Your business" action={<div className="flex gap-1"><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={saveCompany}><Save className="h-3.5 w-3.5" />Save</Button><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={clearCompany}>Clear saved</Button></div>}><div className="grid gap-4 sm:grid-cols-2"><Field label="Company name" value={data.company.name} onChange={(v) => setCompany("name", v)} /><Field label="GSTIN" value={data.company.gstin} onChange={(v) => setCompany("gstin", v)} /><Field label="Phone" value={data.company.phone} onChange={(v) => setCompany("phone", v)} /><Field label="Email" type="email" value={data.company.email} onChange={(v) => setCompany("email", v)} /><Field label="Website" value={data.company.website} onChange={(v) => setCompany("website", v)} /><label className="block text-xs font-semibold">Logo (optional)<span className="mt-1.5 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm font-normal text-muted-foreground hover:border-primary"><Upload className="h-4 w-4" />Choose image<input className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setCompany("logo", String(reader.result || "")); reader.readAsDataURL(file); }} /></span></label><label className="sm:col-span-2 text-xs font-semibold">Address<textarea className={inputClass} rows={2} value={data.company.address} onChange={(e) => setCompany("address", e.target.value)} /></label></div></FormSection>
          <FormSection title="Customer"><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer name" value={data.customer.name} onChange={(v) => setCustomer("name", v)} /><Field label="Company name" value={data.customer.company} onChange={(v) => setCustomer("company", v)} /><Field label="Phone" value={data.customer.phone} onChange={(v) => setCustomer("phone", v)} /><Field label="Email" type="email" value={data.customer.email} onChange={(v) => setCustomer("email", v)} /><Field label="GSTIN" value={data.customer.gstin} onChange={(v) => setCustomer("gstin", v)} /><label className="sm:col-span-2 text-xs font-semibold">Address<textarea className={inputClass} rows={2} value={data.customer.address} onChange={(e) => setCustomer("address", e.target.value)} /></label></div></FormSection>
          <FormSection title="Items" action={<Button variant="secondary" className="min-h-8 px-3 text-xs" onClick={() => setData((c) => ({ ...c, items: [...c.items, { id: `item-${Date.now()}`, description: "", quantity: 1, unit: "Unit", rate: 0, discount: 0, tax: 0 }] }))}><Plus className="h-3.5 w-3.5" />Add item</Button>}>
            <div className="space-y-3">{data.items.map((item, index) => <div key={item.id} className="rounded-md border border-border bg-muted/35 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-muted-foreground">ITEM {index + 1}</span><Button aria-label={`Remove item ${index + 1}`} title="Remove item" variant="ghost" className="h-8 min-h-8 px-2" disabled={data.items.length === 1} onClick={() => setData((c) => ({ ...c, items: c.items.filter((entry) => entry.id !== item.id) }))}><Trash2 className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-6"><div className="col-span-2 sm:col-span-3"><Field label="Description" value={item.description} onChange={(v) => setItem(item.id, "description", v)} /></div><Field label="Quantity" type="number" value={item.quantity} onChange={(v) => setItem(item.id, "quantity", v)} /><Field label="Unit" value={item.unit} onChange={(v) => setItem(item.id, "unit", v)} /><Field label="Rate" type="number" value={item.rate} onChange={(v) => setItem(item.id, "rate", v)} /><Field label="Discount %" type="number" value={item.discount} onChange={(v) => setItem(item.id, "discount", v)} /><label className="block text-xs font-semibold">Tax %<select className={inputClass} value={taxOptions.includes(item.tax) ? item.tax : "custom"} onChange={(e) => setItem(item.id, "tax", e.target.value === "custom" ? "0" : e.target.value)}>{taxOptions.map((tax) => <option key={tax} value={tax}>{tax === 0 ? "No tax" : `${tax}%`}</option>)}<option value="custom">Custom</option></select></label><Field label="Custom tax %" type="number" value={item.tax} onChange={(v) => setItem(item.id, "tax", v)} /><div className="col-span-2 flex items-end justify-end text-sm font-bold sm:col-span-2">{money(calculateItem(item).total)}</div></div></div>)}</div>
          </FormSection>
          <FormSection title="Notes & terms"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Notes<textarea className={inputClass} rows={3} value={data.notes} onChange={(e) => setData((c) => ({ ...c, notes: e.target.value }))} /></label><label className="text-xs font-semibold">Terms & conditions<textarea className={inputClass} rows={3} value={data.terms} onChange={(e) => setData((c) => ({ ...c, terms: e.target.value }))} /></label></div></FormSection>
          {kind === "invoice" && <FormSection title="Payment details (optional)"><div className="grid gap-4 sm:grid-cols-2"><Field label="UPI ID" value={data.payment.upi} onChange={(v) => setData((c) => ({ ...c, payment: { ...c.payment, upi: v } }))} /><Field label="Bank name" value={data.payment.bank} onChange={(v) => setData((c) => ({ ...c, payment: { ...c.payment, bank: v } }))} /><Field label="Account number" value={data.payment.account} onChange={(v) => setData((c) => ({ ...c, payment: { ...c.payment, account: v } }))} /><Field label="IFSC" value={data.payment.ifsc} onChange={(v) => setData((c) => ({ ...c, payment: { ...c.payment, ifsc: v } }))} /></div></FormSection>}
        </div>
        <aside className="min-w-0 xl:sticky xl:top-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary" />Live preview</div><label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"><input type="checkbox" role="switch" checked={watermark} onChange={(event) => setWatermark(event.target.checked)} className="h-4 w-4 accent-primary" />CoreDoc watermark</label></div><div className="overflow-x-auto"><DocumentPreview data={data} watermark={watermark} /></div><div className="mt-4 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={share}><Share2 className="h-4 w-4" />Share</Button><Button onClick={download}><Download className="h-4 w-4" />Download PDF</Button></div></aside>
      </div>
    </div>
    <footer className="border-t border-border bg-background px-4 py-6 text-center text-xs text-muted-foreground">Created by <span role="img" aria-label="love">❤️</span> <a href="https://coreprotechno.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">CorePro Techno LLP</a></footer>
  </main>;
}

function FormSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-md border border-border bg-card p-4 shadow-panel sm:p-5"><div className="mb-4 flex min-h-8 items-center justify-between gap-3"><h2 className="text-sm font-bold text-foreground">{title}</h2>{action}</div>{children}</section>;
}
