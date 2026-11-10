// Sons de notificação. A maioria dos navegadores bloqueia áudio
// programático (tocado sem clique nenhum do usuário) até que a pessoa
// interaja com a página pelo menos uma vez — e criar um `new Audio()`
// diferente a cada notificação faz esse bloqueio valer de novo toda vez,
// mesmo depois de "desbloqueado". Por isso: (1) reaproveitamos os mesmos
// elementos de áudio entre chamadas, e (2) "desbloqueamos" os dois assim
// que a pessoa clica ou aperta uma tecla pela primeira vez na sessão —
// ver AudioUnlockListener, montado uma vez no layout do painel.

const audioCache: Record<string, HTMLAudioElement> = {};

function getAudioEl(src: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioCache[src]) {
    const el = new Audio(src);
    el.preload = "auto";
    audioCache[src] = el;
  }
  return audioCache[src];
}

function playFile(src: string) {
  const el = getAudioEl(src);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = 0.8;
    el.play().catch((err) => {
      console.warn(
        `[som] não consegui tocar ${src} — provavelmente o navegador bloqueou autoplay porque ainda não houve nenhum clique/tecla nesta sessão.`,
        err
      );
    });
  } catch (err) {
    console.warn(`[som] erro inesperado ao tocar ${src}`, err);
  }
}

function shakeLogo() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("app:shake-logo"));
}

/** Som de "nova tarefa" para os setores. */
export function playMessageSound() {
  playFile("/cancelamentos/sounds/new-task.mp3");
  shakeLogo();
}

/** Som de "cutucada" (nudge/alerta) enviado por um gerente ou administrador. */
export function playNudgeSound() {
  playFile("/cancelamentos/sounds/nudge.mp3");
  shakeLogo();
}

let unlocked = false;

/** Chamado na primeira interação do usuário na sessão (clique ou tecla).
 * Toca e pausa cada som instantaneamente, sem volume, só pra "avisar" ao
 * navegador que esses elementos de áudio já têm autorização — assim,
 * quando uma notificação chegar de verdade (via realtime, sem clique
 * nenhum), o navegador já deixa tocar. */
export function unlockAudio() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  for (const src of ["/cancelamentos/sounds/nudge.mp3", "/cancelamentos/sounds/new-task.mp3"]) {
    const el = getAudioEl(src);
    if (!el) continue;
    const originalVolume = el.volume;
    el.volume = 0;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = originalVolume;
      })
      .catch(() => {
        el.volume = originalVolume;
      });
  }
}
