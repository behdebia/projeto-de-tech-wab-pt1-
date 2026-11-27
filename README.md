# ASTRID — Ficha da Personagem

Projeto web responsivo inspirado em uma interface futurista de IA humanoide.

## Funcionalidades da Parte 2

- Menu hambúrguer responsivo, com estado visual aberto/fechado (`☰`/`✕`) e suporte a `aria-expanded`.
- História completa da personagem com botão "Ver mais/Ver menos" e operador ternário no JavaScript.
- Inventário gerado dinamicamente a partir de um array de objetos usando `forEach` e `createElement`/`append`.
- Filtros por tipo de item, com categoria ativa indicada visualmente e estado comunicado por texto.
- Itens favoritados com feedback imediato.
- Barra de XP interativa que adiciona experiência e informa quando ocorre um nível novo.
- Formulário validado no navegador antes do envio, incluindo nome, e-mail, mensagem e termos.
- Feedback visual de erros, envio e sucesso sem `alert()`.
- Estados consistentes com as cores ciano, roxo e preto já usados na Parte 1.

## Decisões de UI/UX

- **Visibilidade do estado:** o menu informa se está aberto, os filtros deixam claro qual está ativo e a barra mostra o progresso da XP.
- **Feedback imediato:** favoritar itens, concluir missões e enviar o formulário exibem respostas visuais ou textuais na hora.
- **Prevenção de erros:** campos obrigatórios e e-mail inválido são destacados antes do envio; mensagens orientam a correção.
- **Controle e liberdade:** menu, história e filtros podem ser fechados ou desfeitos sem recarregar a página.
- **Consistência:** todos os estados dinâmicos reutilizam as variáveis de cor, bordas, fundos holográficos e transições da interface existente.
- **Acessibilidade:** foram usados `aria-live`, `aria-expanded`, `aria-pressed`, `aria-invalid` e navegação por teclado nos cards.

## Layout em camadas (Sandwich Layout)

A página foi organizada em três camadas principais:

- **Superior:** cabeçalho, título principal e navegação responsiva.
- **Central:** conteúdo principal em Flexbox/Grid, com seções distribuídas e espaçamento fluido.
- **Inferior:** rodapé alinhado ao final da página sem sobrepor o conteúdo.

O layout usa `flex: 1` no conteúdo central, áreas responsivas com `clamp()` e grids adaptáveis para desktop, tablet e celular. Alturas fixas dos cards e componentes foram evitadas sempre que poderiam cortar o conteúdo.

## Estrutura do projeto

```text
ASTRID/
├── index.html
├── style.css
├── script.js
├── imagens/
├── modelos/
├── pages/
│   ├── air-paint.html
│   ├── air-paint.css
│   └── air-paint.js
└── README.md
```

A página Air Paint utiliza MediaPipe Tasks Vision e deve ser executada por servidor local ou HTTPS para que a câmera funcione.

## Execução

Abra `index.html` diretamente no navegador ou utilize a extensão Live Server no VS Code.
