import type { Metadata } from "next";
import { DeskApp } from "@/components/desk/DeskApp";

export const metadata: Metadata = {
  title: "Sage Desk",
  robots: { index: false, follow: false },
};

export default function DeskPage() {
  return <DeskApp />;
}
