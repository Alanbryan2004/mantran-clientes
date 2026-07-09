import clsx from 'clsx'
import { Users, Blocks, Pencil, Trash2 } from 'lucide-react'

export interface LeoEmpresa {
  id: string
  cd_empresa: string
  nome_empresa: string
  tipo: string
  has_usuarios: boolean
  has_modulos: boolean
  senha_padrao: string
}

interface LeoMadeirasTableProps {
  empresas: LeoEmpresa[]
  onOpenUsuarios: (empresaId: string, nomeEmpresa: string) => void
  onOpenModulos: (empresaId: string, nomeEmpresa: string) => void
  onEdit: (empresa: LeoEmpresa) => void
  onDelete: (empresaId: string, nomeEmpresa: string) => void
}

export function LeoMadeirasTable({ empresas, onOpenUsuarios, onOpenModulos, onEdit, onDelete }: LeoMadeirasTableProps) {
  
  return (
    <div className="card overflow-y-auto p-0 flex-1">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-slate-800 text-slate-400 sticky top-0 z-10 shadow-sm border-b border-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">CD_EMPRESA</th>
            <th className="px-4 py-3 font-semibold">EMPRESA</th>
            <th className="px-4 py-3 font-semibold text-center">TIPO</th>
            <th className="px-4 py-3 font-semibold text-center">USUÁRIOS</th>
            <th className="px-4 py-3 font-semibold text-center">MÓDULOS</th>
            <th className="px-4 py-3 font-semibold">SENHA</th>
            <th className="px-4 py-3 font-semibold text-center">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((emp) => (
            <tr 
              key={emp.id} 
              className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-4 py-2 font-medium text-blue-400 whitespace-nowrap">
                {emp.cd_empresa}
              </td>
              <td className="px-4 py-2 font-semibold text-slate-100">
                {emp.nome_empresa}
              </td>
              <td className="px-4 py-2 text-center">
                <span className="px-2.5 py-0.5 rounded text-xs font-medium inline-flex items-center bg-orange-900/30 text-orange-400 border border-orange-800/50">
                  {emp.tipo}
                </span>
              </td>
              
              <td className="px-4 py-2 text-center">
                <button 
                  onClick={() => onOpenUsuarios(emp.id, emp.nome_empresa)}
                  className={clsx(
                    "p-1.5 rounded transition-colors inline-flex",
                    emp.has_usuarios 
                      ? "bg-brand-500/10 text-brand-400 hover:bg-brand-500/20" 
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                  title="Gerenciar Usuários"
                >
                  <Users className="w-4 h-4" />
                </button>
              </td>

              <td className="px-4 py-2 text-center">
                <button 
                  onClick={() => onOpenModulos(emp.id, emp.nome_empresa)}
                  className={clsx(
                    "p-1.5 rounded transition-colors inline-flex",
                    emp.has_modulos
                      ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" 
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                  title="Gerenciar Módulos"
                >
                  <Blocks className="w-4 h-4" />
                </button>
              </td>
              
              <td className="px-4 py-2 text-slate-400 font-mono text-xs">
                {emp.senha_padrao || '-'}
              </td>

              <td className="px-4 py-2 text-center whitespace-nowrap space-x-2">
                <button 
                  onClick={() => onEdit(emp)}
                  className="p-1.5 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors inline-flex"
                  title="Editar Empresa"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(emp.id, emp.nome_empresa)}
                  className="p-1.5 bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded transition-colors inline-flex"
                  title="Excluir Empresa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {empresas.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                Nenhuma empresa cadastrada na base Léo Madeiras.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
