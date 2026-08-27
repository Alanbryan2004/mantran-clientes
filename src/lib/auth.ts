export interface LoggedUser {
  id: string
  nome: string
  login: string
  perfil: string
  ativo: boolean
  meta_semanal?: number
}

export function getLoggedUser(): LoggedUser | null {
  try {
    const stored = localStorage.getItem('@Mantran:user')
    if (stored) return JSON.parse(stored)
  } catch (_) {}
  return null
}

/**
 * Retorna true se o usuário logado possui perfil 'Usuario' (Apenas Consulta / Read-Only).
 * Usuários com este perfil não podem incluir, alterar ou excluir registros.
 */
export function isReadOnlyUser(): boolean {
  const user = getLoggedUser()
  if (!user || !user.perfil) return false
  return user.perfil.trim().toLowerCase() === 'usuario'
}
