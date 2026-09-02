import { supabase } from './supabase'
import { getLoggedUser } from './auth'

export interface PerfilPermissao {
  perfil: string
  rotas: string[] // rotas permitidas: '/', '/clientes', '/implantacoes', '/bases', '/leo-madeiras'
  projeto_especifico_id?: string | null // se definido, só acessa este projeto
  read_only?: boolean
}

export const DEFAULT_PERMISSOES: Record<string, PerfilPermissao> = {
  Administrador: {
    perfil: 'Administrador',
    rotas: ['/', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras'],
    projeto_especifico_id: null,
    read_only: false
  },
  Tecnico: {
    perfil: 'Tecnico',
    rotas: ['/', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras'],
    projeto_especifico_id: null,
    read_only: false
  },
  Suporte: {
    perfil: 'Suporte',
    rotas: ['/', '/clientes', '/implantacoes', '/bases', '/processamento-shopee', '/leo-madeiras'],
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
    projeto_especifico_id: '9a1fa78a-f8de-4119-8ef3-643d89b64035', // Padrão: Shopee 4PL
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
          mapped[row.perfil] = {
            perfil: row.perfil,
            rotas: Array.isArray(row.rotas_permitidas) ? row.rotas_permitidas : [],
            projeto_especifico_id: row.projeto_id_permitido || null,
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

    try {
      await supabase
        .from('perfil_permissoes')
        .upsert({
          perfil: perm.perfil,
          rotas_permitidas: perm.rotas,
          projeto_id_permitido: perm.projeto_especifico_id || null,
          read_only: perm.read_only,
          updated_at: new Date().toISOString()
        }, { onConflict: 'perfil' })
    } catch (_) {}
  },

  canAccessRoute(path: string): boolean {
    const user = getLoggedUser()
    if (!user || !user.perfil) return true

    const perfilName = user.perfil.trim()
    if (perfilName.toLowerCase() === 'administrador') return true

    const perms = this.getStoredPermissions()
    const userPerm = perms[perfilName] || DEFAULT_PERMISSOES[perfilName]
    if (!userPerm) return true

    // Normalize path
    const cleanPath = path.split('?')[0].split('#')[0]

    // Special case for bases / project details
    if (cleanPath.startsWith('/bases')) {
      if (!userPerm.rotas.includes('/bases')) return false
      
      // If user has a specific restricted project
      if (userPerm.projeto_especifico_id) {
        // If on /bases/:id, ensure it is the specific project
        if (cleanPath.startsWith('/bases/') && cleanPath !== `/bases/${userPerm.projeto_especifico_id}`) {
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

  getAllowedProjectForUser(): string | null {
    const user = getLoggedUser()
    if (!user || !user.perfil) return null
    const perms = this.getStoredPermissions()
    const userPerm = perms[user.perfil] || DEFAULT_PERMISSOES[user.perfil]
    return userPerm?.projeto_especifico_id || null
  }
}
