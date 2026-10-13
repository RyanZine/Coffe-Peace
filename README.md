<p align="center">
  <img src="img/logo.svg" alt="Coffe Peace" width="420">
</p>

# Coffe Peace — Cafeteria online com carrinho completo no navegador

O **Coffe Peace** é a vitrine online de uma cafeteria fictícia. Tudo roda no navegador, sem back-end:

* Um **cardápio dinâmico** com filtro por categoria (cafés e chás) e busca por nome ou descrição.
* Um **carrinho de compras completo**, com quantidades, cupom de desconto, escolha entre retirada e entrega, cálculo de frete e confirmação do pedido, tudo persistido no `localStorage`.
* Uma **ponte opcional para o CartBoost.AI**: com uma única linha de `<script>`, a loja passa a enviar eventos de interesse e de compra para o motor de recuperação de carrinho.

> O site funciona sozinho. O CartBoost.AI é um "plugue": se a linha do pixel estiver na página, os eventos são enviados; se não estiver, nada muda.

🔗 **Projeto online:** https://coffe-peace.vercel.app

<p align="center">
  <img src="img/preview.png" alt="Cardápio do Coffe Peace" width="49%">
  <img src="img/preview-carrinho.png" alt="Carrinho lateral do Coffe Peace" width="49%">
</p>

---

## 🎯 Objetivo

### Objetivo Técnico

Demonstrar um front-end de e-commerce completo em JavaScript puro, cobrindo:

* Renderização do cardápio a partir de **uma fonte única de dados** (`PRODUTOS`), sem ler preço do texto da página.
* Estado do carrinho como `{ id: quantidade }`, com totais **sempre recalculados** a partir do catálogo.
* Persistência com `localStorage`, incluindo **migração do formato antigo** e funcionamento mesmo com o armazenamento bloqueado.
* Acessibilidade: menu e carrinho controláveis pelo teclado (`Esc`), `aria-*` nos controles e toast com `aria-live`.
* **Integração desacoplada** com um serviço de telemetria externo (CartBoost.AI).

---

## 👥 Público-Alvo

| Segmento | Dor | Como o Coffe Peace resolve |
| --- | --- | --- |
| **Cafeterias e pequenos negócios** | Precisam de um cardápio online sem pagar plataforma | Vitrine estática, hospedada de graça na Vercel |
| **Quem está aprendendo front-end** | Projetos de carrinho costumam parar no "adicionar e remover" | Exemplo completo: quantidades, cupom, frete, migração de dados |
| **Testes do CartBoost.AI** | Precisa de uma loja real, fora da demo interna, para validar o pixel | Loja pronta, com os eventos `view_product` e `checkout_completed` já mapeados |
| **Recrutadores** | Avaliar domínio de JavaScript sem framework | Código curto, organizado por responsabilidade e testado no navegador |

---

## 🧭 Como funciona

```
                 ┌──────────────────────────────────────────────┐
  Visitante ───► │ 1. Cardápio renderizado a partir de PRODUTOS │
                 └──────────────────────┬───────────────────────┘
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │ 2. Filtro por categoria + busca              │
                 └──────────────────────┬───────────────────────┘
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │ 3. Carrinho { id: qtd } salvo no localStorage│──► view_product ──┐
                 └──────────────────────┬───────────────────────┘                   │
                                        ▼                                           ▼
                 ┌──────────────────────────────────────────────┐        ┌────────────────────┐
                 │ 4. Cupom + retirada/entrega → totais         │        │  CartBoost.AI      │
                 └──────────────────────┬───────────────────────┘        │  (opcional, pixel) │
                                        ▼                                └────────────────────┘
                 ┌──────────────────────────────────────────────┐                   ▲
                 │ 5. Confirmação do pedido                     │─► checkout_completed
                 └──────────────────────────────────────────────┘
```

### 1. Cardápio

Os produtos ficam em um único array em `script.js`:

| Campo | Exemplo | Uso |
| --- | --- | --- |
| `id` | `"latte"` | Chave do carrinho e `product_id` enviado ao CartBoost |
| `nome` | `"Latte"` | Exibição |
| `categoria` | `"cafe"` ou `"cha"` | Filtro do cardápio |
| `preco` | `9` (reais) | Única fonte de preço para os cálculos |
| `imagem` | `"img/latte.png"` | Card e miniatura no carrinho |
| `descricao` | `"Mais leite, sabor suave..."` | Card e busca |

Para incluir uma bebida nova, basta adicionar um objeto ao array. O HTML não muda.

### 2. Filtro e busca

* Os botões **Todos / Cafés / Chás** filtram por `categoria`.
* A busca procura o termo no nome e na descrição, sem diferenciar maiúsculas de minúsculas.
* Sem resultados, aparece a mensagem "Nenhuma bebida encontrada".

