import { LoginForm } from "./login-form";

function safeCallbackUrl(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/painel";
}

export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="grid min-h-screen bg-[#fffdf6] lg:grid-cols-[.9fr_1.1fr]">
      <main className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-[#7b4b2a] text-xl font-bold text-[#cdb019]">✦</span>
          <div>
            <strong className="block text-[#2d2926]">Missão Resgatai</strong>
            <small className="text-[10px] tracking-widest text-stone-500">GESTÃO DE IGREJA</small>
          </div>
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-[#2d2926]">Que bom ter você aqui.</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Entre com seu e-mail ou nome de usuário para acessar a plataforma.</p>
        <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />
      </main>
      <aside className="hidden bg-[linear-gradient(135deg,#2d2926,#7b4b2a_68%,#cdb019_155%)] p-16 text-white lg:block">
        <div className="mx-auto mt-[22vh] max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#e9d33b]">Cuidar, conectar e servir</p>
          <h2 className="mt-5 text-5xl font-bold tracking-tight">Uma igreja mais <span className="text-[#e9d33b]">próxima</span> de cada pessoa.</h2>
          <p className="mt-5 max-w-md leading-7 text-stone-200">Administração, comunicação e ministérios reunidos em um ambiente seguro e simples de usar.</p>
        </div>
      </aside>
    </div>
  );
}
