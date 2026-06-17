// Pure presentational, server-renderable. No barcode library is installed in
// this project, so the barcode is rendered as a CSS bar-pattern decoration
// (purely visual, not scannable) plus the human-readable barcode value in
// large monospace text underneath, which is what staff actually key in or
// match against on a packing slip.

type BarcodeLabelProps = {
  barcode: string | null | undefined;
  productName: string;
  sku: string;
  unitSymbol: string;
};

function BarPattern({ seed }: { seed: string }) {
  // Deterministic pseudo-random bar widths derived from the barcode string,
  // purely decorative — gives the visual texture of a barcode without
  // claiming to be a scannable encoding.
  const bars: number[] = [];
  for (let i = 0; i < 40; i++) {
    const code = seed.charCodeAt(i % seed.length) || 1;
    bars.push(((code * (i + 1)) % 3) + 1);
  }

  return (
    <div className="barcode-bars" aria-hidden="true">
      {bars.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: `${w}px`,
            height: "100%",
            marginRight: "1px",
            background: i % 2 === 0 ? "#000000" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

export function BarcodeLabel({ barcode, productName, sku, unitSymbol }: BarcodeLabelProps) {
  const hasBarcode = !!barcode && barcode.trim().length > 0;

  return (
    <div className="print-label">
      <div className="print-label-name">{productName}</div>

      {hasBarcode ? (
        <>
          <div className="print-label-barcode-pattern">
            <BarPattern seed={barcode!} />
          </div>
          <div className="print-label-barcode-value">{barcode}</div>
        </>
      ) : (
        <div className="print-label-no-barcode">No barcode</div>
      )}

      <div className="print-label-meta">
        <span>SKU: {sku}</span>
        <span>Unit: {unitSymbol}</span>
      </div>
    </div>
  );
}
