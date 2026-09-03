# Architecture survey report

Use this scaffold to render the scout's candidates as an offline HTML report.
The generator must replace the placeholders and resolve `vendor/tailwind.min.js`
and `vendor/mermaid.min.js` to absolute repository paths before writing to the
OS temporary directory.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architecture survey</title>
  <script src="__VENDOR_TAILWIND_ABSOLUTE_PATH__"></script>
  <script src="__VENDOR_MERMAID_ABSOLUTE_PATH__"></script>
</head>
<body class="bg-slate-950 text-slate-100">
  <main class="mx-auto max-w-6xl space-y-8 p-8">
    <header><h1 class="text-3xl font-bold">Architecture deepening candidates</h1>
      <p class="text-slate-400">Generated from a read-only architecture scout.</p></header>

    <section id="top-recommendation" class="rounded-lg border border-amber-400 p-6">
      <h2 class="text-xl font-semibold">Top recommendation</h2>
      <!-- Replace with the strongest candidate; do not imply it was selected. -->
    </section>

    <section id="candidates" class="grid gap-6 md:grid-cols-2">
      <!-- Repeat this card for each candidate. Include Files, Problem,
           Solution, and Benefits explicitly. Benefits should describe
           locality and leverage. -->
      <article class="candidate-card rounded-lg border border-slate-700 p-6">
        <div class="flex justify-between"><h2><!-- candidate title --></h2>
          <span class="strength-badge"><!-- Strong | Worth exploring | Speculative --></span></div>
        <h3>Files</h3><p><!-- paths and symbols --></p>
        <h3>Problem</h3><p><!-- observed weakness --></p>
        <h3>Solution</h3><p><!-- smallest safe deepening --></p>
        <h3>Benefits</h3><p><!-- locality and leverage --></p>
        <div class="mermaid"><!-- before/after diagram --></div>
      </article>
    </section>

    <aside id="adr-conflict" class="hidden rounded-lg border border-red-400 p-6">
      <h2>ADR conflict</h2>
      <p><!-- cite the conflicting docs/adr/*.md and ask the user to resolve it --></p>
    </aside>
  </main>
  <script>mermaid.initialize({ startOnLoad: true, theme: "dark" });</script>
</body>
</html>
```

Keep the report factual: distinguish observed structure from proposed change,
show before/after boundaries, and preserve all candidate strength labels.
