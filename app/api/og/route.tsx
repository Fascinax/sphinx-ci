import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0c1a",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "12px",
              background: "rgba(201,168,76,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(201,168,76,0.3)",
            }}
          >
            <span style={{ fontSize: "32px" }}>👁</span>
          </div>
          <span style={{ fontSize: "48px", color: "#c9a84c", fontWeight: "bold" }}>
            sphinx-ci
          </span>
        </div>
        <div
          style={{
            fontSize: "36px",
            color: "white",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.3,
            marginBottom: "16px",
          }}
        >
          The Sphinx that makes you
        </div>
        <div
          style={{
            fontSize: "36px",
            color: "#c9a84c",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.3,
            marginBottom: "32px",
          }}
        >
          understand your own code
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#b0a8c4",
            textAlign: "center",
            maxWidth: "600px",
          }}
        >
          AI-powered quizzes from your PR diff — so you ship code you truly understand.
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "40px",
            fontSize: "14px",
            color: "#8b85a0",
          }}
        >
          <span>Free</span>
          <span>·</span>
          <span>Open source</span>
          <span>·</span>
          <span>5 min setup</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
