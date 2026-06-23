const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const htmlPath = "C:/Users/pc/AppData/Local/Temp/claude/c--Users-pc-Desktop-warehouse/dcd607be-91b2-449d-97b6-f9f38404993a/scratchpad/report.html";
  const pdfPath = "C:/Users/pc/AppData/Local/Temp/claude/c--Users-pc-Desktop-warehouse/dcd607be-91b2-449d-97b6-f9f38404993a/scratchpad/Sales-Purchasing-Workflow-Reference.pdf";

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file:///" + htmlPath, { waitUntil: "networkidle" });

  await page.waitForFunction(() => {
    const diagrams = document.querySelectorAll(".mermaid");
    if (diagrams.length === 0) return true;
    return Array.from(diagrams).every((d) => d.querySelector("svg") !== null);
  }, { timeout: 30000 });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "22mm", bottom: "20mm", left: "18mm", right: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div></div>`,
    footerTemplate: `
      <div style="width:100%; font-size:9px; color:#888; text-align:center; font-family: Arial, sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
  });

  await browser.close();
  console.log("PDF written to: " + pdfPath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
