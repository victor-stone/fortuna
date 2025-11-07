function makeDraggable(el) {
  let offsetX, offsetY, dragging = false;

  el.addEventListener("mousedown", e => {
    dragging = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    el.style.transition = "none"; // disable smooth positioning while dragging
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    e.preventDefault();
    el.style.left = `${e.clientX - offsetX}px`;
    el.style.top = `${e.clientY - offsetY}px`;
    el.style.bottom = "auto";
    el.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    el.style.transition = "";
  });
}