import Link from "next/link";
import { IconAlertTriangle } from "@/lib/protocol-icons";

export function PasswordChangeWarning() {
  return (
    <div className="flex items-center gap-2 border-b border-(--color-red-100) bg-(--color-red-50) px-4 py-2 text-sm text-(--color-red-700)">
      <IconAlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Você já usou bastante essa senha temporária — troque por uma senha
        sua em{" "}
        <Link href="/perfil" className="font-medium underline hover:no-underline">
          Meu perfil
        </Link>
        .
      </span>
    </div>
  );
}
