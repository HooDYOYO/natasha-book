const config = {
  firstFrame: 2,
  lastFrame: 42,
  turnDuration: 820,
  fileName(number) {
    return `pages/A4 - ${number}.png`;
  }
};

const pages = Array.from(
  { length: config.lastFrame - config.firstFrame + 1 },
  (_, i) => config.fileName(config.firstFrame + i)
);

const $ = (id) => document.getElementById(id);
const startScreen = $("startScreen");
const openButton = $("openButton");
const reader = $("reader");
const book = $("book");
const currentImage = $("currentImage");
const currentSpread = $("currentSpread");
const incomingImage = $("incomingImage");
const prevButton = $("prevButton");
const nextButton = $("nextButton");
const tapPrev = $("tapPrev");
const tapNext = $("tapNext");
const counter = $("counter");
const progressBar = $("progressBar");
const homeButton = $("homeButton");
const fullscreenButton = $("fullscreenButton");
const loadingScreen = $("loadingScreen");
const endScreen = $("endScreen");
const restartButton = $("restartButton");

let index = 0;
let isTurning = false;
let touchStartX = 0;
const visitedPages = new Set();

function preloadAround() {
  [index - 1, index + 1, index + 2]
    .filter((i) => i >= 0 && i < pages.length)
    .forEach((i) => { const image = new Image(); image.src = pages[i]; });
}

function render() {
  currentImage.src = pages[index];
  currentImage.alt = `Разворот ${index + 1} из ${pages.length}`;
  counter.textContent = `${index + 1} / ${pages.length}`;
  progressBar.style.width = `${((index + 1) / pages.length) * 100}%`;
  prevButton.disabled = index === 0 || isTurning;
  nextButton.disabled = index === pages.length - 1 || isTurning;
  preloadAround();
}

function showMissingFile() {
  if (book.querySelector(".error-card")) return;
  const message = document.createElement("div");
  message.className = "error-card";
  message.innerHTML = `<strong>Не найден файл страницы</strong><br><br>Проверь, что PNG лежат в папке <code>pages</code><br>и называются <code>A4 - 2.png</code> … <code>A4 - 42.png</code>.`;
  book.appendChild(message);
}
currentImage.addEventListener("error", showMissingFile);

function openBook() {
  if (startScreen.classList.contains("is-opening")) return;

  openButton.disabled = true;
  startScreen.classList.add("is-opening");

  // Пока обложка приближается, подготавливаем первые страницы.
  Promise.all(
    pages.slice(0, 3).map((src) => new Promise((resolve) => {
      const image = new Image();
      image.onload = image.onerror = resolve;
      image.src = src;
    }))
  ).finally(() => loadingScreen.classList.add("is-hidden"));

  window.setTimeout(() => {
    render();
    reader.classList.add("is-visible");
    reader.setAttribute("aria-hidden", "false");

    book.classList.remove("opening");
    void book.offsetWidth;
    book.classList.add("opening");

    startScreen.classList.add("is-hidden");

    window.setTimeout(() => {
      startScreen.classList.remove("is-opening");
      openButton.disabled = false;
    }, 800);
  }, 820);
}

function goHome() {
  reader.classList.remove("is-visible");
  reader.setAttribute("aria-hidden", "true");
  startScreen.classList.remove("is-hidden", "is-opening");
  openButton.disabled = false;
  endScreen.classList.remove("is-visible");
}

function turn(direction) {
  if (isTurning) return;
  const target = index + direction;
  if (target < 0) return;
  if (target >= pages.length) { endScreen.classList.add("is-visible"); endScreen.setAttribute("aria-hidden", "false"); return; }

  isTurning = true;
  incomingImage.src = pages[target];
  incomingImage.alt = `Разворот ${target + 1} из ${pages.length}`;
  book.classList.add(direction > 0 ? "turn-next" : "turn-prev");
  prevButton.disabled = true;
  nextButton.disabled = true;

  window.setTimeout(() => {
    index = target;
    book.classList.remove("turn-next", "turn-prev");
    isTurning = false;
    render();
  }, config.turnDuration);
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {}
}

openButton.addEventListener("click", openBook);
homeButton.addEventListener("click", goHome);
fullscreenButton.addEventListener("click", toggleFullscreen);
restartButton.addEventListener("click", () => {
  endScreen.classList.remove("is-visible");
  endScreen.setAttribute("aria-hidden", "true");
  index = 0;
  render();
});
nextButton.addEventListener("click", () => turn(1));
prevButton.addEventListener("click", () => turn(-1));
tapNext.addEventListener("click", () => turn(1));
tapPrev.addEventListener("click", () => turn(-1));

document.addEventListener("keydown", (event) => {
  if (!reader.classList.contains("is-visible")) return;
  if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); turn(1); }
  if (event.key === "ArrowLeft") turn(-1);
  if (event.key === "Home") { index = 0; render(); }
  if (event.key === "End") { index = pages.length - 1; render(); }
  if (event.key === "Escape" && !document.fullscreenElement) goHome();
});

document.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
document.addEventListener("touchend", (event) => {
  if (!reader.classList.contains("is-visible")) return;
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) < 55) return;
  turn(distance < 0 ? 1 : -1);
}, { passive: true });

render();
