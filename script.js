document.addEventListener("DOMContentLoaded", () => {
    const boot = document.getElementById("astrid-boot");

    if (boot) {
        document.body.classList.add("booting");
        const fecharInicializacao = () => {
            boot.classList.add("closed");
            document.body.classList.remove("booting");
        };
        window.addEventListener("load", () => window.setTimeout(fecharInicializacao, 1200), { once: true });
        window.setTimeout(fecharInicializacao, 4000);
    }

    const menuToggle = document.getElementById("menu-toggle");
    const menuPrincipal = document.getElementById("menu-principal");

    if (menuToggle && menuPrincipal) {
        const alternarMenu = () => {
            const estaAberto = menuPrincipal.classList.toggle("aberto");
            menuToggle.setAttribute("aria-expanded", String(estaAberto));
            menuToggle.setAttribute("aria-label", estaAberto ? "Fechar menu" : "Abrir menu");
            const icone = menuToggle.querySelector("span");
            if (icone) icone.textContent = estaAberto ? "✕" : "☰";
        };

        menuToggle.addEventListener("click", alternarMenu);
        menuPrincipal.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                if (menuPrincipal.classList.contains("aberto")) {
                    menuPrincipal.classList.remove("aberto");
                    menuToggle.setAttribute("aria-expanded", "false");
                    menuToggle.setAttribute("aria-label", "Abrir menu");
                    const icone = menuToggle.querySelector("span");
                    if (icone) icone.textContent = "☰";
                }
            });
        });
    }

    const botaoHistoria = document.getElementById("botao-historia");
    const historiaCompleta = document.getElementById("historia-completa");

    if (botaoHistoria && historiaCompleta) {
        botaoHistoria.addEventListener("click", () => {
            const estaAberta = historiaCompleta.hidden === false;
            historiaCompleta.hidden = estaAberta;
            historiaCompleta.setAttribute("aria-hidden", String(estaAberta));
            historiaCompleta.classList.toggle("revelado", !estaAberta);
            botaoHistoria.textContent = !estaAberta ? "Ver menos" : "Ver história completa";
            botaoHistoria.setAttribute("aria-expanded", String(!estaAberta));
        });
    }

    const itensInventario = [
        { nome: "Corpo Humanoide", tipo: "equipamento", raridade: "Épico", descricao: "Forma física autônoma criada para interação direta com o ambiente.", imagem: "imagens/corpo_humanoide.png" },
        { nome: "Luvas de Interface", tipo: "equipamento", raridade: "Super-raro", descricao: "Interpretam estímulos relacionados ao toque humano.", imagem: "imagens/luva_d_interface.png" },
        { nome: "Núcleo de Energia", tipo: "consumivel", raridade: "Comum", descricao: "Fornece energia para manter sistemas e corpo em funcionamento.", imagem: "imagens/Núcleo de Energia.png" },
        { nome: "Módulos de Mobilidade", tipo: "equipamento", raridade: "Comum", descricao: "Permitem que ASTRID se movimente e interaja fisicamente.", imagem: "imagens/modulos_de_mobilidade.png" },
        { nome: "Versão Digital", tipo: "sistema", raridade: "Raro", descricao: "Forma digital usada para perceber o ambiente pela webcam.", imagem: "imagens/versao digital.png" },
        { nome: "Arpente", tipo: "sistema", raridade: "Lendário", descricao: "Transforma movimentos das mãos captados pela webcam em desenhos digitais.", imagem: "imagens/sistema_visao_computacional.png", url: "pages/air-paint.html" },
        { nome: "Insígnia Astral", tipo: "trofeu", raridade: "Lendário", descricao: "Reconhecimento conquistado por inovação em inteligência artificial.", imagem: "imagens/versao digital.png" }
    ];

    const listaInventario = document.getElementById("lista-inventario");
    const filtrosInventario = document.getElementById("filtros-inventario");
    const statusInventario = document.getElementById("status-inventario");

    if (listaInventario && filtrosInventario) {
        const favoritos = new Set();

        const renderizarInventario = (filtro = "todos") => {
            listaInventario.innerHTML = "";
            const itensFiltrados = filtro === "todos"
                ? itensInventario
                : itensInventario.filter((item) => item.tipo === filtro);

            itensFiltrados.forEach((item) => {
                const card = document.createElement("article");
                card.className = "item-inventario";

                const titulo = document.createElement("h4");
                titulo.textContent = item.nome;

                const imagem = document.createElement("img");
                imagem.src = item.imagem;
                imagem.alt = item.nome;

                const descricao = document.createElement("p");
                descricao.textContent = item.descricao;

                const raridade = document.createElement("p");
                raridade.textContent = `Tipo: ${item.tipo} • Raridade: ${item.raridade}`;

                const botaoFavorito = document.createElement("button");
                botaoFavorito.type = "button";
                botaoFavorito.className = "botao-favorito";
                const favorito = favoritos.has(item.nome);
                botaoFavorito.textContent = favorito ? "★ Favoritado" : "☆ Favoritar";
                botaoFavorito.setAttribute("aria-pressed", String(favorito));

                botaoFavorito.addEventListener("click", () => {
                    if (favoritos.has(item.nome)) {
                        favoritos.delete(item.nome);
                    } else {
                        favoritos.add(item.nome);
                    }
                    const agoraFavorito = favoritos.has(item.nome);
                    botaoFavorito.textContent = agoraFavorito ? "★ Favoritado" : "☆ Favoritar";
                    botaoFavorito.setAttribute("aria-pressed", String(agoraFavorito));
                    if (statusInventario) {
                        statusInventario.textContent = agoraFavorito
                            ? `${item.nome} foi favoritado.`
                            : `${item.nome} foi removido dos favoritos.`;
                    }
                });

                if (item.url) {
                    const botaoArPaint = document.createElement("a");
                    botaoArPaint.href = item.url;
                    botaoArPaint.className = "botao-ar-paint";
                    botaoArPaint.textContent = "TESTE AQUI";
                    card.append(titulo, imagem, descricao, raridade, botaoArPaint, botaoFavorito);
                } else {
                    card.append(titulo, imagem, descricao, raridade, botaoFavorito);
                }

                listaInventario.appendChild(card);
            });

            if (statusInventario) {
                statusInventario.textContent = itensFiltrados.length
                    ? `${itensFiltrados.length} item(ns) exibido(s).`
                    : "Nenhum item encontrado nesta categoria.";
            }
        };

        filtrosInventario.querySelectorAll("button").forEach((botao) => {
            botao.addEventListener("click", () => {
                filtrosInventario.querySelectorAll("button").forEach((item) => {
                    item.classList.remove("filtro-ativo");
                    item.setAttribute("aria-pressed", "false");
                });
                botao.classList.add("filtro-ativo");
                botao.setAttribute("aria-pressed", "true");
                renderizarInventario(botao.dataset.filtro);
            });
        });

        renderizarInventario();
    }

    let experiencia = 0;
    let nivel = 1;
    const botaoXp = document.getElementById("botao-xp");
    const progressoXp = document.getElementById("progresso-xp");
    const barraXp = document.querySelector(".barra-xp");
    const contadorXp = document.getElementById("contador-xp");
    const nivelXp = document.getElementById("nivel-xp");
    const statusXp = document.getElementById("status-xp");

    if (botaoXp && progressoXp && barraXp && contadorXp && nivelXp && statusXp) {
        botaoXp.addEventListener("click", () => {
            experiencia = experiencia >= 100 ? 20 : experiencia + 20;
            nivel = experiencia >= 100 ? nivel + 1 : nivel;

            const xpNaBarra = experiencia >= 100 ? 100 : experiencia;
            progressoXp.style.width = `${xpNaBarra}%`;
            barraXp.setAttribute("aria-valuenow", String(xpNaBarra));
            contadorXp.textContent = `${xpNaBarra} / 100 XP`;
            nivelXp.textContent = `Nível ${nivel}`;

            if (xpNaBarra === 100) {
                statusXp.textContent = `Nível up! ASTRID alcançou o nível ${nivel}.`;
                statusXp.className = "status-xp level-up";
                experiencia = 100;
            } else {
                statusXp.textContent = `Missão concluída! +20 XP (faltam ${100 - xpNaBarra} XP).`;
                statusXp.className = "status-xp";
            }
        });
    }

    const formContato = document.getElementById("form-contato");
    const statusEnvio = document.getElementById("status-envio");

    if (formContato && statusEnvio) {
        const validarCampo = (campo) => {
            const valor = campo.value.trim();
            let mensagem = "";

            if (campo.required && !valor) mensagem = "Este campo é obrigatório.";
            else if (campo.id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
                mensagem = "Informe um e-mail válido, como nome@exemplo.com.";
            } else if (campo.id === "nome" && valor.length < 3) {
                mensagem = "O nome deve ter pelo menos 3 caracteres.";
            } else if (campo.id === "mensagem" && valor.length < 2) {
                mensagem = "Escreva uma mensagem antes de enviar.";
            }

            campo.classList.toggle("campo-invalido", Boolean(mensagem));
            campo.setAttribute("aria-invalid", String(Boolean(mensagem)));

            let feedback = campo.parentElement.querySelector(".erro-campo");
            if (!feedback) {
                feedback = document.createElement("small");
                feedback.className = "erro-campo";
                campo.insertAdjacentElement("afterend", feedback);
            }
            feedback.textContent = mensagem;
            return !mensagem;
        };

        formContato.querySelectorAll("input:not([type='hidden']):not([type='checkbox']), textarea").forEach((campo) => {
            campo.addEventListener("blur", () => validarCampo(campo));
            campo.addEventListener("input", () => {
                if (campo.classList.contains("campo-invalido")) validarCampo(campo);
            });
        });

        formContato.addEventListener("submit", (event) => {
            event.preventDefault();

            const campos = formContato.querySelectorAll("input:not([type='hidden']), textarea");
            let formularioValido = true;

            campos.forEach((campo) => {
                if (campo.type === "checkbox") {
                    const aceito = campo.checked;
                    campo.classList.toggle("campo-invalido", !aceito);
                    campo.setAttribute("aria-invalid", String(!aceito));
                    if (!aceito) formularioValido = false;
                } else if (!validarCampo(campo)) {
                    formularioValido = false;
                }
            });

            if (!formularioValido) {
                statusEnvio.textContent = "Revise os campos destacados antes de enviar.";
                statusEnvio.className = "status-envio erro";
                const primeiroErro = formContato.querySelector(".campo-invalido");
                if (primeiroErro) primeiroErro.focus();
                return;
            }

            const dataEnvio = document.getElementById("data-envio");
            if (dataEnvio) dataEnvio.value = new Date().toISOString();

            const botaoEnviar = formContato.querySelector('button[type="submit"]');
            if (botaoEnviar) {
                botaoEnviar.disabled = true;
                botaoEnviar.textContent = "Enviando...";
            }
            statusEnvio.textContent = "Validando informações...";
            statusEnvio.className = "status-envio enviando";

            window.setTimeout(() => {
                statusEnvio.textContent = "Mensagem validada e pronta para contato!";
                statusEnvio.className = "status-envio sucesso";
                if (botaoEnviar) {
                    botaoEnviar.disabled = false;
                    botaoEnviar.textContent = "Enviar";
                }
                formContato.reset();
                formContato.querySelectorAll(".campo-invalido").forEach((campo) => {
                    campo.classList.remove("campo-invalido");
                    campo.setAttribute("aria-invalid", "false");
                });
                formContato.querySelectorAll(".erro-campo").forEach((feedback) => feedback.textContent = "");
            }, 700);
        });
    }

    const controleConteudo = document.getElementById("controle-conteudo");
    const conteudoExpandido = document.querySelector(".conteudo-expandido");
    const textoControle = document.getElementById("texto-controle");

    if (controleConteudo && conteudoExpandido) {
        controleConteudo.addEventListener("click", () => {
            const estaExpandido = controleConteudo.getAttribute("aria-expanded") === "true";
            conteudoExpandido.style.display = estaExpandido ? "none" : "block";
            if (textoControle) textoControle.textContent = estaExpandido ? "Ver mais" : "Ver menos";
            controleConteudo.setAttribute("aria-expanded", String(!estaExpandido));
        });
    }
});
