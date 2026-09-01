import { useState, useEffect } from 'react'
import { X, Shield, Check, Lock, Database, LayoutDashboard, Users, Rocket, Cloud, CheckCircle2, Save, ShoppingBag } from 'lucide-react'
import { permissionsApi, DEFAULT_PERMISSOES } from '../lib/permissions'
import type { PerfilPermissao } from '../lib/permissions'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'

interface PermissoesModalProps {
  isOpen: boolean
  onClose: () => void
}

const AVAILABLE_PROFILES = [
  { id: 'Administrador', label: 'Administrador', desc: 'Acesso total e irrestrito ao sistema', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'Tecnico', label: 'Técnico', desc: 'Acesso técnico operacional', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { id: 'Suporte', label: 'Suporte', desc: 'Acesso aos módulos e suporte a implantações', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'Usuario', label: 'Usuário', desc: 'Acesso geral em modo somente leitura', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'Parceiro', label: 'Parceiro', desc: 'Acesso restrito para parceiros externos', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
]

const AVAILABLE_MODULES = [
  { path: '/', label: 'Dashboard', desc: 'Métricas gerais e visão executiva', icon: LayoutDashboard },
  { path: '/clientes', label: 'Clientes', desc: 'Gerenciamento de clientes e bases de dados', icon: Users },
  { path: '/implantacoes', label: 'Implantações', desc: 'Processo de onboarding e etapas de implantação', icon: Rocket },
  { path: '/bases', label: 'Projetos', desc: 'Planilha e controle de status de projetos', icon: Database },
  { path: '/processamento-shopee', label: 'Processamento Shopee', desc: 'Acompanhamento de fechamento de Last/First Mile e Line Haul', icon: ShoppingBag },
  { path: '/leo-madeiras', label: 'Léo Madeiras', desc: 'Módulo dedicado da Léo Madeiras', icon: Cloud },
]

export function PermissoesModal({ isOpen, onClose }: PermissoesModalProps) {
  const [selectedPerfil, setSelectedPerfil] = useState('Parceiro')
  const [permissions, setPermissions] = useState<Record<string, PerfilPermissao>>(DEFAULT_PERMISSOES)
  const [projetos, setProjetos] = useState<{ id: string, nome: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const perms = await permissionsApi.getPermissions()
      setPermissions(perms)

      const { data: projs } = await supabase
        .from('projetos')
        .select('id, nome')
        .order('nome', { ascending: true })

      if (projs) setProjetos(projs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const currentPerm: PerfilPermissao = permissions[selectedPerfil] || {
    perfil: selectedPerfil,
    rotas: ['/bases'],
    projeto_especifico_id: null,
    read_only: selectedPerfil === 'Usuario' || selectedPerfil === 'Parceiro'
  }

  const toggleRoute = (path: string) => {
    if (selectedPerfil === 'Administrador') return // Admin has all routes
    const currentRotas = currentPerm.rotas || []
    const exists = currentRotas.includes(path)
    const newRotas = exists 
      ? currentRotas.filter(r => r !== path)
      : [...currentRotas, path]

    setPermissions({
      ...permissions,
      [selectedPerfil]: {
        ...currentPerm,
        rotas: newRotas
      }
    })
  }

  const handleProjetoChange = (projetoId: string | null) => {
    setPermissions({
      ...permissions,
      [selectedPerfil]: {
        ...currentPerm,
        projeto_especifico_id: projetoId || null
      }
    })
  }

  const handleReadOnlyToggle = (isReadOnly: boolean) => {
    setPermissions({
      ...permissions,
      [selectedPerfil]: {
        ...currentPerm,
        read_only: isReadOnly
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await permissionsApi.savePermission(currentPerm)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err: any) {
      alert('Erro ao salvar permissões: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Controle de Permissões por Perfil</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Defina com precisão quais telas e projetos cada perfil pode visualizar e acessar
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Profiles Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/30 px-6 pt-3 gap-2 shrink-0 custom-scrollbar">
          {AVAILABLE_PROFILES.map(prof => (
            <button
              key={prof.id}
              onClick={() => setSelectedPerfil(prof.id)}
              className={clsx(
                "px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t border-x shrink-0",
                selectedPerfil === prof.id
                  ? "bg-dark-card border-slate-700 text-white shadow-lg -mb-[1px] border-b-transparent"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              )}
            >
              <span className={clsx("w-2 h-2 rounded-full", prof.color.split(' ')[0].replace('text-', 'bg-'))}></span>
              <span>{prof.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 flex-1">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Carregando configurações de acesso...</span>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            
            {/* Active Profile Info Banner */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil Selecionado</span>
                <h3 className="text-lg font-black text-white mt-0.5">{selectedPerfil}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {AVAILABLE_PROFILES.find(p => p.id === selectedPerfil)?.desc}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={clsx(
                  "text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5",
                  currentPerm.read_only 
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                )}>
                  {currentPerm.read_only ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{currentPerm.read_only ? 'Somente Leitura' : 'Leitura & Escrita'}</span>
                </span>
              </div>
            </div>

            {/* Section 1: Telas Permitidas */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Telas & Menus Permitidos no Sidebar
                </h4>
                {selectedPerfil === 'Administrador' && (
                  <span className="text-[11px] text-amber-400 font-semibold italic">
                    Administrador possui acesso obrigatório a todas as telas
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_MODULES.map(mod => {
                  const isAllowed = selectedPerfil === 'Administrador' || (currentPerm.rotas || []).includes(mod.path)
                  const Icon = mod.icon

                  return (
                    <div
                      key={mod.path}
                      onClick={() => selectedPerfil !== 'Administrador' && toggleRoute(mod.path)}
                      className={clsx(
                        "p-3.5 rounded-xl border transition-all flex items-start gap-3 select-none",
                        selectedPerfil !== 'Administrador' && "cursor-pointer",
                        isAllowed
                          ? "bg-brand-500/10 border-brand-500/40 text-white shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                          : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        isAllowed
                          ? "bg-brand-500/20 border-brand-500/30 text-brand-400"
                          : "bg-slate-800 border-slate-700 text-slate-500"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold truncate">{mod.label}</span>
                          <div className={clsx(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                            isAllowed
                              ? "bg-brand-500 border-brand-500 text-white"
                              : "border-slate-700 bg-slate-800"
                          )}>
                            {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{mod.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Restrição de Projeto Específico */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>2. Restrição de Projeto (Opcional)</span>
                {selectedPerfil === 'Parceiro' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Recomendado para Parceiros
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">
                Se você deseja que o usuário com este perfil visualize <strong>apenas um projeto específico</strong> (como o projeto Shopee 4PL), selecione-o abaixo:
              </p>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Projeto Permitido para este Perfil:
                  </label>
                  <select
                    value={currentPerm.projeto_especifico_id || ''}
                    onChange={e => handleProjetoChange(e.target.value ? e.target.value : null)}
                    disabled={selectedPerfil === 'Administrador'}
                    className="input-field py-2 px-3 text-xs w-full max-w-md bg-slate-800 border-slate-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Acesso a Todos os Projetos (Padrão) --</option>
                    {projetos.map(p => (
                      <option key={p.id} value={p.id}>
                        Projeto: {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {currentPerm.projeto_especifico_id && (
                  <div className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium flex items-center gap-2">
                    <Database className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Usuário verá apenas este projeto selecionado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Modo Somente Leitura */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Modo de Operação (Edição vs Somente Leitura)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={clsx(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                  !currentPerm.read_only
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                )}>
                  <input
                    type="radio"
                    name="readOnlyOption"
                    disabled={selectedPerfil === 'Administrador'}
                    checked={!currentPerm.read_only}
                    onChange={() => handleReadOnlyToggle(false)}
                    className="text-emerald-500 focus:ring-emerald-500/20 bg-slate-900"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Acesso Completo (Edição / Inclusão)</span>
                    <span className="text-[11px] text-slate-400">Pode criar, editar e atualizar registros</span>
                  </div>
                </label>

                <label className={clsx(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                  currentPerm.read_only
                    ? "bg-amber-500/10 border-amber-500/40 text-white"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                )}>
                  <input
                    type="radio"
                    name="readOnlyOption"
                    disabled={selectedPerfil === 'Administrador'}
                    checked={!!currentPerm.read_only}
                    onChange={() => handleReadOnlyToggle(true)}
                    className="text-amber-500 focus:ring-amber-500/20 bg-slate-900"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Somente Leitura (Consulta Apenas)</span>
                    <span className="text-[11px] text-slate-400">Não pode alterar, incluir nem excluir nada</span>
                  </div>
                </label>
              </div>
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/70 flex justify-between items-center gap-3 shrink-0">
          <div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Permissões salvas com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-4 text-xs"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-2 px-5 text-xs flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Configuração</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
