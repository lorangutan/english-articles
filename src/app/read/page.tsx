import { Suspense } from "react";
import Library from "@/components/Library";

export const metadata = { title: "Library — Folio" };

export default function ReadPage() {
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}
