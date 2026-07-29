import { sound, mountMuteButton } from "./sound.js";

const stage = document.getElementById("stage");
const spotlight = document.getElementById("spotlight");
const silhouette = document.getElementById("silhouette");
const startBtn = document.getElementById("start-btn");

mountMuteButton(document.body);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) document.body.classList.add("reduce-motion");

function moveSpotlight(x, y) {
  const rect = stage.getBoundingClientRect();
  const mx = ((x - rect.left) / rect.width) * 100;
  const my = ((y - rect.top) / rect.height) * 100;
  stage.style.setProperty("--mx", `${mx}%`);
  stage.style.setProperty("--my", `${my}%`);
}

stage.addEventListener("pointermove", (e) => moveSpotlight(e.clientX, e.clientY));
stage.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches[0]) moveSpotlight(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: true }
);

let entered = false;
startBtn.addEventListener("click", () => {
  if (entered) return;
  entered = true;
  sound.ensureCtx();
  sound.scrape(0.9);
  startBtn.disabled = true;
  silhouette.style.transition = reduceMotion ? "none" : "opacity 1.1s ease";
  silhouette.style.opacity = "0.55";
  setTimeout(() => sound.thud(), reduceMotion ? 0 : 650);
  setTimeout(
    () => {
      window.location.href = "list.html";
    },
    reduceMotion ? 150 : 1050
  );
});
