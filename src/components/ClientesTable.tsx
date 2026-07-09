import React from 'react'
import type { BaseMantran } from '../data/mockBases'
import clsx from 'clsx'
import { Users, Blocks, Pencil, Trash2 } from 'lucide-react'

interface ClientesTableProps {
  clientes: BaseMantran[]
  onOpenUsuarios: (clienteDbId: string, clienteNome: string, baseId: string) => void
  onOpenModulos: (clienteDbId: string, clienteNome: string) => void
  onEdit: (cliente: BaseMantran) => void
  onDelete: (clienteDbId: string, baseId: string, empresa: string) => void
}

export function ClientesTable({ clientes, onOpenUsuarios, onOpenModulos, onEdit, onDelete }: ClientesTableProps) {
  
  const getBadgeStyle = (col: string, value: string) => {
    if (!value) return ''
    
    if (col === 'tipo') {
      if (value === 'SHOPEE') return 'bg-green-900/30 text-green-400 border border-green-800/50'
      if (value === 'NORMAL') return 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
    }
    
    if (value === 'OK') {
      if (col === 'ts') return 'bg-purple-900/30 text-purple-400 border border-purple-800/50'
      if (col === 'servico') return 'bg-red-900/30 text-red-400 border border-red-800/50'
      if (col === 'lic') return 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'
      return 'bg-slate-800 text-slate-300 border border-slate-700'
    }
    
    if (value === 'NOK') {
      return 'bg-slate-800 text-slate-500 border border-slate-700'
    }

    return 'bg-slate-800 text-slate-300 border border-slate-700'
  }

  return (
    <div className="card overflow-y-auto p-0 flex-1">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-slate-800 text-slate-400 sticky top-0 z-10 shadow-sm border-b border-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">BASES</th>
            <th className="px-4 py-3 font-semibold">EMPRESA</th>
            <th className="px-4 py-3 font-semibold text-center">TIPO</th>
            <th className="px-4 py-3 font-semibold text-center">USUÁRIOS</th>
            <th className="px-4 py-3 font-semibold text-center">MÓDULOS</th>
            <th className="px-4 py-3 font-semibold">SENHA</th>
            <th className="px-4 py-3 font-semibold text-center">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente, index) => (
            <tr 
              key={cliente.id} 
              className={clsx(
                "border-b border-slate-800 hover:bg-slate-800/50 transition-colors",
                !cliente.empresa && "bg-slate-900/30" // Destaca linhas vazias sutilmente
              )}
            >
              <td className="px-4 py-2 font-medium text-blue-400 whitespace-nowrap">
                {cliente.id}
              </td>
              <td className={clsx("px-4 py-2 font-semibold", cliente.empresa === 'GRAN MILAN' ? 'text-red-500' : 'text-slate-100')}>
                {cliente.empresa}
              </td>
              
              {['tipo'].map((col) => {
                const val = cliente[col as keyof BaseMantran]
                return (
                  <td key={col} className="px-4 py-2 text-center">
                    {val ? (
                      <span className={clsx("px-2.5 py-0.5 rounded text-xs font-medium inline-flex items-center", getBadgeStyle(col, val))}>
                        {val}
                        <svg className="w-3 h-3 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                )
              })}
              
              <td className="px-4 py-2 text-center">
                {cliente.empresa && cliente.clienteDbId ? (
                  <button 
                    onClick={() => onOpenUsuarios(cliente.clienteDbId!, cliente.empresa, cliente.id)}
                    className="p-1.5 bg-slate-800 text-slate-300 hover:text-brand-400 hover:bg-slate-700 rounded transition-colors inline-flex"
                    title="Gerenciar Usuários"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                ) : <span className="text-slate-600">-</span>}
              </td>

              <td className="px-4 py-2 text-center">
                {cliente.empresa && cliente.clienteDbId ? (
                  <button 
                    onClick={() => onOpenModulos(cliente.clienteDbId!, cliente.empresa)}
                    className="p-1.5 bg-slate-800 text-slate-300 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors inline-flex"
                    title="Gerenciar Módulos"
                  >
                    <Blocks className="w-4 h-4" />
                  </button>
                ) : <span className="text-slate-600">-</span>}
              </td>
              
              <td className="px-4 py-2 text-slate-400 font-mono text-xs">
                {cliente.senha}
              </td>

              <td className="px-4 py-2 text-center whitespace-nowrap space-x-2">
                {cliente.empresa && cliente.clienteDbId ? (
                  <>
                    <button 
                      onClick={() => onEdit(cliente)}
                      className="p-1.5 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors inline-flex"
                      title="Editar Cliente"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(cliente.clienteDbId!, cliente.id, cliente.empresa)}
                      className="p-1.5 bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded transition-colors inline-flex"
                      title="Excluir Cliente (Limpar Base)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : <span className="text-slate-600">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
