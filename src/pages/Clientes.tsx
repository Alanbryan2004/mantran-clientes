import { useState, useEffect } from 'react'
import type { BaseMantran } from '../data/mockBases'
import { ClientesTable } from '../components/ClientesTable'
import { NovoClienteModal } from '../components/NovoClienteModal'
import { EditarClienteModal } from '../components/EditarClienteModal'
import { UsuariosModal } from '../components/UsuariosModal'
import { ModulosModal } from '../components/ModulosModal'
import { NovaBaseModal } from '../components/NovaBaseModal'
import { Plus, Search, Database } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function Clientes() {
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

  const availableBases = clientes.filter(c => !c.empresa)

  const filteredClientes = clientes.filter(c => 
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.empresa && c.empresa.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleEditCliente = (cliente: BaseMantran) => {
    setClienteToEdit(cliente)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (clienteDbId: string, data: { empresa: string, tipo: string, senha: string, possui_aditivo?: boolean }) => {
    try {
      await supabase.from('clientes').update({ 
        nome_empresa: data.empresa, 
        tipo: data.tipo,
        possui_aditivo: data.possui_aditivo
      }).eq('id', clienteDbId)
      if (data.senha) {
        // Try to update existing user passwords
        const { data: users } = await supabase.from('usuarios_gpo').select('id').eq('cliente_id', clienteDbId)
        if (users && users.length > 0) {
          await supabase.from('usuarios_gpo').update({ senha: data.senha }).eq('cliente_id', clienteDbId)
        } else {
          // If no user exists, create one
          const login = data.empresa.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'admin'
          await supabase.from('usuarios_gpo').insert([{ cliente_id: clienteDbId, login, senha: data.senha }])
        }
      }
      await fetchBases()
    } catch (err) {
      console.error('Erro ao editar:', err)
    }
  }

  const handleDeleteCliente = async (clienteDbId: string, baseId: string, empresa: string) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR a empresa ${empresa}? Isso irá limpar a base ${baseId} e apagar todos os usuários e módulos.`)) return
    
    try {
      // 1. Release the base
      await supabase.from('bases').update({ cliente_id: null, status: 'Disponível' }).eq('id', baseId)
      
      // 2. Delete dependencies explicitly
      await supabase.from('usuarios_gpo').delete().eq('cliente_id', clienteDbId)
      await supabase.from('modulos').delete().eq('cliente_id', clienteDbId)
      
      // 3. Delete the client itself
      await supabase.from('clientes').delete().eq('id', clienteDbId)
      
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
      const { error } = await supabase.from('bases').insert(basesToInsert)
      if (error) throw error
      setIsNovaBaseOpen(false)
      fetchBases()
    } catch (err: any) {
      console.error('Erro ao criar lote:', err)
      alert('Erro ao criar bases: ' + err.message)
    }
  }

  const handleSaveManual = async (nomeBase: string) => {
    try {
      const { error } = await supabase.from('bases').insert([{ nome_base: nomeBase }])
      if (error) throw error
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
      const { count, error } = await supabase.from('bases').select('*', { count: 'exact', head: true })
      if (error) throw error
      
      if (count === 0) {
        console.log('Sem bases encontradas. Criando 120 bases iniciais...')
        const basesToInsert = []
        for (let i = 1; i <= 120; i++) {
          const paddedId = String(i).padStart(3, '0')
          basesToInsert.push({ nome_base: `dbMantran${paddedId}` })
        }
        await supabase.from('bases').insert(basesToInsert)
      }
    } catch (err) {
      console.error('Erro ao popular bases:', err)
    }
  }

  const fetchBases = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bases')
        .select(`
          id,
          nome_base,
          status,
          migrada,
          clientes (
            id,
            nome_empresa,
            tipo,
            possui_aditivo,
            modulos (nome_modulo, ativo),
            usuarios_gpo (login, senha)
          )
        `)
        .order('nome_base', { ascending: true })

      if (error) throw error

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
      const { data: baseData, error: baseError } = await supabase
        .from('bases')
        .select('id')
        .eq('nome_base', baseId)
        .single()
        
      if (baseError || !baseData) throw new Error('Base não encontrada')

      // 2. Inserir Cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert([{ 
          nome_empresa: data.empresa, 
          tipo: data.tipo,
          possui_aditivo: data.possui_aditivo || false
        }])
        .select()
        .single()

      if (clienteError || !clienteData) throw clienteError

      // 3. Atualizar a Base com o cliente_id
      await supabase
        .from('bases')
        .update({ cliente_id: clienteData.id, status: 'Em Uso' })
        .eq('id', baseData.id)

      // 4. Inserir Módulos - Removido pois não estão mais na tela

      // 5. Inserir Usuário GPO
      if (data.senha) {
        await supabase.from('usuarios_gpo').insert([{
          cliente_id: clienteData.id,
          login: data.empresa?.toLowerCase().replace(/\s/g, '') || 'admin', // mock login
          senha: data.senha
        }])
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
