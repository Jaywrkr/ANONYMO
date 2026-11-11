// Avisos del estudio en el celular (sistema/72). Solo muestra el aviso y, al tocarlo, abre el estudio.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: "ANONYMO", texto: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "ANONYMO", { body: d.texto || "", data: { url: d.url || "/estudio" }, tag: d.titulo, renotify: true }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/estudio";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    const w = ws.find((x) => x.url.includes("/estudio"));
    if (w) { w.navigate(url); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
