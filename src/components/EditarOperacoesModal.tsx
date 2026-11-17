import { useState, useEffect } from 'react'
import { X, Check, Settings2, Save, Calendar } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface EditarOperacoesModalProps {
  isOpen: boolean
  onClose: () => void
  implantacao: any
  onSuccess: () => void
}

const OPERACOES_SHOPEE = ['Line Haul', 'Last Mile', 'First Mile', 'Mobile Hub']

const ETAPAS_BASE_NORMAL = [
  'Checkpoint',
  'Configurar Base',
  'Testes',
]

const SHOPEE_ORDER_MAP: Record<string, number> = {
  'checkpoint': 1,
  'configurar base': 2,
  'testes': 3,
  'treinamento de cadastros': 4,
  'treinamento de cadastro': 4,
  'treinamento cadastros': 4,
  'treinamento cadastro': 4,
  'treinamento de line haul': 5,
  'treinamento line haul': 5,
  'envio da primeira prefatura': 6,
  'envio da primeira pré-fatura': 6,
  'envio da primeira fatura/nf': 7,
  'treinamento de last mile': 8,
  'treinamento last mile': 8,
  'treinamento de first mile': 9,
  'treinamento first mile': 9,
  'treinamento de mobile hub': 10,
  'treinamento mobile hub': 10,
  'treinamento de fatura': 11,
  'treinamento fatura': 11,
  'nfse': 12,
  'feedback': 13,
  'ativo 4pl': 14,
  'ativo 4pi': 14,
}

const normalizeShopeeEtapaName = (nome: string): string => {
  const lower = (nome || '').trim().toLowerCase()
  if (lower === 'ativo 4pl' || lower === 'ativo 4pi') return 'Ativo 4PL'
  if (lower === 'treinamento last mile' || lower === 'treinamento de last mile') return 'Treinamento de Last Mile'
  if (lower === 'treinamento first mile' || lower === 'treinamento de first mile') return 'Treinamento de First Mile'
  if (lower === 'treinamento de cadastro' || lower === 'treinamento de cadastros' || lower === 'treinamento cadastro' || lower === 'treinamento cadastros') return 'Treinamento de Cadastros'
  if (lower === 'treinamento line haul' || lower === 'treinamento de line haul') return 'Treinamento de Line Haul'
  if (lower === 'treinamento mobile hub' || lower === 'treinamento de mobile hub') return 'Treinamento de Mobile Hub'
  if (lower === 'treinamento fatura' || lower === 'treinamento de fatura') return 'Treinamento de Fatura'
  if (lower === 'envio da primeira prefatura' || lower === 'envio da primeira pré-fatura') return 'Envio da Primeira Prefatura'
  if (lower === 'envio da primeira fatura/nf') return 'Envio da Primeira Fatura/NF'
  return nome
}

