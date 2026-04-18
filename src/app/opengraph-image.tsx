import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BasketWise - Australian Grocery Price Comparison";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="52" cy="108" r="8" fill="#ffffff" />
            <circle cx="100" cy="108" r="8" fill="#ffffff" />
            <path
              d="M8 8h20l14.4 72.2a8 8 0 0 0 7.8 6.4h49.6a8 8 0 0 0 7.8-6.4L116 36H36"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: "48px", fontWeight: 700 }}>BasketWise</span>
        </div>
        <p
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            maxWidth: "800px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Compare prices across Coles, Woolworths and Aldi. Build a basket,
          optimise your shop, and spot fake specials.
        </p>
      </div>
    ),
    { ...size },
  );
}
