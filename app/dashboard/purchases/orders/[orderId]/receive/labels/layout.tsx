// See app/dashboard/products/[productId]/label/layout.tsx for why this
// layout is a pass-through: the parent dashboard layout always nests its
// sidebar/topbar chrome around children, so the print page itself uses a
// `.print-overlay` (components/labels/print-label.css) to visually cover
// that chrome on screen and to hide it entirely via `@media print` rules.
export default function GoodsReceiptLabelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