export function EditarOperacoesModal({ isOpen, onClose, implantacao, onSuccess }: EditarOperacoesModalProps) {
  const [selectedOperacoes, setSelectedOperacoes] = useState<string[]>([])
  const [selectedModulos, setSelectedModulos] = useState<string[]>([])
  const [modulosDisponiveis, setModulosDisponiveis] = useState<any[]>([])
  // Módulos contratados do cliente (tabela `modulos`) — define se a etapa NFSE se aplica.
  const [modulosContratados, setModulosContratados] = useState<string[]>([])
  const [dataCriacao, setDataCriacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isShopee = implantacao?.tipo_cliente === 'SHOPEE'
  const isLeo = implantacao?.tipo_cliente === 'LEO_MADEIRAS' || implantacao?.bases?.nome_base === 'dbMantranLeo012'

  const isoToDateInput = (isoString: string) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }

  useEffect(() => {
    if (isOpen && implantacao) {
      setDataCriacao(isoToDateInput(implantacao.created_at))
      if (isShopee) {
        setSelectedOperacoes(implantacao.operacoes_shopee || [])
      } else {
        setSelectedModulos(implantacao.modulos_normal || [])
        fetchModulos()
      }
      fetchModulosContratados()
    }
  }, [isOpen, implantacao])

  const fetchModulosContratados = async () => {
    if (!implantacao?.cliente_id) {
      setModulosContratados([])
      return
    }
    try {
      const nomes = await api.getModulosByCliente(implantacao.cliente_id)
      setModulosContratados(nomes)
    } catch (err) {
      console.error('Erro ao buscar módulos contratados do cliente:', err)
      setModulosContratados([])
    }
  }

  const fetchModulos = async () => {
    setLoading(true)
    try {
      const data = await api.getModulosMantran()
      const sorted = (data || [])
        .filter((m: any) => m.tipo === 'MÓDULO')
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      setModulosDisponiveis(sorted)
    } catch (err) {
      console.error('Erro ao buscar módulos:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleOperacao = (op: string) => {
    setSelectedOperacoes(prev => 
      prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
    )
  }

  const toggleModulo = (mod: string) => {
    setSelectedModulos(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  const generateTargetEtapas = (): string[] => {
    if (isShopee) {
      const etapas: string[] = []
      etapas.push('Checkpoint')
      etapas.push('Configurar Base')
      etapas.push('Testes')
      if (selectedOperacoes.includes('Line Haul')) {
        etapas.push('Treinamento de Cadastros')
        etapas.push('Treinamento de Line Haul')
      }
      etapas.push('Envio da Primeira Prefatura')
      etapas.push('Envio da Primeira Fatura/NF')
      if (selectedOperacoes.includes('Last Mile')) {
        etapas.push('Treinamento de Last Mile')
      }
      if (selectedOperacoes.includes('First Mile')) {
        etapas.push('Treinamento de First Mile')
      }
      if (selectedOperacoes.includes('Mobile Hub')) {
        etapas.push('Treinamento de Mobile Hub')
      }
      etapas.push('Treinamento de Fatura')
      // Etapa NFSE: só quando o módulo NFSE foi contratado pelo cliente. Sempre antes do Feedback.
      if (modulosContratados.includes('NFSE')) {
        etapas.push('NFSE')
      }
      etapas.push('Feedback')
      etapas.push('Ativo 4PL')
      return etapas
    } else {
      const etapas = [...ETAPAS_BASE_NORMAL]
      selectedModulos.forEach(mod => {
        etapas.push(`Treinamento ${mod}`)
        if (isLeo && mod === 'Operação' && !etapas.includes('Treinamento Fatura')) {
          etapas.push('Treinamento Fatura')
        }
      })
      if (isLeo && !etapas.includes('Treinamento Fatura')) {
        etapas.push('Treinamento Fatura')
      }
      // Etapa NFSE: só quando o módulo NFSE foi contratado pelo cliente. Sempre antes do Feedback.
      if (modulosContratados.includes('NFSE')) {
        etapas.push('NFSE')
      }
      etapas.push('Feedback')
      return etapas
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const targetEtapaNames = generateTargetEtapas()
      const existingEtapas: any[] = implantacao.implantacao_etapas || []
      
      // Normalize comparison for Shopee
      const normalize = (n: string) => isShopee ? normalizeShopeeEtapaName(n) : n

      // 1. Etapas to delete (exist in DB but not in target list)
      const etapasToDelete = existingEtapas.filter(
        (e: any) => !targetEtapaNames.some(t => normalize(t) === normalize(e.nome_etapa))
      )
      if (etapasToDelete.length > 0) {
        await api.deleteImplantacaoEtapas(etapasToDelete.map((e: any) => e.id))
      }

      // 2. Etapas to add (exist in target list but not in DB)
      const existingNormalized = existingEtapas.map((e: any) => normalize(e.nome_etapa))
      const etapasToAdd = targetEtapaNames.filter(
        nome => !existingNormalized.includes(normalize(nome))
      )

      if (etapasToAdd.length > 0) {
        const toInsert = etapasToAdd.map((nome, i) => {
          const lower = nome.trim().toLowerCase()
          const rawOrdem = isShopee && lower in SHOPEE_ORDER_MAP ? SHOPEE_ORDER_MAP[lower] : (targetEtapaNames.indexOf(nome) + 1 || existingEtapas.length + i + 1)
          return {
            implantacao_id: implantacao.id,
            nome_etapa: nome,
            valor: 'EM BRANCO',
            ordem: Math.round(Number(rawOrdem))
          }
        })
        await api.insertImplantacaoEtapas(toInsert)
      }

      // 3. Update implantacao record
      let novaDataIso = implantacao.created_at
      if (dataCriacao) {
        const [year, month, day] = dataCriacao.split('-').map(Number)
        if (year && month && day) {
          novaDataIso = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString()
        }
      }

      if (isShopee) {
        await api.updateImplantacao(implantacao.id, { 
          operacoes_shopee: selectedOperacoes,
          created_at: novaDataIso
        })
        if (implantacao.cliente_id) {
          api.updateClienteProcessosShopee(implantacao.cliente_id, selectedOperacoes, implantacao.nome_empresa).catch(() => {})
        }
      } else {
        await api.updateImplantacao(implantacao.id, { 
          modulos_normal: selectedModulos,
          created_at: novaDataIso
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar alterações:', err)
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !implantacao) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-brand-500" />
              {isShopee ? 'Alterar Operações Shopee' : 'Alterar Módulos'}
            </h2>
            <p className="text-sm text-slate-400">{implantacao.nome_empresa}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Data de Criação */}
          <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-400" /> Data de Criação da Implantação
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Utilizada para indicar quanto tempo a implantação está em andamento.
              </p>
            </div>
            <input
              type="date"
              value={dataCriacao}
              onChange={(e) => setDataCriacao(e.target.value)}
              className="input-field py-1.5 px-3 text-xs w-full sm:w-auto bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:border-brand-500 cursor-pointer"
            />
          </div>

          {isShopee ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Selecione ou desmarque as operações. As etapas de treinamento correspondentes serão adicionadas ou removidas automaticamente.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {OPERACOES_SHOPEE.map(op => (
                  <label
                    key={op}
                    className={clsx(
                      "flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                      selectedOperacoes.includes(op) 
                        ? "border-orange-500 bg-orange-500/10 text-orange-300" 
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    <div className={clsx(
                      "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-colors shrink-0",
                      selectedOperacoes.includes(op) 
                        ? "bg-orange-500 border-orange-500 text-white" 
                        : "border-slate-500"
                    )}>
                      {selectedOperacoes.includes(op) && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedOperacoes.includes(op)} onChange={() => toggleOperacao(op)} />
                    <span className="text-sm font-medium">{op}</span>
                  </label>
                ))}
              </div>
              {selectedOperacoes.includes('Line Haul') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <span className="text-xs text-amber-400">⚡ Line Haul ativo — inclui "Treinamento de Cadastros" e "Treinamento de Line Haul"</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Selecione ou desmarque os módulos. As etapas de treinamento correspondentes serão atualizadas.
              </p>
              {loading ? (
                <p className="text-slate-500 text-sm">Carregando módulos...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {modulosDisponiveis.map((mod: any) => (
                    <label
                      key={mod.id}
                      className={clsx(
                        "flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200",
                        selectedModulos.includes(mod.nome) 
                          ? "border-blue-500/50 bg-blue-500/10 text-blue-300" 
                          : "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      <div className={clsx(
                        "w-4 h-4 rounded border-2 flex items-center justify-center mr-2 transition-colors shrink-0",
                        selectedModulos.includes(mod.nome) 
                          ? "bg-blue-500 border-blue-500 text-white" 
                          : "border-slate-500"
                      )}>
                        {selectedModulos.includes(mod.nome) && <Check className="w-3 h-3" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedModulos.includes(mod.nome)} onChange={() => toggleModulo(mod.nome)} />
                      <span className="text-sm font-medium truncate">{mod.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-between shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
