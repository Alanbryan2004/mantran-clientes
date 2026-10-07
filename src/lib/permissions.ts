import { supabase } from './supabase'
import { getLoggedUser } from './auth'

export interface PerfilPermissao {
  perfil: string
  rotas: string[] // rotas permitidas: '/', '/clientes', '/implantacoes', '/bases', '/leo-madeiras'
  projeto_especifico_id?: string | null // (legado) um único projeto — mantido por compatibilidade
  projetos_especificos_ids?: string[] // se definido e não vazio, só acessa estes projetos
  read_only?: boolean
}

export const DEFAULT_PERMISSOES: Record<string, PerfilPermissao> = {
  Administrador: {
    perfil: 'Administrador',
    rotas: ['/', '/tickets', '/calendario', '/comercial', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras', '/rh'],
    projeto_especifico_id: null,
    read_only: false
  },
  Tecnico: {
    perfil: 'Tecnico',
    rotas: ['/', '/tickets', '/calendario', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras', '/rh'],
    projeto_especifico_id: null,
    read_only: false
  },
  Suporte: {
    perfil: 'Suporte',
    rotas: ['/', '/tickets', '/calendario', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras', '/rh'],
    projeto_especifico_id: null,
    read_only: false
  },
  Usuario: {
    perfil: 'Usuario',
    rotas: ['/', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras'],
    projeto_especifico_id: null,
    read_only: true
  },
  Parceiro: {
    perfil: 'Parceiro',
    rotas: ['/bases', '/processamento-shopee'],
    projeto_especifico_id: '9a1fa78a-f8de-4119-8ef3-643d89b64035', // Padrão: Shopee 4PL (legado)
    projetos_especificos_ids: ['9a1fa78a-f8de-4119-8ef3-643d89b64035'],
    read_only: false
  },
  Comercial: {
    perfil: 'Comercial',
    rotas: ['/comercial', '/calendario', '/implantacoes', '/rh'],
    projeto_especifico_id: null,
    read_only: false
  },
  Cliente: {
    perfil: 'Cliente',
    rotas: ['/tickets', '/implantacoes'],
    projeto_especifico_id: null,
    read_only: true
  }
}


const STORAGE_KEY = '@Mantran:perfil_permissoes'

export const permissionsApi = {
  getStoredPermissions(): Record<string, PerfilPermissao> {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        return { ...DEFAULT_PERMISSOES, ...JSON.parse(cached) }
      }
    } catch (_) {}
    return DEFAULT_PERMISSOES
  },

  async getPermissions(): Promise<Record<string, PerfilPermissao>> {
    try {
      const { data, error } = await supabase
        .from('perfil_permissoes')
        .select('*')

      if (!error && data && data.length > 0) {
        const mapped: Record<string, PerfilPermissao> = { ...DEFAULT_PERMISSOES }
        data.forEach((row: any) => {
          let rotas: string[] = Array.isArray(row.rotas_permitidas) ? [...row.rotas_permitidas] : []
          
          const p = (row.perfil || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          const isFuncionario = p !== 'cliente' && p !== 'parceiro' && p !== 'usuario' && !p.includes('consulta')
          
          // Garante que funcionários internos (Suporte, Tecnico, Comercial, etc.) sempre tenham acesso à rota /rh
          if (isFuncionario && !rotas.includes('/rh')) {
            rotas.push('/rh')
          }

          // Lista de projetos: usa a coluna nova (array/JSONB); se vazia, cai no campo singular legado
          let projetosIds: string[] = []
          const brutaLista = row.projetos_ids_permitidos
          if (Array.isArray(brutaLista)) {
            projetosIds = brutaLista.filter(Boolean)
          } else if (typeof brutaLista === 'string' && brutaLista.trim()) {
            try { const arr = JSON.parse(brutaLista); if (Array.isArray(arr)) projetosIds = arr.filter(Boolean) } catch { /* ignora */ }
          }
          if (projetosIds.length === 0 && row.projeto_id_permitido) {
            projetosIds = [row.projeto_id_permitido]
          }

          mapped[row.perfil] = {
            perfil: row.perfil,
            rotas,
            projeto_especifico_id: row.projeto_id_permitido || projetosIds[0] || null,
            projetos_especificos_ids: projetosIds,
            read_only: !!row.read_only
          }
        })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
        return mapped
      }
    } catch (_) {}

    return this.getStoredPermissions()
  },

  async savePermission(perm: PerfilPermissao): Promise<void> {
    const current = this.getStoredPermissions()
    current[perm.perfil] = perm
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))

    const lista = (perm.projetos_especificos_ids && perm.projetos_especificos_ids.length)
      ? perm.projetos_especificos_ids
      : (perm.projeto_especifico_id ? [perm.projeto_especifico_id] : [])

    const baseRow: Record<string, any> = {
      perfil: perm.perfil,
      rotas_permitidas: perm.rotas,
      projeto_id_permitido: lista[0] || null, // singular (1º) por compatibilidade
      read_only: perm.read_only,
      updated_at: new Date().toISOString()
    }

    try {
      // 1ª tentativa: grava também a lista completa (coluna nova)
      const { error } = await supabase
        .from('perfil_permissoes')
        .upsert({ ...baseRow, projetos_ids_permitidos: lista }, { onConflict: 'perfil' })

      if (error) {
        // Se a coluna nova ainda não existe no banco, faz fallback sem ela (grava ao menos o singular)
        console.warn('Falha ao salvar lista de projetos (verifique se a coluna projetos_ids_permitidos existe):', error.message)
        const { error: err2 } = await supabase
          .from('perfil_permissoes')
          .upsert(baseRow, { onConflict: 'perfil' })
        if (err2) console.warn('Falha ao salvar permissão (fallback):', err2.message)
      }
    } catch (err) {
      console.warn('Erro ao salvar permissão:', err)
    }
  },

  canAccessRoute(path: string): boolean {
    const user = getLoggedUser()
    if (!user || !user.perfil) return true

    const perfilName = user.perfil.trim()
    if (perfilName.toLowerCase() === 'administrador') return true

    // Normalize path
    const cleanPath = path.split('?')[0].split('#')[0]

    // Rotas /rh e /calendario: permitidas para todos os funcionários internos
    // (Suporte, Tecnico, Comercial, etc.), independentemente das permissões salvas.
    if (cleanPath.startsWith('/rh') || cleanPath.startsWith('/calendario')) {
      const p = perfilName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (p === 'cliente' || p === 'parceiro' || p === 'usuario' || p.includes('consulta')) {
        return false
      }
      return true
    }

    const perms = this.getStoredPermissions()
    const userPerm = perms[perfilName] || DEFAULT_PERMISSOES[perfilName]
    if (!userPerm) return true

    // Special case for bases / project details
    if (cleanPath.startsWith('/bases')) {
      if (!userPerm.rotas.includes('/bases')) return false

      // Lista de projetos permitidos (nova) com fallback ao campo singular (legado)
      const projetosPermitidos = (userPerm.projetos_especificos_ids && userPerm.projetos_especificos_ids.length)
        ? userPerm.projetos_especificos_ids
        : (userPerm.projeto_especifico_id ? [userPerm.projeto_especifico_id] : [])

      // Se há restrição e está em /bases/:id, o id tem que estar na lista permitida
      if (projetosPermitidos.length > 0 && cleanPath.startsWith('/bases/')) {
        const projId = cleanPath.replace('/bases/', '').split('/')[0]
        if (projId && !projetosPermitidos.includes(projId)) {
          return false
        }
      }
      return true
    }

    if (cleanPath === '/' || cleanPath === '') {
      return userPerm.rotas.includes('/')
    }

    return userPerm.rotas.some(r => r !== '/' && cleanPath.startsWith(r))
  },

  // Lista de projetos permitidos para o usuário logado (vazia = sem restrição)
  getAllowedProjectsForUser(): string[] {
    const user = getLoggedUser()
    if (!user || !user.perfil) return []
    const perms = this.getStoredPermissions()
    const userPerm = perms[user.perfil] || DEFAULT_PERMISSOES[user.perfil]
    if (!userPerm) return []
    if (userPerm.projetos_especificos_ids && userPerm.projetos_especificos_ids.length) {
      return userPerm.projetos_especificos_ids
    }
    return userPerm.projeto_especifico_id ? [userPerm.projeto_especifico_id] : []
  },

  // (Legado) Retorna o 1º projeto permitido — usado quando a restrição é de projeto único.
  getAllowedProjectForUser(): string | null {
    const lista = this.getAllowedProjectsForUser()
    // Só "trava" num projeto único quando há exatamente 1; com vários, não força navegação única
    return lista.length === 1 ? lista[0] : null
  },

  getFirstAllowedRouteForUser(): string {
    const user = getLoggedUser()
    if (!user || !user.perfil) return '/implantacoes'
    const perfilName = user.perfil.trim()
    if (perfilName.toLowerCase() === 'administrador') return '/'
    const perms = this.getStoredPermissions()
    const userPerm = perms[perfilName] || DEFAULT_PERMISSOES[perfilName]
    if (userPerm && userPerm.rotas && userPerm.rotas.length > 0) {
      return userPerm.rotas[0]
    }
    return '/implantacoes'
  },

  isReadOnly(): boolean {
    const user = getLoggedUser()
    if (!user || !user.perfil) return false
    const perfilName = user.perfil.trim()
    if (perfilName.toLowerCase() === 'administrador') return false

    const perms = this.getStoredPermissions()
    const userPerm = perms[perfilName] || DEFAULT_PERMISSOES[perfilName]
    if (userPerm && userPerm.read_only !== undefined) {
      return !!userPerm.read_only
    }
    return false
  }
}
