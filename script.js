import { carregarProdutos, validarCupom, criarPedido, ouvirMudancas, CATEGORIAS } from "./js/dados.js";

// O cardápio vem da camada de dados: é o mesmo que o lojista edita no painel dele
let PRODUTOS = [];

// Só para migrar carrinhos antigos, que guardavam apenas o código do cupom
const CUPONS_ANTIGOS = { PEACE10: 0.1 };
const CHAVE = "carrinho-v2";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const buscarProduto = (id) => PRODUTOS.find((p) => p.id === id);

// O carrinho salvo só é conferido depois que o cardápio carrega
let estado = lerCarrinhoSalvo();

function lerCarrinhoSalvo() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE));
        if (salvo) return salvo;

        // Versão anterior guardava [{ nome, preco }]; os nomes viram ids na conferência
        const antigo = JSON.parse(localStorage.getItem("carrinho"));
        localStorage.removeItem("carrinho");
        if (Array.isArray(antigo)) return { nomesAntigos: antigo.map((item) => item?.nome) };
    } catch {
        // Armazenamento bloqueado ou corrompido: segue com carrinho vazio
    }
    return {};
}

// Dados salvos podem ter sido editados à mão; só aceita ids, cupons e opções conhecidos
function sanitizar(salvo) {
    const itens = {};
    Object.entries(salvo.itens && typeof salvo.itens === "object" ? salvo.itens : {}).forEach(([id, qtd]) => {
        if (disponivel(id) && Number.isInteger(qtd) && qtd > 0) itens[id] = qtd;
    });
    (Array.isArray(salvo.nomesAntigos) ? salvo.nomesAntigos : []).forEach((nome) => {
        const produto = PRODUTOS.find((p) => p.nome === nome);
        if (produto && disponivel(produto.id)) itens[produto.id] = (itens[produto.id] || 0) + 1;
    });
    return {
        itens,
        cupom: cupomValido(salvo.cupom),
    };
}

const disponivel = (id) => buscarProduto(id) && buscarProduto(id).disponivel !== false;

// Versões anteriores salvavam só o código ("PEACE10"); agora vai junto o percentual
function cupomValido(cupom) {
    if (typeof cupom === "string" && Object.hasOwn(CUPONS_ANTIGOS, cupom)) return { codigo: cupom, percentual: CUPONS_ANTIGOS[cupom] };
    if (cupom && /^[A-Z0-9]{3,20}$/.test(cupom.codigo) && cupom.percentual > 0 && cupom.percentual <= 0.5) {
        return { codigo: cupom.codigo, percentual: cupom.percentual };
    }
    return null;
}

function salvarEstado() {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
        // Sem armazenamento o carrinho só dura até fechar a aba
    }
}

function calcularTotais() {
    const subtotal = Object.entries(estado.itens)
        .reduce((soma, [id, qtd]) => soma + (buscarProduto(id)?.preco || 0) * qtd, 0);
    const desconto = estado.cupom ? subtotal * estado.cupom.percentual : 0;
    const quantidade = Object.values(estado.itens).reduce((soma, qtd) => soma + qtd, 0);
    return { subtotal, desconto, total: subtotal - desconto, quantidade };
}

// ---------- Toast ----------
const toast = document.getElementById("toast");
let timerToast;

function mostrarToast(mensagem) {
    toast.textContent = mensagem;
    toast.classList.add("show");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => toast.classList.remove("show"), 2500);
}

// ---------- Cardápio ----------
const gradeProdutos = document.getElementById("produtos");
const semResultado = document.getElementById("sem-resultado");
const campoBusca = document.getElementById("busca");
let categoriaAtiva = "todos";

// Quem digita "cafe" ou "cha" sem acento também encontra o produto
const semAcento = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function renderizarCardapio() {
    const termo = semAcento(campoBusca.value.trim());
    const visiveis = PRODUTOS.filter((p) =>
        (categoriaAtiva === "todos" || p.categoria === categoriaAtiva) &&
        semAcento(`${p.nome} ${p.descricao}`).includes(termo)
    );

    gradeProdutos.replaceChildren(...visiveis.map(criarCard));
    semResultado.hidden = visiveis.length > 0;
}

