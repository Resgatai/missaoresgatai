import { getFirebaseWebConfig } from "@/lib/firebase-public";

export const runtime = "nodejs";

export async function GET() {
  const config = getFirebaseWebConfig();
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) return new Response("Firebase web não configurado.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  const body = `importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || 'Missão Resgatai', {
    body: notification.body || '',
    icon: '/logo-resgatai.png',
    data: { url: payload.data && payload.data.url ? payload.data.url : '/notificacoes' }
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/notificacoes';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((window) => 'focus' in window);
    if (existing) { existing.navigate(url); return existing.focus(); }
    return clients.openWindow(url);
  }));
});`;
  return new Response(body, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", "service-worker-allowed": "/" } });
}
