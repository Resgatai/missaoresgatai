type PasswordResetMessage = { recipient: string; resetUrl: string };

export async function sendPasswordResetEmail({ recipient, resetUrl }: PasswordResetMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] Link de recuperação para ${recipient}: ${resetUrl}`);
      return;
    }
    throw new Error("O envio de e-mail ainda não foi configurado.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [recipient], subject: "Redefinição de senha | Missão Resgatai", html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">Definir nova senha</a></p><p>Este link expira em 30 minutos. Se não foi você, ignore esta mensagem.</p>` }),
  });
  if (!response.ok) throw new Error("Não foi possível enviar o e-mail de recuperação.");
}
