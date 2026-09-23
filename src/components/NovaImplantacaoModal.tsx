import { useState, useEffect } from 'react'
import { 
  X, ChevronRight, ChevronLeft, Check, ShoppingBag, Building, 
  Rocket, UserCheck, ShieldAlert, KeyRound, ShieldCheck, 
  Layers, PackageCheck, Sparkles
} from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface NovaImplantacaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const OPERACOES_SHOPEE = ['Line Haul', 'Last Mile', 'First Mile', 'Mobile Hub']

const ETAPAS_BASE_NORMAL = [
  'Checkpoint',
  'Configurar Base',
  'Testes',
]

const getBaseNumero = (baseName: string) => {
  if (!baseName) return '001'
  const match = baseName.match(/\d+/)
  return match ? match[0] : '001'
}

export function NovaImplantacaoModal({ isOpen, onClose, onSuccess }: NovaImplantacaoModalProps) {
  const [step, setStep] = useState(1)
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [selectedBase, setSelectedBase] = useState('')
  const [tipoCliente, setTipoCliente] = useState<'SHOPEE' | 'NORMAL' | ''>('')
  
  // Step 2: Módulos & Integrações Contratados (para o cadastro do Cliente)
  const [selectedModulosContratados, setSelectedModulosContratados] = useState<string[]>([])
  
  // Step 3: Operações Shopee ou Módulos para Treinamento da Implantação
  const [selectedOperacoes, setSelectedOperacoes] = useState<string[]>([])
  const [selectedModulosTreinamento, setSelectedModulosTreinamento] = useState<string[]>([])
  
  // Step 4: Analista Responsável
  const [selectedAnalistaId, setSelectedAnalistaId] = useState<string>('')
  const [selectedAnalistaNome, setSelectedAnalistaNome] = useState<string>('')
  
  // Data Sources
  const [basesDisponiveis, setBasesDisponiveis] = useState<any[]>([])
  const [modulosMantranList, setModulosMantranList] = useState<any[]>([])
  const [integracoesList, setIntegracoesList] = useState<any[]>([])
  const [analistasSuporte, setAnalistasSuporte] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      resetForm()
      fetchBasesDisponiveis()
      fetchModulos()
      fetchAnalistasSuporte()
    }
  }, [isOpen])

  const resetForm = () => {
    setStep(1)
    setNomeEmpresa('')
    setSelectedBase('')
    setTipoCliente('')
    setSelectedModulosContratados([])
    setSelectedOperacoes([])
    setSelectedModulosTreinamento([])
    setSelectedAnalistaId('')
    setSelectedAnalistaNome('')
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
      const modulos = (data || [])
        .filter((m: any) => m.tipo === 'MÓDULO')
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      const integracoes = (data || [])
        .filter((m: any) => m.tipo === 'INTEGRAÇÃO')
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome))

      setModulosMantranList(modulos)
      setIntegracoesList(integracoes)
    } catch (err) {
      console.error('Erro ao buscar módulos:', err)
    }
  }

  const fetchAnalistasSuporte = async () => {
    try {
      const data = await api.getUsuariosSuporte()
      setAnalistasSuporte(data || [])
    } catch (err) {
      console.error('Erro ao buscar analistas de suporte:', err)
    }
  }

  // Toggle Módulos Contratados (Step 2)
  const toggleModuloContratado = (nomeModulo: string) => {
    setSelectedModulosContratados(prev => {
      const exists = prev.includes(nomeModulo)
      const next = exists ? prev.filter(m => m !== nomeModulo) : [...prev, nomeModulo]
      
      // Se for cliente Normal e estiver desmarcando ou marcando, sincroniza sugestão de treinamento
      if (tipoCliente === 'NORMAL') {
        const isModuloMantran = modulosMantranList.some(m => m.nome === nomeModulo)
        if (isModuloMantran) {
          if (exists) {
            setSelectedModulosTreinamento(cur => cur.filter(c => c !== nomeModulo))
          } else {
            setSelectedModulosTreinamento(cur => cur.includes(nomeModulo) ? cur : [...cur, nomeModulo])
          }
        }
      }
      return next
    })
  }

  const selectAllModulosMantran = () => {
    const todosNomes = modulosMantranList.map(m => m.nome)
    const allSelected = todosNomes.every(n => selectedModulosContratados.includes(n))
    if (allSelected) {
      // Desmarcar todos os módulos Mantran
      setSelectedModulosContratados(prev => prev.filter(n => !todosNomes.includes(n)))
      if (tipoCliente === 'NORMAL') setSelectedModulosTreinamento([])
    } else {
      // Marcar todos
      setSelectedModulosContratados(prev => Array.from(new Set([...prev, ...todosNomes])))
      if (tipoCliente === 'NORMAL') setSelectedModulosTreinamento(todosNomes)
    }
  }

  const toggleOperacao = (op: string) => {
    setSelectedOperacoes(prev => 
      prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
    )
  }

  const toggleModuloTreinamento = (mod: string) => {
    setSelectedModulosTreinamento(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  const handleSelectAnalista = (id: string, nome: string) => {
    setSelectedAnalistaId(id)
    setSelectedAnalistaNome(nome)
  }

  const generateEtapas = (): string[] => {
    if (tipoCliente === 'SHOPEE') {
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
      selectedModulosTreinamento.forEach(mod => {
        etapas.push(`Treinamento ${mod}`)
      })
      etapas.push('Feedback')
      return etapas
    }
  }

  const canProceed = () => {
    if (step === 1) return nomeEmpresa.trim() !== '' && selectedBase !== '' && tipoCliente !== ''
    if (step === 2) {
      // Passo 2: Módulos contratados pode ser opcional ou exigir ao menos 1
      return true
    }
    if (step === 3) {
      if (tipoCliente === 'SHOPEE') return selectedOperacoes.length > 0
      return selectedModulosTreinamento.length > 0
    }
    if (step === 4) {
      return true // Analista pode ser selecionado ou deixado em branco
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

      // 2. Inserir Módulos & Integrações contratados vinculados ao Cliente
      if (selectedModulosContratados.length > 0) {
        try {
          await api.insertClienteModulos(clienteData.id, selectedModulosContratados)
        } catch (modErr) {
          console.warn('Aviso ao vincular módulos ao cliente:', modErr)
        }
      }

      // 3. Vincular a base ao cliente
      const baseObj = basesDisponiveis.find((b: any) => b.nome_base === selectedBase)
      if (baseObj) {
        updatedBaseId = baseObj.id
        await api.updateBase(baseObj.id, { 
          cliente_id: clienteData.id, 
          status: 'Em Uso' 
        })
      }

      // 4. Criar a implantação
      const implData = await api.insertImplantacao({
        cliente_id: clienteData.id,
        base_id: baseObj?.id || '',
        nome_empresa: nomeEmpresa,
        tipo_cliente: tipoCliente,
        operacoes_shopee: tipoCliente === 'SHOPEE' ? selectedOperacoes : [],
        modulos_normal: tipoCliente === 'NORMAL' ? selectedModulosTreinamento : [],
        analista_responsavel_id: selectedAnalistaId || null,
        analista_responsavel: selectedAnalistaNome || null
      })

      // 5. Gerar e inserir as etapas
      const etapasNomes = generateEtapas()
      const etapasToInsert = etapasNomes.map((nome, i) => ({
        implantacao_id: implData.id,
        nome_etapa: nome,
        valor: 'EM BRANCO',
        ordem: i + 1
      }))
      await api.insertImplantacaoEtapas(etapasToInsert)

      // 6. Gerar automaticamente o Usuário e Senha do Cliente com Perfil Cliente
      try {
        const baseNum = getBaseNumero(selectedBase)
        await api.insertUsuarioCliente({
          nome: nomeEmpresa.trim(),
          login: `${nomeEmpresa.trim()}@Mantran`,
          senha: `${baseNum}@Mantran`
        })
      } catch (userErr) {
        console.error('Aviso ao criar usuário do cliente:', userErr)
      }

      // 7. Gerar Notificação para a equipe sobre a Nova Implantação
      try {
        const analistaTxt = selectedAnalistaNome ? ` • Analista: ${selectedAnalistaNome}` : ''
        const baseTxt = selectedBase ? ` • Base: ${selectedBase}` : ''
        await api.createNotificacao({
          titulo: `🚀 Nova Implantação: ${nomeEmpresa.trim()}`,
          mensagem: `A implantação da empresa "${nomeEmpresa.trim()}" (${tipoCliente === 'SHOPEE' ? 'Shopee' : 'Padrão'}) foi iniciada.${baseTxt}${analistaTxt}`,
          tipo: 'nova_implantacao',
          implantacao_id: implData.id,
          cliente_id: clienteData.id,
          dados_extras: {
            nome_empresa: nomeEmpresa.trim(),
            tipo_cliente: tipoCliente,
            base: selectedBase,
            analista: selectedAnalistaNome || null
          }
        })
      } catch (notifErr) {
        console.warn('Aviso ao gerar notificação de nova implantação:', notifErr)
      }

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

  const previewEtapas = (tipoCliente && ((tipoCliente === 'SHOPEE' && selectedOperacoes.length > 0) || (tipoCliente === 'NORMAL' && selectedModulosTreinamento.length > 0)))
    ? generateEtapas()
    : []

  const modulosCount = selectedModulosContratados.filter(n => modulosMantranList.some(m => m.nome === n)).length
  const integracoesCount = selectedModulosContratados.filter(n => integracoesList.some(m => m.nome === n)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 bg-slate-900/40">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Rocket className="w-5 h-5 text-brand-500" />
              Nova Implantação
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Passo {step} de 5</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (1 to 5) */}
        <div className="flex items-center px-6 py-3.5 bg-slate-900/60 border-b border-slate-800 shrink-0">
          {[
            { num: 1, label: 'Dados Básicos' },
            { num: 2, label: 'Módulos Contratados' },
            { num: 3, label: 'Treinamento / Operações' },
            { num: 4, label: 'Analista' },
            { num: 5, label: 'Confirmação' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                  s.num < step ? "bg-brand-500 text-white" :
                  s.num === step ? "bg-brand-500/20 text-brand-400 border-2 border-brand-500 shadow-sm shadow-brand-500/30" :
                  "bg-slate-800 text-slate-500"
                )}>
                  {s.num < step ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className={clsx(
                  "text-xs font-semibold hidden md:inline truncate max-w-[120px]",
                  s.num === step ? "text-white" : "text-slate-500"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < 4 && (
                <div className={clsx(
                  "flex-1 h-0.5 mx-2 transition-all",
                  s.num < step ? "bg-brand-500" : "bg-slate-800"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP 1: Dados Básicos */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Nome da Empresa <span className="text-rose-400">*</span>
                </label>
                <input 
                  type="text"
                  value={nomeEmpresa}
                  onChange={e => setNomeEmpresa(e.target.value)}
                  placeholder="Ex: Transportes ABC"
                  className="input-field w-full text-base py-2.5"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Base Disponível <span className="text-rose-400">*</span>
                </label>
                {loading ? (
                  <p className="text-slate-500 text-sm">Carregando bases disponíveis...</p>
                ) : (
                  <select 
                    value={selectedBase} 
                    onChange={e => setSelectedBase(e.target.value)}
                    className="input-field w-full text-base py-2.5 font-mono cursor-pointer"
                  >
                    <option value="">Selecione uma base livre...</option>
                    {basesDisponiveis.map((b: any) => (
                      <option key={b.id} value={b.nome_base}>{b.nome_base}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-500 mt-1">{basesDisponiveis.length} bases disponíveis encontradas</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Tipo de Cliente <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoCliente('NORMAL')}
                    className={clsx(
                      "flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-200",
                      tipoCliente === 'NORMAL' 
                        ? "border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10" 
                        : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    <Building className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">NORMAL</span>
                    <span className="text-xs mt-1 opacity-60">Cliente Padrão Mantran</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCliente('SHOPEE')}
                    className={clsx(
                      "flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-200",
                      tipoCliente === 'SHOPEE' 
                        ? "border-orange-500 bg-orange-500/10 text-orange-400 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/10" 
                        : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    <ShoppingBag className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">SHOPEE</span>
                    <span className="text-xs mt-1 opacity-60">Operações Shopee 4PL</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Módulos e Integrações Contratados (Como na tela de Clientes) */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-400" />
                    Módulos e Integrações Contratados
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione os módulos contratados pelo cliente ({nomeEmpresa}). Eles serão salvos no cadastro de Clientes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {modulosCount} módulos • {integracoesCount} integrações
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Coluna 1: Módulos Mantran */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-blue-400" />
                      Módulos Mantran ({modulosMantranList.length})
                    </h4>
                    <button
                      type="button"
                      onClick={selectAllModulosMantran}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
                    >
                      {modulosMantranList.every(m => selectedModulosContratados.includes(m.nome))
                        ? 'Desmarcar Todos'
                        : 'Selecionar Todos'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                    {modulosMantranList.map((modulo) => {
                      const isChecked = selectedModulosContratados.includes(modulo.nome)
                      return (
                        <label
                          key={modulo.id}
                          className={clsx(
                            "flex items-center p-2.5 rounded-xl border cursor-pointer transition-all select-none",
                            isChecked
                              ? "bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-sm"
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          )}
                        >
                          <div className={clsx(
                            "w-4 h-4 rounded border flex items-center justify-center mr-2.5 transition-colors shrink-0",
                            isChecked ? "bg-blue-500 border-blue-500 text-white" : "border-slate-600 bg-slate-950"
                          )}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isChecked}
                            onChange={() => toggleModuloContratado(modulo.nome)}
                          />
                          <span className="text-xs font-semibold truncate">{modulo.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Coluna 2: Integrações */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Integrações ({integracoesList.length})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                    {integracoesList.map((modulo) => {
                      const isChecked = selectedModulosContratados.includes(modulo.nome)
                      return (
                        <label
                          key={modulo.id}
                          className={clsx(
                            "flex items-center p-2.5 rounded-xl border cursor-pointer transition-all select-none",
                            isChecked
                              ? "bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-sm"
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          )}
                        >
                          <div className={clsx(
                            "w-4 h-4 rounded border flex items-center justify-center mr-2.5 transition-colors shrink-0",
                            isChecked ? "bg-purple-500 border-purple-500 text-white" : "border-slate-600 bg-slate-950"
                          )}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isChecked}
                            onChange={() => toggleModuloContratado(modulo.nome)}
                          />
                          <span className="text-xs font-semibold truncate">{modulo.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 3: Configuração de Treinamento / Operações */}
          {step === 3 && tipoCliente === 'SHOPEE' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Operações Shopee 4PL
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Selecione as operações que farão parte do escopo da implantação
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {OPERACOES_SHOPEE.map(op => (
                    <label
                      key={op}
                      className={clsx(
                        "flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none",
                        selectedOperacoes.includes(op) 
                          ? "border-orange-500 bg-orange-500/10 text-orange-300" 
                          : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-colors",
                        selectedOperacoes.includes(op) 
                          ? "bg-orange-500 border-orange-500 text-white" 
                          : "border-slate-500 bg-slate-950"
                      )}>
                        {selectedOperacoes.includes(op) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedOperacoes.includes(op)} onChange={() => toggleOperacao(op)} />
                      <span className="text-sm font-bold">{op}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedOperacoes.includes('Line Haul') && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-xs text-amber-300 font-medium">
                    ⚡ Line Haul selecionado — inclui "Treinamento de Cadastros" e "Treinamento de Line Haul"
                  </span>
                </div>
              )}

              {previewEtapas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Preview das Etapas da Implantação ({previewEtapas.length})
                  </h4>
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 max-h-40 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60">
                    {previewEtapas.map((etapa, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 text-xs">
                        <span className="text-slate-500 font-mono w-5 shrink-0">{i + 1}.</span>
                        <span className="text-slate-200 font-semibold">{etapa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && tipoCliente === 'NORMAL' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Módulos para Etapas de Treinamento
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Selecione quais módulos exigirão uma etapa dedicada de Treinamento na Implantação
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {modulosMantranList.map((mod: any) => (
                    <label
                      key={mod.id}
                      className={clsx(
                        "flex items-center p-3 rounded-xl border cursor-pointer transition-all select-none",
                        selectedModulosTreinamento.includes(mod.nome) 
                          ? "border-blue-500/60 bg-blue-500/10 text-blue-300 shadow-sm" 
                          : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "w-4 h-4 rounded border flex items-center justify-center mr-2.5 transition-colors shrink-0",
                        selectedModulosTreinamento.includes(mod.nome) 
                          ? "bg-blue-500 border-blue-500 text-white" 
                          : "border-slate-600 bg-slate-950"
                      )}>
                        {selectedModulosTreinamento.includes(mod.nome) && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedModulosTreinamento.includes(mod.nome)} onChange={() => toggleModuloTreinamento(mod.nome)} />
                      <span className="text-xs font-semibold truncate">{mod.nome}</span>
                    </label>
                  ))}
                </div>
              </div>

              {previewEtapas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Preview das Etapas da Implantação ({previewEtapas.length})
                  </h4>
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 max-h-40 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60">
                    {previewEtapas.map((etapa, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 text-xs">
                        <span className="text-slate-500 font-mono w-5 shrink-0">{i + 1}.</span>
                        <span className="text-slate-200 font-semibold">{etapa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Analista Responsável (Perfil Suporte) */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-400" />
                  Analista Responsável
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Selecione o analista da equipe de Suporte que acompanhará este onboarding
                </p>

                {analistasSuporte.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-amber-300">Nenhum analista com Perfil Suporte encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">Você pode prosseguir e vincular o analista posteriormente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                        Selecionar Analista de Suporte
                      </label>
                      <select
                        value={selectedAnalistaId}
                        onChange={(e) => {
                          const id = e.target.value
                          const user = analistasSuporte.find((u: any) => u.id === id)
                          handleSelectAnalista(id, user ? (user.nome || user.login) : '')
                        }}
                        className="input-field w-full text-base py-2.5 font-medium cursor-pointer"
                      >
                        <option value="">-- Não atribuir analista agora --</option>
                        {analistasSuporte.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.nome || u.login} ({u.login}) - Suporte
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {analistasSuporte.map((u: any) => {
                        const isSelected = selectedAnalistaId === u.id
                        const displayName = u.nome || u.login
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleSelectAnalista(isSelected ? '' : u.id, isSelected ? '' : displayName)}
                            className={clsx(
                              "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none",
                              isSelected 
                                ? "border-brand-500 bg-brand-500/10 text-white shadow-md shadow-brand-500/10" 
                                : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50"
                            )}
                          >
                            <div className={clsx(
                              "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 uppercase transition-colors",
                              isSelected 
                                ? "bg-brand-500 text-white" 
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            )}>
                              {displayName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate text-white">{displayName}</p>
                              <p className="text-xs text-slate-400 truncate">@{u.login}</p>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-brand-400 shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Confirmação e Revisão Completa */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-4">
                <Rocket className="w-10 h-10 text-brand-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Confirmar Implantação</h3>
                <p className="text-xs text-slate-400">Revise os dados antes de finalizar o cadastro</p>
              </div>

              <div className="bg-slate-900/60 rounded-xl border border-slate-800 divide-y divide-slate-800">
                <div className="flex justify-between p-3.5 text-xs">
                  <span className="text-slate-400 font-semibold">Empresa</span>
                  <span className="font-bold text-white text-sm">{nomeEmpresa}</span>
                </div>
                <div className="flex justify-between p-3.5 text-xs">
                  <span className="text-slate-400 font-semibold">Base Mantran</span>
                  <span className="font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {selectedBase}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 text-xs">
                  <span className="text-slate-400 font-semibold">Tipo</span>
                  <span className={clsx(
                    "font-bold px-2 py-0.5 rounded text-xs",
                    tipoCliente === 'SHOPEE' ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  )}>
                    {tipoCliente}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 text-xs">
                  <span className="text-slate-400 font-semibold">Analista Responsável</span>
                  {selectedAnalistaNome ? (
                    <span className="font-bold text-brand-400 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      {selectedAnalistaNome}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Sem analista atribuído</span>
                  )}
                </div>

                {/* Módulos Contratados no Cliente */}
                <div className="p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Módulos Contratados (Tela Clientes)</span>
                    <span className="text-slate-300 font-bold">{selectedModulosContratados.length} itens</span>
                  </div>
                  {selectedModulosContratados.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedModulosContratados.map((mod) => (
                        <span key={mod} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {mod}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Nenhum módulo selecionado previamente</p>
                  )}
                </div>

                {tipoCliente === 'SHOPEE' && (
                  <div className="flex justify-between p-3.5 text-xs">
                    <span className="text-slate-400 font-semibold">Operações Shopee</span>
                    <span className="font-semibold text-orange-300">{selectedOperacoes.join(', ')}</span>
                  </div>
                )}
                
                <div className="flex justify-between p-3.5 text-xs">
                  <span className="text-slate-400 font-semibold">Etapas do Processo</span>
                  <span className="font-bold text-brand-400">{previewEtapas.length} etapas geradas</span>
                </div>
              </div>

              {/* Acesso do Cliente Pré-Visualização */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-brand-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-brand-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Acesso do Cliente (Criado Automaticamente)</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Perfil Cliente
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Usuário (Login)</span>
                    <span className="font-bold text-white">{nomeEmpresa}@Mantran</span>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Senha Padrão</span>
                    <span className="font-mono font-bold text-emerald-400">{getBaseNumero(selectedBase)}@Mantran</span>
                  </div>
                </div>
              </div>

              {/* Lista das Etapas */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etapas a serem geradas</h4>
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 max-h-36 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60">
                  {previewEtapas.map((etapa, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                      <span className="text-slate-500 font-mono w-5 shrink-0">{i + 1}.</span>
                      <span className="text-slate-300 font-semibold">{etapa}</span>
                      <span className="ml-auto text-[10px] text-slate-600 uppercase font-mono">EM BRANCO</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-between shrink-0">
          {step > 1 ? (
            <button 
              type="button" 
              onClick={() => setStep(step - 1)} 
              className="btn-secondary flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancelar
            </button>
          )}
          
          {step < 5 ? (
            <button 
              type="button" 
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              <Rocket className="w-4 h-4" />
              {saving ? 'Criando Implantação...' : 'Criar Implantação'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
