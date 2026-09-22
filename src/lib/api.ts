import { supabase } from './supabase'

// ----------------------------------------------------
// Supabase-based API (previously DAB/SQL Server)
// All methods maintain the same interface as before
// ----------------------------------------------------

export function checkCheckpointCompleto(dados: any, isShopee: boolean = true) {
  const pendencias: string[] = []

  // 1. CNPJs
  const cnpjs = dados?.cnpjs || []
  const hasValidCnpj = cnpjs.length > 0 && cnpjs.every((c: any) => c.cnpj && c.cnpj.trim().length >= 14 && c.razao_social)
  if (!hasValidCnpj) {
    pendencias.push('CNPJ dos emissores')
  }

  // 2. Tributação
  const hasValidTrib = cnpjs.length > 0 && cnpjs.every((c: any) => c.tributacao)
  if (!hasValidTrib) {
    pendencias.push('Regime Tributário')
  }

  // 3. Processos Shopee & Line Haul
  if (isShopee) {
    const processos = dados?.processos_shopee || []
    if (processos.length === 0) {
      pendencias.push('Processos Shopee')
    }
    if (processos.includes('Line Haul')) {
      const percursos = dados?.percursos_line_haul || []
      const percursosOk = percursos.length > 0 && percursos.every((p: any) => 
        p.cnpj_hub_shopee && p.cidade_origem && p.cnpj_recebedor && p.endereco_destino
      )
      if (!percursosOk) {
        pendencias.push('Percurso do Line Haul')
      }
    }
  }

  // 4. RNTRC
  const hasValidRntrc = cnpjs.length > 0 && cnpjs.every((c: any) => c.rntrc && c.rntrc.trim().length > 0)
  if (!hasValidRntrc) {
    pendencias.push('RNTRC / ANTT')
  }

  // 5. CTe Anterior
  const hasValidCte = cnpjs.length > 0 && cnpjs.every((c: any) => c.ja_emitiu_cte !== null && c.ja_emitiu_cte !== undefined)
  if (!hasValidCte) {
    pendencias.push('Histórico CTe')
  }

  // 6. Usuários (Email é opcional, apenas Nome é obrigatório)
  const usuarios = dados?.usuarios || []
  const hasValidUsers = usuarios.length > 0 && usuarios.some((u: any) => u.nome && u.nome.trim().length > 0)
  if (!hasValidUsers) {
    pendencias.push('Usuários do Sistema')
  }

  // 7. NFSe
  if (dados?.nfse?.emitira_nfse === null || dados?.nfse?.emitira_nfse === undefined) {
    pendencias.push('Emissão de NFSe')
  }

  // 8. Certificado Digital
  const cert = dados?.certificado_digital
  if (!cert?.arquivo_nome || !cert?.senha) {
    pendencias.push('Certificado Digital (.pfx) e Senha')
  }

  // 9. Tabela de Frete
  const frete = dados?.tabela_frete
  if (!frete?.arquivo_nome && !frete?.observacoes) {
    pendencias.push('Tabela de Frete')
  }

  // 10. CST & Aditivo
  const cst = dados?.cst_config
  if (cst?.habilitar_cst === null || cst?.habilitar_cst === undefined) {
    pendencias.push('Configuração de CST')
  } else if (cst.habilitar_cst === true) {
    if (!cst.arquivo_aditivo_nome) {
      pendencias.push('Aditivo Assinado')
    }
  }

  return {
    isCompleto: pendencias.length === 0,
    pendencias
  }
}

