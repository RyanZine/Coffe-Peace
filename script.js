/*1. Selecionar todos os botões de adicionar
2. Criar um array carrinho
3. Quando clicar:
   - pegar o produto
   - pegar nome e preço
   - adicionar no carrinho
   - atualizar a interface */


   //seleciona todos os botões com a classe "add"
    const botoes = document.querySelectorAll(".add");
    //variável para armazenar o carrinho
    let carrinho = [];

    //função para adicionar ao carrinho
    function adicionarAoCarrinho(nome, preco) {
        carrinho.push({nome, preco});
        atualizarCarrinho();
    }

    //função para atualizar o carrinho
    function atualizarCarrinho() {
        const lista = document.getElementById("lista-carrinho");
        const totalElemento = document.getElementById("total");

        lista.innerHTML = "";

        let total = 0;

        carrinho.forEach((item, index) => {
            const li = document.createElement("li");

            const info = document.createElement("span");
            info.classList.add("item-info");
            info.innerText = `${item.nome} - R$ ${item.preco.toFixed(2).replace(".",",")}`;

            const botaoRemover = document.createElement("button");
            botaoRemover.innerText = "Remover";

            botaoRemover.addEventListener("click", () => {
            carrinho.splice(index, 1);
            atualizarCarrinho();
    });
            li.appendChild(info);
            li.appendChild(botaoRemover);

            lista.appendChild(li);

            total += item.preco;
        });

        totalElemento.innerText = `Total: R$ ${total.toFixed(2).replace(".",",")}`;

    }

    //loop para cada botão
    botoes.forEach(botao => {
        botao.addEventListener("click", (evento) => {
            const produto = evento.target.parentElement;

            const nome = produto.querySelector("h3").innerText;
            const precoTexto = produto.querySelector(".preco").innerText;
            const preco = Number(precoTexto.replace("R$","").replace(",","."))

            adicionarAoCarrinho(nome, preco);
        });
    });