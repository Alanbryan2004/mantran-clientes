import { useState, useMemo, useEffect } from 'react'
import {
  X, Calendar as CalendarIcon, Copy, Check, Clock, Building2, UserCheck,
  Database, CheckCircle2, AlertCircle, RefreshCw, MessageSquare
} from 'lucide-react'
import clsx from 'clsx'

interface Props {
  isOpen: boolean
  onClose: () => void
  implantacao: any
  etapas: any[]
  agendamentosEtapas: Record<string, any>
  dataCheckpointEfetivaISO?: string | null
  dataConfigurarBaseAutomaticaISO?: string | null
  dataTestesAutomaticaISO?: string | null
  dataFeedbackAutomaticaISO: string | null
  normalizeEtapaNome: (nome: string) => string
}

export function CronogramaImplantacaoModal({
  isOpen,
  onClose,
  implantacao,
  etapas,
  agendamentosEtapas,
  dataCheckpointEfetivaISO,
  dataConfigurarBaseAutomaticaISO,
  dataTestesAutomaticaISO,
  dataFeedbackAutomaticaISO,
  normalizeEtapaNome
}: Props) {
  const [copiado, setCopiado] = useState(false)
  const [textoEditavel, setTextoEditavel] = useState('')

  // Monta a lista estruturada do cronograma
  const itensCronograma = useMemo(() => {
    return (etapas || []).map((etapa, idx) => {
      const nome = normalizeEtapaNome(etapa.nome_etapa)
      const lower = nome.toLowerCase()
      const isCheckpoint = lower === 'checkpoint'
      const is4PL = lower === 'ativo 4pl' || lower.includes('4pl') || lower.includes('4pi')
      const isConfigBase = lower === 'configurar base'
      const isTestes = lower === 'testes'
      const isFeedback = lower === 'feedback'
      const ag = agendamentosEtapas[etapa.id] || null
      const qtdReplanejamentos = Array.isArray(ag?.replanejamentos) ? ag.replanejamentos.length : 0

      let dataHorarioTexto = 'A definir pelo cliente'
      let tipoData: 'agendado' | 'interno' | 'automatico' | 'pendente' = 'pendente'

      if (is4PL) {
        dataHorarioTexto = 'Sem data (Processo interno)'
        tipoData = 'interno'
      } else if (isConfigBase) {
        if (dataConfigurarBaseAutomaticaISO) {
          const dt = new Date(dataConfigurarBaseAutomaticaISO)
          dataHorarioTexto = `${dt.toLocaleDateString('pt-BR')} (Automático: 1 dia útil após Checkpoint)`
          tipoData = 'automatico'
        } else {
          dataHorarioTexto = 'Automático: 1 dia útil após a data do Checkpoint'
          tipoData = 'pendente'
        }
      } else if (isTestes) {
        if (dataTestesAutomaticaISO) {
          const dt = new Date(dataTestesAutomaticaISO)
          dataHorarioTexto = `${dt.toLocaleDateString('pt-BR')} (Automático: 1 dia útil após Configurar Base)`
          tipoData = 'automatico'
        } else {
          dataHorarioTexto = 'Automático: 1 dia útil após Configurar Base'
          tipoData = 'pendente'
        }
      } else if (isFeedback) {
        if (dataFeedbackAutomaticaISO) {
          const dt = new Date(dataFeedbackAutomaticaISO)
          dataHorarioTexto = `${dt.toLocaleDateString('pt-BR')} (Automático: 15 dias após última data definida)`
          tipoData = 'automatico'
        } else {
          dataHorarioTexto = 'Automático: 15 dias após a última data definida pelo cliente'
          tipoData = 'pendente'
        }
      } else if (ag?.inicio) {
        const dtIni = new Date(ag.inicio)
        const dataStr = dtIni.toLocaleDateString('pt-BR')
        const horaIniStr = dtIni.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const horaFimStr = ag.fim
          ? new Date(ag.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : ''
        dataHorarioTexto = horaFimStr
          ? `${dataStr} das ${horaIniStr} às ${horaFimStr}`
          : `${dataStr} às ${horaIniStr}`
        tipoData = 'agendado'
      } else if (isCheckpoint && dataCheckpointEfetivaISO) {
        const dt = new Date(dataCheckpointEfetivaISO)
        dataHorarioTexto = `${dt.toLocaleDateString('pt-BR')} (Data de conclusão do Checkpoint)`
        tipoData = 'automatico'
      }

      return {
        ordem: idx + 1,
        id: etapa.id,
        tema: nome,
        status: etapa.valor || 'EM BRANCO',
        dataHorarioTexto,
        tipoData,
        qtdReplanejamentos
      }
    })
  }, [etapas, agendamentosEtapas, dataCheckpointEfetivaISO, dataConfigurarBaseAutomaticaISO, dataTestesAutomaticaISO, dataFeedbackAutomaticaISO, normalizeEtapaNome])

  // Gera o texto formatado para envio no WhatsApp
  const textoPadraoWhatsapp = useMemo(() => {
    const nomeEmpresa = implantacao?.nome_empresa || 'Cliente'
    const nomeBase = implantacao?.bases?.nome_base || '—'
    const analista = implantacao?.analista_responsavel || 'Equipe de Implantação Mantran'

    const linhasEtapas = itensCronograma.map(item => {
      const iconeStatus = item.status === 'OK' ? ' ✅' : ''
      const tagReplanejado = item.qtdReplanejamentos > 0 ? ' _(Replanejado)_' : ''
      return `*${item.ordem}. ${item.tema}:* ${item.dataHorarioTexto}${iconeStatus}${tagReplanejado}`
    })

    return [
      `📋 *CRONOGRAMA DE IMPLANTAÇÃO — MANTRAN TECNOLOGIAS*`,
      ``,
      `🏢 *Empresa:* ${nomeEmpresa}`,
      `🗄️ *Base:* ${nomeBase}`,
      `👨‍💻 *Analista Responsável:* ${analista}`,
      ``,
      `Olá! Segue a formalização das datas e horários definidos para cada processo da nossa implantação:`,
      ``,
      ...linhasEtapas,
      ``,
      `⚠️ _Caso precise replanejar alguma data, por favor nos avise com antecedência ou atualize diretamente pelo Portal Mantran Clientes._`
    ].join('\n')
  }, [implantacao, itensCronograma])

  useEffect(() => {
    if (isOpen) {
      setTextoEditavel(textoPadraoWhatsapp)
      setCopiado(false)
    }
  }, [isOpen, textoPadraoWhatsapp])

  const handleCopiarWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(textoEditavel)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    } catch {
      // Fallback caso clipboard API falhe
      const textarea = document.createElement('textarea')
      textarea.value = textoEditavel
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white truncate">
                Cronograma de Implantação — {implantacao?.nome_empresa}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Visualize todas as datas agendadas por processo e copie a mensagem pronta para formalizar no WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Resumo da Implantação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-brand-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Cliente / Empresa</span>
                <span className="text-xs font-bold text-white truncate block">{implantacao?.nome_empresa || '—'}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Base Alocada</span>
                <span className="text-xs font-mono font-bold text-white truncate block">{implantacao?.bases?.nome_base || '—'}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Analista Responsável</span>
                <span className="text-xs font-bold text-white truncate block">{implantacao?.analista_responsavel || 'Não atribuído'}</span>
              </div>
            </div>
          </div>

          {/* Tabela Visual do Cronograma por Tema/Processo */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Datas e Horários por Processo / Tema
              </span>
              <span className="text-[11px] text-slate-400">
                {itensCronograma.filter(i => i.tipoData === 'agendado' || i.tipoData === 'automatico').length} data(s) definida(s)
              </span>
            </div>
            <div className="divide-y divide-slate-800/70">
              {itensCronograma.map(item => (
                <div key={item.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {item.ordem}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {item.tema}
                    </span>
                    {item.status === 'OK' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                      </span>
                    )}
                    {item.qtdReplanejamentos > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <RefreshCw className="w-2.5 h-2.5" /> Replanejado {item.qtdReplanejamentos}x
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end shrink-0">
                    {item.tipoData === 'agendado' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 font-mono text-xs font-bold">
                        <CalendarIcon className="w-3.5 h-3.5 text-brand-400" />
                        {item.dataHorarioTexto}
                      </span>
                    ) : item.tipoData === 'automatico' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                        {item.dataHorarioTexto}
                      </span>
                    ) : item.tipoData === 'interno' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {item.dataHorarioTexto}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        {item.dataHorarioTexto}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mensagem Pronta para Copiar e Colar no WhatsApp */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Mensagem Formatada para WhatsApp (você pode editar antes de copiar se desejar)
              </label>
              <button
                type="button"
                onClick={() => setTextoEditavel(textoPadraoWhatsapp)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Restaurar texto padrão
              </button>
            </div>
            <textarea
              value={textoEditavel}
              onChange={e => setTextoEditavel(e.target.value)}
              rows={11}
              className="w-full p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500/60 resize-y"
            />
          </div>
        </div>

        {/* Rodapé com Botão de Copiar para WhatsApp */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleCopiarWhatsapp}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg cursor-pointer",
              copiado
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/25"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
            )}
          >
            {copiado ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Copiado! Agora é só colar no WhatsApp</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Cronograma para WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

