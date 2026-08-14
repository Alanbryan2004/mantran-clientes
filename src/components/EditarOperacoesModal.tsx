import { useState, useEffect } from 'react'
import { X, Check, Settings2, Save } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface EditarOperacoesModalProps {
  isOpen: boolean
  onClose: () => void
  implantacao: any
  onSuccess: () => void
}

const OPERACOES_SHOPEE = ['Line Haul', 'Last Mile', 'First Mile', 'Mobile Hub']

const SHOPEE_ORDER_MAP: Record<string, number> = {
  'checkpoint': 1,
  'configurar base': 2,
  'ativo 4pl': 3,
  'ativo 4pi': 3,
  'testes': 4,
  'treinamento last mile': 5,
  'treinamento de first mile': 6,
  'treinamento first mile': 6,
  'treinamento de cadastros': 7,
  'treinamento de cadastro': 7,
  'treinamento cadastros': 7,
  'treinamento cadastro': 7,
  'treinamento de line haul': 8,
  'treinamento line haul': 8,
  'treinamento mobile hub': 8.5,
  'treinamento de mobile hub': 8.5,
  'treinamento fatura': 9,
  'feedback': 10,
}

const normalizeShopeeEtapaName = (nome: string): string => {
  const lower = nome.trim().toLowerCase()
  if (lower === 'ativo 4pl' || lower === 'ativo 4pi') return 'Ativo 4PL'
  if (lower === 'treinamento first mile' || lower === 'treinamento de first mile') return 'Treinamento de First Mile'
  if (lower === 'treinamento de cadastro' || lower === 'treinamento de cadastros' || lower === 'treinamento cadastro' || lower === 'treinamento cadastros') return 'Treinamento de Cadastros'
  if (lower === 'treinamento line haul' || lower === 'treinamento de line haul') return 'Treinamento de Line Haul'
  return nome
}

export function EditarOperacoesModal({ isOpen, onClose, implantacao, onSuccess }: EditarOperacoesModalProps) {
  const [selectedOperacoes, setSelectedOperacoes] = useState<string[]>([])
  const [selectedModulos, setSelectedModulos] = useState<string[]>([])
  const [modulosDisponiveis, setModulosDisponiveis] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isShopee = implantacao?.tipo_cliente === 'SHOPEE'

  useEffect(() => {
    if (isOpen && implantacao) {
      if (isShopee) {
        setSelectedOperacoes(implantacao.operacoes_shopee || [])
      } else {
        setSelectedModulos(implantacao.modulos_normal || [])
        fetchModulos()
      }
    }
  }, [isOpen, implantacao])

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
      etapas.push('Ativo 4PL')
      etapas.push('Testes')
      if (selectedOperacoes.includes('Last Mile')) {
        etapas.push('Treinamento Last Mile')
      }
      if (selectedOperacoes.includes('First Mile')) {
        etapas.push('Treinamento de First Mile')
      }
      if (selectedOperacoes.includes('Line Haul')) {
        etapas.push('Treinamento de Cadastros')
      }
      if (selectedOperacoes.includes('Line Haul')) {
        etapas.push('Treinamento de Line Haul')
      }
      if (selectedOperacoes.includes('Mobile Hub')) {
        etapas.push('Treinamento Mobile Hub')
      }
      etapas.push('Treinamento Fatura')
      etapas.push('Feedback')
      return etapas
    } else {
      const etapas = [...ETAPAS_BASE_NORMAL]
      selectedModulos.forEach(mod => {
        etapas.push(`Treinamento ${mod}`)
      })
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
          const ordem = isShopee && lower in SHOPEE_ORDER_MAP ? SHOPEE_ORDER_MAP[lower] : existingEtapas.length + i + 1
          return {
            implantacao_id: implantacao.id,
            nome_etapa: nome,
            valor: 'EM BRANCO',
            ordem
          }
        })
        await api.insertImplantacaoEtapas(toInsert)
      }

      // 3. Update implantacao record
      if (isShopee) {
        await api.updateImplantacao(implantacao.id, { operacoes_shopee: selectedOperacoes })
      } else {
        await api.updateImplantacao(implantacao.id, { modulos_normal: selectedModulos })
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
