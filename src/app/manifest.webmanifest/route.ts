export const dynamic = "force-static";

export function GET() {
  return Response.json({
    name: "Missao Resgatai",
    short_name: "Resgatai",
    description: "Sistema de gestao e comunicacao da Missao Resgatai.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf6",
    theme_color: "#e9d33b",
    icons: [
      { src: "/logo-resgatai.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/logo-resgatai.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  }, { headers: { "content-type": "application/manifest+json; charset=utf-8" } });
}
