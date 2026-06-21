"use client";

export default function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="text-sm font-bold text-white"
    >
      ← Back
    </button>
  );
}