function criarCard(produto) {
    const card = document.createElement("article");
    card.className = "produto";
    card.innerHTML = `
        <img loading="lazy" decoding="async" alt="">
        <div class="produto-info">
            <span class="categoria"></span>
            <h3></h3>
            <p class="descricao"></p>
            <div class="produto-rodape">
                <p class="preco"></p>
                <button class="add"></button>
            </div>
        </div>`;
    card.querySelector("img").src = produto.imagem;
    card.querySelector("img").alt = produto.nome;
    card.querySelector(".categoria").textContent = CATEGORIAS[produto.categoria] || produto.categoria;
    card.querySelector("h3").textContent = produto.nome;
    card.querySelector(".descricao").textContent = produto.descricao;
    card.querySelector(".preco").textContent = moeda.format(produto.preco);
    card.classList.toggle("esgotado", produto.disponivel === false);

    const botao = card.querySelector(".add");
    botao.dataset.id = produto.id;
    // o pixel do CartBoost lê estes atributos no clique e registra o produto visto
    botao.dataset.cbProduto = produto.id;
    botao.dataset.cbCategoria = produto.categoria;
    atualizarBotaoAdicionar(botao);
    return card;
}

// O botão mostra quantas unidades já estão no carrinho
function atualizarBotaoAdicionar(botao) {
    const qtd = estado.itens[botao.dataset.id] || 0;
    botao.disabled = !disponivel(botao.dataset.id);
    if (botao.disabled) return (botao.textContent = "Esgotado");
    botao.textContent = qtd ? `Adicionar mais (${qtd} no carrinho)` : "Adicionar ao carrinho";
    botao.classList.toggle("no-carrinho", qtd > 0);
}

gradeProdutos.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".add");
    if (!botao) return;
    const produto = buscarProduto(botao.dataset.id);
    alterarQuantidade(produto.id, 1);
    mostrarToast(`${produto.nome} adicionado ao carrinho`);
});

document.querySelectorAll(".filtro").forEach((filtro) => {
    filtro.addEventListener("click", () => {
        categoriaAtiva = filtro.dataset.categoria;
        document.querySelectorAll(".filtro").forEach((f) => {
            f.classList.toggle("ativo", f === filtro);
            f.setAttribute("aria-pressed", f === filtro);
        });
        renderizarCardapio();
    });
});

campoBusca.addEventListener("input", renderizarCardapio);

// ---------- Carrinho ----------
const lista = document.getElementById("lista-carrinho");

function alterarQuantidade(id, delta) {
    const novaQtd = (estado.itens[id] || 0) + delta;
    if (novaQtd > 0) estado.itens[id] = novaQtd;
    else delete estado.itens[id];
    salvarEstado();
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const ids = Object.keys(estado.itens).filter(buscarProduto);
    lista.replaceChildren(...ids.map((id) => criarItemCarrinho(buscarProduto(id), estado.itens[id])));

    const { subtotal, desconto, total, quantidade } = calcularTotais();
    const vazio = quantidade === 0;

    document.getElementById("carrinho-vazio").hidden = !vazio;
    document.getElementById("carrinho-rodape").hidden = vazio;
    document.getElementById("carrinho-qtd").textContent = vazio ? "" : `(${quantidade})`;

    const contador = document.getElementById("contador-carrinho");
    contador.hidden = vazio;
    contador.textContent = quantidade;

    document.getElementById("subtotal").textContent = moeda.format(subtotal);
    document.getElementById("linha-desconto").hidden = desconto === 0;
    document.getElementById("desconto").textContent = `- ${moeda.format(desconto)}`;
    document.getElementById("total").textContent = moeda.format(total);
    document.getElementById("cupom").value = estado.cupom?.codigo || "";

    document.querySelectorAll(".add").forEach(atualizarBotaoAdicionar);
}

function criarItemCarrinho(produto, qtd) {
    const li = document.createElement("li");
    li.innerHTML = `
        <img alt="">
        <div class="item-info">
            <p class="item-nome"></p>
            <p class="item-preco"></p>
            <div class="quantidade">
                <button data-acao="menos" aria-label="Diminuir quantidade">−</button>
                <span></span>
                <button data-acao="mais" aria-label="Aumentar quantidade">+</button>
            </div>
        </div>
        <div class="item-lado">
            <p class="item-total"></p>
            <button data-acao="remover" class="botao-texto">Remover</button>
        </div>`;
    li.dataset.id = produto.id;
    li.querySelector("img").src = produto.imagem;
    li.querySelector(".item-nome").textContent = produto.nome;
    li.querySelector(".item-preco").textContent = `${moeda.format(produto.preco)} cada`;
    li.querySelector(".quantidade span").textContent = qtd;
    li.querySelector(".item-total").textContent = moeda.format(produto.preco * qtd);
    return li;
}

