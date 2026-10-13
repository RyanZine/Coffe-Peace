import {
    pedidosDoDia, avancarStatus, metricasDoDia, carregarProdutos, atualizarProduto, criarProduto,
    definirDisponibilidade, listarCupons, criarCupom, alternarCupom, pinAtual, trocarPin, restaurarDemo, ouvirMudancas,
} from "./dados.js";
import { $, elemento, moeda, tentar, criarCartaoPedido, confirmarDuasVezes, ROTULO_STATUS } from "./ui.js";

const IMAGENS = ["cafe_expresso.png", "cafe_mocha.png", "cappuccino.png", "latte.png", "macchiato.png", "cha.png"];
let abaAtual = "resumo";

// ---------- Entrada ----------
$("entrar").addEventListener("click", () => {
    sessionStorage.setItem("lojista-liberado", "1");
    abrirPainel();
});

$("sair").addEventListener("click", () => {
    sessionStorage.removeItem("lojista-liberado");
    location.reload();
});

function abrirPainel() {
    $("tela-entrada").hidden = true;
    $("abas").hidden = false;
    $("usuario").hidden = false;
    $("imagens").replaceChildren(...IMAGENS.map((img) => new Option(img.replace(/\.png$/, "").replace("_", " "), `img/${img}`)));
    abrirAba("resumo");
    ouvirMudancas(() => abrirAba(abaAtual, { manterEdicao: true }));
}

// ---------- Abas ----------
const CARREGAR = { resumo: carregarResumo, pedidos: carregarPedidos, cardapio: carregarCardapio, cupons: carregarCupons, ajustes: carregarAjustes };

function abrirAba(nome, { manterEdicao = false } = {}) {
    // uma mudança vinda de outra aba não pode apagar o que o lojista está digitando
    if (manterEdicao && nome === "cardapio" && document.activeElement?.closest("#lista-produtos")) return;
    abaAtual = nome;
    document.querySelectorAll(".aba").forEach((aba) => (aba.hidden = aba.id !== `aba-${nome}`));
    document.querySelectorAll("#abas button").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === nome));
    CARREGAR[nome]();
}

$("abas").addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-aba]");
    if (botao) abrirAba(botao.dataset.aba);
});

// ---------- Resumo ----------
async function carregarResumo() {
    const m = await metricasDoDia();
    $("m-pedidos").textContent = m.pedidos;
    $("m-faturamento").textContent = moeda.format(m.faturamento);
    $("m-ticket").textContent = moeda.format(m.ticket_medio);
    $("m-top").replaceChildren(...(m.mais_vendidos.length
        ? m.mais_vendidos.map((p) => elemento("li", "", `${p.nome} (${p.quantidade})`))
        : [elemento("li", "", "Nenhuma venda ainda")]));

    const fila = (await pedidosDoDia()).filter((p) => ["recebido", "preparando", "pronto"].includes(p.status));
    $("fila").replaceChildren(...(fila.length
        ? ["recebido", "preparando", "pronto"].map((status) => {
            const quantos = fila.filter((p) => p.status === status).length;
            const bloco = elemento("div", "fila-item");
            bloco.append(elemento("strong", "", quantos), elemento("span", "", ROTULO_STATUS[status]));
            return bloco;
        })
        : [elemento("p", "dica", "Nenhum pedido aguardando.")]));
}

// ---------- Pedidos ----------
async function carregarPedidos() {
    const pedidos = (await pedidosDoDia()).reverse();
    $("lista-pedidos").replaceChildren(...(pedidos.length
        ? pedidos.map((p) => {
            const acoes = ["recebido", "preparando"].includes(p.status) ? [{ status: "cancelado", rotulo: "Cancelar pedido", classe: "botao-texto" }] : [];
            const cartao = criarCartaoPedido(p, acoes);
            cartao.querySelector(".cartao-topo").append(elemento("span", `status status-${p.status}`, ROTULO_STATUS[p.status]));
            return cartao;
        })
        : [elemento("p", "dica", "Nenhum pedido hoje. Faça um pela loja para ver aqui.")]));
}

$("lista-pedidos").addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-status]");
    if (!botao || !confirmarDuasVezes(botao, "Cancelar pedido")) return;
    await tentar(() => avancarStatus(Number(botao.closest(".cartao-pedido").dataset.id), "cancelado"), "Pedido cancelado").catch(() => {});
});

