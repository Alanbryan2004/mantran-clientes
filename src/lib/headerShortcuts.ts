import { 
  LayoutDashboard, 
  Ticket, 
  TrendingUp, 
  Users, 
  Rocket, 
  Database, 
  ShoppingBag, 
  Cloud, 
  Users2, 
  Clock, 
  FlaskConical, 
  ListFilter, 
  CheckCircle2, 
  PlusCircle, 
  Calendar, 
  UserCog
} from 'lucide-react'
import { permissionsApi } from './permissions'

export interface ShortcutDefinition {
  id: string
  name: string
  path: string
  icon: any
  category: 'Geral' | 'Desenvolvimento & QA' | 'Administração'
  color: string
  adminOnly?: boolean
  tecnicoOrAdminOnly?: boolean
  devOnly?: boolean
}

export const ALL_SHORTCUT_OPTIONS: ShortcutDefinition[] = [
  // Categoria: Geral
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    category: 'Geral',
    color: 'text-blue-400'
  },
  {
    id: 'tickets',
    name: 'Tickets',
    path: '/tickets',
    icon: Ticket,
    category: 'Geral',
    color: 'text-emerald-400'
  },
  {
    id: 'comercial',
    name: 'Comercial',
    path: '/comercial',
    icon: TrendingUp,
    category: 'Geral',
    color: 'text-cyan-400'
  },
  {
    id: 'clientes',
    name: 'Clientes',
    path: '/clientes',
    icon: Users,
    category: 'Geral',
    color: 'text-purple-400'
  },
  {
    id: 'implantacoes',
    name: 'Implantações',
    path: '/implantacoes',
    icon: Rocket,
    category: 'Geral',
    color: 'text-rose-400'
  },
  {
    id: 'projetos',
    name: 'Projetos',
    path: '/bases',
    icon: Database,
    category: 'Geral',
    color: 'text-amber-400'
  },
  {
    id: 'shopee',
    name: 'Processamento Shopee',
    path: '/processamento-shopee',
    icon: ShoppingBag,
    category: 'Geral',
    color: 'text-orange-400'
  },
  {
    id: 'leo-madeiras',
    name: 'Léo Madeiras',
    path: '/leo-madeiras',
    icon: Cloud,
    category: 'Geral',
    color: 'text-sky-400'
  },
  {
    id: 'rh',
    name: 'Gestão de RH',
    path: '/rh',
    icon: Users2,
    category: 'Geral',
    color: 'text-teal-400'
  },

  // Categoria: Desenvolvimento & QA
  {
    id: 'dev-tarefas',
    name: 'Minhas Tarefas',
    path: '/dev/tarefas',
    icon: Clock,
    category: 'Desenvolvimento & QA',
    color: 'text-amber-400',
    devOnly: true
  },
  {
    id: 'dev-qa',
    name: 'QA & Testes',
    path: '/dev/qa',
    icon: FlaskConical,
    category: 'Desenvolvimento & QA',
    color: 'text-purple-400',
    devOnly: true
  },
  {
    id: 'dev-dashboard',
    name: 'Dashboard Dev',
    path: '/dev/dashboard',
    icon: LayoutDashboard,
    category: 'Desenvolvimento & QA',
    color: 'text-blue-400',
    devOnly: true
  },
  {
    id: 'dev-pendentes',
    name: 'Telas Pendentes',
    path: '/dev/pendentes',
    icon: ListFilter,
    category: 'Desenvolvimento & QA',
    color: 'text-cyan-400',
    devOnly: true
  },
  {
    id: 'dev-finalizadas',
    name: 'Telas Finalizadas',
    path: '/dev/finalizadas',
    icon: CheckCircle2,
    category: 'Desenvolvimento & QA',
    color: 'text-emerald-400',
    devOnly: true
  },
  {
    id: 'dev-cadastro-telas',
    name: 'Cadastro de Telas',
    path: '/dev/cadastro-telas',
    icon: PlusCircle,
    category: 'Desenvolvimento & QA',
    color: 'text-rose-400',
    devOnly: true
  },
  {
    id: 'dev-cronograma-visualizar',
    name: 'Cronograma',
    path: '/dev/cronograma/visualizar',
    icon: Calendar,
    category: 'Desenvolvimento & QA',
    color: 'text-indigo-400',
    devOnly: true
  },
  {
    id: 'dev-cronograma-incluir',
    name: 'Cronograma: Incluir',
    path: '/dev/cronograma/incluir',
    icon: Calendar,
    category: 'Desenvolvimento & QA',
    color: 'text-indigo-400',
    adminOnly: true,
    devOnly: true
  },
  {
    id: 'dev-cronograma-arquitetura',
    name: 'Cronograma: Arquitetura',
    path: '/dev/cronograma/arquitetura',
    icon: Calendar,
    category: 'Desenvolvimento & QA',
    color: 'text-indigo-400',
    tecnicoOrAdminOnly: true,
    devOnly: true
  },

  // Categoria: Administração
  {
    id: 'usuarios',
    name: 'Usuários',
    path: '/usuarios',
    icon: UserCog,
    category: 'Administração',
    color: 'text-cyan-400',
    adminOnly: true
  }
]