lista.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const id = botao.closest("li").dataset.id;
    const acao = botao.dataset.acao;

    if (acao === "mais") alterarQuantidade(id, 1);
    if (acao === "menos") alterarQuantidade(id, -1);
    if (acao === "remover") {
        alterarQuantidade(id, -estado.itens[id]);
        mostrarToast(`${buscarProduto(id).nome} removido`);
    }
});

document.getElementById("form-cupom").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const codigo = document.getElementById("cupom").value.trim().toUpperCase();

    if (!codigo) {
        estado.cupom = null;
        mostrarToast("Cupom removido");
    } else {
        const percentual = await buscarPercentual(codigo);
        if (!percentual) return mostrarToast("Cupom inválido");
        estado.cupom = { codigo, percentual };
        mostrarToast(`Cupom ${codigo} aplicado: ${Math.round(percentual * 100)}% de desconto`);
    }
    salvarEstado();
    atualizarCarrinho();
});

async function buscarPercentual(codigo) {
    try {
        return await validarCupom(codigo);
    } catch {
        return null;
    }
}

document.getElementById("limpar-carrinho").addEventListener("click", () => {
    estado.itens = {};
    salvarEstado();
    atualizarCarrinho();
    mostrarToast("Carrinho esvaziado");
});

// ---------- Painel lateral e menu ----------
const painel = document.getElementById("carrinho-lateral");
const fundo = document.getElementById("fundo-escuro");
const menu = document.getElementById("menu");
const botaoMenu = document.getElementById("abrir-menu");

function abrirCarrinho() {
    fecharMenu();
    painel.classList.add("ativo");
    painel.setAttribute("aria-hidden", "false");
    fundo.hidden = false;
    document.body.classList.add("sem-rolagem");
    document.getElementById("fechar-carrinho").focus();
}

function fecharCarrinho() {
    painel.classList.remove("ativo");
    painel.setAttribute("aria-hidden", "true");
    fundo.hidden = true;
    document.body.classList.remove("sem-rolagem");
}

function fecharMenu() {
    menu.classList.remove("aberto");
    botaoMenu.setAttribute("aria-expanded", "false");
}

document.getElementById("abrir-carrinho").addEventListener("click", abrirCarrinho);
document.getElementById("fechar-carrinho").addEventListener("click", fecharCarrinho);
document.getElementById("ir-cardapio").addEventListener("click", fecharCarrinho);
fundo.addEventListener("click", fecharCarrinho);

botaoMenu.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botaoMenu.setAttribute("aria-expanded", aberto);
});
menu.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) fecharMenu();
});

document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    fecharCarrinho();
    fecharMenu();
});

// Destaca no menu a seção que está na tela
const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        menu.querySelectorAll("a").forEach((link) => {
            link.classList.toggle("ativo", link.getAttribute("href") === `#${entrada.target.id}`);
        });
    });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((secao) => observador.observe(secao));

// Header ganha fundo sólido depois que o usuário rola
window.addEventListener("scroll", () => {
    document.getElementById("topo").classList.toggle("rolado", window.scrollY > 40);
}, { passive: true });

// ---------- Finalizar pedido ----------
const dialogo = document.getElementById("confirmacao");
const formCheckout = document.getElementById("form-checkout");

// No checkout, o carrinho mostra só o resumo e o formulário
function mostrarEtapa(checkout) {
    document.querySelectorAll('[data-etapa="carrinho"]').forEach((bloco) => (bloco.hidden = checkout));
    formCheckout.hidden = !checkout;
    if (checkout) document.getElementById("cliente-nome").focus();
}

document.getElementById("finalizar-compra").addEventListener("click", () => {
    const totais = calcularTotais();
    if (totais.quantidade === 0) return mostrarToast("Seu carrinho está vazio!");
    mostrarEtapa(true);
});

