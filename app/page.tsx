"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.href = "/trial360.html";
  }, []);
  return null;
}