// ---------- Cardápio ----------
async function carregarCardapio() {
    const produtos = await carregarProdutos();
    $("lista-produtos").replaceChildren(...produtos.map((produto) => {
        const li = elemento("li", "linha-produto");
        li.dataset.id = produto.id;
        li.classList.toggle("esgotado", !produto.disponivel);

        const imagem = elemento("img");
        imagem.src = produto.imagem;
        imagem.alt = "";
        const nome = Object.assign(elemento("input"), { value: produto.nome, name: "nome", maxLength: 60, ariaLabel: "Nome" });
        const preco = Object.assign(elemento("input"), { value: produto.preco, name: "preco", type: "number", min: 0.5, step: 0.5, ariaLabel: "Preço" });
        const descricao = Object.assign(elemento("input", "campo-descricao"), { value: produto.descricao, name: "descricao", maxLength: 160, ariaLabel: "Descrição" });
        const salvar = elemento("button", "botao-texto", "Salvar");
        salvar.dataset.acao = "salvar";

        const alternar = elemento("label", "alternar");
        const caixa = Object.assign(document.createElement("input"), { type: "checkbox", checked: !produto.disponivel });
        caixa.dataset.acao = "esgotado";
        alternar.append(caixa, " Esgotado");

        li.append(imagem, nome, preco, descricao, salvar, alternar);
        return li;
    }));
}

$("lista-produtos").addEventListener("click", async (evento) => {
    if (evento.target.dataset.acao !== "salvar") return;
    const linha = evento.target.closest(".linha-produto");
    const campo = (nome) => linha.querySelector(`[name="${nome}"]`).value;
    evento.target.blur();
    await tentar(
        () => atualizarProduto(linha.dataset.id, { nome: campo("nome"), preco: Number(campo("preco")), descricao: campo("descricao") }),
        "Produto atualizado",
    ).catch(() => {});
});

$("lista-produtos").addEventListener("change", async (evento) => {
    if (evento.target.dataset.acao !== "esgotado") return;
    const caixa = evento.target;
    caixa.blur();
    await tentar(
        () => definirDisponibilidade(caixa.closest(".linha-produto").dataset.id, !caixa.checked),
        caixa.checked ? "Marcado como esgotado" : "Voltou ao cardápio",
    ).catch(() => (caixa.checked = !caixa.checked));
});

$("form-produto").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));
    await tentar(() => criarProduto({ ...dados, preco: Number(dados.preco) }), `${dados.nome} adicionado ao cardápio`)
        .then(() => evento.target.reset())
        .catch(() => {});
});

// ---------- Cupons ----------
async function carregarCupons() {
    const cupons = await listarCupons();
    $("lista-cupons").replaceChildren(...cupons.map((cupom) => {
        const li = elemento("li", cupom.ativo ? "" : "inativo");
        li.append(elemento("strong", "", cupom.codigo), elemento("span", "", `${Math.round(cupom.percentual * 100)}% de desconto`));
        const botao = elemento("button", "botao-texto", cupom.ativo ? "Desativar" : "Ativar");
        botao.dataset.codigo = cupom.codigo;
        botao.dataset.ativo = cupom.ativo;
        li.append(botao);
        return li;
    }));
}

$("lista-cupons").addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-codigo]");
    if (!botao) return;
    const ativar = botao.dataset.ativo !== "true";
    await tentar(() => alternarCupom(botao.dataset.codigo, ativar), ativar ? "Cupom ativado" : "Cupom desativado").catch(() => {});
});

$("form-cupom").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const { codigo, percentual } = Object.fromEntries(new FormData(evento.target));
    await tentar(() => criarCupom(codigo, Number(percentual) / 100), "Cupom criado")
        .then(() => evento.target.reset())
        .catch(() => {});
});

// ---------- Ajustes ----------
async function carregarAjustes() {
    $("pin-atual").textContent = await pinAtual();
}

$("form-pin").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await tentar(() => trocarPin(evento.target.pin.value.trim()), "PIN do balcão trocado")
        .then(() => evento.target.reset())
        .catch(() => {});
});

$("restaurar").addEventListener("click", async (evento) => {
    if (!confirmarDuasVezes(evento.target, "Restaurar")) return;
    await tentar(restaurarDemo, "Demonstração restaurada");
});

if (sessionStorage.getItem("lojista-liberado")) abrirPainel();
