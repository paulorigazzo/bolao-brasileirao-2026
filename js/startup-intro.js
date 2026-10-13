// The intro is decorative: app readiness always takes precedence over playback.
export function createStartupIntro({ container, video, motion }) {
  if (!container || !video) return () => {};
  let finished = false;
  let active = false;
  const fallback = () => {
    active = false;
    container.classList.remove("is-intro-playing");
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
  const onPlaying = () => {
    if (finished || !active || motion?.matches) return;
    container.classList.add("is-intro-playing");
  };
  const onMotion = () => { if (motion.matches) fallback(); };
  const finish = () => {
    if (finished) return;
    finished = true;
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("ended", fallback);
    video.removeEventListener("error", fallback);
    motion?.removeEventListener("change", onMotion);
    fallback();
  };
  video.addEventListener("playing", onPlaying);
  video.addEventListener("ended", fallback);
  video.addEventListener("error", fallback);
  motion?.addEventListener("change", onMotion);
  if (!motion?.matches) {
    active = true;
    video.muted = true;
    video.src = video.dataset.src;
    try { Promise.resolve(video.play()).catch(fallback); }
    catch { fallback(); }
  }
  return finish;
}

const finishIntro = typeof document === "undefined" ? () => {} : createStartupIntro({
  container: document.getElementById("loading"),
  video: document.getElementById("startupIntro"),
  motion: window.matchMedia?.("(prefers-reduced-motion: reduce)"),
});

export function finishStartupIntro() { finishIntro(); }
