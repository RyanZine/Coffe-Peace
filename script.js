// Fonte única dos produtos: preço vem daqui, nunca do texto da página
const PRODUTOS = [
    { id: "expresso", nome: "Café Expresso", categoria: "cafe", preco: 5, imagem: "img/cafe_expresso.png", descricao: "Curto, intenso e encorpado." },
    { id: "mocha", nome: "Café Mocha", categoria: "cafe", preco: 7, imagem: "img/cafe_mocha.png", descricao: "Expresso com chocolate e leite vaporizado." },
    { id: "cappuccino", nome: "Cappuccino", categoria: "cafe", preco: 8, imagem: "img/cappuccino.png", descricao: "Expresso, leite e uma espuma cremosa." },
    { id: "latte", nome: "Latte", categoria: "cafe", preco: 9, imagem: "img/latte.png", descricao: "Mais leite, sabor suave para qualquer hora." },
    { id: "macchiato", nome: "Macchiato", categoria: "cafe", preco: 10, imagem: "img/macchiato.png", descricao: "Expresso marcado com espuma de leite." },
    { id: "earl-grey", nome: "Chá Earl Grey", categoria: "cha", preco: 6, imagem: "img/cha.png", descricao: "Chá preto com bergamota para desacelerar." },
];

const CUPONS = { PEACE10: 0.1 };
const TAXA_ENTREGA = 5;
const FRETE_GRATIS_A_PARTIR = 40;
const CHAVE = "carrinho-v2";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const buscarProduto = (id) => PRODUTOS.find((p) => p.id === id);

let estado = carregarEstado();

function carregarEstado() {
    const padrao = { itens: {}, cupom: null, entrega: "retirada" };
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE));
        if (salvo) return sanitizar(salvo);

        // Versão anterior guardava [{ nome, preco }]; converte para { id: quantidade }
        const antigo = JSON.parse(localStorage.getItem("carrinho"));
        localStorage.removeItem("carrinho");
        if (Array.isArray(antigo)) {
            antigo.forEach((item) => {
                const produto = PRODUTOS.find((p) => p.nome === item?.nome);
                if (produto) padrao.itens[produto.id] = (padrao.itens[produto.id] || 0) + 1;
            });
        }
    } catch {
        // Armazenamento bloqueado ou corrompido: segue com carrinho vazio
    }
    return padrao;
}

// Dados salvos podem ter sido editados à mão; só aceita ids, cupons e opções conhecidos
function sanitizar(salvo) {
    const itens = {};
    Object.entries(salvo.itens && typeof salvo.itens === "object" ? salvo.itens : {}).forEach(([id, qtd]) => {
        if (buscarProduto(id) && Number.isInteger(qtd) && qtd > 0) itens[id] = qtd;
    });
    return {
        itens,
        cupom: Object.hasOwn(CUPONS, salvo.cupom) ? salvo.cupom : null,
        entrega: salvo.entrega === "entrega" ? "entrega" : "retirada",
    };
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
    const desconto = estado.cupom ? subtotal * CUPONS[estado.cupom] : 0;
    const comDesconto = subtotal - desconto;
    const frete = estado.entrega === "entrega" && comDesconto > 0 && comDesconto < FRETE_GRATIS_A_PARTIR ? TAXA_ENTREGA : 0;
    const quantidade = Object.values(estado.itens).reduce((soma, qtd) => soma + qtd, 0);
    return { subtotal, desconto, frete, total: comDesconto + frete, quantidade };
}

// ---------- Integração CartBoost.AI ----------
// O pixel é opcional: sem a linha do <script> no index.html, nada é enviado
function rastrear(evento, payload) {
    window.CartBoost?.track(evento, payload);
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
    card.querySelector(".categoria").textContent = produto.categoria === "cha" ? "Chá" : "Café";
    card.querySelector("h3").textContent = produto.nome;
    card.querySelector(".descricao").textContent = produto.descricao;
    card.querySelector(".preco").textContent = moeda.format(produto.preco);

    const botao = card.querySelector(".add");
    botao.dataset.id = produto.id;
    atualizarBotaoAdicionar(botao);
    return card;
}

// O botão mostra quantas unidades já estão no carrinho
function atualizarBotaoAdicionar(botao) {
    const qtd = estado.itens[botao.dataset.id] || 0;
    botao.textContent = qtd ? `Adicionar mais (${qtd} no carrinho)` : "Adicionar ao carrinho";
    botao.classList.toggle("no-carrinho", qtd > 0);
}

gradeProdutos.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".add");
    if (!botao) return;
    const produto = buscarProduto(botao.dataset.id);
    alterarQuantidade(produto.id, 1);
    mostrarToast(`${produto.nome} adicionado ao carrinho`);
    // view_product abre a janela de recuperação de carrinho no CartBoost
    rastrear("view_product", {
        product_id: produto.id,
        name: produto.nome,
        category: produto.categoria,
        price: produto.preco,
        quantidade: estado.itens[produto.id],
        carrinho_total: calcularTotais().total,
    });
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

    const { subtotal, desconto, frete, total, quantidade } = calcularTotais();
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
    document.getElementById("frete").textContent = frete ? moeda.format(frete) : "Grátis";
    document.getElementById("total").textContent = moeda.format(total);
    document.getElementById("cupom").value = estado.cupom || "";
    document.querySelector(`input[name="entrega"][value="${estado.entrega}"]`).checked = true;

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

document.getElementById("form-cupom").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const codigo = document.getElementById("cupom").value.trim().toUpperCase();

    if (!codigo) {
        estado.cupom = null;
        mostrarToast("Cupom removido");
    } else if (CUPONS[codigo]) {
        estado.cupom = codigo;
        mostrarToast(`Cupom ${codigo} aplicado: ${CUPONS[codigo] * 100}% de desconto`);
    } else {
        mostrarToast("Cupom inválido");
        return;
    }
    salvarEstado();
    atualizarCarrinho();
});

document.querySelectorAll('input[name="entrega"]').forEach((opcao) => {
    opcao.addEventListener("change", () => {
        estado.entrega = opcao.value;
        salvarEstado();
        atualizarCarrinho();
    });
});

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

document.getElementById("finalizar-compra").addEventListener("click", () => {
    const totais = calcularTotais();
    if (totais.quantidade === 0) return mostrarToast("Seu carrinho está vazio!");

    const numero = Math.floor(1000 + Math.random() * 9000);
    const recebimento = estado.entrega === "entrega" ? "Seu pedido sai para entrega em breve" : "Retire no balcão em até 15 minutos";
    document.getElementById("confirmacao-texto").textContent = `Pedido nº ${numero}. ${recebimento}.`;
    document.getElementById("confirmacao-itens").replaceChildren(...Object.entries(estado.itens).map(([id, qtd]) => {
        const li = document.createElement("li");
        li.textContent = `${qtd}× ${buscarProduto(id).nome}`;
        return li;
    }));
    document.getElementById("confirmacao-total").textContent = `Total: ${moeda.format(totais.total)}`;

    // checkout_completed marca a conversão e cancela a mensagem de recuperação
    rastrear("checkout_completed", {
        pedido: numero,
        valor: Number(totais.total.toFixed(2)),
        itens: Object.keys(estado.itens),
        entrega: estado.entrega,
        cupom: estado.cupom,
    });

    estado.itens = {};
    estado.cupom = null;
    salvarEstado();
    atualizarCarrinho();
    fecharCarrinho();
    dialogo.showModal();
});

document.getElementById("fechar-confirmacao").addEventListener("click", () => dialogo.close());

renderizarCardapio();
atualizarCarrinho();
