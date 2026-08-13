import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Check, ShoppingBag, Building, Rocket } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface NovaImplantacaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const OPERACOES_SHOPEE = ['Line Haul', 'Last Mile', 'First Mile', 'Mobile Hub']

const ETAPAS_BASE_SHOPEE = [
  'Checkpoint',
  'Configurar Base',
  'Testes',
  'Treinamento Fatura',
  'Ativo 4Pl',
]

const ETAPAS_BASE_NORMAL = [
  'Checkpoint',
  'Configurar Base',
  'Testes',
]

export function NovaImplantacaoModal({ isOpen, onClose, onSuccess }: NovaImplantacaoModalProps) {
  const [step, setStep] = useState(1)
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [selectedBase, setSelectedBase] = useState('')
  const [tipoCliente, setTipoCliente] = useState<'SHOPEE' | 'NORMAL' | ''>('')
  const [selectedOperacoes, setSelectedOperacoes] = useState<string[]>([])
  const [selectedModulos, setSelectedModulos] = useState<string[]>([])
  const [basesDisponiveis, setBasesDisponiveis] = useState<any[]>([])
  const [modulosDisponiveis, setModulosDisponiveis] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      resetForm()
      fetchBasesDisponiveis()
      fetchModulos()
    }
  }, [isOpen])

  const resetForm = () => {
    setStep(1)
    setNomeEmpresa('')
    setSelectedBase('')
    setTipoCliente('')
    setSelectedOperacoes([])
    setSelectedModulos([])
  }

  const fetchBasesDisponiveis = async () => {
    setLoading(true)
    try {
      const data = await api.getBasesWithClienteInfo()
      const livres = data.filter((b: any) => !b.clientes)
      setBasesDisponiveis(livres)
    } catch (err) {
      console.error('Erro ao buscar bases:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchModulos = async () => {
    try {
      const data = await api.getModulosMantran()
      const sorted = (data || [])
        .filter((m: any) => m.tipo === 'MÓDULO')
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      setModulosDisponiveis(sorted)
    } catch (err) {
      console.error('Erro ao buscar módulos:', err)
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

  const generateEtapas = (): string[] => {
    if (tipoCliente === 'SHOPEE') {
      const etapas = [...ETAPAS_BASE_SHOPEE]
      selectedOperacoes.forEach(op => {
        etapas.push(`Treinamento ${op}`)
      })
      if (selectedOperacoes.includes('Line Haul')) {
        etapas.push('Treinamento de Cadastro')
      }
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

  const canProceed = () => {
    if (step === 1) return nomeEmpresa.trim() !== '' && selectedBase !== '' && tipoCliente !== ''
    if (step === 2) {
      if (tipoCliente === 'SHOPEE') return selectedOperacoes.length > 0
      return selectedModulos.length > 0
    }
    return true
  }

  const handleSubmit = async () => {
    setSaving(true)
    let createdClienteId: string | null = null
    let updatedBaseId: string | null = null

    try {
      // 1. Criar o cliente na tabela clientes
      const clienteData = await api.insertCliente({
        nome_empresa: nomeEmpresa,
        tipo: tipoCliente,
        possui_aditivo: false
      })
      createdClienteId = clienteData.id

      // 2. Vincular a base ao cliente
      const baseObj = basesDisponiveis.find((b: any) => b.nome_base === selectedBase)
      if (baseObj) {
        updatedBaseId = baseObj.id
        await api.updateBase(baseObj.id, { 
          cliente_id: clienteData.id, 
          status: 'Em Uso' 
        })
      }

      // 3. Criar a implantação
      const implData = await api.insertImplantacao({
        cliente_id: clienteData.id,
        base_id: baseObj?.id || '',
        nome_empresa: nomeEmpresa,
        tipo_cliente: tipoCliente,
        operacoes_shopee: tipoCliente === 'SHOPEE' ? selectedOperacoes : [],
        modulos_normal: tipoCliente === 'NORMAL' ? selectedModulos : []
      })

      // 4. Gerar e inserir as etapas
      const etapasNomes = generateEtapas()
      const etapasToInsert = etapasNomes.map((nome, i) => ({
        implantacao_id: implData.id,
        nome_etapa: nome,
        valor: 'EM BRANCO',
        ordem: i + 1
      }))
      await api.insertImplantacaoEtapas(etapasToInsert)

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao criar implantação:', err)

      // Rollback on failure
      if (updatedBaseId) {
        try { await api.updateBase(updatedBaseId, { cliente_id: null, status: 'Disponível' }) } catch (_) {}
      }
      if (createdClienteId) {
        try { await api.deleteCliente(createdClienteId) } catch (_) {}
      }

      alert('Erro ao criar implantação: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const previewEtapas = (tipoCliente && ((tipoCliente === 'SHOPEE' && selectedOperacoes.length > 0) || (tipoCliente === 'NORMAL' && selectedModulos.length > 0)))
    ? generateEtapas()
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-brand-500" />
              Nova Implantação
            </h2>
            <p className="text-sm text-slate-400">Passo {step} de 3</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 bg-slate-900/50 border-b border-slate-800 shrink-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                s < step ? "bg-brand-500 text-white" :
                s === step ? "bg-brand-500/20 text-brand-400 border-2 border-brand-500" :
                "bg-slate-800 text-slate-500"
              )}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={clsx(
                  "flex-1 h-0.5 mx-2 transition-all",
                  s < step ? "bg-brand-500" : "bg-slate-700"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP 1: Dados básicos */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Nome da Empresa *</label>
                <input 
                  type="text"
                  value={nomeEmpresa}
                  onChange={e => setNomeEmpresa(e.target.value)}
                  placeholder="Ex: Transportes ABC"
                  className="input-field w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Base Disponível *</label>
                {loading ? (
                  <p className="text-slate-500 text-sm">Carregando bases...</p>
                ) : (
                  <select 
                    value={selectedBase} 
                    onChange={e => setSelectedBase(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Selecione uma base livre...</option>
                    {basesDisponiveis.map((b: any) => (
                      <option key={b.id} value={b.nome_base}>{b.nome_base}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-500 mt-1">{basesDisponiveis.length} bases disponíveis</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Tipo de Cliente *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoCliente('NORMAL')}
                    className={clsx(
                      "flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200",
                      tipoCliente === 'NORMAL' 
                        ? "border-blue-500 bg-blue-500/10 text-blue-400" 
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    )}
                  >
                    <Building className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">NORMAL</span>
                    <span className="text-xs mt-1 opacity-60">Cliente Padrão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCliente('SHOPEE')}
                    className={clsx(
                      "flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200",
                      tipoCliente === 'SHOPEE' 
                        ? "border-orange-500 bg-orange-500/10 text-orange-400" 
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    )}
                  >
                    <ShoppingBag className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">SHOPEE</span>
                    <span className="text-xs mt-1 opacity-60">Operações Shopee</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Operações (Shopee) ou Módulos (Normal) */}
          {step === 2 && tipoCliente === 'SHOPEE' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">Operações Shopee</h3>
                <p className="text-xs text-slate-500 mb-4">Selecione as operações que o cliente irá realizar</p>
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
                        "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-colors",
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
              </div>

              {selectedOperacoes.includes('Line Haul') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <span className="text-xs text-amber-400">⚡ Line Haul selecionado — será adicionado automaticamente "Treinamento de Cadastro"</span>
                </div>
              )}

              {previewEtapas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preview das Etapas ({previewEtapas.length})</h4>
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {previewEtapas.map((etapa, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <span className="text-xs text-slate-600 w-5">{i + 1}.</span>
                        <span className="text-sm text-slate-300">{etapa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && tipoCliente === 'NORMAL' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">Módulos do Cliente</h3>
                <p className="text-xs text-slate-500 mb-4">Selecione os módulos que o cliente irá utilizar</p>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
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
              </div>

              {previewEtapas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preview das Etapas ({previewEtapas.length})</h4>
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {previewEtapas.map((etapa, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <span className="text-xs text-slate-600 w-5">{i + 1}.</span>
                        <span className="text-sm text-slate-300">{etapa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Confirmação */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-4">
                <Rocket className="w-10 h-10 text-brand-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Confirmar Implantação</h3>
                <p className="text-sm text-slate-400">Revise os dados antes de criar</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 divide-y divide-slate-800">
                <div className="flex justify-between p-4">
                  <span className="text-sm text-slate-400">Empresa</span>
                  <span className="text-sm font-bold text-white">{nomeEmpresa}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="text-sm text-slate-400">Base</span>
                  <span className="text-sm font-bold text-white font-mono">{selectedBase}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="text-sm text-slate-400">Tipo</span>
                  <span className={`text-sm font-bold ${tipoCliente === 'SHOPEE' ? 'text-orange-400' : 'text-blue-400'}`}>
                    {tipoCliente}
                  </span>
                </div>
                {tipoCliente === 'SHOPEE' && (
                  <div className="flex justify-between p-4">
                    <span className="text-sm text-slate-400">Operações</span>
                    <span className="text-sm font-medium text-orange-300">{selectedOperacoes.join(', ')}</span>
                  </div>
                )}
                {tipoCliente === 'NORMAL' && (
                  <div className="flex justify-between p-4">
                    <span className="text-sm text-slate-400">Módulos</span>
                    <span className="text-sm font-medium text-blue-300 text-right max-w-[200px]">{selectedModulos.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between p-4">
                  <span className="text-sm text-slate-400">Etapas</span>
                  <span className="text-sm font-bold text-brand-400">{previewEtapas.length} etapas</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etapas a serem criadas</h4>
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-3 max-h-48 overflow-y-auto custom-scrollbar">
                  {previewEtapas.map((etapa, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <span className="text-xs text-slate-600 w-5 shrink-0">{i + 1}.</span>
                      <span className="text-sm text-slate-300">{etapa}</span>
                      <span className="ml-auto text-[10px] text-slate-600 uppercase">EM BRANCO</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-between shrink-0">
          {step > 1 ? (
            <button 
              type="button" 
              onClick={() => setStep(step - 1)} 
              className="btn-secondary flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          )}
          
          {step < 3 ? (
            <button 
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              {saving ? 'Criando...' : 'Criar Implantação'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
