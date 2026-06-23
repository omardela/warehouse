const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const htmlPath = path.join(__dirname, "sales-purchasing-workflow-report.html");
  const pdfPath = path.join(__dirname, "Sales-Purchasing-Workflow-Report.pdf");

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });

  // Give mermaid time to render all diagrams into SVG before printing.
  await page.waitForFunction(() => {
    const diagrams = document.querySelectorAll(".mermaid");
    return diagrams.length > 0 && Array.from(diagrams).every((d) => d.querySelector("svg"));
  }, { timeout: 15000 });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "16mm", left: "0mm", right: "0mm" },
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="width:100%; font-size:8pt; color:#5b6480; padding:0 18mm; display:flex; justify-content:space-between; font-family: Arial, sans-serif;">
        <span>Sales &amp; Purchasing Workflows — System Reference</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();
  console.log("PDF written to", pdfPath);
})();
