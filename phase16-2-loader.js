(() => {
  if (window.BuildScoutDallasNow) return;
  const script = document.createElement("script");
  script.src = "dallasnow-adapter.js";
  script.async = false;
  script.onload = () => console.log("BuildScout DallasNow adapter ready.");
  script.onerror = () => console.error("BuildScout DallasNow adapter failed to load.");
  document.head.appendChild(script);
})();