### 3. Carrinho

* O estado é `{ itens: { id: quantidade }, cupom, entrega }`, salvo na chave `carrinho-v2`.
* Adicionar o mesmo produto **soma a quantidade**, em vez de duplicar a linha.
* No painel lateral: miniatura, preço unitário, controles **− / +**, total da linha e **Remover**.
* O ícone do header mostra um **contador** de itens, e o botão do card informa quantos daquele produto já estão no carrinho.
* **Migração:** a versão anterior salvava `[{ nome, preco }]` na chave `carrinho`. Na primeira visita após a atualização, esses itens são convertidos para o novo formato e a chave antiga é apagada. Produtos que não existem mais são descartados.

### 4. Totais

```
subtotal    = Σ preço do catálogo × quantidade
desconto    = subtotal × percentual do cupom
frete       = R$ 5,00 se "Entrega" e (subtotal − desconto) < R$ 40,00; senão grátis
total       = subtotal − desconto + frete
```

| Regra | Valor |
| --- | --- |
| Cupom disponível | `PEACE10` → 10% de desconto |
| Taxa de entrega | R$ 5,00 |
| Frete grátis | pedidos a partir de R$ 40,00 (após o desconto) |
| Retirada no balcão | sempre grátis |

### 5. Confirmação

"Finalizar pedido" abre um `<dialog>` com o número do pedido, os itens, a forma de recebimento e o total. Em seguida, o carrinho é esvaziado. **Nenhum pagamento é processado**: é uma simulação.

---

## 🔌 Integração com o CartBoost.AI

O CartBoost.AI se conecta por **uma linha**: o `pixel.js`. Ela já está no `index.html`, comentada, logo acima do `script.js`:

```html
<script defer src="http://localhost:5000/pixel.js" data-debug="true" data-store="0199ef7e-9143-4021-8408-639758805b31"></script>
```

O `script.js` só chama `window.CartBoost?.track(...)`. Sem o pixel, a chamada não faz nada.

| Momento | Evento | Payload | Efeito no CartBoost |
| --- | --- | --- | --- |
| Carregar a página | `page_view` | `{ url, title }` (enviado pelo próprio pixel) | Registro |
| Adicionar ao carrinho | `view_product` | `{ product_id, name, category, price, quantidade, carrinho_total }` | Abre a janela de recuperação de carrinho |
| Finalizar pedido | `checkout_completed` | `{ pedido, valor, itens, entrega, cupom }` | Marca a conversão e cancela a recuperação |

Valores em **reais** (número decimal), `itens` como lista de ids. O formato segue os limites de payload do CartBoost: no máximo dois níveis, apenas primitivos, até 8 KB.

---

## 📋 Requisitos do Sistema

### Requisitos Funcionais (RF)

* **RF01 — Cardápio:** exibir os produtos a partir da lista `PRODUTOS`.
* **RF02 — Filtro e busca:** filtrar por categoria e buscar por nome ou descrição.
* **RF03 — Carrinho:** adicionar, alterar a quantidade, remover e esvaziar.
* **RF04 — Cupom:** validar e aplicar códigos de desconto e informar quando o código for inválido.
* **RF05 — Recebimento:** escolher entre retirada e entrega, com regra de frete grátis.
* **RF06 — Pedido:** confirmar o pedido com número, itens e total, e esvaziar o carrinho.
* **RF07 — Persistência:** manter o carrinho entre visitas e migrar o formato antigo.
* **RF08 — Telemetria opcional:** enviar `view_product` e `checkout_completed` ao CartBoost.AI quando o pixel estiver presente.

### Requisitos Não-Funcionais (RNF)

* **RNF01 — Sem build:** HTML, CSS e JavaScript puros, abertos direto no navegador.
* **RNF02 — Responsivo:** layout testado em 375 px (celular) e 1280 px (desktop), com menu hambúrguer abaixo de 768 px.
* **RNF03 — Resiliência:** com o `localStorage` bloqueado ou corrompido, o site funciona com o carrinho em memória.
* **RNF04 — Segurança da interface:** textos dinâmicos inseridos com `textContent`, nunca como HTML.
* **RNF05 — Acessibilidade:** `Esc` fecha o menu e o carrinho, os botões de ícone têm `aria-label` e o toast usa `aria-live`.
* **RNF06 — Desacoplamento:** a loja não depende do CartBoost para funcionar.

---

## 🖥️ Interface

| Seção | Âncora | Conteúdo |
| --- | --- | --- |
| Início | `#inicio` | Chamada principal sobre vídeo de fundo |
| Sobre | `#sobre` | História da casa e números de destaque |
| Cardápio | `#cardapio` | Filtros, busca e cards dos produtos |
| Contato | `#contato` | Horários, retirada, entrega e cupom de primeira compra |
| Carrinho | painel lateral | Itens, quantidades, cupom, recebimento, resumo e finalização |

