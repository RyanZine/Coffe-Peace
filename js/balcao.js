import {
    entrarBalcao, balcaoLiberado, sairBalcao, pedidosDoDia, avancarStatus,
    carregarProdutos, definirDisponibilidade, ouvirMudancas,
} from "./dados.js";
import { $, elemento, mostrarToast, tentar, criarCartaoPedido, confirmarDuasVezes } from "./ui.js";

const COLUNAS = ["recebido", "preparando", "pronto", "entregue"];
const ACOES = {
    recebido: [{ status: "preparando", rotulo: "Começar preparo", classe: "botao-principal" }, { status: "cancelado", rotulo: "Cancelar", classe: "botao-texto" }],
    preparando: [{ status: "pronto", rotulo: "Marcar pronto", classe: "botao-principal" }, { status: "cancelado", rotulo: "Cancelar", classe: "botao-texto" }],
    pronto: [{ status: "entregue", rotulo: "Entregar ao cliente", classe: "botao-principal" }],
};

// ids já vistos: o que aparecer fora desta lista é pedido novo e fica destacado até alguém agir nele
let conhecidos = null;
const destacados = new Set();

// ---------- PIN ----------
$("form-pin").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (await entrarBalcao($("pin").value)) return abrirBalcao();
    $("erro-pin").textContent = "PIN incorreto.";
    $("pin").select();
});

$("sair").addEventListener("click", () => {
    sairBalcao();
    location.reload();
});

function abrirBalcao() {
    $("tela-pin").hidden = true;
    $("tela-balcao").hidden = false;
    $("usuario").hidden = false;
    atualizar();
    ouvirMudancas(atualizar);
}

// ---------- Quadro ----------
async function atualizar() {
    const pedidos = await pedidosDoDia();
    const novos = conhecidos ? pedidos.filter((p) => !conhecidos.has(p.id)) : [];
    conhecidos = new Set(pedidos.map((p) => p.id));
    novos.forEach((p) => destacados.add(p.id));
    pedidos.forEach((p) => (p.novo = destacados.has(p.id)));
    if (novos.length) {
        mostrarToast(`Novo pedido #${novos.at(-1).id} de ${novos.at(-1).cliente_nome}`);
        if (document.hidden) document.title = "● Novo pedido · Balcão";
    }

    COLUNAS.forEach((status) => {
        const coluna = document.querySelector(`[data-coluna="${status}"]`);
        const doStatus = pedidos.filter((p) => p.status === status);
        // entregues mais recentes no topo; os demais por ordem de chegada
        if (status === "entregue") doStatus.reverse();
        coluna.querySelector("h3 span").textContent = doStatus.length;
        coluna.querySelector("ol").replaceChildren(...doStatus.map((p) => criarCartaoPedido(p, ACOES[p.status])));
    });
    renderizarEsgotados(await carregarProdutos());
}

$("quadro").addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-status]");
    if (!botao) return;
    if (botao.dataset.status === "cancelado" && !confirmarDuasVezes(botao, "Cancelar")) return;
    const id = Number(botao.closest(".cartao-pedido").dataset.id);
    destacados.delete(id);
    botao.disabled = true;
    // a camada de dados avisa a mudança e o quadro se redesenha sozinho
    await tentar(() => avancarStatus(id, botao.dataset.status)).catch(() => (botao.disabled = false));
});

addEventListener("visibilitychange", () => {
    if (!document.hidden) document.title = "Balcão · Coffe Peace";
});

// ---------- Esgotados ----------
function renderizarEsgotados(produtos) {
    $("lista-esgotados").replaceChildren(...produtos.map((produto) => {
        const li = elemento("li", produto.disponivel ? "" : "esgotado");
        const rotulo = elemento("label", "alternar");
        const caixa = Object.assign(document.createElement("input"), { type: "checkbox", checked: !produto.disponivel });
        caixa.dataset.id = produto.id;
        rotulo.append(caixa, ` ${produto.nome}`);
        li.append(rotulo);
        return li;
    }));
}

$("lista-esgotados").addEventListener("change", async (evento) => {
    const caixa = evento.target;
    await tentar(
        () => definirDisponibilidade(caixa.dataset.id, !caixa.checked),
        caixa.checked ? "Marcado como esgotado" : "Voltou ao cardápio",
    ).catch(() => (caixa.checked = !caixa.checked));
});

if (balcaoLiberado()) abrirBalcao();
