(() => {
  const load = src => new Promise((resolve, reject) => {
    if ([...document.scripts].some(s => s.src.endsWith(src))) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  window.BuildScoutLoadDallasNow = async function () {
    await load("dallasnow-adapter.js");
    await load("phase16-2-dallasnow-bootstrap.js");
    return window.BuildScoutDallasNow;
  };
})();
