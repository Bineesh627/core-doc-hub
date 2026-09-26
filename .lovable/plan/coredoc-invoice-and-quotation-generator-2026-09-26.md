# CoreDoc invoice and quotation generator

## Build
- Replace the placeholder with a compact CoreDoc home page using the supplied blue document artwork and no other imagery.
- Add dedicated Invoice and Quotation builders with a shared, responsive form-and-preview workspace.
- Support company/customer details, local logo upload, editable document details, dynamic line items, discounts, taxes, notes, terms, and invoice payment fields.
- Keep business details in the user's browser only, with a clear saved-details reset.
- Add client-side A4 PDF export containing only the document, plus native file sharing with a practical fallback.

## Design
- Use a simple white-and-blue business palette, restrained borders, clear typography, and familiar controls.
- Keep desktop editing and preview side-by-side; stack the complete workflow cleanly on mobile.
- Use the uploaded image as CoreDoc's sole supplied visual asset.

## Technical details
- Keep the product frontend-only with no accounts, database, or APIs.
- Centralize totals so preview, export, and sharing use identical calculations.
- Give every public page unique sharing and search metadata.
- Verify invoice and quotation editing, totals, logo upload, PDF download, sharing fallback, and mobile layout.
