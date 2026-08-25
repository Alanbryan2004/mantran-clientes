import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BaseMantran } from '../data/mockBases'
import { ClientesTable } from '../components/ClientesTable'
import { NovoClienteModal } from '../components/NovoClienteModal'
import { EditarClienteModal } from '../components/EditarClienteModal'
import { UsuariosModal } from '../components/UsuariosModal'
import { ModulosModal } from '../components/ModulosModal'
import { NovaBaseModal } from '../components/NovaBaseModal'
import { Plus, Search, Database, ShoppingBag, Briefcase, Layers } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

export function Clientes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [clientes, setClientes] = useState<BaseMantran[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNovaBaseOpen, setIsNovaBaseOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [isUsuariosOpen, setIsUsuariosOpen] = useState(false)
  const [isModulosOpen, setIsModulosOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [clienteToEdit, setClienteToEdit] = useState<BaseMantran | null>(null)
  
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [selectedClienteNome, setSelectedClienteNome] = useState('')
  const [selectedBaseId, setSelectedBaseId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [tipoFilter, setTipoFilter] = useState<string>(() => {
    const param = searchParams.get('tipo')?.toUpperCase()
    return param === 'SHOPEE' || param === 'NORMAL' || param === 'COMMERSYS' ? param : 'TODOS'
  })

  useEffect(() => {
    const param = searchParams.get('tipo')?.toUpperCase()
    if (param === 'SHOPEE' || param === 'NORMAL' || param === 'COMMERSYS') {
      setTipoFilter(param)
    } else if (!param) {
      setTipoFilter('TODOS')
    }
  }, [searchParams])

  const handleSetFilter = (tipo: string) => {
    setTipoFilter(tipo)
    if (tipo === 'TODOS') {
      setSearchParams({})
    } else {
      setSearchParams({ tipo })
    }
  }

  const availableBases = clientes.filter(c => !c.empresa)

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.empresa && c.empresa.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesTipo = tipoFilter === 'TODOS' || c.tipo === tipoFilter

    return matchesSearch && matchesTipo
  })

  const handleEditCliente = (cliente: BaseMantran) => {
    setClienteToEdit(cliente)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (clienteDbId: string, data: { empresa: string, tipo: string, senha: string, possui_aditivo?: boolean }) => {
    try {
      await api.updateCliente(clienteDbId, { 
        nome_empresa: data.empresa, 
        tipo: data.tipo,
        possui_aditivo: data.possui_aditivo
      })
      if (data.senha) {
        // Try to update existing user passwords
        const users = await api.getUsuariosByCliente(clienteDbId)
        if (users && users.length > 0) {
          await api.updateUsuariosByCliente(clienteDbId, { senha: data.senha })
        } else {
          // If no user exists, create one
          const login = data.empresa.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'admin'
          await api.insertUsuario({ cliente_id: clienteDbId, login, senha: data.senha })
        }
      }
      await fetchBases()
    } catch (err) {
      console.error('Erro ao editar:', err)
    }
  }

  const handleDeleteCliente = async (clienteDbId: string, baseNome: string, empresa: string) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR a empresa ${empresa}? Isso irá limpar a base ${baseNome} e apagar todos os usuários e módulos.`)) return
    
    try {
      // 1. Release the base
      const baseData = await api.getBaseByName(baseNome)
      if (baseData) {
        await api.updateBase(baseData.id, { cliente_id: null, status: 'Disponível' })
      }
      
      // 2. Delete dependencies explicitly
      await api.deleteUsuariosByCliente(clienteDbId)
      await api.deleteModulosByCliente(clienteDbId)
      
      // 3. Delete the client itself
      await api.deleteCliente(clienteDbId)
      
      await fetchBases()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir cliente.')
    }
  }

  const handleOpenUsuarios = (id: string, nome: string, baseId: string) => {
    setSelectedClienteId(id)
    setSelectedClienteNome(nome)
    setSelectedBaseId(baseId)
    setIsUsuariosOpen(true)
  }

  const handleOpenModulos = (id: string, nome: string) => {
    setSelectedClienteId(id)
    setSelectedClienteNome(nome)
    setIsModulosOpen(true)
  }

  const handleSaveLote = async (quantidade: number, baseInicial: number) => {
    try {
      const basesToInsert = []
      for (let i = 0; i < quantidade; i++) {
        const num = baseInicial + i
        basesToInsert.push({ nome_base: `dbMantran${String(num).padStart(3, '0')}` })
      }
      await api.insertBases(basesToInsert)
      setIsNovaBaseOpen(false)
      fetchBases()
    } catch (err: any) {
      console.error('Erro ao criar lote:', err)
      alert('Erro ao criar bases: ' + err.message)
    }
  }

  const handleSaveManual = async (nomeBase: string) => {
    try {
      await api.insertBases([{ nome_base: nomeBase }])
      setIsNovaBaseOpen(false)
      fetchBases()
    } catch (err: any) {
      console.error('Erro ao criar base:', err)
      alert('Erro ao criar base: ' + err.message)
    }
  }

  const allBasesStrings = clientes.map(c => c.id)

  useEffect(() => {
    checkAndSeedBases().then(() => fetchBases())
  }, [])

  const checkAndSeedBases = async () => {
    try {
      const count = await api.getBasesCount()
      
      if (count === 0) {
        console.log('Sem bases encontradas. Criando 120 bases iniciais...')
        const basesToInsert = []
        for (let i = 1; i <= 120; i++) {
          const paddedId = String(i).padStart(3, '0')
          basesToInsert.push({ nome_base: `dbMantran${paddedId}` })
        }
        await api.insertBases(basesToInsert)
      }
    } catch (err) {
      console.error('Erro ao popular bases:', err)
    }
  }

  const fetchBases = async () => {
    setLoading(true)
    try {
      const data = await api.getBasesWithClientes()

      if (data) {
        const mappedData: BaseMantran[] = data.map((b: any) => {
          const cliente = Array.isArray(b.clientes) ? b.clientes[0] : b.clientes

          const mappedBase: BaseMantran = {
            id: b.nome_base,
            clienteDbId: cliente?.id,
            empresa: cliente?.nome_empresa || '',
            tipo: cliente?.tipo || '',
            possui_aditivo: cliente?.possui_aditivo || false,
            migradas: b.migrada ? 'OK' : (cliente ? 'NOK' : ''),
            ts: '', servico: '', lic: '', dblogin: '', senha: ''
          }
          
          if (cliente) {
            const mods = cliente.modulos || []
            mappedBase.ts = mods.find((m: any) => m.nome_modulo === 'TS')?.ativo ? 'OK' : 'NOK'
            mappedBase.servico = mods.find((m: any) => m.nome_modulo === 'SERVIÇO')?.ativo ? 'OK' : 'NOK'
            mappedBase.lic = mods.find((m: any) => m.nome_modulo === 'LIC')?.ativo ? 'OK' : 'NOK'
            
            const users = cliente.usuarios_gpo || []
            mappedBase.dblogin = users.length > 0 ? 'OK' : 'NOK'
            mappedBase.senha = users.length > 0 ? users[0].senha : ''
          }
          return mappedBase
        })
        setClientes(mappedData)
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      alert('Erro ao carregar os clientes do banco.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNovoCliente = async (baseId: string, data: Partial<BaseMantran>) => {
    try {
      // 1. Encontrar o ID da base selecionada
      const baseData = await api.getBaseByName(baseId)
        
      if (!baseData) throw new Error('Base não encontrada')

      // 2. Inserir Cliente
      const clienteData = await api.insertCliente({ 
        nome_empresa: data.empresa || '', 
        tipo: data.tipo || 'NORMAL',
        possui_aditivo: data.possui_aditivo || false
      })

      // 3. Atualizar a Base com o cliente_id
      await api.updateBase(baseData.id, { cliente_id: clienteData.id, status: 'Em Uso' })

      // 4. Inserir Módulos - Removido pois não estão mais na tela

      // 5. Inserir Usuário GPO
      if (data.senha) {
        await api.insertUsuario({
          cliente_id: clienteData.id,
          login: data.empresa?.toLowerCase().replace(/\s/g, '') || 'admin', // mock login
          senha: data.senha
        })
      }

      // 6. Recarregar a tabela para refletir as mudanças do banco
      await fetchBases()
      
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err)
      alert('Erro ao salvar cliente: ' + (err.message || 'Desconhecido'))
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-slate-400 mt-1">Gerenciamento das bases de dados e clientes Mantran</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Tipo filter buttons */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => handleSetFilter('TODOS')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                tipoFilter === 'TODOS'
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => handleSetFilter('SHOPEE')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                tipoFilter === 'SHOPEE'
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Shopee
            </button>
            <button
              onClick={() => handleSetFilter('NORMAL')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                tipoFilter === 'NORMAL'
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Normais
            </button>
            <button
              onClick={() => handleSetFilter('COMMERSYS')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                tipoFilter === 'COMMERSYS'
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Commersys
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar base ou empresa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsNovaBaseOpen(true)}
              className="btn-secondary flex items-center justify-center space-x-2 whitespace-nowrap w-full sm:w-auto"
            >
              <Database className="w-5 h-5" />
              <span>Nova Base</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20 whitespace-nowrap w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">
          Carregando clientes do Supabase...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <ClientesTable 
            clientes={filteredClientes} 
            onOpenUsuarios={handleOpenUsuarios}
            onOpenModulos={handleOpenModulos}
            onEdit={handleEditCliente}
            onDelete={handleDeleteCliente}
          />
        </div>
      )}

      <NovoClienteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableBases={availableBases}
        onSave={handleSaveNovoCliente}
      />

      <EditarClienteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        cliente={clienteToEdit}
        onSave={handleSaveEdit}
      />

      <NovaBaseModal
        isOpen={isNovaBaseOpen}
        onClose={() => setIsNovaBaseOpen(false)}
        basesAtuais={allBasesStrings}
        onSaveLote={handleSaveLote}
        onSaveManual={handleSaveManual}
      />

      <UsuariosModal
        isOpen={isUsuariosOpen}
        onClose={() => setIsUsuariosOpen(false)}
        clienteId={selectedClienteId}
        clienteNome={selectedClienteNome}
        baseId={selectedBaseId}
      />

      <ModulosModal
        isOpen={isModulosOpen}
        onClose={() => setIsModulosOpen(false)}
        clienteId={selectedClienteId}
        clienteNome={selectedClienteNome}
      />
    </div>
  )
}
