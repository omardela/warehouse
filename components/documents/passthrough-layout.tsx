// Print routes render inside a fixed-position overlay (PrintPageShell) so the
// parent dashboard layout's sidebar/topbar chrome, while still mounted,
// never reaches the screen or paper (see print-document.css). This layout
// exists only because Next.js requires nested layouts to pass children
// through explicitly — it adds no markup of its own.
export default function PassthroughLayout({ children }: { children: React.ReactNode }) {
  return children;
}
