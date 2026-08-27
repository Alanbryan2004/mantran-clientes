import { supabase } from './supabase'

// ----------------------------------------------------
// Supabase-based API (previously DAB/SQL Server)
// All methods maintain the same interface as before
// ----------------------------------------------------

export const api = {
  // --- Auth ---
  async authenticateUser(login: string, senha: string) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('login', login)
      .eq('senha', senha)
      .eq('ativo', true)
    
    if (error) throw error
    if (!data || data.length === 0) return null
    return data[0]
  },

  // --- Bases ---
  async getBasesWithClientes() {
    const { data, error } = await supabase
      .from('bases')
      .select(`
        id,
        nome_base,
        status,
        migrada,
        cliente_id,
        clientes (
          id,
          nome_empresa,
          tipo,
          possui_aditivo,
          modulos ( nome_modulo, ativo ),
          usuarios_gpo ( login, senha )
        )
      `)
      .order('nome_base', { ascending: true })
    
    if (error) throw error
    
    return (data || []).map((b: any) => ({
      id: b.id,
      nome_base: b.nome_base,
      status: b.status,
      migrada: b.migrada,
      cliente_id: b.cliente_id,
      clientes: b.clientes ? {
        id: b.clientes.id,
        nome_empresa: b.clientes.nome_empresa,
        tipo: b.clientes.tipo,
        possui_aditivo: b.clientes.possui_aditivo,
        modulos: b.clientes.modulos || [],
        usuarios_gpo: b.clientes.usuarios_gpo || []
      } : null
    }))
  },

  async getBasesCount() {
    const { count, error } = await supabase
      .from('bases')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    return count || 0
  },

  async insertBases(basesArray: { nome_base: string }[]) {
    const { error } = await supabase
      .from('bases')
      .insert(basesArray)
    
    if (error) throw error
  },

  async getBaseByName(nomeBase: string) {
    const { data, error } = await supabase
      .from('bases')
      .select('*')
      .eq('nome_base', nomeBase)
      .single()
    
    if (error) throw error
    return data
  },

  async updateBase(baseId: string, updates: any) {
    const { error } = await supabase
      .from('bases')
      .update(updates)
      .eq('id', baseId)
    
    if (error) throw error
  },

  // --- Clientes ---
  async insertCliente(cliente: { nome_empresa: string, tipo: string, possui_aditivo: boolean }) {
    const { data, error } = await supabase
      .from('clientes')
      .insert(cliente)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateCliente(clienteId: string, updates: any) {
    const { error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('id', clienteId)
    
    if (error) throw error
  },

  async deleteCliente(clienteId: string) {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteId)
    
    if (error) throw error
  },

  // --- Usuarios_GPO ---
  async getUsuariosByCliente(clienteId: string) {
    const { data, error } = await supabase
      .from('usuarios_gpo')
      .select('*')
      .eq('cliente_id', clienteId)
    
    if (error) throw error
    return data || []
  },

  async insertUsuario(usuario: { cliente_id: string, login: string, senha?: string }) {
    const { error } = await supabase
      .from('usuarios_gpo')
      .insert(usuario)
    
    if (error) throw error
  },

  async updateUsuariosByCliente(clienteId: string, updates: any) {
    const { error } = await supabase
      .from('usuarios_gpo')
      .update(updates)
      .eq('cliente_id', clienteId)
    
    if (error) throw error
  },

  async deleteUsuariosByCliente(clienteId: string) {
    const { error } = await supabase
      .from('usuarios_gpo')
      .delete()
      .eq('cliente_id', clienteId)
    
    if (error) throw error
  },

  // --- Modulos ---
  async deleteModulosByCliente(clienteId: string) {
    const { error } = await supabase
      .from('modulos')
      .delete()
      .eq('cliente_id', clienteId)
    
    if (error) throw error
  },

  // --- Projetos ---
  async getProjetosAtivos() {
    const { data, error } = await supabase
      .from('projetos')
      .select('*')
      .eq('status', 'Em Andamento')
    
    if (error) throw error
    return data || []
  },

  async getProjetoColunas() {
    const { data, error } = await supabase
      .from('projeto_colunas')
      .select('*')
      .limit(1000)
    
    if (error) throw error
    return data || []
  },

  async getProjetoBases() {
    const { data, error } = await supabase
      .from('projeto_bases')
      .select('*')
      .limit(2000)
    
    if (error) throw error
    return data || []
  },

  async getProjetoDados() {
    const { data, error } = await supabase
      .from('projeto_dados')
      .select('*')
      .limit(5000)
    
    if (error) throw error
    return data || []
  },

  // --- Dashboard Analytics ---
  async getBases() {
    const { data, error } = await supabase
      .from('bases')
      .select('*')
      .limit(1000)
    
    if (error) throw error
    return data || []
  },

  async getClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .limit(1000)
    
    if (error) throw error
    return data || []
  },

  async getLeoEmpresas() {
    const { data, error } = await supabase
      .from('leo_empresas')
      .select('*')
      .limit(1000)
    
    if (error) throw error
    return data || []
  },

  // --- Léo Madeiras API ---
  async getLeoEmpresasWithDetails() {
    const { data, error } = await supabase
      .from('leo_empresas')
      .select(`
        *,
        leo_usuarios ( id, login, senha ),
        leo_modulos ( id, ativo, nome_modulo )
      `)
      .order('cd_empresa', { ascending: true })
    
    if (error) throw error
    
    return (data || []).map((e: any) => ({
      ...e,
      leo_usuarios: { items: e.leo_usuarios || [] },
      leo_modulos: { items: e.leo_modulos || [] }
    }))
  },

  async insertLeoEmpresa(empresa: { cd_empresa: string, nome_empresa: string, ativo?: boolean }) {
    const { data, error } = await supabase
      .from('leo_empresas')
      .insert({ ...empresa, ativo: empresa.ativo ?? true })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateLeoEmpresa(id: string, updates: any) {
    const { error } = await supabase
      .from('leo_empresas')
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteLeoEmpresa(id: string) {
    const { error } = await supabase
      .from('leo_empresas')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async insertLeoUsuario(usuario: { leo_empresa_id: string, login: string, senha?: string }) {
    const { error } = await supabase
      .from('leo_usuarios')
      .insert(usuario)
    
    if (error) throw error
  },

  async getLeoUsuariosByEmpresa(empresaId: string) {
    const { data, error } = await supabase
      .from('leo_usuarios')
      .select('*')
      .eq('leo_empresa_id', empresaId)
    
    if (error) throw error
    return data || []
  },

  async deleteLeoUsuario(id: string) {
    const { error } = await supabase
      .from('leo_usuarios')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async insertLeoModulo(modulo: { empresa_id: string, ativo: boolean, nome_modulo: string }) {
    const { error } = await supabase
      .from('leo_modulos')
      .insert(modulo)
    
    if (error) throw error
  },

  async getLeoModulosByEmpresa(empresaId: string) {
    const { data, error } = await supabase
      .from('leo_modulos')
      .select('*')
      .eq('empresa_id', empresaId)
    
    if (error) throw error
    return data || []
  },

  async getModulosMantran() {
    const { data, error } = await supabase
      .from('modulos_mantran')
      .select('*')
      .limit(1000)
    
    if (error) throw error
    return data || []
  },

  async deleteLeoModulo(id: string) {
    const { error } = await supabase
      .from('leo_modulos')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // --- Projetos (detalhes) ---
  async getProjetoById(projetoId: string) {
    const { data, error } = await supabase
      .from('projetos')
      .select('*')
      .eq('id', projetoId)
      .single()
    
    if (error) throw error
    return data
  },

  async getProjetoColunasById(projetoId: string) {
    const { data, error } = await supabase
      .from('projeto_colunas')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('ordem', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getProjetoBasesWithDetails(projetoId: string) {
    const { data, error } = await supabase
      .from('projeto_bases')
      .select('base_id, bases(nome_base, clientes(nome_empresa))')
      .eq('projeto_id', projetoId)
    
    if (error) throw error
    return data || []
  },

  async getProjetoDadosByProjeto(projetoId: string) {
    const { data, error } = await supabase
      .from('projeto_dados')
      .select('*')
      .eq('projeto_id', projetoId)
    
    if (error) throw error
    return data || []
  },

  async upsertProjetoDado(dado: { projeto_id: string, base_id: string, coluna_id: string, valor: string }) {
    const { error } = await supabase
      .from('projeto_dados')
      .upsert(dado, { onConflict: 'projeto_id, base_id, coluna_id' })
    
    if (error) throw error
  },

  // --- Gerenciar Bases (para modal de projetos) ---
  async getBasesWithClienteInfo() {
    const { data, error } = await supabase
      .from('bases')
      .select('id, nome_base, clientes ( nome_empresa, tipo )')
      .order('nome_base', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async deleteProjetoDadosByBase(projetoId: string, baseId: string) {
    const { error } = await supabase
      .from('projeto_dados')
      .delete()
      .eq('projeto_id', projetoId)
      .eq('base_id', baseId)
    
    if (error) throw error
  },

  async removeBaseFromProjeto(projetoId: string, baseId: string) {
    const { error } = await supabase
      .from('projeto_bases')
      .delete()
      .eq('projeto_id', projetoId)
      .eq('base_id', baseId)
    
    if (error) throw error
  },

  async addBasesToProjeto(rows: { projeto_id: string, base_id: string }[]) {
    const { error } = await supabase
      .from('projeto_bases')
      .insert(rows)
    
    if (error) throw error
  },

  // --- Implantações ---
  async getImplantacoes() {
    const { data, error } = await supabase
      .from('implantacoes')
      .select(`
        *,
        bases ( id, nome_base ),
        implantacao_etapas ( id, nome_etapa, valor, ordem )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getImplantacaoById(id: string) {
    const { data, error } = await supabase
      .from('implantacoes')
      .select(`
        *,
        bases ( id, nome_base ),
        implantacao_etapas ( id, nome_etapa, valor, ordem )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Sort etapas by ordem
    if (data && data.implantacao_etapas) {
      data.implantacao_etapas.sort((a: any, b: any) => a.ordem - b.ordem)
    }
    return data
  },

  async insertImplantacao(implantacao: {
    cliente_id: string,
    base_id: string,
    nome_empresa: string,
    tipo_cliente: string,
    operacoes_shopee?: string[],
    modulos_normal?: string[],
    analista_responsavel_id?: string | null,
    analista_responsavel?: string | null
  }) {
    const { data, error } = await supabase
      .from('implantacoes')
      .insert(implantacao)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateImplantacao(id: string, updates: any) {
    const { error } = await supabase
      .from('implantacoes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  },

  async insertImplantacaoEtapas(etapas: { implantacao_id: string, nome_etapa: string, valor: string, ordem: number }[]) {
    const { error } = await supabase
      .from('implantacao_etapas')
      .insert(etapas)
    
    if (error) throw error
  },

  async updateImplantacaoEtapa(etapaId: string, valor: string) {
    const { error } = await supabase
      .from('implantacao_etapas')
      .update({ valor })
      .eq('id', etapaId)
    
    if (error) throw error
  },

  async deleteImplantacaoEtapas(ids: string[]) {
    if (ids.length === 0) return
    const { error } = await supabase
      .from('implantacao_etapas')
      .delete()
      .in('id', ids)
    
    if (error) throw error
  },

  async updateImplantacaoStatus(id: string, status: string) {
    const { error } = await supabase
      .from('implantacoes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteImplantacao(id: string) {
    const { error } = await supabase
      .from('implantacoes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // --- Implantação Histórico ---
  async getImplantacaoHistorico(implantacaoId: string) {
    const { data, error } = await supabase
      .from('implantacao_historico')
      .select('*')
      .eq('implantacao_id', implantacaoId)
      .order('data_hora', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async insertImplantacaoHistorico(entry: {
    implantacao_id: string,
    data_hora?: string,
    texto: string,
    usuario_id?: string | null,
    usuario_nome?: string | null
  }) {
    const { data, error } = await supabase
      .from('implantacao_historico')
      .insert(entry)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteImplantacaoHistorico(id: string) {
    const { error } = await supabase
      .from('implantacao_historico')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // --- Usuários do Sistema ---
  async getUsuariosSuporte() {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nome, login, perfil, ativo')
      .eq('perfil', 'Suporte')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    
    if (error) throw error
    return data || []
  }
}

