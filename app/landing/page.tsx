"use client";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    // Load landing page scripts after component mounts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<script>
          fetch('/landing.html')
            .then(r => r.text())
            .then(html => {
              document.open();
              document.write(html);
              document.close();
            });
        </script>`
      }}
    />
  );
}