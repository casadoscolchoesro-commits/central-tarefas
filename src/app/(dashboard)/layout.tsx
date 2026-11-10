import { Suspense } from "react";
import Tela from "./_tela_layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <Tela>{children}</Tela>
    </Suspense>
  );
}
