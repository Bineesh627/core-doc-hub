import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Plus, Save, Share2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/Button";
import { DocumentPreview } from "@/components/DocumentPreview";
import { calculateItem, calculateTotals, createInitialDocument, documentSummary, money, paginateDocument } from "@/lib/document-utils";
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
    const pages = paginateDocument(data);

    let watermarkLogoData = "";
    if (watermark) {
      try {
        const response = await fetch("/coredoc-logo.png");
        if (response.ok) {
          const blob = await response.blob();
          watermarkLogoData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        /* Watermark text still appears if image cannot load */
      }
    }

    const drawTableHeader = (startY: number) => {
      pdf.setFillColor(237, 245, 255);
      pdf.rect(20, startY - 5, 170, 8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(18, 94, 180);
      pdf.text("DESCRIPTION", 23, startY);
      pdf.text("QTY", 108, startY, { align: "right" });
      pdf.text("RATE", 138, startY, { align: "right" });
      pdf.text("TAX", 158, startY, { align: "right" });
      pdf.text("AMOUNT", 187, startY, { align: "right" });
      return startY + 7;
    };

    pages.forEach((page, pageIdx) => {
      if (pageIdx > 0) {
        pdf.addPage();
      }

      let y = 20;

      if (page.isFirstPage) {
        if (data.company.logo) {
          try {
            pdf.addImage(data.company.logo, 20, 13, 18, 18, undefined, "FAST");
          } catch {
            /* Unsupported image format */
          }
        }

        pdf.setTextColor(18, 94, 180);
        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, 190, 22, { align: "right" });

        pdf.setTextColor(20, 31, 48);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(`#${data.number}`, 190, 30, { align: "right" });

        const companyX = data.company.logo ? 43 : 20;
        pdf.setTextColor(20, 31, 48);
        pdf.setFontSize(15);
        pdf.text(data.company.name || "Your Company", companyX, 20);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(91, 105, 123);
        const compAddrLines = pdf.splitTextToSize(data.company.address || "", 70);
        pdf.text(compAddrLines, companyX, 26);
        let compY = 26 + compAddrLines.length * 4.5;

        const contactInfo = [data.company.phone, data.company.email].filter(Boolean).join("  |  ");
        if (contactInfo) {
          pdf.text(contactInfo, companyX, compY);
          compY += 4.5;
        }
        const taxInfo = [data.company.website, data.company.gstin && `GSTIN: ${data.company.gstin}`].filter(Boolean).join("  |  ");
        if (taxInfo) {
          pdf.text(taxInfo, companyX, compY);
          compY += 4.5;
        }

        const headerLineY = Math.max(48, compY + 2);
        pdf.setDrawColor(18, 94, 180);
        pdf.setLineWidth(0.7);
        pdf.line(20, headerLineY, 190, headerLineY);

        const panelsY = headerLineY + 6;
        const custAddr = data.customer.address ? pdf.splitTextToSize(data.customer.address, 74) : [];
        let custLinesCount = 2 + (data.customer.company ? 1 : 0) + custAddr.length + (data.customer.phone || data.customer.email ? 1 : 0) + (data.customer.gstin ? 1 : 0);
        const panelHeight = Math.max(34, custLinesCount * 4.5 + 8);

        // Billed To Card Panel
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(20, panelsY, 82, panelHeight, 2, 2, "FD");

        pdf.setTextColor(18, 94, 180);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.text("BILLED TO", 24, panelsY + 6);

        pdf.setTextColor(20, 31, 48);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(data.customer.name || "Customer", 24, panelsY + 12);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(91, 105, 123);
        let cY = panelsY + 17;
        if (data.customer.company) {
          pdf.text(data.customer.company, 24, cY);
          cY += 4.5;
        }
        if (custAddr.length > 0) {
          pdf.text(custAddr, 24, cY);
          cY += custAddr.length * 4;
        }
        const custContact = [data.customer.phone, data.customer.email].filter(Boolean).join("  ·  ");
        if (custContact) {
          pdf.text(custContact, 24, cY);
          cY += 4.5;
        }
        if (data.customer.gstin) {
          pdf.text(`GSTIN: ${data.customer.gstin}`, 24, cY);
          cY += 4.5;
        }

        // Document Overview Card Panel
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(108, panelsY, 82, panelHeight, 2, 2, "FD");

        pdf.setTextColor(18, 94, 180);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.text("DOCUMENT OVERVIEW", 112, panelsY + 6);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(91, 105, 123);
        pdf.text(`${label} Date`, 112, panelsY + 14);
        pdf.setTextColor(20, 31, 48);
        pdf.setFont("helvetica", "bold");
        pdf.text(data.issueDate, 186, panelsY + 14, { align: "right" });

        pdf.setDrawColor(235, 240, 246);
        pdf.line(112, panelsY + 17, 186, panelsY + 17);

        const endLabel = kind === "invoice" ? "Payment Due" : "Valid Until";
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(91, 105, 123);
        pdf.text(endLabel, 112, panelsY + 23);
        pdf.setTextColor(20, 31, 48);
        pdf.setFont("helvetica", "bold");
        pdf.text(data.endDate, 186, panelsY + 23, { align: "right" });

        pdf.line(112, panelsY + 26, 186, panelsY + 26);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(91, 105, 123);
        pdf.text("Currency", 112, panelsY + 31);
        pdf.setTextColor(20, 31, 48);
        pdf.setFont("helvetica", "bold");
        pdf.text("INR (Rs.)", 186, panelsY + 31, { align: "right" });

        y = panelsY + panelHeight + 6;
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(20, 31, 48);
        pdf.text(`${label} #${data.number}`, 20, 18);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(130, 140, 155);
        pdf.text(`— Sheet ${page.pageNumber}`, 55, 18);
        pdf.text(data.customer.name || "Customer", 190, 18, { align: "right" });

        pdf.setDrawColor(220, 228, 238);
        pdf.setLineWidth(0.4);
        pdf.line(20, 22, 190, 22);

        y = 28;
      }

      y = drawTableHeader(y);

      page.items.forEach((item) => {
        const descText = item.description || "Item";
        const descLines = pdf.splitTextToSize(descText, 78);
        const rowHeight = Math.max(8, descLines.length * 4.8) + 3;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(20, 31, 48);
        pdf.text(descLines, 23, y);
        pdf.text(String(item.quantity), 108, y, { align: "right" });
        pdf.text(money(item.rate).replace("₹", "Rs. "), 138, y, { align: "right" });
        pdf.text(`${item.tax}%`, 158, y, { align: "right" });
        pdf.text(money(calculateItem(item).total).replace("₹", "Rs. "), 187, y, { align: "right" });

        pdf.setDrawColor(228, 234, 242);
        pdf.setLineWidth(0.3);
        pdf.line(20, y + rowHeight - 4, 190, y + rowHeight - 4);

        y += rowHeight;
      });

      if (page.showTotals) {
        y = page.isFirstPage ? Math.max(y + 6, 135) : y + 6;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(91, 105, 123);
        pdf.text("Subtotal", 145, y);
        pdf.text(money(totals.subtotal).replace("₹", "Rs. "), 187, y, { align: "right" });

        if (totals.discount > 0) {
          y += 6;
          pdf.text("Discount", 145, y);
          pdf.text(`- ${money(totals.discount).replace("₹", "Rs. ")}`, 187, y, { align: "right" });
        }

        y += 6;
        pdf.text("Tax", 145, y);
        pdf.text(money(totals.tax).replace("₹", "Rs. "), 187, y, { align: "right" });

        y += 9;
        pdf.setFillColor(18, 94, 180);
        pdf.rect(138, y - 6, 52, 9.5, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text("TOTAL", 143, y);
        pdf.text(money(totals.total).replace("₹", "Rs. "), 187, y, { align: "right" });
      }

      if (page.showPayment && kind === "invoice" && Object.values(data.payment).some(Boolean)) {
        y += 4;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(20, y, 170, 16, 2, 2, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(18, 94, 180);
        pdf.text("PAYMENT & BANK DETAILS", 24, y + 5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(91, 105, 123);
        const payParts = [
          data.payment.bank && `Bank: ${data.payment.bank}`,
          data.payment.account && `A/C: ${data.payment.account}`,
          data.payment.ifsc && `IFSC: ${data.payment.ifsc}`,
          data.payment.upi && `UPI: ${data.payment.upi}`,
        ].filter(Boolean).join("    |    ");
        pdf.text(payParts, 24, y + 11);
        y += 20;
      }

      if (page.showNotesTerms && (data.notes || data.terms)) {
        const boxY = y;
        const noteLines = data.notes ? pdf.splitTextToSize(data.notes, 74) : [];
        const termLines = data.terms ? pdf.splitTextToSize(data.terms, 74) : [];
        const notesH = Math.max(16, Math.max(noteLines.length, termLines.length) * 4 + 8);

        if (data.notes) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(20, boxY, 82, notesH, 2, 2, "FD");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(18, 94, 180);
          pdf.text("NOTES", 24, boxY + 5);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(91, 105, 123);
          pdf.text(noteLines, 24, boxY + 10);
        }

        if (data.terms) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(108, boxY, 82, notesH, 2, 2, "FD");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(18, 94, 180);
          pdf.text("TERMS & CONDITIONS", 112, boxY + 5);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(91, 105, 123);
          pdf.text(termLines, 112, boxY + 10);
        }

        y += notesH + 4;
      }
    });

    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);

      pdf.setDrawColor(225, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(20, 276, 190, 276);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(130, 140, 155);
      pdf.text("Thank you for your business.", 20, 283);
      pdf.text(`Page ${p} of ${totalPages}`, 190, 283, { align: "right" });

      if (watermark) {
        if (watermarkLogoData) {
          try {
            pdf.addImage(watermarkLogoData, "PNG", 84, 279.5, 4.5, 4.5);
          } catch {
            /* ignore logo draw error */
          }
        }
        pdf.setTextColor(110, 120, 135);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.text("Created with CoreDoc", watermarkLogoData ? 90 : 85, 283);
      }
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
        <aside className="flex max-h-[calc(100vh-2rem)] min-w-0 flex-col xl:sticky xl:top-4"><div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary" />Live preview{data.items.length > 8 && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{data.items.length} items</span>}</div><label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"><input type="checkbox" role="switch" checked={watermark} onChange={(event) => setWatermark(event.target.checked)} className="h-4 w-4 accent-primary" />CoreDoc watermark</label></div><div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2 shadow-inner"><DocumentPreview data={data} watermark={watermark} /></div><div className="mt-4 grid shrink-0 grid-cols-2 gap-3"><Button variant="secondary" onClick={share}><Share2 className="h-4 w-4" />Share</Button><Button onClick={download}><Download className="h-4 w-4" />Download PDF</Button></div></aside>
      </div>
    </div>
    <footer className="border-t border-border bg-background px-4 py-6 text-center text-xs text-muted-foreground">Created by <span role="img" aria-label="love">❤️</span> <a href="https://coreprotechno.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">CorePro Techno LLP</a></footer>
  </main>;
}

function FormSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-md border border-border bg-card p-4 shadow-panel sm:p-5"><div className="mb-4 flex min-h-8 items-center justify-between gap-3"><h2 className="text-sm font-bold text-foreground">{title}</h2>{action}</div>{children}</section>;
}
