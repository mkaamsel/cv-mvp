"use client";

import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  message?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("UI crash caught by ErrorBoundary", { error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "40vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              border: "1px solid #fecaca",
              background: "#fff7f7",
              borderRadius: 16,
              padding: 20,
              color: "#1f2937",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {this.props.title || "Something went wrong"}
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
              {this.props.message ||
                "This part of the page failed, but your session is still safe. Please reload and continue."}
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 700,
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}