document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll(".history-item").forEach((item) => {
      item.hidden = filter !== "all" && item.dataset.status !== filter;
    });
  });
});
