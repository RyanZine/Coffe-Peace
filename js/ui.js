// Peças de interface usadas pelo balcão e pelo painel do lojista

export const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const $ = (id) => document.getElementById(id);

export function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
}

let timerToast;
export function mostrarToast(mensagem) {
    $("toast").textContent = mensagem;
    $("toast").classList.add("show");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => $("toast").classList.remove("show"), 2800);
}

// Executa uma ação da camada de dados e mostra o erro no toast em vez de quebrar a tela
export async function tentar(acao, sucesso) {
    try {
        const resultado = await acao();
        if (sucesso) mostrarToast(sucesso);
        return resultado;
    } catch (erro) {
        mostrarToast(`Erro: ${erro.message}`);
        throw erro;
    }
}

export const ROTULO_STATUS = {
    recebido: "Recebido",
    preparando: "Preparando",
    pronto: "Pronto",
    entregue: "Entregue",
    cancelado: "Cancelado",
};

// Cartão de pedido usado no quadro do balcão e na lista do lojista
export function criarCartaoPedido(pedido, acoes = []) {
    const li = elemento("li", "cartao-pedido");
    li.dataset.id = pedido.id;
    if (pedido.novo) li.classList.add("novo");

    const topo = elemento("div", "cartao-topo");
    topo.append(elemento("strong", "", `#${pedido.id}`), elemento("span", "", hora.format(new Date(pedido.criado_em))));
    li.append(topo, elemento("p", "cliente", pedido.cliente_nome));

    const itens = elemento("ul", "itens");
    pedido.itens.forEach((item) => itens.append(elemento("li", "", `${item.quantidade}× ${item.nome}`)));
    li.append(itens);

    const rodape = elemento("div", "cartao-rodape");
    rodape.append(
        elemento("span", `etiqueta etiqueta-${pedido.entrega}`, pedido.entrega === "entrega" ? "Entrega" : "Retirada"),
        elemento("strong", "", moeda.format(pedido.total)),
    );
    li.append(rodape);

    if (acoes.length) {
        const caixa = elemento("div", "cartao-acoes");
        acoes.forEach(({ status, rotulo, classe }) => {
            const botao = elemento("button", classe, rotulo);
            botao.dataset.status = status;
            caixa.append(botao);
        });
        li.append(caixa);
    }
    return li;
}

// Cancelar pede um segundo clique em vez de um confirm() que trava a página
export function confirmarDuasVezes(botao, rotuloOriginal) {
    if (botao.dataset.confirmar) return true;
    botao.dataset.confirmar = "1";
    botao.textContent = "Confirmar?";
    setTimeout(() => {
        delete botao.dataset.confirmar;
        botao.textContent = rotuloOriginal;
    }, 4000);
    return false;
}