O header fica fixo, ganha fundo sólido ao rolar e destaca no menu a seção que está na tela.

---

## 🛠️ Tecnologias

* **Estrutura:** HTML5 semântico (`<main>`, `<aside>`, `<dialog>`)
* **Estilo:** CSS3 com variáveis, Grid, Flexbox e media queries
* **Lógica:** JavaScript puro (ES2020+), `Intl.NumberFormat` para moeda e `IntersectionObserver` para o menu ativo
* **Persistência:** `localStorage`
* **Integração:** pixel do CartBoost.AI (opcional)
* **Hospedagem:** Vercel, com Vercel Web Analytics
* **Controle de versão:** Git & GitHub

---

## 🚦 Status do projeto

| Componente | Status |
| --- | --- |
| Nova identidade visual (nome, logo, favicon, imagem social) | ✅ Implementado |
| Header fixo com menu hambúrguer e seção ativa | ✅ Implementado |
| Cardápio dinâmico com filtro e busca | ✅ Implementado |
| Carrinho com quantidades, cupom e frete | ✅ Implementado |
| Migração do carrinho da versão anterior | ✅ Implementado |
| Confirmação de pedido | ✅ Implementado |
| Ponte de eventos para o CartBoost.AI | ✅ Implementado |
| Teste ponta a ponta com o CartBoost.AI rodando | 🔜 Planejado |
| Testes automatizados | 🔜 Planejado |

### Limitações conhecidas

* **Sem back-end:** pedidos, cupons e preços ficam no navegador. Qualquer pessoa pode alterá-los pelo DevTools. É uma demonstração, não uma loja real.
* **Pixel em `localhost`:** o site publicado (HTTPS) chamando o CartBoost em `http://localhost` pode ser bloqueado pelo navegador (conteúdo misto ou acesso à rede local). Para testes, rode a loja localmente ou exponha o CartBoost em HTTPS.
* **`view_product` no clique de adicionar:** como não há página de produto, o interesse é registrado ao adicionar ao carrinho.
* **Sem testes automatizados:** o fluxo do carrinho foi verificado no Chrome headless. Ainda não há uma suíte versionada.
* **Imagens pesadas:** as fotos dos produtos são PNG de cerca de 400 KB cada. Convertê-las para WebP reduziria bastante o carregamento.

---

## 📅 Roadmap

| Sprint | Fase | Entregável |
| --- | --- | --- |
| **Sprint 1** ✅ | Landing page | Layout, vídeo de fundo e carrinho simples |
| **Sprint 2** ✅ | Nova versão | Identidade Coffe Peace, menu, cardápio dinâmico e carrinho completo |
| **Sprint 3** 🟡 | CartBoost.AI | Ponte de eventos pronta ✅; teste ponta a ponta com o pixel pendente |
| **Sprint 4** | Qualidade | Testes automatizados, imagens em WebP e GIF de demonstração atualizado |

---

## 🚀 Como executar

### Só o site

```bash
git clone https://github.com/RyanZine/Coffe-Peace.git
cd Coffe-Peace
python -m http.server 5500
```

Abra **http://localhost:5500**. Também funciona abrindo o `index.html` direto no navegador.

### Com o CartBoost.AI

1. No CartBoost.AI, defina `MODO=poc` no `.env` (sem essa variável o servidor não sobe) e libere a origem da loja: `CORS_ORIGINS=http://localhost:5500`.
2. Suba o CartBoost com `npm run app`: API em `http://localhost:3000`, pixel em `http://localhost:5000/pixel.js`.
3. No `index.html` do Coffe Peace, **descomente a linha do pixel**.
4. Sirva a loja por HTTP com `python -m http.server 5500` e abra exatamente **http://localhost:5500**. Abrir o `index.html` direto (`file://`) não funciona, porque a origem vira `null` e o CORS recusa. `127.0.0.1:5500` é outra origem: se for usá-la, inclua também no `CORS_ORIGINS`. Adicione produtos e finalize um pedido.
5. Acompanhe os eventos no console (`data-debug="true"` mostra o status de cada envio) e as mensagens de recuperação em `GET http://localhost:3000/demo/recuperacoes`.

> No modo `poc`, o CartBoost aceita somente a loja semente `0199ef7e-9143-4021-8408-639758805b31`, que já está na linha do pixel.

---

## 👤 Autor

**Ryan Zinedine**

* **GitHub:** [@RyanZine](https://github.com/RyanZine)
* **LinkedIn:** [Ryan Zinedine](https://www.linkedin.com/in/ryan-zinedine-rodrigues-de-sousa-pereira-8b63b3314)
