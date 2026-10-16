import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};

export default function LoginPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <AuthCard />
    </div>
  );
}