document.getElementById("voltar-carrinho").addEventListener("click", () => mostrarEtapa(false));

formCheckout.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const botao = document.getElementById("confirmar-pedido");
    const cliente = {
        nome: document.getElementById("cliente-nome").value.trim(),
        email: document.getElementById("cliente-email").value.trim(),
    };

    botao.disabled = true;
    botao.textContent = "Enviando...";
    try {
        confirmarPedido(await enviarPedido(cliente));
    } catch (erro) {
        mostrarToast(`Não foi possível enviar: ${erro.message}`);
        sincronizarCardapio();
    } finally {
        botao.disabled = false;
        botao.textContent = "Confirmar pedido";
    }
});

// O banco recalcula o total com os próprios preços; daqui só vão ids e quantidades
function enviarPedido({ nome, email }) {
    return criarPedido({
        itens: Object.entries(estado.itens).map(([id, quantidade]) => ({ id, quantidade })),
        cupom: estado.cupom?.codigo || null,
        nome,
        email,
    });
}

function confirmarPedido(pedido) {
    document.getElementById("confirmacao-texto").textContent = `Pedido nº ${pedido.numero}. Retire no balcão em até 15 minutos.`;
    document.getElementById("confirmacao-itens").replaceChildren(...Object.entries(estado.itens).map(([id, qtd]) => {
        const li = document.createElement("li");
        li.textContent = `${qtd}× ${buscarProduto(id).nome}`;
        return li;
    }));
    document.getElementById("confirmacao-total").textContent = `Total: ${moeda.format(pedido.total)}`;

    const acompanhar = document.getElementById("acompanhar-pedido");
    acompanhar.hidden = !pedido.codigo;
    if (pedido.codigo) {
        acompanhar.href = `pedido.html?c=${encodeURIComponent(pedido.codigo)}`;
        lembrarPedido(pedido);
    }

    // Única chamada ao CartBoost no código: a compra tira o cliente da lista de abandonos.
    // Sem o pixel na página, o ?. faz a linha não fazer nada
    window.CartBoost?.track("checkout_completed", {
        pedido: pedido.numero,
        valor: Number(pedido.total.toFixed(2)),
        itens: Object.keys(estado.itens),
        cupom: estado.cupom?.codigo || null,
    });

    estado.itens = {};
    estado.cupom = null;
    salvarEstado();
    atualizarCarrinho();
    formCheckout.reset();
    mostrarEtapa(false);
    fecharCarrinho();
    dialogo.showModal();
}

// A página de acompanhamento lista os últimos pedidos deste navegador
function lembrarPedido({ numero, codigo }) {
    try {
        const pedidos = JSON.parse(localStorage.getItem("meus-pedidos")) || [];
        pedidos.unshift({ numero, codigo, em: Date.now() });
        localStorage.setItem("meus-pedidos", JSON.stringify(pedidos.slice(0, 5)));
    } catch {
        // Sem armazenamento, o link da confirmação continua valendo
    }
}

document.getElementById("fechar-confirmacao").addEventListener("click", () => dialogo.close());

// ---------- Cardápio ----------
async function sincronizarCardapio() {
    try {
        const antes = Object.keys(estado.itens || {});
        PRODUTOS = await carregarProdutos();
        estado = sanitizar(estado);
        if (antes.some((id) => !estado.itens[id])) mostrarToast("Um item do carrinho esgotou e foi removido");
        salvarEstado();
        renderizarCardapio();
        atualizarCarrinho();
    } catch {
        mostrarToast("Não foi possível carregar o cardápio agora");
    }
}

// Lojista mudou preço ou o balcão marcou esgotado em outra aba: a vitrine atualiza sozinha
ouvirMudancas(sincronizarCardapio);
sincronizarCardapio().then(abrirCarrinhoDoLink);

// O e-mail de recuperação do CartBoost traz ?carrinho=1: o cliente volta direto para o carrinho que deixou
function abrirCarrinhoDoLink() {
    const url = new URL(location.href);
    if (url.searchParams.get("carrinho") !== "1") return;
    url.searchParams.delete("carrinho");
    history.replaceState(null, "", url);
    if (calcularTotais().quantidade > 0) abrirCarrinho();
}
