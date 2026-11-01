import { Suspense } from "react";
import Practice from "@/components/Practice";

export const metadata = { title: "Practice — Folio" };

export default function PracticePage() {
  return (
    <Suspense>
      <Practice />
    </Suspense>
  );
}
