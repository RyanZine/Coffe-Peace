// Camada de dados da demonstração: tudo fica no localStorage deste navegador.
// Loja, balcão e lojista só conversam com as funções exportadas aqui; a branch
// supabase-cartboost troca este arquivo pela versão com banco real, mantendo a mesma lista de funções.

const CHAVE = "coffe-peace-demo";
const TAXA_ENTREGA = 5;
const FRETE_GRATIS_A_PARTIR = 40;
const PIN_PADRAO = "1234";

const PRODUTOS_INICIAIS = [
    { id: "expresso", nome: "Café Expresso", categoria: "cafe", preco: 5, imagem: "img/cafe_expresso.png", descricao: "Curto, intenso e encorpado.", disponivel: true },
    { id: "mocha", nome: "Café Mocha", categoria: "cafe", preco: 7, imagem: "img/cafe_mocha.png", descricao: "Expresso com chocolate e leite vaporizado.", disponivel: true },
    { id: "cappuccino", nome: "Cappuccino", categoria: "cafe", preco: 8, imagem: "img/cappuccino.png", descricao: "Expresso, leite e uma espuma cremosa.", disponivel: true },
    { id: "latte", nome: "Latte", categoria: "cafe", preco: 9, imagem: "img/latte.png", descricao: "Mais leite, sabor suave para qualquer hora.", disponivel: true },
    { id: "macchiato", nome: "Macchiato", categoria: "cafe", preco: 10, imagem: "img/macchiato.png", descricao: "Expresso marcado com espuma de leite.", disponivel: true },
    { id: "earl-grey", nome: "Chá Earl Grey", categoria: "cha", preco: 6, imagem: "img/cha.png", descricao: "Chá preto com bergamota para desacelerar.", disponivel: true },
    { id: "cha-verde", nome: "Chá Verde", categoria: "cha", preco: 6, imagem: "img/cha_verde.png", descricao: "Leve e fresco, com notas herbais.", disponivel: true },
    { id: "camomila", nome: "Camomila", categoria: "cha", preco: 6, imagem: "img/camomila.png", descricao: "Floral e suave, ideal para o fim do dia.", disponivel: true },
    { id: "hibisco", nome: "Hibisco com Frutas Vermelhas", categoria: "cha", preco: 7, imagem: "img/hibisco.png", descricao: "Infusão rubi, levemente ácida e sem cafeína.", disponivel: true },
    { id: "hortela", nome: "Hortelã", categoria: "cha", preco: 6, imagem: "img/hortela.png", descricao: "Refrescante, bom depois das refeições.", disponivel: true },
    { id: "chai-latte", nome: "Chai Latte", categoria: "cha", preco: 10, imagem: "img/chai_latte.png", descricao: "Chá preto com especiarias e leite vaporizado.", disponivel: true },
    { id: "matcha-latte", nome: "Matcha Latte", categoria: "cha", preco: 12, imagem: "img/matcha_latte.png", descricao: "Matcha batido com leite, cremoso e energizante.", disponivel: true },
    { id: "bolo-cenoura", nome: "Bolo de Cenoura", categoria: "bolo", preco: 9, imagem: "img/bolo_cenoura.png", descricao: "Fatia fofinha com cobertura de ganache.", disponivel: true },
    { id: "bolo-chocolate", nome: "Bolo de Chocolate", categoria: "bolo", preco: 10, imagem: "img/bolo_chocolate.png", descricao: "Massa úmida e recheio cremoso de chocolate.", disponivel: true },
    { id: "bolo-laranja", nome: "Bolo de Laranja", categoria: "bolo", preco: 8, imagem: "img/bolo_laranja.png", descricao: "Leve, cítrico, com calda de laranja.", disponivel: true },
    { id: "pao-de-queijo", nome: "Pão de Queijo", categoria: "salgado", preco: 7, imagem: "img/pao_de_queijo.png", descricao: "Grande, casquinha crocante e miolo macio.", disponivel: true },
    { id: "coxinha", nome: "Coxinha", categoria: "salgado", preco: 8, imagem: "img/coxinha.png", descricao: "Massa crocante e recheio de frango desfiado.", disponivel: true },
    { id: "croissant", nome: "Croissant", categoria: "salgado", preco: 9, imagem: "img/croissant.png", descricao: "Folhado amanteigado, assado no dia.", disponivel: true },
    { id: "empada", nome: "Empada de Frango", categoria: "salgado", preco: 8, imagem: "img/empada.png", descricao: "Massa que desmancha e frango temperado.", disponivel: true },
    { id: "combo-manha", nome: "Combo Manhã", categoria: "combo", preco: 17, imagem: "img/combo_manha.png", descricao: "Café Expresso + Pão de Queijo + Bolo de Laranja.", disponivel: true },
    { id: "combo-tarde", nome: "Combo Tarde", categoria: "combo", preco: 18, imagem: "img/combo_tarde.png", descricao: "Café Expresso + Pão de Queijo + Bolo de Cenoura.", disponivel: true },
    { id: "combo-classico", nome: "Combo Clássico", categoria: "combo", preco: 19, imagem: "img/combo_classico.png", descricao: "Café Expresso + Pão de Queijo + Bolo de Chocolate.", disponivel: true },
];

