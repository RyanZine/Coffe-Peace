// variável do carrinho (estado atual do pedido)
let carrinho = [];

// recuperar dados salvos do localStorage (persistência simples entre recarregamentos)
const carrinhoSalvo = localStorage.getItem("carrinho");

if (carrinhoSalvo) {
    carrinho = JSON.parse(carrinhoSalvo); // converter JSON para objeto JavaScript
}

// seleciona todos os botões "Adicionar ao Carrinho" no catálogo de produtos
const botoes = document.querySelectorAll(".add");

// =====================
// 🔥 FUNÇÕES
// =====================

// função toast: exibe mensagem temporária no canto da página
function mostrarToast(mensagem) {
    const toast = document.getElementById("toast");

    toast.innerText = mensagem; // define texto da notificação
    toast.classList.add("show"); // aplicar classe de animação

    setTimeout(() => {
        toast.classList.remove("show"); // remover notificação após 3 segundos
    }, 3000);
}

// adicionar ao carrinho: atualiza estado e localStorage
function adicionarAoCarrinho(nome, preco) {
    // Empurra novo item ao array do carrinho
    carrinho.push({ nome, preco });

    // Atualiza armazenamento local para manter dados na próxima visita
    localStorage.setItem("carrinho", JSON.stringify(carrinho));

    // Atualiza a interface do carrinho (lista + total)
    atualizarCarrinho();

    // Mensagem para o usuário
    mostrarToast("Item adicionado ao carrinho 🛒");
}

// atualizar carrinho: renderiza lista de itens e soma total
function atualizarCarrinho() {
    const lista = document.getElementById("lista-carrinho");
    const totalElemento = document.getElementById("total");

    // Limpa lista antes de re-renderizar para evitar duplicação
    lista.innerHTML = "";

    let total = 0;

    // Construir cada item no carrinho com botão de remover
    carrinho.forEach((item, index) => {
        const li = document.createElement("li");

        const info = document.createElement("span");
        info.classList.add("item-info");
        info.innerText = `${item.nome} - R$ ${item.preco.toFixed(2).replace(".", ",")}`; // moeda brasileira

        const botaoRemover = document.createElement("button");
        botaoRemover.innerText = "Remover";

        botaoRemover.addEventListener("click", () => {
            // Remove item usando índice da iteração
            carrinho.splice(index, 1);

            // Sincroniza localStorage com o novo estado
            localStorage.setItem("carrinho", JSON.stringify(carrinho));

            // Re-renderiza lista e total
            atualizarCarrinho();

            mostrarToast("Item removido ❌");
        });

        li.appendChild(info);
        li.appendChild(botaoRemover);

        lista.appendChild(li);

        total += item.preco; // acumula total do carrinho
    });

    // Exibe valor total formatado em reais
    totalElemento.innerText = `Total: R$ ${total.toFixed(2).replace(".", ",")}`;
}

// =====================
// EVENTOS
// =====================

// laço para atribuir evento de clique a cada botão de produto
botoes.forEach(botao => {
    botao.addEventListener("click", (evento) => {
        const produto = evento.target.parentElement; // container do produto clicado

        const nome = produto.querySelector("h3").innerText; // nome do produto
        const precoTexto = produto.querySelector(".preco").innerText; // texto R$ 5,00

        // Converter texto para número (ex: "R$ 5,00" => 5.00)
        const preco = Number(precoTexto.replace("R$", "").replace(",", "."));

        adicionarAoCarrinho(nome, preco);
    });
});

// carrinho lateral: abrir e fechar painel
const abrirCarrinho = document.getElementById("abrir-carrinho");
const fecharCarrinho = document.getElementById("fechar-carrinho");
const carrinhoLateral = document.getElementById("carrinho-lateral");

abrirCarrinho.addEventListener("click", () => {
    carrinhoLateral.classList.add("ativo"); // mostra carrinho com estilo
});

fecharCarrinho.addEventListener("click", () => {
    carrinhoLateral.classList.remove("ativo"); // oculta carrinho
});

// finalizar compra: esvazia o carrinho e limpa localStorage
const botaoFinalizar = document.getElementById("finalizar-compra");

if (botaoFinalizar) {
    botaoFinalizar.addEventListener("click", () => {
        if (carrinho.length === 0) {
            mostrarToast("Seu carrinho está vazio!");
            return; // não faz nada se vazio
        }

        mostrarToast("Compra finalizada com sucesso! ☕");

        carrinho = [];
        localStorage.removeItem("carrinho");

        atualizarCarrinho();
    });
}

// chama atualização no carregamento para exibir itens já salvos
atualizarCarrinho();