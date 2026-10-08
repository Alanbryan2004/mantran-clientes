import { useState, useEffect } from 'react'
import { X, AlertTriangle, FolderKanban, Check, Save, Info } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface ModalErro4PLProps {
  isOpen: boolean
  onClose: () => void
  implantacaoId: string
  etapaId: string
  etapaNome?: string
  nomeEmpresa: string
  baseId?: string | null
  baseNome?: string | null
  onSuccess: () => void
}

export function ModalErro4PL({
  isOpen,
  onClose,
  implantacaoId,
  etapaId,
  etapaNome = 'Ativo 4PL',
  nomeEmpresa,
  baseId,
  baseNome,
  onSuccess
}: ModalErro4PLProps) {
  const [justificativa, setJustificativa] = useState('')
  const [adicionarEmProjeto, setAdicionarEmProjeto] = useState<boolean | null>(null)
  const [projetosAtivos, setProjetosAtivos] = useState<any[]>([])
  const [selectedProjetoId, setSelectedProjetoId] = useState('')
  const [loadingProjetos, setLoadingProjetos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')

  useEffect(() => {
    if (isOpen) {
      setJustificativa('')
      setAdicionarEmProjeto(null)
      setSelectedProjetoId('')
      setErroValidacao('')
      carregarProjetos()
    }
  }, [isOpen])

  const carregarProjetos = async () => {
    setLoadingProjetos(true)
    try {
      const data = await api.getProjetosAtivos()
      setProjetosAtivos(data || [])
    } catch (err) {
      console.error('Erro ao carregar projetos ativos:', err)
    } finally {
      setLoadingProjetos(false)
    }
  }

  if (!isOpen) return null

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroValidacao('')

    if (!justificativa.trim()) {
      setErroValidacao('Por favor, informe a justificativa do erro.')
      return
    }

    if (adicionarEmProjeto === null) {
      setErroValidacao('Por favor, informe se deseja adicionar o cliente a um projeto em andamento.')
      return
    }

    if (adicionarEmProjeto && !selectedProjetoId) {
      setErroValidacao('Por favor, selecione em qual projeto o cliente/base será incluído.')
      return
    }

    setSaving(true)
    try {
      // 1. Atualizar o status da etapa para ERRO
      await api.updateImplantacaoEtapa(etapaId, 'ERRO')

      // 2. Montar texto do histórico
      let usuarioNome: string | null = null
      let usuarioId: string | null = null
      try {
        const stored = localStorage.getItem('@Mantran:user')
        if (stored) {
          const u = JSON.parse(stored)
          usuarioNome = u.nome || u.login
          usuarioId = u.id
        }
      } catch (_) {}

      const projSelecionado = projetosAtivos.find(p => p.id === selectedProjetoId)
      const nomeProjeto = projSelecionado?.nome || projSelecionado?.titulo || 'Projeto'

      let textoHistorico = `🚨 [ERRO - ${etapaNome}]: ${justificativa.trim()}`
      if (adicionarEmProjeto && selectedProjetoId) {
        textoHistorico += `\n\n📌 Cliente/Base (${baseNome || nomeEmpresa}) incluído(a) no projeto em andamento: "${nomeProjeto}".`
      }

      // 3. Salvar no histórico da implantação
      await api.insertImplantacaoHistorico({
        implantacao_id: implantacaoId,
        data_hora: new Date().toISOString(),
        texto: textoHistorico,
        usuario_id: usuarioId,
        usuario_nome: usuarioNome
      })

      // 4. Se solicitado, vincular a base ao projeto selecionado
      if (adicionarEmProjeto && selectedProjetoId) {
        if (baseId) {
          try {
            await api.addBasesToProjeto([{
              projeto_id: selectedProjetoId,
              base_id: baseId
            }])
          } catch (projErr: any) {
            console.warn('Base já pode estar vinculada ao projeto ou erro ao vincular:', projErr)
          }
        }
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar ERRO no 4PL:', err)
      setErroValidacao('Erro ao registrar o erro: ' + (err?.message || 'Falha na requisição'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com destaque em vermelho */}
        <div className="p-5 border-b border-slate-800 bg-red-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Registrar ERRO — {etapaNome}
              </h3>
              <p className="text-xs text-slate-400">
                {nomeEmpresa} {baseNome ? `(${baseNome})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSalvar} className="p-6 space-y-5 overflow-y-auto flex-1">
          {erroValidacao && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Justificativa */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Justificativa do Erro <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva detalhadamente o motivo/justificativa do erro ocorrido no 4PL (ex: falha na validação de credenciais, divergência de CNPJ, etc.)..."
              className="w-full bg-slate-950/60 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Esta justificativa será registrada automaticamente no histórico da implantação.
            </p>
          </div>

          {/* Pergunta: Adicionar em Projeto em Andamento */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Adicionar Cliente (Base) a um Projeto em Andamento? <span className="text-red-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Deseja incluir esta base em um dos projetos ativos para acompanhamento técnico?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdicionarEmProjeto(true)}
                className={clsx(
                  "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  adicionarEmProjeto === true
                    ? "bg-brand-500/20 border-brand-500 text-brand-300 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                )}
              >
                <Check className="w-4 h-4" />
                <span>SIM</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdicionarEmProjeto(false)
                  setSelectedProjetoId('')
                }}
                className={clsx(
                  "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  adicionarEmProjeto === false
                    ? "bg-slate-800 border-slate-600 text-slate-200 shadow-md ring-1 ring-slate-600"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                )}
              >
                <X className="w-4 h-4" />
                <span>NÃO</span>
              </button>
            </div>

            {/* Se SIM -> Exibir seletor de projeto */}
            {adicionarEmProjeto === true && (
              <div className="p-4 bg-slate-950/60 border border-brand-500/30 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 text-brand-400 text-xs font-bold">
                  <FolderKanban className="w-4 h-4" />
                  <span>Selecione o Projeto em Andamento</span>
                </div>

                {loadingProjetos ? (
                  <div className="text-xs text-slate-400 py-2">Carregando projetos ativos...</div>
                ) : projetosAtivos.length === 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Nenhum projeto com status "Em Andamento" encontrado.</span>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedProjetoId}
                      onChange={(e) => setSelectedProjetoId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="">Selecione um projeto...</option>
                      {projetosAtivos.map(proj => (
                        <option key={proj.id} value={proj.id}>
                          {proj.nome || proj.titulo || 'Projeto sem nome'}
                        </option>
                      ))}
                    </select>

                    {baseNome && (
                      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                        Base a ser incluída: <strong className="text-slate-200">{baseNome}</strong>
                      </p>
                    )}
                    {!baseId && (
                      <p className="text-[11px] text-amber-400 mt-1">
                        Atenção: Esta implantação ainda não possui uma base vinculada. A inclusão no projeto será registrada no histórico.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl shadow-lg shadow-red-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Confirmar e Registrar ERRO'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