export const CATEGORIAS = { cafe: "Café", cha: "Chá", bolo: "Bolo", salgado: "Salgado", combo: "Combo" };

const PROXIMO_STATUS = { recebido: ["preparando", "cancelado"], preparando: ["pronto", "cancelado"], pronto: ["entregue"] };

const copia = (valor) => JSON.parse(JSON.stringify(valor));

function estadoInicial() {
    return {
        produtos: copia(PRODUTOS_INICIAIS),
        cupons: [{ codigo: "PEACE10", percentual: 0.1, ativo: true }],
        pedidos: [],
        proximoNumero: 101,
        pin: PIN_PADRAO,
    };
}

// Quem abriu a demonstração antes de o cardápio crescer recebe os produtos novos,
// sem perder preços e esgotados que o lojista já mudou
function comCatalogoNovo(estado) {
    const ids = new Set(estado.produtos.map((p) => p.id));
    PRODUTOS_INICIAIS.filter((p) => !ids.has(p.id)).forEach((p) => estado.produtos.push(copia(p)));
    return estado;
}

// Sem armazenamento (aba anônima bloqueada), a demonstração vive só na memória da aba
let memoria = null;

function ler() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE));
        if (salvo && Array.isArray(salvo.produtos) && Array.isArray(salvo.pedidos)) return comCatalogoNovo(salvo);
    } catch {
        // dado corrompido: recomeça a demonstração
    }
    return memoria || estadoInicial();
}

function gravar(estado) {
    memoria = estado;
    try {
        localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
        // segue só em memória
    }
    // o evento "storage" avisa as outras abas; esta aba é avisada aqui
    ouvintes.forEach((ouvinte) => ouvinte());
}

// ---------- Avisos de mudança (o "tempo real" da demonstração) ----------
const ouvintes = new Set();

export function ouvirMudancas(ouvinte) {
    ouvintes.add(ouvinte);
    const outraAba = (evento) => evento.key === CHAVE && ouvinte();
    addEventListener("storage", outraAba);
    return () => {
        ouvintes.delete(ouvinte);
        removeEventListener("storage", outraAba);
    };
}

// ---------- Cliente ----------
export async function carregarProdutos() {
    return ler().produtos;
}

export async function validarCupom(codigo) {
    const cupom = ler().cupons.find((c) => c.codigo === codigo.trim().toUpperCase() && c.ativo);
    return cupom ? cupom.percentual : null;
}

// Mesmas regras da função criar_pedido do banco: o total sai dos preços cadastrados, nunca do carrinho
export async function criarPedido({ itens, entrega, cupom, nome }) {
    const estado = ler();
    const nomeLimpo = String(nome || "").trim();
    if (nomeLimpo.length < 2 || nomeLimpo.length > 60) throw new Error("informe um nome de 2 a 60 letras");
    if (!["retirada", "entrega"].includes(entrega)) throw new Error("forma de recebimento inválida");
    if (!itens.length || itens.length > 20) throw new Error("o pedido precisa ter de 1 a 20 produtos");

    const linhas = itens.map(({ id, quantidade }) => {
        const produto = estado.produtos.find((p) => p.id === id && p.disponivel);
        if (!produto) throw new Error("produto inexistente ou esgotado");
        if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 20) throw new Error("quantidade inválida");
        return { produto_id: id, nome: produto.nome, preco_unitario: produto.preco, quantidade };
    });

    let percentual = 0;
    if (cupom) {
        const encontrado = estado.cupons.find((c) => c.codigo === cupom && c.ativo);
        if (!encontrado) throw new Error("cupom inválido");
        percentual = encontrado.percentual;
    }

    const subtotal = linhas.reduce((soma, l) => soma + l.preco_unitario * l.quantidade, 0);
    const desconto = Math.round(subtotal * percentual * 100) / 100;
    const frete = entrega === "entrega" && subtotal - desconto < FRETE_GRATIS_A_PARTIR ? TAXA_ENTREGA : 0;
    const agora = new Date().toISOString();

    const pedido = {
        id: estado.proximoNumero++,
        // código aleatório: o número do pedido é sequencial e daria para adivinhar os dos outros
        codigo: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
        criado_em: agora,
        atualizado_em: agora,
        status: "recebido",
        cliente_nome: nomeLimpo,
        entrega,
        cupom: cupom || null,
        subtotal,
        desconto,
        frete,
        total: subtotal - desconto + frete,
        itens: linhas,
    };
    estado.pedidos.push(pedido);
    gravar(estado);
    return { numero: pedido.id, codigo: pedido.codigo, status: pedido.status, subtotal, desconto, frete, total: pedido.total };
}

