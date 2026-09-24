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

  async markNotificacaoAsLida(_id: string) {
    // Gestão de leitura individualizada por usuário no frontend (NotificationsPopover)
    return true
  },

  async markAllNotificacoesAsLidas() {
    // Gestão de leitura individualizada por usuário no frontend (NotificationsPopover)
    return true
  },

  async deleteNotificacao(_id: string) {
    // Gestão de exclusão individualizada por usuário (não apaga do banco para não sumir dos outros usuários)
    return true
  },

  async clearAllNotificacoes() {
    // Gestão de exclusão individualizada por usuário (não apaga do banco para não sumir dos outros usuários)
    return true
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
  },

  // --- Comercial / CRM ---
  async getOportunidadesComerciais(): Promise<OportunidadeComercial[]> {
    const { data, error } = await supabase
      .from('comercial_oportunidades')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data || []).map((row: any) => ({
      ...row,
      valor_setup: Number(row.valor_setup) || 0,
      valor_mensalidade: Number(row.valor_mensalidade) || 0,
      modulos_interesse: Array.isArray(row.modulos_interesse) 
        ? row.modulos_interesse 
        : typeof row.modulos_interesse === 'string'
        ? JSON.parse(row.modulos_interesse || '[]')
        : []
    }))
  },

  async createOportunidadeComercial(payload: Partial<OportunidadeComercial>): Promise<OportunidadeComercial> {
    const { data, error } = await supabase
      .from('comercial_oportunidades')
      .insert({
        nome_empresa: payload.nome_empresa?.trim(),
        nome_contato: payload.nome_contato?.trim() || null,
        telefone: payload.telefone?.trim() || null,
        email: payload.email?.trim() || null,
        estagio: payload.estagio || 'lead',
        valor_setup: Number(payload.valor_setup) || 0,
        valor_mensalidade: Number(payload.valor_mensalidade) || 0,
        tipo_cliente: payload.tipo_cliente || 'NORMAL',
        volume_estimado_cte: Number(payload.volume_estimado_cte) || 0,
        qtd_usuarios: Number(payload.qtd_usuarios) || 1,
        modulos_interesse: payload.modulos_interesse || [],
        origem_lead: payload.origem_lead || 'Site Mantran',
        vendedor_id: payload.vendedor_id || null,
        vendedor_nome: payload.vendedor_nome || null,
        motivo_perda: payload.motivo_perda || null,
        tms_atual: payload.tms_atual || null,
        observacoes: payload.observacoes || null,
        data_previsao_fechamento: payload.data_previsao_fechamento || null
      })
      .select('*')
      .single()

    if (error) throw error
    return {
      ...data,
      valor_setup: Number(data.valor_setup) || 0,
      valor_mensalidade: Number(data.valor_mensalidade) || 0,
      modulos_interesse: Array.isArray(data.modulos_interesse) ? data.modulos_interesse : []
    }
  },

  async updateOportunidadeComercial(id: string, payload: Partial<OportunidadeComercial>): Promise<OportunidadeComercial> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (payload.nome_empresa !== undefined) updateData.nome_empresa = payload.nome_empresa.trim()
    if (payload.nome_contato !== undefined) updateData.nome_contato = payload.nome_contato.trim()
    if (payload.telefone !== undefined) updateData.telefone = payload.telefone.trim()
    if (payload.email !== undefined) updateData.email = payload.email.trim()
    if (payload.estagio !== undefined) updateData.estagio = payload.estagio
    if (payload.valor_setup !== undefined) updateData.valor_setup = Number(payload.valor_setup) || 0
    if (payload.valor_mensalidade !== undefined) updateData.valor_mensalidade = Number(payload.valor_mensalidade) || 0
    if (payload.tipo_cliente !== undefined) updateData.tipo_cliente = payload.tipo_cliente
    if (payload.volume_estimado_cte !== undefined) updateData.volume_estimado_cte = Number(payload.volume_estimado_cte) || 0
    if (payload.qtd_usuarios !== undefined) updateData.qtd_usuarios = Number(payload.qtd_usuarios) || 1
    if (payload.modulos_interesse !== undefined) updateData.modulos_interesse = payload.modulos_interesse
    if (payload.origem_lead !== undefined) updateData.origem_lead = payload.origem_lead
    if (payload.vendedor_id !== undefined) updateData.vendedor_id = payload.vendedor_id
    if (payload.vendedor_nome !== undefined) updateData.vendedor_nome = payload.vendedor_nome
    if (payload.motivo_perda !== undefined) updateData.motivo_perda = payload.motivo_perda
    if (payload.tms_atual !== undefined) updateData.tms_atual = payload.tms_atual
    if (payload.observacoes !== undefined) updateData.observacoes = payload.observacoes
    if (payload.data_previsao_fechamento !== undefined) updateData.data_previsao_fechamento = payload.data_previsao_fechamento
    if (payload.implantacao_id !== undefined) updateData.implantacao_id = payload.implantacao_id

    const { data, error } = await supabase
      .from('comercial_oportunidades')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return {
      ...data,
      valor_setup: Number(data.valor_setup) || 0,
      valor_mensalidade: Number(data.valor_mensalidade) || 0,
      modulos_interesse: Array.isArray(data.modulos_interesse) ? data.modulos_interesse : []
    }
  },

  async updateEstagioOportunidade(id: string, estagio: string, motivo_perda?: string): Promise<boolean> {
    const updatePayload: any = {
      estagio,
      updated_at: new Date().toISOString()
    }
    if (motivo_perda !== undefined) {
      updatePayload.motivo_perda = motivo_perda
    }

    const { error } = await supabase
      .from('comercial_oportunidades')
      .update(updatePayload)
      .eq('id', id)

    if (error) throw error
    return true
  },

  async deleteOportunidadeComercial(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('comercial_oportunidades')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  async getMetasComerciais(mesAno: string): Promise<MetaComercial[]> {
    const { data, error } = await supabase
      .from('comercial_metas')
      .select('*')
      .eq('mes_ano', mesAno)

    if (error) throw error
    return (data || []).map((r: any) => ({
      ...r,
      meta_mrr: Number(r.meta_mrr) || 0,
      meta_setup: Number(r.meta_setup) || 0,
      meta_qtd_fechamentos: Number(r.meta_qtd_fechamentos) || 0
    }))
  },

  async saveMetaComercial(payload: {
    mes_ano: string
    vendedor_id?: string | null
    vendedor_nome?: string | null
    meta_mrr: number
    meta_setup: number
    meta_qtd_fechamentos: number
  }): Promise<MetaComercial> {
    // Check if exists
    let query = supabase
      .from('comercial_metas')
      .select('id')
      .eq('mes_ano', payload.mes_ano)
    
    if (payload.vendedor_id) {
      query = query.eq('vendedor_id', payload.vendedor_id)
    } else {
      query = query.is('vendedor_id', null)
    }

    const { data: existing } = await query.maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('comercial_metas')
        .update({
          meta_mrr: payload.meta_mrr,
          meta_setup: payload.meta_setup,
          meta_qtd_fechamentos: payload.meta_qtd_fechamentos,
          vendedor_nome: payload.vendedor_nome
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('comercial_metas')
        .insert({
          mes_ano: payload.mes_ano,
          vendedor_id: payload.vendedor_id || null,
          vendedor_nome: payload.vendedor_nome || null,
          meta_mrr: payload.meta_mrr,
          meta_setup: payload.meta_setup,
          meta_qtd_fechamentos: payload.meta_qtd_fechamentos
        })
        .select('*')
        .single()

      if (error) throw error
      return data
    }
  },

  async getVendedoresComerciais() {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nome, login, perfil')
      .in('perfil', ['Comercial', 'Administrador', 'Tecnico', 'Suporte'])
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  // --- RH: Férias (Quinzenas) & Atestados/Faltas ---
  async getSolicitacoesFerias(usuarioId?: string): Promise<SolicitacaoFerias[]> {
    try {
      let query = supabase
        .from('rh_ferias')
        .select('*')
        .order('created_at', { ascending: false })

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId)
      }

      const { data, error } = await query
      if (error) {
        // Fallback local caso tabela ainda não exista
        const local = localStorage.getItem('@Mantran:rh_ferias')
        const list: SolicitacaoFerias[] = local ? JSON.parse(local) : []
        if (usuarioId) return list.filter(i => i.usuario_id === usuarioId)
        return list
      }

      return data || []
    } catch {
      const local = localStorage.getItem('@Mantran:rh_ferias')
      const list: SolicitacaoFerias[] = local ? JSON.parse(local) : []
      if (usuarioId) return list.filter(i => i.usuario_id === usuarioId)
      return list
    }
  },

  async insertSolicitacaoFerias(payload: Partial<SolicitacaoFerias>): Promise<SolicitacaoFerias> {
    const item: SolicitacaoFerias = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      usuario_id: payload.usuario_id!,
      usuario_nome: payload.usuario_nome!,
      ano_vigencia: payload.ano_vigencia || new Date().getFullYear(),
      quinzena_1_inicio: payload.quinzena_1_inicio!,
      quinzena_1_fim: payload.quinzena_1_fim!,
      quinzena_1_dias: payload.quinzena_1_dias || 15,
      quinzena_2_inicio: payload.quinzena_2_inicio || null,
      quinzena_2_fim: payload.quinzena_2_fim || null,
      quinzena_2_dias: payload.quinzena_2_dias || (payload.quinzena_2_inicio ? 15 : null),
      status: payload.status || 'Pendente',
      observacoes: payload.observacoes || null,
      resposta_rh: payload.resposta_rh || null,
      aprovado_por: payload.aprovado_por || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('rh_ferias')
        .insert(item)
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch {
      // Fallback local storage
      const local = localStorage.getItem('@Mantran:rh_ferias')
      const list: SolicitacaoFerias[] = local ? JSON.parse(local) : []
      list.unshift(item)
      localStorage.setItem('@Mantran:rh_ferias', JSON.stringify(list))
      return item
    }
  },

  async updateStatusFerias(id: string, status: 'Pendente' | 'Aprovado' | 'Reprovado', respostaRh?: string, aprovadoPor?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rh_ferias')
        .update({
          status,
          resposta_rh: respostaRh || null,
          aprovado_por: aprovadoPor || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      return true
    } catch {
      // Fallback local
      const local = localStorage.getItem('@Mantran:rh_ferias')
      if (local) {
        const list: SolicitacaoFerias[] = JSON.parse(local)
        const updated = list.map(i => i.id === id ? {
          ...i,
          status,
          resposta_rh: respostaRh || null,
          aprovado_por: aprovadoPor || null,
          updated_at: new Date().toISOString()
        } : i)
        localStorage.setItem('@Mantran:rh_ferias', JSON.stringify(updated))
      }
      return true
    }
  },

  async deleteSolicitacaoFerias(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rh_ferias')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch {
      const local = localStorage.getItem('@Mantran:rh_ferias')
      if (local) {
        const list: SolicitacaoFerias[] = JSON.parse(local)
        localStorage.setItem('@Mantran:rh_ferias', JSON.stringify(list.filter(i => i.id !== id)))
      }
      return true
    }
  },

  async getFaltasEAtestados(usuarioId?: string): Promise<FaltaAtestado[]> {
    try {
      let query = supabase
        .from('rh_faltas_atestados')
        .select('*')
        .order('data_falta_inicio', { ascending: false })

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId)
      }

      const { data, error } = await query
      if (error) {
        const local = localStorage.getItem('@Mantran:rh_faltas')
        const list: FaltaAtestado[] = local ? JSON.parse(local) : []
        if (usuarioId) return list.filter(i => i.usuario_id === usuarioId)
        return list
      }

      return data || []
    } catch {
      const local = localStorage.getItem('@Mantran:rh_faltas')
      const list: FaltaAtestado[] = local ? JSON.parse(local) : []
      if (usuarioId) return list.filter(i => i.usuario_id === usuarioId)
      return list
    }
  },

  async insertFaltaAtestado(payload: Partial<FaltaAtestado>): Promise<FaltaAtestado> {
    const item: FaltaAtestado = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      usuario_id: payload.usuario_id!,
      usuario_nome: payload.usuario_nome!,
      data_falta_inicio: payload.data_falta_inicio!,
      data_falta_fim: payload.data_falta_fim || payload.data_falta_inicio!,
      dias_afastamento: payload.dias_afastamento || 1,
      motivo: payload.motivo || 'Atestado Médico',
      descricao: payload.descricao || null,
      possui_atestado: payload.possui_atestado !== undefined ? payload.possui_atestado : true,
      arquivo_atestado_nome: payload.arquivo_atestado_nome || null,
      arquivo_atestado_url: payload.arquivo_atestado_url || null,
      arquivo_atestado_tipo: payload.arquivo_atestado_tipo || null,
      status: payload.status || 'Pendente',
      observacoes_rh: payload.observacoes_rh || null,
      aprovado_por: payload.aprovado_por || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('rh_faltas_atestados')
        .insert(item)
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch {
      const local = localStorage.getItem('@Mantran:rh_faltas')
      const list: FaltaAtestado[] = local ? JSON.parse(local) : []
      list.unshift(item)
      localStorage.setItem('@Mantran:rh_faltas', JSON.stringify(list))
      return item
    }
  },

  async updateStatusFalta(id: string, status: 'Pendente' | 'Abonado / Aprovado' | 'Em Análise' | 'Recusado', observacoesRh?: string, aprovadoPor?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rh_faltas_atestados')
        .update({
          status,
          observacoes_rh: observacoesRh || null,
          aprovado_por: aprovadoPor || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      return true
    } catch {
      const local = localStorage.getItem('@Mantran:rh_faltas')
      if (local) {
        const list: FaltaAtestado[] = JSON.parse(local)
        const updated = list.map(i => i.id === id ? {
          ...i,
          status,
          observacoes_rh: observacoesRh || null,
          aprovado_por: aprovadoPor || null,
          updated_at: new Date().toISOString()
        } : i)
        localStorage.setItem('@Mantran:rh_faltas', JSON.stringify(updated))
      }
      return true
    }
  },

  async deleteFaltaAtestado(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rh_faltas_atestados')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch {
      const local = localStorage.getItem('@Mantran:rh_faltas')
      if (local) {
        const list: FaltaAtestado[] = JSON.parse(local)
        localStorage.setItem('@Mantran:rh_faltas', JSON.stringify(list.filter(i => i.id !== id)))
      }
      return true
    }
  },

  // --- RH: Escala de Home Office ---
  async getEscalasHomeOffice(): Promise<EscalaHomeOffice[]> {
    try {
      const { data, error } = await supabase
        .from('rh_home_office')
        .select('*')
        .order('usuario_nome', { ascending: true })

      if (error) {
        const local = localStorage.getItem('@Mantran:rh_home_office')
        return local ? JSON.parse(local) : []
      }

      return data || []
    } catch {
      const local = localStorage.getItem('@Mantran:rh_home_office')
      return local ? JSON.parse(local) : []
    }
  },

  async upsertEscalaHomeOffice(payload: Partial<EscalaHomeOffice>): Promise<EscalaHomeOffice> {
    const item: EscalaHomeOffice = {
      id: payload.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
      usuario_id: payload.usuario_id!,
      usuario_nome: payload.usuario_nome!,
      modalidade: payload.modalidade || 'Híbrido',
      segunda: !!payload.segunda,
      terca: !!payload.terca,
      quarta: !!payload.quarta,
      quinta: !!payload.quinta,
      sexta: !!payload.sexta,
      sabado: !!payload.sabado,
      observacoes: payload.observacoes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      // Upsert by usuario_id
      const { data, error } = await supabase
        .from('rh_home_office')
        .upsert(item, { onConflict: 'usuario_id' })
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch {
      const local = localStorage.getItem('@Mantran:rh_home_office')
      let list: EscalaHomeOffice[] = local ? JSON.parse(local) : []
      const index = list.findIndex(i => i.usuario_id === item.usuario_id)
      if (index >= 0) {
        list[index] = { ...list[index], ...item }
      } else {
        list.push(item)
      }
      localStorage.setItem('@Mantran:rh_home_office', JSON.stringify(list))
      return item
    }
  },

  async deleteEscalaHomeOffice(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rh_home_office')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch {
      const local = localStorage.getItem('@Mantran:rh_home_office')
      if (local) {
        const list: EscalaHomeOffice[] = JSON.parse(local)
        localStorage.setItem('@Mantran:rh_home_office', JSON.stringify(list.filter(i => i.id !== id)))
      }
      return true
    }
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

export interface OportunidadeComercial {
  id: string
  nome_empresa: string
  nome_contato?: string
  telefone?: string
  email?: string
  estagio: 'lead' | 'apresentacao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
  valor_setup?: number
  valor_mensalidade?: number
  tipo_cliente?: 'NORMAL' | 'SHOPEE'
  volume_estimado_cte?: number
  qtd_usuarios?: number
  modulos_interesse?: string[]
  origem_lead?: string
  vendedor_id?: string | null
  vendedor_nome?: string | null
  motivo_perda?: string | null
  tms_atual?: string | null
  observacoes?: string | null
  data_previsao_fechamento?: string | null
  implantacao_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface MetaComercial {
  id: string
  mes_ano: string
  vendedor_id?: string | null
  vendedor_nome?: string | null
  meta_mrr?: number
  meta_setup?: number
  meta_qtd_fechamentos?: number
  created_at?: string
}

export interface SolicitacaoFerias {
  id: string
  usuario_id: string
  usuario_nome: string
  ano_vigencia: number
  quinzena_1_inicio: string
  quinzena_1_fim: string
  quinzena_1_dias: number
  quinzena_2_inicio?: string | null
  quinzena_2_fim?: string | null
  quinzena_2_dias?: number | null
  status: 'Pendente' | 'Aprovado' | 'Reprovado'
  observacoes?: string | null
  resposta_rh?: string | null
  aprovado_por?: string | null
  created_at?: string
  updated_at?: string
}

export interface FaltaAtestado {
  id: string
  usuario_id: string
  usuario_nome: string
  data_falta_inicio: string
  data_falta_fim: string
  dias_afastamento: number
  motivo: string
  descricao?: string | null
  possui_atestado: boolean
  arquivo_atestado_nome?: string | null
  arquivo_atestado_url?: string | null
  arquivo_atestado_tipo?: string | null
  status: 'Pendente' | 'Abonado / Aprovado' | 'Em Análise' | 'Recusado'
  observacoes_rh?: string | null
  aprovado_por?: string | null
  created_at?: string
  updated_at?: string
}

export interface EscalaHomeOffice {
  id: string
  usuario_id: string
  usuario_nome: string
  modalidade: 'Híbrido' | '100% Presencial' | '100% Remoto'
  segunda: boolean
  terca: boolean
  quarta: boolean
  quinta: boolean
  sexta: boolean
  sabado: boolean
  observacoes?: string | null
  created_at?: string
  updated_at?: string
}







