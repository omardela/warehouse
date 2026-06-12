"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategoryAction, type CategoryActionState } from "./actions";

export function CategoryInlineForm() {
  const [state, formAction, pending] = useActionState<CategoryActionState, FormData>(createCategoryAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div style={{ marginBottom: "12px" }}>
        <label
          htmlFor="cat-name"
          style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}
        >
          Category Name <span style={{ color: "#ffb4ab" }}>*</span>
        </label>
        <input
          id="cat-name"
          name="name"
          type="text"
          required
          placeholder="e.g. Electronics, Hardware, Office Supplies"
          maxLength={100}
          style={{
            width: "100%",
            background: "#0d1627",
            border: `1px solid ${state && "error" in state ? "#ffb4ab" : "#2d3449"}`,
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "13px",
            color: "#dbe2fd",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#0062ff";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = state && "error" in state ? "#ffb4ab" : "#2d3449";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {state && "error" in state && (
        <p style={{ fontSize: "12px", color: "#ffb4ab", marginBottom: "12px", padding: "8px 12px", borderRadius: "6px", background: "rgba(147,0,10,0.12)", border: "1px solid rgba(147,0,10,0.2)" }}>
          {state.error}
        </p>
      )}

      {state && "success" in state && (
        <p style={{ fontSize: "12px", color: "#62df7d", marginBottom: "12px", padding: "8px 12px", borderRadius: "6px", background: "rgba(98,223,125,0.08)", border: "1px solid rgba(98,223,125,0.15)" }}>
          Category created successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{ padding: "8px 20px", borderRadius: "8px", background: pending ? "#0044b8" : "#0062ff", color: "#fff", fontSize: "13px", fontWeight: 600, border: "none", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.8 : 1 }}
      >
        {pending ? "Creating…" : "Create Category"}
      </button>
    </form>
  );
}
