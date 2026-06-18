// This segment renders a print-optimised label view. The parent
// `app/dashboard/layout.tsx` still mounts the dashboard sidebar/topbar
// chrome around `{children}` (Next.js layouts always nest), so this layout
// cannot remove that chrome from the React tree. Instead, the page below
// renders its content inside a `.print-overlay` (see print-label.css) that:
//   - on screen, is `position: fixed; inset: 0` with a very high z-index, so
//     it visually covers the dashboard chrome entirely;
//   - on print, the global print stylesheet hides every other element in
//     the document (`body * { visibility: hidden }`) and reveals only the
//     `.print-overlay` subtree, so the dashboard chrome never reaches paper.
// This layout itself just passes children through with no additional
// wrapper markup, keeping the print overlay's `position: fixed` directly
// effective relative to the viewport.
export default function ProductLabelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
