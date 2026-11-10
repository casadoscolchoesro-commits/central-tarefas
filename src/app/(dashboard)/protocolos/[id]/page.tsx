import { Suspense } from "react";
import Tela from "./_tela";

// um arquivo só para todos os números (o endereço real é lido no navegador)
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return (
    <Suspense>
      <Tela />
    </Suspense>
  );
}
