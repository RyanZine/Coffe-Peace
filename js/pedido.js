import { consultarPedido, ouvirMudancas } from "./dados.js";

// O cliente não tem login: consulta pelo código a cada poucos segundos e também quando outra aba avisa
const INTERVALO_MS = 4000;
const ETAPAS = ["recebido", "preparando", "pronto", "entregue"];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const $ = (id) => document.getElementById(id);

const codigo = new URLSearchParams(location.search).get("c");

function mostrarMensagem(texto) {
    $("mensagem").textContent = texto;
    $("mensagem").hidden = false;
}

function renderizar(pedido) {
    $("pedido").hidden = false;
    $("numero").textContent = `Pedido nº ${pedido.numero}`;
    $("atualizado").textContent = `Atualizado às ${hora.format(new Date())}`;

    const cancelado = pedido.status === "cancelado";
    const atual = ETAPAS.indexOf(pedido.status);
    $("linha-status").classList.toggle("cancelado", cancelado);
    $("linha-status").querySelectorAll("li").forEach((etapa, i) => {
        etapa.classList.toggle("feito", !cancelado && i <= atual);
        etapa.classList.toggle("atual", !cancelado && i === atual);
    });
    if (cancelado) mostrarMensagem("Este pedido foi cancelado pela loja.");

    $("itens").replaceChildren(...(pedido.itens || []).map((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.quantidade}× ${item.nome}`;
        const preco = document.createElement("span");
        preco.textContent = moeda.format(item.preco_unitario * item.quantidade);
        li.append(preco);
        return li;
    }));

    $("subtotal").textContent = moeda.format(pedido.subtotal);
    $("linha-desconto").hidden = Number(pedido.desconto) === 0;
    $("desconto").textContent = `- ${moeda.format(pedido.desconto)}`;
    $("total").textContent = moeda.format(pedido.total);

    return ["entregue", "cancelado"].includes(pedido.status);
}

async function acompanhar() {
    try {
        const pedido = await consultarPedido(codigo);
        if (!pedido) return mostrarMensagem("Pedido não encontrado. Confira o link da confirmação.");
        const terminou = renderizar(pedido);
        clearTimeout(proxima);
        if (!terminou) proxima = setTimeout(acompanhar, INTERVALO_MS);
    } catch {
        mostrarMensagem("Sem conexão com a loja agora. Tentando de novo...");
        clearTimeout(proxima);
        proxima = setTimeout(acompanhar, INTERVALO_MS * 2);
    }
}

function listarPedidosDoNavegador() {
    let pedidos = [];
    try {
        pedidos = JSON.parse(localStorage.getItem("meus-pedidos")) || [];
    } catch {
        // Sem armazenamento, não há histórico para mostrar
    }
    if (!pedidos.length) return mostrarMensagem("Você ainda não fez pedidos neste navegador.");

    $("meus-pedidos").hidden = false;
    $("lista-pedidos").replaceChildren(...pedidos.map((p) => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = `pedido.html?c=${encodeURIComponent(p.codigo)}`;
        link.textContent = `Pedido nº ${p.numero}`;
        li.append(link);
        return li;
    }));
}

let proxima;

if (codigo) {
    acompanhar();
    ouvirMudancas(acompanhar);
} else {
    listarPedidosDoNavegador();
}
