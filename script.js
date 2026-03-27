document.addEventListener("DOMContentLoaded", () => {

    let carrinho = [];

    const carrinhoSalvo = localStorage.getItem("carrinho");

    if (carrinhoSalvo) {
        carrinho = JSON.parse(carrinhoSalvo);
    }

    const botoes = document.querySelectorAll(".add");

    function mostrarToast(mensagem) {
        const toast = document.getElementById("toast");

        toast.innerText = mensagem;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    function adicionarAoCarrinho(nome, preco) {
        carrinho.push({ nome, preco });

        localStorage.setItem("carrinho", JSON.stringify(carrinho));

        atualizarCarrinho();

        mostrarToast("Item adicionado ao carrinho 🛒");
    }

    function atualizarCarrinho() {
        const lista = document.getElementById("lista-carrinho");
        const totalElemento = document.getElementById("total");

        lista.innerHTML = "";

        let total = 0;

        carrinho.forEach((item, index) => {
            const li = document.createElement("li");

            const info = document.createElement("span");
            info.classList.add("item-info");
            info.innerText = `${item.nome} - R$ ${item.preco.toFixed(2).replace(".", ",")}`;

            const botaoRemover = document.createElement("button");
            botaoRemover.innerText = "Remover";

            botaoRemover.addEventListener("click", () => {
                carrinho.splice(index, 1);
                localStorage.setItem("carrinho", JSON.stringify(carrinho));
                atualizarCarrinho();
                mostrarToast("Item removido ❌");
            });

            li.appendChild(info);
            li.appendChild(botaoRemover);

            lista.appendChild(li);

            total += item.preco;
        });

        totalElemento.innerText = `Total: R$ ${total.toFixed(2).replace(".", ",")}`;
    }

    botoes.forEach(botao => {
        botao.addEventListener("click", (evento) => {
            const produto = evento.target.parentElement;

            const nome = produto.querySelector("h3").innerText;
            const precoTexto = produto.querySelector(".preco").innerText;

            const preco = Number(precoTexto.replace("R$", "").replace(",", "."));

            adicionarAoCarrinho(nome, preco);
        });
    });

    const abrirCarrinho = document.getElementById("abrir-carrinho");
    const fecharCarrinho = document.getElementById("fechar-carrinho");
    const carrinhoLateral = document.getElementById("carrinho-lateral");

    abrirCarrinho.addEventListener("click", () => {
        carrinhoLateral.classList.add("ativo");
    });

    fecharCarrinho.addEventListener("click", () => {
        carrinhoLateral.classList.remove("ativo");
    });

    const botaoFinalizar = document.getElementById("finalizar-compra");

    if (botaoFinalizar) {
        botaoFinalizar.addEventListener("click", () => {
            if (carrinho.length === 0) {
                mostrarToast("Seu carrinho está vazio!");
                return;
            }

            mostrarToast("Compra finalizada com sucesso! ☕");

            carrinho = [];
            localStorage.removeItem("carrinho");

            atualizarCarrinho();
        });
    }

    atualizarCarrinho();

});