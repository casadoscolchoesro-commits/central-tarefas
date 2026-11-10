import { Suspense } from "react";
import Tela from "./_tela";

export default function Page() {
  return (
    <Suspense>
      <Tela />
    </Suspense>
  );
}
