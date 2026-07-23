import { LoginForm } from "./login-form";

function safeCallbackUrl(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/painel";
}

export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[.9fr_1.1fr]">
      <main className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-[#0b1f3a] text-xl font-bold text-[#d6a548]">✦</span>
          <div>
            <strong className="block text-[#0b1f3a]">Missão Resgatai</strong>
            <small className="text-[10px] tracking-widest text-slate-500">GESTÃO DE IGREJA</small>
          </div>
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-800">Que bom ter você aqui.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Entre com seu e-mail ou nome de usuário para acessar a plataforma.</p>
        <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />
      </main>
      <aside className="hidden bg-[linear-gradient(135deg,#07162b,#104f80)] p-16 text-white lg:block">
        <div className="mx-auto mt-[22vh] max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#d6a548]">Cuidar, conectar e servir</p>
          <h2 className="mt-5 text-5xl font-bold tracking-tight">Uma igreja mais <span className="text-[#d6a548]">próxima</span> de cada pessoa.</h2>
          <p className="mt-5 max-w-md leading-7 text-slate-300">Administração, comunicação e ministérios reunidos em um ambiente seguro e simples de usar.</p>
        </div>
      </aside>
    </div>
  );
}