// O acompanhamento não devolve o nome do cliente, como no banco
export async function consultarPedido(codigo) {
    const pedido = ler().pedidos.find((p) => p.codigo === codigo);
    if (!pedido) return null;
    const { id, status, entrega, criado_em, atualizado_em, subtotal, desconto, frete, total, itens } = pedido;
    return { numero: id, status, entrega, criado_em, atualizado_em, subtotal, desconto, frete, total, itens };
}

// ---------- Balcão (funcionário) ----------
export async function entrarBalcao(pin) {
    const liberado = String(pin).trim() === ler().pin;
    if (liberado) sessionStorage.setItem("balcao-liberado", "1");
    return liberado;
}

export const balcaoLiberado = () => sessionStorage.getItem("balcao-liberado") === "1";
export const sairBalcao = () => sessionStorage.removeItem("balcao-liberado");

function inicioDoDia() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
}

export async function pedidosDoDia() {
    return ler().pedidos.filter((p) => new Date(p.criado_em) >= inicioDoDia());
}

export async function avancarStatus(id, novoStatus) {
    const estado = ler();
    const pedido = estado.pedidos.find((p) => p.id === id);
    if (!pedido) throw new Error("pedido não encontrado");
    if (!(PROXIMO_STATUS[pedido.status] || []).includes(novoStatus)) {
        throw new Error(`mudança de ${pedido.status} para ${novoStatus} não permitida`);
    }
    pedido.status = novoStatus;
    pedido.atualizado_em = new Date().toISOString();
    gravar(estado);
}

export async function definirDisponibilidade(id, disponivel) {
    const estado = ler();
    const produto = estado.produtos.find((p) => p.id === id);
    if (!produto) throw new Error("produto não encontrado");
    produto.disponivel = disponivel;
    gravar(estado);
}

// ---------- Lojista ----------
export async function atualizarProduto(id, { nome, preco, descricao }) {
    const estado = ler();
    const produto = estado.produtos.find((p) => p.id === id);
    if (!produto) throw new Error("produto não encontrado");
    if (!(preco > 0 && preco < 1000)) throw new Error("preço deve ficar entre R$ 0,01 e R$ 999,99");
    if (String(nome).trim().length < 2) throw new Error("nome muito curto");
    Object.assign(produto, { nome: nome.trim(), preco, descricao: descricao.trim().slice(0, 160) });
    gravar(estado);
}

export async function criarProduto({ nome, categoria, preco, imagem, descricao }) {
    const estado = ler();
    // id legível: vira a chave do carrinho e o product_id enviado ao CartBoost
    const id = nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (id.length < 2) throw new Error("nome muito curto");
    if (estado.produtos.some((p) => p.id === id)) throw new Error("já existe um produto com esse nome");
    if (!(preco > 0 && preco < 1000)) throw new Error("preço deve ficar entre R$ 0,01 e R$ 999,99");
    if (!(categoria in CATEGORIAS)) throw new Error("categoria inválida");
    estado.produtos.push({ id, nome: nome.trim(), categoria, preco, imagem, descricao: (descricao || "").trim().slice(0, 160), disponivel: true });
    gravar(estado);
}

export async function listarCupons() {
    return ler().cupons;
}

export async function criarCupom(codigo, percentual) {
    const estado = ler();
    const limpo = codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(limpo)) throw new Error("use de 3 a 20 letras ou números");
    if (!(percentual > 0 && percentual <= 0.5)) throw new Error("o desconto vai de 1% a 50%");
    if (estado.cupons.some((c) => c.codigo === limpo)) throw new Error("esse cupom já existe");
    estado.cupons.push({ codigo: limpo, percentual, ativo: true });
    gravar(estado);
}

export async function alternarCupom(codigo, ativo) {
    const estado = ler();
    const cupom = estado.cupons.find((c) => c.codigo === codigo);
    if (!cupom) throw new Error("cupom não encontrado");
    cupom.ativo = ativo;
    gravar(estado);
}

export async function metricasDoDia() {
    const validos = (await pedidosDoDia()).filter((p) => p.status !== "cancelado");
    const faturamento = validos.reduce((soma, p) => soma + p.total, 0);
    const vendidos = {};
    validos.flatMap((p) => p.itens).forEach((i) => (vendidos[i.nome] = (vendidos[i.nome] || 0) + i.quantidade));
    return {
        pedidos: validos.length,
        faturamento,
        ticket_medio: validos.length ? faturamento / validos.length : 0,
        mais_vendidos: Object.entries(vendidos).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, quantidade]) => ({ nome, quantidade })),
    };
}

export async function pinAtual() {
    return ler().pin;
}

export async function trocarPin(novo) {
    if (!/^\d{4,6}$/.test(novo)) throw new Error("o PIN tem de 4 a 6 números");
    const estado = ler();
    estado.pin = novo;
    gravar(estado);
}

// Volta cardápio, cupons, PIN e pedidos ao estado de fábrica
export async function restaurarDemo() {
    gravar(estadoInicial());
}
