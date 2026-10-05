"use client";
// Inspection Mode portal (Part 11a). Rendered in the browser only: the link token lives in the URL
// fragment and this tab's storage, which the server never sees.
import dynamic from "next/dynamic";

const InspectApp = dynamic(() => import("./InspectApp"), { ssr: false });

export default function InspectPage() {
  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />
      <InspectApp />
    </>
  );
}
