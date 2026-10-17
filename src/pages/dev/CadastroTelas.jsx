import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    RotateCcw, PlusCircle, Pencil, Trash2,
    ChevronLeft, ChevronRight, Layers,
} from "lucide-react";
import AppShell from "./components/AppShell";
import { apiGet, apiPost, apiPatch, apiDelete } from "./services/api";

const PAGE_SIZE = 20;

function paginas(atual, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total, atual, atual - 1, atual + 1].filter(p => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...");
        result.push(sorted[i]);
    }
    return result;
}

export default function CadastroTelas() {
    const navigate = useNavigate();

    const [lista, setLista] = useState([]);
    const [editId, setEditId] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [dados, setDados] = useState({
        nome_tabela: "",
        tipo_tabela: "Cadastro",
        qtd_campos: "",
        modulo: "Operacao",
    });

    async function carregar() {
        const data = await apiGet(
            "/rest/v1/controle_api?select=id,tela,nome_tabela,tipo_tabela,modulo,qtd_campos,nivel_api&order=nome_tabela.asc"
        );
        setLista(data || []);
        setPagina(1);
    }

    useEffect(() => { carregar(); }, []);

    const totalPaginas = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
    const inicio = (pagina - 1) * PAGE_SIZE;
    const listaExibida = lista.slice(inicio, inicio + PAGE_SIZE);

    const limpar = () => {
        setDados({ nome_tabela: "", tipo_tabela: "Cadastro", qtd_campos: "", modulo: "Operacao" });
        setEditId(null);
    };

    const incluir = async () => {
        if (!dados.nome_tabela.trim()) return alert("Informe a Tela");
        if (!dados.qtd_campos || Number(dados.qtd_campos) < 0) return alert("Informe a quantidade de campos (pode ser 0)");

        try {
            await apiPost("/rest/v1/controle_api", {
                tela: dados.nome_tabela.trim(),
                nome_tabela: dados.nome_tabela.trim(),
                tipo_tabela: dados.tipo_tabela,
                qtd_campos: Number(dados.qtd_campos),
                modulo: dados.modulo,
                status_api: "Pendente",
                status_teste: "Pendente",
                status_documentacao: "Pendente",
            });

            alert("Tela incluída com sucesso");
            await carregar();
            limpar();
        } catch (error) {
            alert("Erro ao incluir: " + (error.message || String(error)));
        }
    };

    const alterar = async () => {
        if (!editId) return alert("Selecione um registro na tabela");

        try {
            await apiPatch(`/rest/v1/controle_api?id=eq.${editId}`, {
                tela: dados.nome_tabela.trim(),
                nome_tabela: dados.nome_tabela.trim(),
                tipo_tabela: dados.tipo_tabela,
                qtd_campos: Number(dados.qtd_campos),
                modulo: dados.modulo,
            });

            alert("Tela alterada com sucesso");
            await carregar();
            limpar();
        } catch (error) {
            alert("Erro ao alterar: " + (error.message || String(error)));
        }
    };

    const excluir = async () => {
        if (!editId) return alert("Selecione um registro na tabela");
        if (!window.confirm("Confirma exclusão da tela?")) return;

        try {
            await apiDelete(`/rest/v1/controle_api?id=eq.${editId}`);

            alert("Tela excluída com sucesso");
            await carregar();
            limpar();
        } catch (error) {
            alert("Erro ao excluir: " + (error.message || String(error)));
        }
    };

    const selecionar = (item) => {
        setDados({
            nome_tabela: item.tela,
            tipo_tabela: item.tipo_tabela,
            qtd_campos: item.qtd_campos,
            modulo: item.modulo,
        });
        setEditId(item.id);
    };

    return (
        <AppShell
            title="Cadastro de Telas"
            subtitle="Gerencie e parametrize as telas e APIs do sistema"
            icon={Layers}
        >
            <div className="space-y-6">
                {/* ── Parâmetros Card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Parâmetros da Tela</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Preencha os dados abaixo para cadastrar ou editar</p>
                        </div>
                        {editId && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Editando ID #{editId}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Nome da Tela / Tabela
                            </label>
                            <input
                                type="text"
                                value={dados.nome_tabela}
                                onChange={(e) => setDados({ ...dados, nome_tabela: e.target.value })}
                                placeholder="Ex: Pedidos, Clientes..."
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Tipo
                            </label>
                            <select
                                value={dados.tipo_tabela}
                                onChange={(e) => {
                                    const novoTipo = e.target.value;
                                    let novoModulo = dados.modulo;
                                    if (novoTipo === "Arquitetura") {
                                        novoModulo = "Mantran.API";
                                    } else if (dados.tipo_tabela === "Arquitetura") {
                                        novoModulo = "Operacao";
                                    }
                                    setDados({ ...dados, tipo_tabela: novoTipo, modulo: novoModulo });
                                }}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                            >
                                <option>Cadastro</option>
                                <option>Documento</option>
                                <option>Arquitetura</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Qtd. Campos
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={dados.qtd_campos}
                                onChange={(e) => setDados({ ...dados, qtd_campos: e.target.value })}
                                placeholder="0"
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Módulo
                            </label>
                            <select
                                value={dados.modulo}
                                onChange={(e) => setDados({ ...dados, modulo: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                            >
                                {dados.tipo_tabela === "Arquitetura" ? (
                                    <>
                                        <option>Mantran.API</option>
                                        <option>Mantran.Web.React</option>
                                        <option>IA</option>
                                        <option>Organização</option>
                                    </>
                                ) : (
                                    <>
                                        <option>Operacao</option>
                                        <option>Financeiro</option>
                                        <option>WMS</option>
                                        <option>Seguranca</option>
                                        <option>Oficina</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                        <button
                            onClick={incluir}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
                        >
                            <PlusCircle size={16} />
                            Incluir Tela
                        </button>

                        <button
                            onClick={alterar}
                            disabled={!editId}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer ${
                                editId 
                                    ? "bg-amber-600 hover:bg-amber-700 text-white" 
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            }`}
                        >
                            <Pencil size={16} />
                            Alterar
                        </button>

                        <button
                            onClick={excluir}
                            disabled={!editId}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer ${
                                editId 
                                    ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            }`}
                        >
                            <Trash2 size={16} />
                            Excluir
                        </button>

                        <button
                            onClick={limpar}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition-all cursor-pointer ml-auto"
                        >
                            <RotateCcw size={16} />
                            Limpar
                        </button>
                    </div>
                </div>

                {/* ── Registros Cadastrados Card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Registros Cadastrados</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Clique em uma linha para editar ou excluir</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                            Total: <strong className="text-slate-800">{lista.length}</strong> telas
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <th className="py-3.5 px-6">Tela</th>
                                    <th className="py-3.5 px-4 text-center">Tipo</th>
                                    <th className="py-3.5 px-4 text-center">Módulo</th>
                                    <th className="py-3.5 px-4 text-center">Qtd. Campos</th>
                                    <th className="py-3.5 px-4 text-center">Nível API</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listaExibida.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                                            Nenhum registro encontrado
                                        </td>
                                    </tr>
                                )}
                                {listaExibida.map((item) => {
                                    const isSelected = editId === item.id;
                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => selecionar(item)}
                                            className={`transition-colors cursor-pointer ${
                                                isSelected 
                                                    ? "bg-brand-50/60 font-semibold" 
                                                    : "hover:bg-slate-50/80"
                                            }`}
                                        >
                                            <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2">
                                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
                                                {item.tela}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                    {item.tipo_tabela}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center text-slate-600 font-medium">{item.modulo}</td>
                                            <td className="py-3.5 px-4 text-center text-slate-600">{item.qtd_campos}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {item.nivel_api || "N/D"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            {lista.length === 0
                                ? "0 registros"
                                : `Exibindo ${inicio + 1}–${Math.min(inicio + PAGE_SIZE, lista.length)} de ${lista.length} registros`}
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPagina(p => p - 1)}
                                disabled={pagina === 1}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                            >
                                <ChevronLeft size={14} /> Ant
                            </button>

                            {paginas(pagina, totalPaginas).map((item, i) =>
                                item === "..." ? (
                                    <span key={`e${i}`} className="text-xs text-slate-400 px-1">…</span>
                                ) : (
                                    <button
                                        key={item}
                                        onClick={() => setPagina(item)}
                                        className={`w-7 h-7 text-xs rounded-lg font-bold flex items-center justify-center transition-all ${
                                            pagina === item
                                                ? "bg-brand-600 text-white shadow-sm"
                                                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {item}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => setPagina(p => p + 1)}
                                disabled={pagina === totalPaginas}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                            >
                                Próx <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
