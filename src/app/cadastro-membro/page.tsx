import Link from "next/link";
import { MaskedInput } from "@/components/masked-input";
import { selfRegisterMember } from "./actions";

const field = "h-11 rounded-lg border border-stone-300 bg-white px-3 font-normal";

export default async function PublicMemberRegistrationPage({ searchParams }: { searchParams: Promise<{ enviado?: string; erro?: string }> }) {
  const message = await searchParams;

  return <main className="min-h-screen bg-[#fffdf6] p-5">
    <div className="mx-auto max-w-3xl rounded-2xl border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
      <Link href="/" className="text-sm font-bold text-[#7b4b2a]">← Missao Resgatai</Link>
      <h1 className="mt-6 text-3xl font-bold text-[#2d2926]">Faca seu cadastro</h1>
      <p className="mt-2 text-sm text-stone-600">Preencha seus dados. A equipe da igreja revisara o cadastro antes de aprovar. Se voce criar usuario e senha, a conta so sera liberada depois dessa aprovacao.</p>
      {message.enviado && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Cadastro recebido. Em breve entraremos em contato.</p>}
      {message.erro && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{message.erro}</p>}

      <form action={selfRegisterMember} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-stone-700 sm:col-span-2">Nome completo *<input required name="fullName" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Como prefere ser chamado<input name="preferredName" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">E-mail<input name="email" type="email" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Celular / WhatsApp<MaskedInput name="mobilePhone" kind="phone" placeholder="(85) 99999-9999" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Instagram (opcional)<input name="instagram" placeholder="@sua_conta" autoCapitalize="none" autoComplete="off" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">CPF<MaskedInput name="cpf" kind="cpf" placeholder="000.000.000-00" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Nascimento<input name="birthDate" type="date" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Estado civil<input name="maritalStatus" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Profissao<input name="occupation" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700 sm:col-span-2">Endereco<input name="address" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Bairro<input name="neighborhood" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">CEP<input name="zipCode" inputMode="numeric" placeholder="00000-000" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">Cidade<input name="city" className={field} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">UF<input name="state" maxLength={2} className={`${field} uppercase`} /></label>
        <label className="grid gap-1 text-xs font-bold text-stone-700 sm:col-span-2">Responsavel (se menor de idade)<input name="guardianName" className={field} /></label>

        <fieldset className="grid gap-4 rounded-xl border border-[#eadfce] bg-[#fffdf6] p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-2 text-xs font-bold text-[#7b4b2a]">Conta de acesso</legend>
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700 sm:col-span-2"><input name="createAccount" type="checkbox" className="size-4" />Quero cadastrar usuario e senha para acessar o app</label>
          <label className="grid gap-1 text-xs font-bold text-stone-700">Usuario<input name="username" autoComplete="username" placeholder="ex.: maria.silva" className={field} /></label>
          <label className="grid gap-1 text-xs font-bold text-stone-700">Senha<input name="password" type="password" minLength={8} autoComplete="new-password" className={field} /></label>
          <label className="grid gap-1 text-xs font-bold text-stone-700 sm:col-span-2">Confirmar senha<input name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" className={field} /></label>
          <p className="text-xs leading-5 text-stone-500 sm:col-span-2">A conta ficara aguardando aprovacao junto com o cadastro do membro.</p>
        </fieldset>

        <label className="grid gap-1 text-xs font-bold text-stone-700 sm:col-span-2">Observacoes<textarea name="notes" rows={4} className="rounded-lg border border-stone-300 bg-white p-3 font-normal" /></label>
        <button className="sm:col-span-2 rounded-lg bg-[#7b4b2a] py-3 text-sm font-bold text-white hover:bg-[#5d402b]">Enviar cadastro para aprovacao</button>
      </form>
    </div>
  </main>;
}
