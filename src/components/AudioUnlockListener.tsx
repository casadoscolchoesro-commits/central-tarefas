"use client";

import { useEffect } from "react";
import { unlockAudio } from "@/lib/sounds";

export function AudioUnlockListener() {
  useEffect(() => {
    function handleFirstInteraction() {
      unlockAudio();
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    }
    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  return null;
}
