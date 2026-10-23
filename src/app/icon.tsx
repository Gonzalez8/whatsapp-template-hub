import { ImageResponse } from "next/og";
import { getBrand } from "@/lib/brand";

// Tab and link-preview icon, in the deployment's brand color. Public, like the preview image.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  const brand = getBrand();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        background: brand.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={brand.onColor} strokeWidth="2.4">
        <path strokeLinejoin="round" d="M4 5h16v11H9l-5 4z" />
      </svg>
    </div>,
    size,
  );
}
