// ============================================================
// Notificações de aniversário (geradas no cliente, padrão dos lembretes de ponto)
// - Felicitação ao próprio aniversariante (com pergunta de Day Off se não marcado)
// - Aviso aos demais funcionários de que hoje é aniversário de um colega
// ============================================================

export interface FuncionarioAniversario {
  id: string
  nome: string
  data_nascimento?: string | null
}

export interface ItemAniversario {
  id: string
  tipo: 'aniversario_dayoff' | 'aniversario_felicitacao' | 'aniversario_aviso'
  titulo: string
  mensagem: string
  aniversarianteId: string
  aniversarianteNome: string
}

// "hoje" no formato MM-DD (ignora o ano)
function mmddDeHoje(agora: Date): string {
  const mm = String(agora.getMonth() + 1).padStart(2, '0')
  const dd = String(agora.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

// Extrai MM-DD de uma data YYYY-MM-DD
function mmddDaData(dataNasc?: string | null): string | null {
  if (!dataNasc) return null
  const partes = dataNasc.split('-')
  if (partes.length < 3) return null
  const mm = partes[1]
  const dd = partes[2].slice(0, 2)
  if (!mm || !dd) return null
  return `${mm}-${dd}`
}

/**
 * Gera as notificações de aniversário do dia.
 * @param usuarioLogado o funcionário logado (recebe felicitação/pergunta de day off)
 * @param todosFuncionarios lista completa de funcionários (para avisar dos aniversários dos colegas)
 * @param jaMarcouDayOffAnoAtual se o usuário logado já marcou o Day Off do ano corrente
 * @param agora data de referência (default: agora)
 */
export function avaliarAniversarios(
  usuarioLogado: { id: string; nome: string; data_nascimento?: string | null },
  todosFuncionarios: FuncionarioAniversario[],
  jaMarcouDayOffAnoAtual: boolean,
  agora: Date = new Date()
): ItemAniversario[] {
  const hoje = mmddDeHoje(agora)
  const ano = agora.getFullYear()
  const itens: ItemAniversario[] = []

  // 1) O próprio usuário faz aniversário hoje → felicitação (+ day off se não marcou)
  const meuMMDD = mmddDaData(usuarioLogado.data_nascimento)
  if (meuMMDD && meuMMDD === hoje) {
    if (!jaMarcouDayOffAnoAtual) {
      itens.push({
        id: `aniversario_dayoff_${usuarioLogado.id}_${ano}`,
        tipo: 'aniversario_dayoff',
        titulo: '🎉 Feliz aniversário!',
        mensagem: 'A equipe Mantran deseja um feliz aniversário! 🎂 Você ainda não marcou seu Day Off deste ano. Quer marcar agora? Toque aqui para escolher a data da sua folga de aniversário.',
        aniversarianteId: usuarioLogado.id,
        aniversarianteNome: usuarioLogado.nome
      })
    } else {
      itens.push({
        id: `aniversario_felicitacao_${usuarioLogado.id}_${ano}`,
        tipo: 'aniversario_felicitacao',
        titulo: '🎉 Feliz aniversário!',
        mensagem: 'A equipe Mantran deseja um feliz aniversário! 🎂 Aproveite muito o seu dia.',
        aniversarianteId: usuarioLogado.id,
        aniversarianteNome: usuarioLogado.nome
      })
    }
  }

  // 2) Colegas que fazem aniversário hoje → aviso para o usuário logado
  for (const f of todosFuncionarios) {
    if (!f.id || f.id === usuarioLogado.id) continue
    const mmdd = mmddDaData(f.data_nascimento)
    if (mmdd && mmdd === hoje) {
      const primeiroNome = (f.nome || '').split(' ')[0] || f.nome
      itens.push({
        id: `aniversario_aviso_${f.id}_${ano}_${usuarioLogado.id}`,
        tipo: 'aniversario_aviso',
        titulo: `🎂 Hoje é aniversário de ${primeiroNome}`,
        mensagem: `Hoje é o aniversário de ${f.nome}. Que tal enviar uma mensagem de parabéns? 🎉`,
        aniversarianteId: f.id,
        aniversarianteNome: f.nome
      })
    }
  }

  return itens
}