export function isShortcutPermitted(shortcut: ShortcutDefinition, user: any): boolean {
  if (!user) return false
  const perfilLower = (user.perfil || '').toLowerCase()
  const isAdmin = perfilLower === 'administrador'
  const isTecnico = perfilLower.includes('tecnico')
  const isParceiro = perfilLower === 'parceiro'
  const isCliente = perfilLower === 'cliente'

  // Restrições de parceiro / cliente
  if (isParceiro || isCliente) {
    if (shortcut.devOnly) return false
    if (shortcut.adminOnly) return false
    if (shortcut.tecnicoOrAdminOnly) return false
  }

  if (shortcut.adminOnly && !isAdmin) return false
  if (shortcut.tecnicoOrAdminOnly && !isAdmin && !isTecnico) return false

  // Checagem de rota configurada nas permissões
  return permissionsApi.canAccessRoute(shortcut.path)
}

export function getDefaultShortcutIds(user: any): string[] {
  const perfilLower = (user?.perfil || '').toLowerCase()
  const isTecnico = perfilLower.includes('tecnico')
  const isAdmin = perfilLower === 'administrador'
  const isComercial = perfilLower === 'comercial'
  const isCliente = perfilLower === 'cliente'

  if (isCliente) {
    return ['tickets']
  }

  if (isTecnico) {
    return ['dev-tarefas', 'dev-qa', 'dev-pendentes', 'tickets']
  }

  if (isAdmin) {
    return ['dashboard', 'tickets', 'dev-qa', 'implantacoes']
  }

  if (isComercial) {
    return ['comercial', 'clientes', 'tickets', 'dashboard']
  }

  return ['dashboard', 'tickets', 'implantacoes', 'clientes']
}

export function getStorageKey(userId?: string): string {
  return `@Mantran:header_shortcuts_${userId || 'guest'}`
}

export function loadUserShortcutIds(user: any): string[] {
  if (!user) return []
  const key = getStorageKey(user.id)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filtra para garantir que os IDs existem e são válidos para este usuário
        const valid = parsed
          .filter((id: string) => typeof id === 'string')
          .slice(0, 4)
        if (valid.length > 0) return valid
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar atalhos do header:', err)
  }

  // Se não tiver personalizado ainda, retorna os padrões para o perfil
  return getDefaultShortcutIds(user)
}

export function saveUserShortcutIds(userId: string | undefined, shortcutIds: string[]): void {
  const key = getStorageKey(userId)
  const toSave = shortcutIds.slice(0, 4)
  localStorage.setItem(key, JSON.stringify(toSave))
  window.dispatchEvent(new Event('mantran:shortcuts-updated'))
}
