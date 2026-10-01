export interface LoggedUser {
  id: string
  nome: string
  login: string
  perfil: string
  ativo: boolean
  meta_semanal?: number
  implantacao_id?: string
  foto_url?: string | null
  data_nascimento?: string | null
  email_corporativo?: string | null
  email_pessoal?: string | null
  cargo?: string | null
  telefone_empresarial?: string | null
  cliente_email?: string | null // e-mail do cliente logado no portal de tickets
}

/**
 * Atualiza a foto (avatar) do usuário logado no localStorage.
 * Mantém a sessão sincronizada após o upload no banco.
 */
export function updateLoggedUserFoto(fotoUrl: string | null): void {
  try {
    const stored = localStorage.getItem('@Mantran:user')
    if (!stored) return
    const user = JSON.parse(stored)
    user.foto_url = fotoUrl
    localStorage.setItem('@Mantran:user', JSON.stringify(user))
  } catch (_) {}
}

/**
 * Atualiza a data de nascimento do usuário logado no localStorage.
 */
export function updateLoggedUserDataNascimento(dataNascimento: string | null): void {
  try {
    const stored = localStorage.getItem('@Mantran:user')
    if (!stored) return
    const user = JSON.parse(stored)
    user.data_nascimento = dataNascimento
    localStorage.setItem('@Mantran:user', JSON.stringify(user))
  } catch (_) {}
}

/**
 * Atualiza os e-mails (corporativo e pessoal) do usuário logado no localStorage.
 */
export function updateLoggedUserEmails(emailCorporativo?: string | null, emailPessoal?: string | null): void {
  try {
    const stored = localStorage.getItem('@Mantran:user')
    if (!stored) return
    const user = JSON.parse(stored)
    if (emailCorporativo !== undefined) user.email_corporativo = emailCorporativo
    if (emailPessoal !== undefined) user.email_pessoal = emailPessoal
    localStorage.setItem('@Mantran:user', JSON.stringify(user))
  } catch (_) {}
}

/**
 * Atualiza cargo e telefone empresarial do usuário logado no localStorage (para a assinatura).
 */
export function updateLoggedUserAssinatura(cargo?: string | null, telefoneEmpresarial?: string | null): void {
  try {
    const stored = localStorage.getItem('@Mantran:user')
    if (!stored) return
    const user = JSON.parse(stored)
    if (cargo !== undefined) user.cargo = cargo
    if (telefoneEmpresarial !== undefined) user.telefone_empresarial = telefoneEmpresarial
    localStorage.setItem('@Mantran:user', JSON.stringify(user))
  } catch (_) {}
}

export function getLoggedUser(): LoggedUser | null {
  try {
    const stored = localStorage.getItem('@Mantran:user')
    if (stored) return JSON.parse(stored)
  } catch (_) {}
  return null
}

/**
 * Retorna true se o usuário logado possui perfil 'Administrador'.
 */
export function isAdminUser(): boolean {
  const user = getLoggedUser()
  if (!user || !user.perfil) return false
  return user.perfil.trim().toLowerCase() === 'administrador'
}

/**
 * Retorna true se o perfil do usuário logado está configurado como Somente Leitura (read_only: true).
 * Consulta dinamicamente as permissões definidas no Controle de Permissões (perfil_permissoes).
 */
export function isReadOnlyUser(): boolean {
  const user = getLoggedUser()
  if (!user || !user.perfil) return false
  const perfilName = user.perfil.trim()
  if (perfilName.toLowerCase() === 'administrador') return false

  try {
    const cached = localStorage.getItem('@Mantran:perfil_permissoes')
    if (cached) {
      const perms = JSON.parse(cached)
      if (perms[perfilName] && perms[perfilName].read_only !== undefined) {
        return !!perms[perfilName].read_only
      }
    }
  } catch (_) {}

  // Fallbacks padrão caso não haja cache
  const p = perfilName.toLowerCase()
  if (p === 'usuario' || p === 'cliente') return true
  return false
}

/**
 * Retorna true se o usuário logado possui perfil 'Cliente'.
 */
export function isClienteUser(): boolean {
  const user = getLoggedUser()
  if (!user || !user.perfil) return false
  return user.perfil.trim().toLowerCase() === 'cliente'
}

/**
 * Retorna true se o usuário logado possui perfil 'Técnico' / 'Tecnico'.
 */
export function isTecnicoUser(): boolean {
  const user = getLoggedUser()
  if (!user || !user.perfil) return false
  if (isAdminUser()) return false
  const p = user.perfil.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return p === 'tecnico' || p === 'tecnica'
}

/**
 * Retorna true se o usuário logado é um funcionário da Mantran (não é cliente, parceiro, ou consulta/usuário externo).
 */
export function isFuncionarioUser(): boolean {
  const user = getLoggedUser()
  if (!user || !user.perfil) return false
  const p = user.perfil.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return p !== 'cliente' && p !== 'parceiro' && p !== 'usuario' && !p.includes('consulta')
}