export const api = {
  // --- Auth ---
  async authenticateUser(login: string, senha: string) {
    const cleanLogin = (login || '').trim()
    const cleanSenha = (senha || '').trim()
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .ilike('login', cleanLogin)
      .eq('senha', cleanSenha)
      .eq('ativo', true)
    
    if (error) throw error
    if (!data || data.length === 0) return null
    const user = data[0]
    if ((user.login || '').trim().toLowerCase().endsWith('@mantran') && (user.perfil === 'Usuario' || user.perfil === 'Cliente')) {
      const clienteImpl = await api.getImplantacaoForLoggedCliente(user.nome || user.login).catch(() => null)
      return { 
        ...user, 
        perfil: 'Cliente',
        implantacao_id: clienteImpl?.id || null
      }
    }
    return user
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

  async insertClienteModulos(clienteId: string, modulosNomes: string[]) {
    if (!clienteId || !modulosNomes || modulosNomes.length === 0) return []
    const payload = modulosNomes.map(nome => ({
      cliente_id: clienteId,
      nome_modulo: nome,
      ativo: true
    }))
    const { data, error } = await supabase
      .from('modulos')
      .insert(payload)
      .select()
    
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

  async updateProjeto(projetoId: string, updates: { nome?: string, status?: string }) {
    const { error } = await supabase
      .from('projetos')
      .update(updates)
      .eq('id', projetoId)
    
    if (error) throw error
  },

  async updateProjetoColunas(
    projetoId: string, 
    colunas: { id?: string, isNew?: boolean, nome: string, tipo: string, ordem: number, indicador_conclusao: boolean }[], 
    removedColumnIds: string[]
  ) {
    // 1. Delete removed columns and their data
    if (removedColumnIds.length > 0) {
      await supabase
        .from('projeto_dados')
        .delete()
        .eq('projeto_id', projetoId)
        .in('coluna_id', removedColumnIds)

      await supabase
        .from('projeto_colunas')
        .delete()
        .eq('projeto_id', projetoId)
        .in('id', removedColumnIds)
    }

    // 2. Process remaining columns (update existing or insert new)
    for (const col of colunas) {
      if (col.isNew || !col.id || col.id.startsWith('temp_')) {
        // Insert new column
        await supabase
          .from('projeto_colunas')
          .insert({
            projeto_id: projetoId,
            nome: col.nome,
            tipo: col.tipo,
            ordem: col.ordem,
            indicador_conclusao: col.indicador_conclusao
          })
      } else {
        // Update existing column
        await supabase
          .from('projeto_colunas')
          .update({
            nome: col.nome,
            tipo: col.tipo,
            ordem: col.ordem,
            indicador_conclusao: col.indicador_conclusao
          })
          .eq('id', col.id)
      }
    }
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
        implantacao_etapas ( id, nome_etapa, valor, ordem ),
        implantacao_historico ( id, data_hora, texto, usuario_nome, created_at )
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
        implantacao_etapas ( id, nome_etapa, valor, ordem ),
        implantacao_historico ( id, data_hora, texto, usuario_nome, created_at )
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

  // --- Implantação Checkpoint / Formulário do Cliente ---
  async getImplantacaoCheckpoint(implantacaoId: string) {
    const { data, error } = await supabase
      .from('implantacao_checkpoint')
      .select('*')
      .eq('implantacao_id', implantacaoId)
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  async saveImplantacaoCheckpoint(implantacaoId: string, dados: any, _usuarioNome?: string, _isFinal: boolean = true) {
    // 1. Check if implantacao is Shopee or Normal to validate required fields
    let isShopee = true
    let impInfo: any = null
    try {
      const { data: imp } = await supabase
        .from('implantacoes')
        .select('id, tipo_cliente, nome_empresa, cliente_id')
        .eq('id', implantacaoId)
        .single()
      if (imp) {
        impInfo = imp
        if (imp.tipo_cliente) {
          isShopee = imp.tipo_cliente === 'SHOPEE'
        }
      }
    } catch (e) {
      console.warn('Aviso ao consultar tipo de cliente:', e)
    }

    const { isCompleto, pendencias } = checkCheckpointCompleto(dados, isShopee)
    const isReallyConcluido = isCompleto // ONLY true if 100% of required fields are provided

    // 2. Check if checkpoint already exists
    const existing = await api.getImplantacaoCheckpoint(implantacaoId)
    
    let result: any = null
    if (existing) {
      const { data, error } = await supabase
        .from('implantacao_checkpoint')
        .update({
          dados,
          concluido: isReallyConcluido,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('implantacao_checkpoint')
        .insert({
          implantacao_id: implantacaoId,
          dados,
          concluido: isReallyConcluido
        })
        .select()
        .single()
      if (error) throw error
      result = data
    }

    // 3. Update the Checkpoint step in implantacao_etapas (OK only if 100% complete, else PENDENTE)
    try {
      const { data: etapas } = await supabase
        .from('implantacao_etapas')
        .select('id, nome_etapa')
        .eq('implantacao_id', implantacaoId)

      const checkpointEtapa = etapas?.find(
        (e: any) => (e.nome_etapa || '').trim().toLowerCase() === 'checkpoint'
      )

      if (checkpointEtapa) {
        await supabase
          .from('implantacao_etapas')
          .update({ valor: isReallyConcluido ? 'OK' : 'PENDENTE' })
          .eq('id', checkpointEtapa.id)
      }
    } catch (etapaErr) {
      console.warn('Aviso ao atualizar etapa Checkpoint:', etapaErr)
    }

    // 4. Register detailed entry in history
    try {
      const respondidas: string[] = []

      // P1. CNPJs
      const cnpjsValidos = (dados?.cnpjs || []).filter((c: any) => c.cnpj || c.razao_social)
      if (cnpjsValidos.length > 0) {
        respondidas.push(`P1: CNPJs (${cnpjsValidos.length} filial/empresa)`)
      }

      // P2. Tributação
      const tribValidos = (dados?.cnpjs || []).filter((c: any) => c.tributacao)
      if (tribValidos.length > 0) {
        respondidas.push(`P2: Tributação (${tribValidos.map((c: any) => c.tributacao).join(', ')})`)
      }

      // P3. Processos Shopee
      if ((dados?.processos_shopee || []).length > 0) {
        respondidas.push(`P3: Processos Shopee (${dados.processos_shopee.join(', ')})`)
      }

      // P4. Line Haul
      const percursosValidos = (dados?.percursos_line_haul || []).filter((p: any) => p.cnpj_hub_shopee || p.cidade_origem || p.cnpj_recebedor)
      if (percursosValidos.length > 0) {
        respondidas.push(`P4: Line Haul (${percursosValidos.length} percurso${percursosValidos.length > 1 ? 's' : ''})`)
      }

      // P5. RNTRC
      const rntrcValidos = (dados?.cnpjs || []).filter((c: any) => c.rntrc)
      if (rntrcValidos.length > 0) {
        respondidas.push(`P5: RNTRC/ANTT`)
      }

      // P6. CTe Anterior
      const cteValidos = (dados?.cnpjs || []).filter((c: any) => c.ja_emitiu_cte !== null)
      if (cteValidos.length > 0) {
        respondidas.push(`P6: Histórico CTe`)
      }

      // P7. Usuários
      const usuariosValidos = (dados?.usuarios || []).filter((u: any) => u.nome || u.email)
      if (usuariosValidos.length > 0) {
        respondidas.push(`P7: Usuários (${usuariosValidos.length} cadastrado${usuariosValidos.length > 1 ? 's' : ''})`)
      }

      // P8. NFSe
      if (dados?.nfse?.emitira_nfse !== null) {
        respondidas.push(`P8: NFSe (${dados.nfse.emitira_nfse ? 'Sim' : 'Não'})`)
      }

      // P9. Certificado Digital
      if (dados?.certificado_digital?.arquivo_nome || dados?.certificado_digital?.senha) {
        respondidas.push(`P9: Certificado Digital (${dados.certificado_digital.arquivo_nome ? 'Anexado' : 'Senha'})`)
      }

      // P10. Tabela de Frete
      if (dados?.tabela_frete?.arquivo_nome || dados?.tabela_frete?.observacoes) {
        respondidas.push(`P10: Tabela de Frete`)
      }

      // P11. CST & Aditivo
      if (dados?.cst_config?.habilitar_cst !== null || dados?.cst_config?.arquivo_aditivo_nome) {
        const cstStatus = dados.cst_config.habilitar_cst ? 'Sim (Aditivo anexado)' : 'Padrão'
        respondidas.push(`P11: CST & Aditivo (${cstStatus})`)
      }

      let historicoTexto = ''
      if (isReallyConcluido) {
        historicoTexto = `Checkpoint Concluído 100% pelo Cliente. Todas as informações e anexos foram enviados com sucesso.`
      } else {
        const pendenciasStr = pendencias.join(', ')
        if (respondidas.length > 0) {
          historicoTexto = `Formulário salvo pelo Cliente com pendências. Perguntas respondidas: ${respondidas.join(' • ')} | Pendências: ${pendenciasStr}.`
        } else {
          historicoTexto = `Formulário iniciado pelo Cliente com pendências: ${pendenciasStr}.`
        }
      }

      await api.insertImplantacaoHistorico({
        implantacao_id: implantacaoId,
        texto: historicoTexto,
        usuario_nome: 'Cliente'
      })

      // 5. Inserir Notificação para a equipe do sistema
      try {
        const nomeEmpresa = impInfo?.nome_empresa || 'Cliente'
        const tituloNotif = isReallyConcluido 
          ? `🎉 Checkpoint Concluído!` 
          : `📝 Checkpoint Preenchido`
        
        const msgNotif = isReallyConcluido
          ? `O cliente "${nomeEmpresa}" completou 100% do Checkpoint e enviou todas as informações e arquivos.`
          : `O cliente "${nomeEmpresa}" preencheu e salvou informações no Checkpoint (${respondidas.length} itens respondidos).`

        await api.createNotificacao({
          titulo: tituloNotif,
          mensagem: msgNotif,
          tipo: 'checkpoint',
          implantacao_id: implantacaoId,
          cliente_id: impInfo?.cliente_id || null,
          dados_extras: {
            nome_empresa: nomeEmpresa,
            isCompleto: isReallyConcluido,
            respondidas,
            pendencias
          }
        })
      } catch (notifErr) {
        console.warn('Aviso ao gerar notificação de checkpoint:', notifErr)
      }

    } catch (histErr) {
      console.warn('Aviso ao inserir histórico:', histErr)
    }

    // 6. Update cliente possui_aditivo if aditivo is attached or confirmed
    try {
      const temAditivo = !!(
        dados?.cst_config?.arquivo_aditivo_base64 || 
        (dados?.cst_config?.habilitar_cst && dados?.cst_config?.arquivo_aditivo_nome)
      )

      if (temAditivo) {
        const clienteId = impInfo?.cliente_id
        const nomeEmp = impInfo?.nome_empresa

        if (clienteId) {
          await supabase
            .from('clientes')
            .update({ possui_aditivo: true })
            .eq('id', clienteId)
        } else if (nomeEmp) {
          await supabase
            .from('clientes')
            .update({ possui_aditivo: true })
            .ilike('nome_empresa', nomeEmp)
        }
      }
    } catch (aditivoErr) {
      console.warn('Aviso ao atualizar possui_aditivo no cliente:', aditivoErr)
    }

    // 7. Sincronizar Usuários informados no Checkpoint para a tabela usuarios_gpo (Tela Clientes)
    try {
      const usuariosList = dados?.usuarios || []
      let clienteId = impInfo?.cliente_id

      if (!clienteId && impInfo?.nome_empresa) {
        const { data: clis } = await supabase
          .from('clientes')
          .select('id')
          .ilike('nome_empresa', impInfo.nome_empresa)
          .limit(1)
        if (clis && clis.length > 0) {
          clienteId = clis[0].id
        }
      }

      if (clienteId && usuariosList.length > 0) {
        // Obter número da base para formar a senha padrão (ex: dbMantran120 -> 120@Mantran)
        let nomeBase = ''
        try {
          const { data: impWithBase } = await supabase
            .from('implantacoes')
            .select('base_id, bases ( nome_base )')
            .eq('id', implantacaoId)
            .single()
          nomeBase = (impWithBase?.bases as any)?.nome_base || impWithBase?.base_id || ''
        } catch {}

        const baseDigits = (nomeBase || '').replace(/\D/g, '')
        const senhaPadrao = baseDigits 
          ? `${baseDigits}@Mantran` 
          : `${(impInfo?.nome_empresa || 'Cliente').replace(/\s+/g, '')}@Mantran`

        // Consultar usuários já existentes em usuarios_gpo
        const { data: existingGpo } = await supabase
          .from('usuarios_gpo')
          .select('id, login')
          .eq('cliente_id', clienteId)

        const existingLogins = (existingGpo || []).map((u: any) => (u.login || '').trim().toLowerCase())

        for (const u of usuariosList) {
          const login = (u.nome || '').trim()
          if (!login) continue

          if (!existingLogins.includes(login.toLowerCase())) {
            await supabase
              .from('usuarios_gpo')
              .insert({
                cliente_id: clienteId,
                login: login,
                senha: senhaPadrao
              })
            existingLogins.push(login.toLowerCase())
          }
        }
      }
    } catch (usersSyncErr) {
      console.warn('Aviso ao sincronizar usuarios_gpo a partir do Checkpoint:', usersSyncErr)
    }

    return result
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
  },

  // --- Usuários Perfil Cliente ---
  async getUsuarioClienteByEmpresa(nomeEmpresa: string) {
    const cleanNome = (nomeEmpresa || '').trim().toLowerCase()
    const expectedLogin = `${cleanNome}@mantran`
    
    const { data, error } = await supabase
      .from('usuario')
      .select('*')

    if (error) throw error
    if (!data || data.length === 0) return null

    const found = data.find((u: any) => {
      const uNome = (u.nome || '').trim().toLowerCase()
      const uLogin = (u.login || '').trim().toLowerCase()
      const isClientLogin = uLogin.endsWith('@mantran')
      return (isClientLogin || u.perfil === 'Cliente') && (
        uNome === cleanNome || 
        uLogin === expectedLogin || 
        uLogin.startsWith(cleanNome) || 
        cleanNome.startsWith(uNome)
      )
    })

    return found || null
  },


  async insertUsuarioCliente(dados: { nome: string, login: string, senha: string }) {
    const cleanNome = (dados.nome || '').trim()
    const cleanLogin = (dados.login || '').trim()
    const cleanSenha = (dados.senha || '').trim()

    const { data, error } = await supabase
      .from('usuario')
      .insert({
        nome: cleanNome,
        login: cleanLogin,
        senha: cleanSenha,
        perfil: 'Cliente',
        ativo: true,
        e_tecnico: false,
        meta_semanal: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateUsuarioCliente(id: string, updates: { nome?: string, login?: string, senha?: string, ativo?: boolean }) {
    const payload: any = {}
    if (updates.nome !== undefined) payload.nome = updates.nome.trim()
    if (updates.login !== undefined) payload.login = updates.login.trim()
    if (updates.senha !== undefined) payload.senha = updates.senha.trim()
    if (updates.ativo !== undefined) payload.ativo = updates.ativo

    const { data, error } = await supabase
      .from('usuario')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteUsuarioCliente(id: string) {
    const { error } = await supabase
      .from('usuario')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getImplantacaoForLoggedCliente(userNameOrLogin: string) {
    const raw = (userNameOrLogin || '').trim()
    const baseName = raw.replace(/@mantran$/i, '').trim()

    // Helper to sanitize for comparison: remove accents, lowercase, remove non-alphanumeric
    const normalize = (str: string) => {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    }

    const normRaw = normalize(raw)
    const normBase = normalize(baseName)

    // Query all implantacoes and match client
    const { data, error } = await supabase
      .from('implantacoes')
      .select(`
        *,
        bases ( id, nome_base ),
        implantacao_etapas ( id, nome_etapa, valor, ordem )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) return null

    // Exact or partial match
    const found = data.find((imp: any) => {
      const normImp = normalize(imp.nome_empresa)
      return (
        normImp === normBase ||
        normImp === normRaw ||
        (normBase.length >= 3 && normImp.includes(normBase)) ||
        (normImp.length >= 3 && normBase.includes(normImp))
      )
    })

    return found || data[0] || null
  },

  // --- Notificações do Sistema ---
  async getNotificacoes(limit: number = 40) {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.warn('Aviso ao buscar notificações:', error.message)
        return []
      }
      return data || []
    } catch (err) {
      console.warn('Erro ao buscar notificações:', err)
      return []
    }
  },

  async getUnreadNotificacoesCount() {
    try {
      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('lida', false)
      
      if (error) return 0
      return count || 0
    } catch {
      return 0
    }
  },

  async createNotificacao(payload: {
    titulo: string
    mensagem: string
    tipo?: string
    implantacao_id?: string | null
    cliente_id?: string | null
    dados_extras?: any
  }) {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .insert({
          titulo: payload.titulo,
          mensagem: payload.mensagem,
          tipo: payload.tipo || 'checkpoint',
          lida: false,
          implantacao_id: payload.implantacao_id || null,
          cliente_id: payload.cliente_id || null,
          dados_extras: payload.dados_extras || null
        })
        .select()
        .single()

      if (error) {
        console.warn('Aviso ao criar notificação:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.warn('Erro ao inserir notificação:', err)
      return null
    }
  },

  async markNotificacaoAsLida(id: string) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (err) {
      console.warn('Erro ao marcar notificação como lida:', err)
      return false
    }
  },

  async markAllNotificacoesAsLidas() {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('lida', false)
      
      if (error) throw error
      return true
    } catch (err) {
      console.warn('Erro ao marcar todas notificações como lidas:', err)
      return false
    }
  },

  async deleteNotificacao(id: string) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (err) {
      console.warn('Erro ao excluir notificação:', err)
      return false
    }
  },

  async clearAllNotificacoes() {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      
      if (error) throw error
      return true
    } catch (err) {
      console.warn('Erro ao limpar todas notificações:', err)
      return false
    }
  },

  // --- Usuários do Sistema ---
  async getUsuariosSistema(): Promise<UsuarioSistema[]> {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  async createUsuarioSistema(payload: {
    nome: string
    login: string
    senha?: string
    perfil: string
    ativo?: boolean
    e_tecnico?: boolean
    meta_semanal?: number
  }): Promise<UsuarioSistema> {
    const cleanLogin = (payload.login || '').trim()

    // Verifica se já existe login duplicado
    const { data: existing } = await supabase
      .from('usuario')
      .select('id')
      .ilike('login', cleanLogin)
      .maybeSingle()

    if (existing) {
      throw new Error(`O login "${cleanLogin}" já está em uso por outro usuário.`)
    }

    const { data, error } = await supabase
      .from('usuario')
      .insert({
        nome: payload.nome.trim(),
        login: cleanLogin,
        senha: payload.senha?.trim() || 'M4ntr4n@',
        perfil: payload.perfil || 'Usuario',
        ativo: payload.ativo !== undefined ? payload.ativo : true,
        e_tecnico: payload.e_tecnico !== undefined ? payload.e_tecnico : payload.perfil === 'Tecnico',
        meta_semanal: Number(payload.meta_semanal) || 0
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async updateUsuarioSistema(id: string, payload: {
    nome?: string
    login?: string
    senha?: string
    perfil?: string
    ativo?: boolean
    e_tecnico?: boolean
    meta_semanal?: number
  }): Promise<UsuarioSistema> {
    const updateData: any = {}
    if (payload.nome !== undefined) updateData.nome = payload.nome.trim()
    if (payload.login !== undefined) {
      const cleanLogin = payload.login.trim()
      // Verifica duplicação de login em outro usuário
      const { data: existing } = await supabase
        .from('usuario')
        .select('id')
        .ilike('login', cleanLogin)
        .neq('id', id)
        .maybeSingle()

      if (existing) {
        throw new Error(`O login "${cleanLogin}" já está em uso por outro usuário.`)
      }
      updateData.login = cleanLogin
    }
    if (payload.senha && payload.senha.trim() !== '') {
      updateData.senha = payload.senha.trim()
    }
    if (payload.perfil !== undefined) {
      updateData.perfil = payload.perfil
    }
    if (payload.ativo !== undefined) {
      updateData.ativo = payload.ativo
    }
    if (payload.e_tecnico !== undefined) {
      updateData.e_tecnico = payload.e_tecnico
    }
    if (payload.meta_semanal !== undefined) {
      updateData.meta_semanal = Number(payload.meta_semanal) || 0
    }

    const { data, error } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async toggleUsuarioAtivo(id: string, ativo: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('usuario')
      .update({ ativo })
      .eq('id', id)

    if (error) throw error
    return true
  },

  async deleteUsuarioSistema(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('usuario')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

export interface UsuarioSistema {
  id: string
  nome: string
  login: string
  senha?: string
  perfil: string
  ativo: boolean
  e_tecnico?: boolean
  meta_semanal?: number
  created_at?: string
}




