export const THEME_KEY = "jp-theme";

/**
 * Runs before the first paint so the page never flashes the wrong colours: a saved choice wins,
 * otherwise the device's setting, which is followed live until the visitor picks one.
 */
export const THEME_SCRIPT = `(function(){try{var k="${THEME_KEY}",d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");var set=function(){var s=localStorage.getItem(k);d.dataset.theme=s==="dark"||s==="light"?s:m.matches?"dark":"light"};set();m.addEventListener("change",set)}catch(e){}})();`;
