"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const initialState = null;

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "400px",
        margin: "0 auto",
        padding: "0 16px",
      }}
    >
      {/* Card */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "12px",
          padding: "40px 36px",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#0062ff",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="8"
                width="14"
                height="8"
                rx="1.5"
                fill="white"
                opacity="0.9"
              />
              <rect x="5" y="2" width="8" height="7" rx="1.5" fill="white" />
              <rect
                x="7.5"
                y="4.5"
                width="3"
                height="3"
                rx="0.5"
                fill="#0062ff"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#dbe2fd",
              letterSpacing: "-0.01em",
            }}
          >
            LogiCore
          </span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#dbe2fd",
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
            }}
          >
            Sign in to your account
          </h1>
          <p style={{ fontSize: "13px", color: "#8c90a2", margin: 0 }}>
            Enter your credentials to continue
          </p>
        </div>

        {/* Form */}
        <form action={formAction} noValidate>
          {/* Email field */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#c2c6d9",
                marginBottom: "6px",
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              className="livs-input"
              placeholder="you@company.com"
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#c2c6d9",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
              className="livs-input"
              placeholder="Your password"
            />
          </div>

          {/* Non-enumeration error message */}
          {state?.error && (
            <div
              role="alert"
              style={{
                backgroundColor: "rgba(147, 0, 10, 0.15)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M7.5 1C3.91 1 1 3.91 1 7.5S3.91 14 7.5 14 14 11.09 14 7.5 11.09 1 7.5 1zm.75 9.75h-1.5V9h1.5v1.75zm0-3.25h-1.5V4h1.5v3.5z"
                  fill="#ffb4ab"
                />
              </svg>
              <span
                style={{ fontSize: "13px", color: "#ffb4ab", lineHeight: "1.4" }}
              >
                {state.error}
              </span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            className="livs-btn-primary"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      {/* Scoped styles for LIVS Dark inputs and button */}
      <style>{`
        .livs-input {
          display: block;
          width: 100%;
          background-color: #0d1627;
          border: 1px solid #2d3449;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          color: #dbe2fd;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .livs-input:focus {
          border-color: #0062ff;
          box-shadow: 0 0 0 3px rgba(0, 98, 255, 0.15);
        }
        .livs-input::placeholder {
          color: #4a5168;
        }
        .livs-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .livs-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 40px;
          background-color: #0062ff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s;
          font-family: inherit;
        }
        .livs-btn-primary:hover:not(:disabled) {
          background-color: #004cca;
        }
        .livs-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
