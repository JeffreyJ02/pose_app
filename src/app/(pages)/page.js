"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div>
      <h1>Landing Page</h1>
      <button onClick={() => router.push("/workout")}>
        Click me to continue to webcam ui
      </button>
    </div>
  );
}
