"use client";

import { useEffect, useState } from "react";

export function ShakeableLogo({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    function handleShake() {
      // Reinicia a animação mesmo se ela já estiver rodando (dois alertas
      // seguidos): tira e recoloca a classe no próximo frame.
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
    }
    window.addEventListener("app:shake-logo", handleShake);
    return () => window.removeEventListener("app:shake-logo", handleShake);
  }, []);

  return (
    <img
      src={src}
      alt={alt}
      onAnimationEnd={() => setShaking(false)}
      className={`${className ?? ""} ${shaking ? "shake-logo-active" : ""}`}
    />
  );
}
