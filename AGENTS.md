<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep CoreDoc frontend-only; all document data, calculations, PDF generation, and sharing stay in the browser because the product promises no accounts or backend.
- Use one shared document model and calculation utility for invoice and quotation builders so preview and export totals cannot diverge.
- Keep document branding optional and synchronized between the live preview and browser-generated PDF so exported files match what users see.
- Vercel deploys must use Nitro's vercel preset (vite.config.ts sets `nitro: { preset: "vercel" }` when VERCEL=1) and have NO vercel.json — vercel.json's outputDirectory "dist/client" breaks the build because Nitro emits .vercel/output natively.
- The Lovable build config wraps Nitro's `compiled` hook and drops the preset's version, so vite.config.ts re-runs the vercel preset's compiled hook itself (`runVercelPresetCompiled`) — without it, .vercel/output lacks config.json and the function .vc-config.json, which breaks Vercel deploys.
