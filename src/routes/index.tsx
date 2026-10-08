import { createFileRoute } from "@tanstack/react-router";
import { LessicoApp } from "@/components/app/LessicoApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LessicoApp />;
}
