import { useState, useEffect } from 'react'
import { Plus, Search, Building } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LeoMadeirasTable } from '../components/LeoMadeirasTable'
import type { LeoEmpresa } from '../components/LeoMadeirasTable'
import { NovaEmpresaLeoModal } from '../components/NovaEmpresaLeoModal'
import { EditarEmpresaLeoModal } from '../components/EditarEmpresaLeoModal'
import { UsuariosLeoModal } from '../components/UsuariosLeoModal'
import { ModulosLeoModal } from '../components/ModulosLeoModal'

export function LeoMadeiras() {
  const [empresas, setEmpresas] = useState<LeoEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isNovaEmpresaOpen, setIsNovaEmpresaOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [empresaToEdit, setEmpresaToEdit] = useState<LeoEmpresa | null>(null)
  
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null)
  const [selectedEmpresaNome, setSelectedEmpresaNome] = useState('')
  const [selectedCdEmpresa, setSelectedCdEmpresa] = useState('')
  const [isUsuariosOpen, setIsUsuariosOpen] = useState(false)
  const [isModulosOpen, setIsModulosOpen] = useState(false)

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leo_empresas')
        .select(`
          id,
          cd_empresa,
          nome_empresa,
          tipo,
          leo_usuarios (id, senha),
          leo_modulos (id, ativo)
        `)
        .order('cd_empresa', { ascending: true })

      if (error) throw error

      if (data) {
        const mappedData: LeoEmpresa[] = data.map((e: any) => {
          const usuarios = e.leo_usuarios || []
          const modulos = e.leo_modulos || []
          
          return {
            id: e.id,
            cd_empresa: e.cd_empresa,
            nome_empresa: e.nome_empresa,
            tipo: e.tipo || 'LÉO',
            has_usuarios: usuarios.length > 0,
            has_modulos: modulos.filter((m:any) => m.ativo).length > 0,
            senha_padrao: usuarios.length > 0 ? usuarios[0].senha : ''
          }
        })
        setEmpresas(mappedData)
      }
    } catch (err) {
      console.error('Erro ao buscar empresas da Léo:', err)
      alert('Erro ao carregar dados da Léo Madeiras. Certifique-se de que rodou o script SQL das novas tabelas.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNovaEmpresa = async (cdEmpresa: string, nomeEmpresa: string) => {
    try {
      let finalCd = cdEmpresa
      
      // Auto-generate cd_empresa if empty
      if (!finalCd) {
        // Find highest current cd_empresa
        let max = 0
        empresas.forEach(e => {
          const num = parseInt(e.cd_empresa, 10)
          if (!isNaN(num) && num > max) max = num
        })
        finalCd = String(max + 1).padStart(3, '0')
      }

      // Check if already exists
      if (empresas.some(e => e.cd_empresa === finalCd)) {
        return alert(`Já existe uma empresa com o código ${finalCd}`)
      }

      const { data, error } = await supabase
        .from('leo_empresas')
        .insert([{ cd_empresa: finalCd, nome_empresa: nomeEmpresa }])
        .select()
        .single()
        
      if (error) throw error

      // Auto create a default user for this company
      const defaultLogin = nomeEmpresa.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'admin'
      await supabase.from('leo_usuarios').insert([{
        leo_empresa_id: data.id,
        login: defaultLogin,
        senha: `012@Mantran`
      }])

      setIsNovaEmpresaOpen(false)
      fetchEmpresas()
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err)
      alert('Erro ao salvar: ' + (err.message || 'Desconhecido'))
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente EXCLUIR a empresa ${nome}?`)) return
    try {
      const { error } = await supabase.from('leo_empresas').delete().eq('id', id)
      if (error) throw error
      fetchEmpresas()
    } catch (err) {
      console.error('Erro ao deletar:', err)
      alert('Erro ao deletar a empresa.')
    }
  }

  const handleEdit = (empresa: LeoEmpresa) => {
    setEmpresaToEdit(empresa)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (id: string, novoNome: string) => {
    try {
      const { error } = await supabase
        .from('leo_empresas')
        .update({ nome_empresa: novoNome })
        .eq('id', id)
        
      if (error) throw error
      setIsEditModalOpen(false)
      fetchEmpresas()
    } catch (err: any) {
      console.error('Erro ao editar empresa:', err)
      alert('Erro ao salvar edição: ' + err.message)
    }
  }

  const handleOpenUsuarios = (id: string, nome: string) => {
    setSelectedEmpresaId(id)
    setSelectedEmpresaNome(nome)
    
    // Find the cd_empresa to pass for password generation
    const emp = empresas.find(e => e.id === id)
    setSelectedCdEmpresa(emp?.cd_empresa || '')
    
    setIsUsuariosOpen(true)
  }

  const handleOpenModulos = (id: string, nome: string) => {
    setSelectedEmpresaId(id)
    setSelectedEmpresaNome(nome)
    setIsModulosOpen(true)
  }

  const filteredEmpresas = empresas.filter(e => 
    e.cd_empresa.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.nome_empresa.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Building className="w-8 h-8 mr-3 text-orange-500" />
            Léo Madeiras
          </h1>
          <p className="text-slate-400 mt-1 font-mono text-sm">Base: dbMantranLeo012</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar CD ou Empresa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <button 
            onClick={() => setIsNovaEmpresaOpen(true)}
            className="btn-primary flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Empresa</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">
          Carregando dados da Léo Madeiras...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <LeoMadeirasTable 
            empresas={filteredEmpresas} 
            onOpenUsuarios={handleOpenUsuarios}
            onOpenModulos={handleOpenModulos}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <NovaEmpresaLeoModal
        isOpen={isNovaEmpresaOpen}
        onClose={() => setIsNovaEmpresaOpen(false)}
        onSave={handleSaveNovaEmpresa}
      />

      <EditarEmpresaLeoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        empresa={empresaToEdit}
        onSave={handleSaveEdit}
      />

      <UsuariosLeoModal
        isOpen={isUsuariosOpen}
        onClose={() => { setIsUsuariosOpen(false); fetchEmpresas(); }}
        empresaId={selectedEmpresaId}
        empresaNome={selectedEmpresaNome}
        cdEmpresa={selectedCdEmpresa}
      />

      <ModulosLeoModal
        isOpen={isModulosOpen}
        onClose={() => { setIsModulosOpen(false); fetchEmpresas(); }}
        empresaId={selectedEmpresaId}
        empresaNome={selectedEmpresaNome}
      />
    </div>
  )
}
