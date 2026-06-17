"use client";

import { useEffect } from "react";

/**
 * Triggers the browser print dialog once the label view has mounted.
 * Rendered as an invisible child of the print page so the parent stays a
 * server component.
 */
export function AutoPrint() {
  useEffect(() => {
    // Give the layout a tick to settle (fonts, barcode bars) before printing.
    const id = window.setTimeout(() => {
      window.print();
    }, 150);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
