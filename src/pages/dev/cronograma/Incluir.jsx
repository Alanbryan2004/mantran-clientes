import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    RotateCcw, PlusCircle, Pencil, Trash2,
    ChevronLeft, ChevronRight, RefreshCw, CalendarPlus,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { apiGet, apiPost, apiPatch, apiDelete } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

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

export default function Incluir() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [lista, setLista] = useState([]);
    const [telas, setTelas] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [todosUsuarios, setTodosUsuarios] = useState([]);
    
    const [editId, setEditId] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [dados, setDados] = useState({
        controle_api_id: "",
        inicio: "",
        termino: "",
        tecnico_id: "",
        carga_horaria: "",
        justificativa: "",
    });
    
    const [originalItem, setOriginalItem] = useState(null);
    const [filtroTecnico, setFiltroTecnico] = useState("");

    // Segurança: Apenas Administrador acessa Incluir
    useEffect(() => {
        if (user && user.perfil !== "Administrador") {
            navigate("/dev/cronograma/visualizar");
        }
    }, [user, navigate]);

    async function carregar() {
        try {
            let dataTecnicos = [];
            try {
                dataTecnicos = await apiGet("/rest/v1/usuario?select=id,nome,login,perfil,e_tecnico,ativo&ativo=eq.true&order=nome.asc");
            } catch {
                dataTecnicos = await apiGet("/rest/v1/usuario?select=id,nome,login,perfil,ativo&ativo=eq.true&order=nome.asc");
            }

            const [dataCronograma, dataTelas] = await Promise.all([
                apiGet("/rest/v1/cronograma?select=*,controle_api(tela,nome_tabela)&order=inicio.asc,termino.asc"),
                apiGet("/rest/v1/controle_api?select=id,tela,nome_tabela&order=nome_tabela.asc")
            ]);

            // Filtra apenas usuários que atuam como Técnico
            const apenasTecnicos = (dataTecnicos || []).filter(u => {
                if (typeof u.e_tecnico === "boolean") {
                    return u.e_tecnico;
                }
                if (u.perfil === "Tecnico") return true;
                if (u.perfil === "Administrador" && ["alan", "gabriel", "daniel", "guilherme"].includes((u.login || "").toLowerCase())) {
                    return true;
                }
                return false;
            });

            setLista(dataCronograma || []);
            setTelas(dataTelas || []);
            setTecnicos(apenasTecnicos);
            setTodosUsuarios(dataTecnicos || []);
        } catch (err) {
            console.error("Erro ao carregar dados", err);
            alert("Erro ao carregar os dados. Verifique a tabela cronograma no banco de dados.");
        }
    }

    useEffect(() => {
        if (user && user.perfil === "Administrador") {
            carregar();
        }
    }, [user]);

    if (!user || user.perfil !== "Administrador") return null;

    const listaFiltrada = filtroTecnico 
        ? lista.filter(item => item.tecnico_id === filtroTecnico)
        : lista;

    const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PAGE_SIZE));
    const inicioOffset = (pagina - 1) * PAGE_SIZE;
    const listaExibida = listaFiltrada.slice(inicioOffset, inicioOffset + PAGE_SIZE);

    const limpar = () => {
        setDados({
            controle_api_id: "",
            inicio: "",
            termino: "",
            tecnico_id: "",
            carga_horaria: "",
            justificativa: "",
        });
        setOriginalItem(null);
        setEditId(null);
    };

    const incluir = async () => {
        if (!dados.controle_api_id) return alert("Selecione a Tela");
        if (!dados.inicio) return alert("Informe a data de Início");
        if (!dados.termino) return alert("Informe a data de Término");
        if (!dados.tecnico_id) return alert("Selecione o Técnico");
        if (!dados.carga_horaria || Number(dados.carga_horaria) <= 0) return alert("Informe a Carga Horária");

        try {
            await apiPost("/rest/v1/cronograma", {
                controle_api_id: dados.controle_api_id,
                inicio: dados.inicio,
                termino: dados.termino,
                tecnico_id: dados.tecnico_id,
                carga_horaria: Number(dados.carga_horaria)
            });

            const tecnicoSelecionado = tecnicos.find(t => t.id === dados.tecnico_id);
            if (tecnicoSelecionado) {
                await apiPatch(`/rest/v1/controle_api?id=eq.${dados.controle_api_id}`, {
                    tecnico_id: tecnicoSelecionado.id,
                    tecnico_nome: tecnicoSelecionado.nome
                });
            }

            alert("Cronograma incluído com sucesso!");
            await carregar();
            limpar();
        } catch (e) {
            alert("Erro ao cadastrar: " + e.message);
        }
    };

    const alterar = async () => {
        if (!editId) return alert("Selecione um registro na tabela");
        if (!dados.controle_api_id) return alert("Selecione a Tela");
        if (!dados.inicio) return alert("Informe a data de Início");
        if (!dados.termino) return alert("Informe a data de Término");
        if (!dados.tecnico_id) return alert("Selecione o Técnico");
        if (!dados.carga_horaria || Number(dados.carga_horaria) <= 0) return alert("Informe a Carga Horária");

        const isTerminoAlterado = originalItem && originalItem.termino !== dados.termino;
        if (isTerminoAlterado && !dados.justificativa.trim()) {
            return alert("Como a data de término foi alterada, você deve informar uma justificativa.");
        }

        try {
            const payload = {
                controle_api_id: dados.controle_api_id,
                inicio: dados.inicio,
                termino: dados.termino,
                tecnico_id: dados.tecnico_id,
                carga_horaria: Number(dados.carga_horaria),
                justificativa: dados.justificativa
            };

            // Se for a primeira alteração, grava o término original
            if (isTerminoAlterado && !originalItem.termino_original) {
                payload.termino_original = originalItem.termino;
            }

            await apiPatch(`/rest/v1/cronograma?id=eq.${editId}`, payload);

            const tecnicoSelecionado = tecnicos.find(t => t.id === dados.tecnico_id);
            if (tecnicoSelecionado) {
                await apiPatch(`/rest/v1/controle_api?id=eq.${dados.controle_api_id}`, {
                    tecnico_id: tecnicoSelecionado.id,
                    tecnico_nome: tecnicoSelecionado.nome
                });
            }

            alert("Cronograma alterado com sucesso!");
            await carregar();
            limpar();
        } catch (e) {
            alert("Erro ao alterar: " + e.message);
        }
    };

    const excluir = async () => {
        if (!editId) return alert("Selecione um registro na tabela");
        if (!window.confirm("Confirma exclusão deste cronograma?")) return;

        try {
            await apiDelete(`/rest/v1/cronograma?id=eq.${editId}`);
            alert("Registro excluído com sucesso!");
            await carregar();
            limpar();
        } catch (e) {
            alert("Erro ao excluir: " + e.message);
        }
    };

    const sincronizarTudo = async () => {
        if (!window.confirm("Isso vai vincular TODAS as tarefas do Cronograma aos respectivos técnicos na tabela principal. Deseja continuar?")) return;
        
        try {
            for (const item of lista) {
                const tecnicoSelecionado = tecnicos.find(t => t.id === item.tecnico_id);
                if (tecnicoSelecionado) {
                    await apiPatch(`/rest/v1/controle_api?id=eq.${item.controle_api_id}`, {
                        tecnico_id: tecnicoSelecionado.id,
                        tecnico_nome: tecnicoSelecionado.nome
                    });
                }
            }
            alert("Sincronização concluída com sucesso! Agora todas as tarefas já vão aparecer para os técnicos.");
            await carregar();
        } catch (e) {
            alert("Erro na sincronização: " + e.message);
        }
    };

    const selecionar = (item) => {
        setDados({
            controle_api_id: item.controle_api_id,
            inicio: item.inicio,
            termino: item.termino,
            tecnico_id: item.tecnico_id,
            carga_horaria: item.carga_horaria,
            justificativa: item.justificativa || "",
        });
        setOriginalItem(item);
        setEditId(item.id);
    };

    const getNomeTecnico = (id) => {
        const tec = (todosUsuarios || []).find(t => t.id === id) || tecnicos.find(t => t.id === id);
        return tec ? tec.nome : "Desconhecido";
    };

    // Filtra as telas que já estão no cronograma, exceto a que está selecionada na edição atual
    const telasDisponiveis = telas.filter(t => 
        !lista.some(c => c.controle_api_id === t.id) || t.id === dados.controle_api_id
    );

    return (
        <AppShell
            title="Incluir Cronograma"
            subtitle="Agendamento e atribuição de técnicos para desenvolvimento"
            icon={CalendarPlus}
            actions={
                <button
                    onClick={sincronizarTudo}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                >
                    <RefreshCw size={15} />
                    Sincronizar Técnicos
                </button>
            }
        >
            <div className="space-y-6">
                {/* ── Formulário Dados do Cronograma ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Dados do Agendamento</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Selecione a tela, técnico responsável e período previsto</p>
                        </div>
                        {editId && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Editando Registro #{editId}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Tela / Objeto
                            </label>
                            <select
                                value={dados.controle_api_id}
                                onChange={(e) => setDados({ ...dados, controle_api_id: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                            >
                                <option value="">-- Selecione a Tela --</option>
                                {telasDisponiveis.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome_tabela} ({t.tela})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Técnico Responsável
                            </label>
                            <select
                                value={dados.tecnico_id}
                                onChange={(e) => setDados({ ...dados, tecnico_id: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                            >
                                <option value="">-- Selecione o Técnico --</option>
                                {dados.tecnico_id && !tecnicos.some(t => t.id === dados.tecnico_id) && (
                                    <option value={dados.tecnico_id}>{getNomeTecnico(dados.tecnico_id)}</option>
                                )}
                                {tecnicos.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Carga Horária Prevista (Horas)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={dados.carga_horaria}
                                onChange={(e) => setDados({ ...dados, carga_horaria: e.target.value })}
                                placeholder="Ex: 8"
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Data Início
                            </label>
                            <input
                                type="date"
                                value={dados.inicio}
                                onChange={(e) => setDados({ ...dados, inicio: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Data Término
                            </label>
                            <input
                                type="date"
                                value={dados.termino}
                                onChange={(e) => setDados({ ...dados, termino: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                            />
                        </div>

                        {originalItem && originalItem.termino !== dados.termino && (
                            <div className="lg:col-span-3">
                                <label className="block text-xs font-bold text-rose-700 mb-1.5 uppercase tracking-wide">
                                    Justificativa da Alteração de Data
                                </label>
                                <input
                                    type="text"
                                    value={dados.justificativa}
                                    onChange={(e) => setDados({ ...dados, justificativa: e.target.value })}
                                    placeholder="Informe o motivo da alteração de prazo..."
                                    className="w-full bg-rose-50/50 border border-rose-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                        <button
                            onClick={incluir}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
                        >
                            <PlusCircle size={16} />
                            Incluir no Cronograma
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

                {/* ── Tabela Cronogramas Cadastrados ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Cronogramas Cadastrados</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Selecione para editar ou excluir</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                Filtrar Técnico:
                            </span>
                            <select
                                value={filtroTecnico}
                                onChange={(e) => {
                                    setFiltroTecnico(e.target.value);
                                    setPagina(1);
                                }}
                                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[160px]"
                            >
                                <option value="">-- Todos os Técnicos --</option>
                                {tecnicos.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <th className="py-3.5 px-6">Tela</th>
                                    <th className="py-3.5 px-4 text-center">Início</th>
                                    <th className="py-3.5 px-4 text-center">Término</th>
                                    <th className="py-3.5 px-4 text-center">Técnico</th>
                                    <th className="py-3.5 px-4 text-center">Carga Horária</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listaExibida.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                                            Nenhum cronograma cadastrado
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
                                                {item.controle_api?.nome_tabela}
                                            </td>
                                            <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-600">
                                                {new Date(item.inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </td>
                                            <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-600">
                                                <div className="inline-flex items-center justify-center gap-1">
                                                    {new Date(item.termino).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    {item.justificativa && <span title={item.justificativa}>⚠️</span>}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {getNomeTecnico(item.tecnico_id)}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {item.carga_horaria}h
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
                            {listaFiltrada.length === 0
                                ? "0 registros"
                                : `Exibindo ${inicioOffset + 1}–${Math.min(inicioOffset + PAGE_SIZE, listaFiltrada.length)} de ${listaFiltrada.length} registros`}
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
