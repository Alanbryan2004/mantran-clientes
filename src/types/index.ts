export interface Cliente {
  id: string
  nome_empresa: string
  tipo: string
  possui_aditivo?: boolean
  created_at: string
}

export interface Base {
  id: string
  nome_base: string
  cliente_id: string | null
  status: string
  migrada: boolean
  created_at: string
}

export interface Modulo {
  id: string
  cliente_id: string
  nome_modulo: string
  ativo: boolean
  created_at: string
}

export interface UsuarioGPO {
  id: string
  cliente_id: string
  login: string
  senha?: string
  acesso_validado: boolean
  created_at: string
}
