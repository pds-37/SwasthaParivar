export function localStorageProvider() {
  if (typeof window === "undefined") return new Map();

  // Initialize the cache from local storage.
  const map = new Map(JSON.parse(localStorage.getItem("swastha-swr-cache") || "[]"));

  // Before unloading the app, we write back all the data into local storage.
  window.addEventListener("beforeunload", () => {
    const appCache = JSON.stringify(Array.from(map.entries()));
    try {
      localStorage.setItem("swastha-swr-cache", appCache);
    } catch (e) {
      console.warn("SWR Cache persistence failed", e);
    }
  });

  // We still use the map for write & read for performance.
  return map;
}
