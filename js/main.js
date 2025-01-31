// REGISTRANDO O SERVICE WORKER
if ('serviceWorker' in navigator) {
    // Espera a página carregar para registrar o Service Worker
    window.addEventListener('load', async () => {
        try {
            // Registra o Service Worker localizado em '/sw.js'
            let reg = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado!', reg);
        } catch (err) {
            // Caso falhe o registro, exibe erro no console
            console.log('Falha ao registrar Service Worker:', err);
        }
    });
}

// CONFIGURANDO O BANCO DE DADOS (IndexedDB)
let db;
const request = indexedDB.open("ReceitasDB", 1);

// Função quando a versão do banco de dados for atualizada
request.onupgradeneeded = function (event) {
    db = event.target.result;
    // Criação de uma object store chamada "receitas"
    let store = db.createObjectStore("receitas", { keyPath: "id", autoIncrement: true });
    // Índices para facilitar buscas por diferentes campos
    store.createIndex("nome", "nome", { unique: false });
    store.createIndex("ingredientes", "ingredientes", { unique: false });
    store.createIndex("descricao", "descricao", { unique: false });
    store.createIndex("imagem", "imagem", { unique: false });
    store.createIndex("data", "data", { unique: false });
    store.createIndex("autor", "autor", { unique: false });
};

// Função chamada quando o banco de dados é aberto com sucesso
request.onsuccess = function (event) {
    db = event.target.result;
    listarReceitas(); // Chama a função para listar receitas do banco
};

// Função chamada caso ocorra erro ao abrir o banco de dados
request.onerror = function (event) {
    console.error("Erro ao abrir IndexedDB", event.target.error);
};

// CAPTURAR LOCALIZAÇÃO (GEOLOCALIZAÇÃO)
let posicaoInicial;
const capturarLocalizacao = document.getElementById('localizacao');
const latitude = document.getElementById('latitude');
const longitude = document.getElementById('longitude');

// Função para processar a posição capturada com sucesso
const sucesso = (posicao) => {
    posicaoInicial = posicao;
    // Exibe latitude e longitude na página
    latitude.innerHTML = `Latitude: ${posicaoInicial.coords.latitude}`;
    longitude.innerHTML = `Longitude: ${posicaoInicial.coords.longitude}`;
};

// erros de geolocalização
const erro = (error) => {
    let mensagens = ["Erro desconhecido", "Permissão negada!", "Posição indisponível!", "Tempo de solicitação excedido!"];
    console.log(`Ocorreu um erro: ${mensagens[error.code]}`);
};

// capturar localização
capturarLocalizacao.addEventListener('click', () =>
    navigator.geolocation.getCurrentPosition(sucesso, erro)
);

// CONFIGURANDO ACESSO À CÂMERA
let useFrontCamera = true;
let stream = null;

// Elementos HTML da câmera
const cameraView = document.getElementById("camera-view"),
    cameraOutput = document.getElementById("camera-output"),
    cameraSensor = document.getElementById("camera-sensor"),
    cameraTrigger = document.getElementById("camera-trigger"),
    cameraToggle = document.getElementById("camera-toggle"),
    cameraStop = document.getElementById("camera-stop"),
    cameraStartBtn = document.getElementById("camera-start");

// Função para iniciar a câmera
async function cameraStart() {
    if (stream) {
        stopCamera(); // Se já houver stream, para a câmera antes de reiniciar
    }

    // Definição das constraints para a câmera (frontal ou traseira)
    const constraints = {
        video: { facingMode: useFrontCamera ? "user" : "environment" },
        audio: false
    };

    try {
        // Solicita permissão para acessar a câmera
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraView.srcObject = stream; // Exibe o vídeo da câmera no elemento
    } catch (error) {
        console.error("Erro ao acessar a câmera", error);
    }
}

//PARAR CÂMERA
function stopCamera() {
    if (stream) {
        // Para todas as tracks da câmera
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        cameraView.srcObject = null; // Remove o vídeo da câmera
    }
}

// LIGAR A CÂMERA NOVAMENTE
cameraStartBtn.onclick = cameraStart;

// TROCAR ENTRE CÂMERA FRONTAL/TRASEIRA
cameraToggle.onclick = () => {
    useFrontCamera = !useFrontCamera; // Alterna entre câmera frontal e traseira
    cameraStart(); // Reinicia a câmera com a nova configuração
};

// TIRAR FOTO
cameraTrigger.onclick = function () {
    if (!stream) {
        alert("Ative a câmera antes de tirar a foto.");
        return;
    }

    // Configura o tamanho do canvas de acordo com a resolução da câmera
    cameraSensor.width = cameraView.videoWidth;
    cameraSensor.height = cameraView.videoHeight;
    // Captura o quadro da câmera e desenha no canvas
    cameraSensor.getContext("2d").drawImage(cameraView, 0, 0);
    // Exibe a imagem tirada na tag <img> da página
    cameraOutput.src = cameraSensor.toDataURL("image/webp");
    cameraOutput.classList.add("taken"); // Adiciona classe para estilizar a imagem
};

// DESLIGAR CÂMERA
cameraStop.onclick = stopCamera;

// Inicia a câmera automaticamente quando a página carregar
window.addEventListener("load", cameraStart, false);

// SALVAR RECEITA NO BANCO DE DADOS
document.getElementById("add-receita").addEventListener("click", () => {
    // Captura os valores dos campos do formulário
    const nome = document.getElementById("nome-receita").value;
    const ingredientes = document.getElementById("ingredientes-receita").value;
    const descricao = document.getElementById("descricao-receita").value;
    const autor = document.getElementById("autor-receita").value;
    const imagem = cameraOutput.src; // A imagem capturada pela câmera
    const data = new Date().toLocaleString(); // Data de criação da receita

    if (nome && ingredientes && descricao && autor && imagem) {
        const transaction = db.transaction(["receitas"], "readwrite");
        const store = transaction.objectStore("receitas");
        const receita = { nome, ingredientes, descricao, autor, imagem, data };

        let request = store.add(receita); // Adiciona a receita ao banco de dados

        request.onsuccess = () => {
            console.log("Receita adicionada com sucesso!");
            listarReceitas(); // Atualiza a lista de receitas
        };

        request.onerror = (event) => {
            console.error("Erro ao adicionar receita", event.target.error);
        };

        // Limpa os campos do formulário após salvar a receita
        document.getElementById("nome-receita").value = "";
        document.getElementById("ingredientes-receita").value = "";
        document.getElementById("descricao-receita").value = "";
        document.getElementById("autor-receita").value = "";
        cameraOutput.src = ""; // Limpa a imagem
    } else {
        alert("Preencha todos os campos!"); // Verifica se todos os campos foram preenchidos
    }
});

//LISTAR RECEITAS DO BANCO DE DADOS
document.getElementById("mostrar-receitas").addEventListener("click", () => {
    document.getElementById("receitas-container").classList.toggle("hidden"); // Exibe ou oculta a lista de receitas
    listarReceitas(); // Atualiza a lista de receitas
});

// Função para listar todas as receitas do banco de dados
function listarReceitas() {
    const lista = document.getElementById("receitas-list");
    lista.innerHTML = ""; // Limpa a lista antes de exibir as receitas

    const transaction = db.transaction(["receitas"], "readonly");
    const store = transaction.objectStore("receitas");

    store.openCursor().onsuccess = function (event) {
        let cursor = event.target.result;
        if (cursor) {
            // Cria um novo cartão para cada receita
            let div = document.createElement("div");
            div.classList.add("receita-card");
            div.innerHTML = `
                <h3>${cursor.value.nome}</h3>
                <p><strong>Autor:</strong> ${cursor.value.autor}</p>
                <p><strong>Data:</strong> ${cursor.value.data}</p>
                <p><strong>Ingredientes:</strong> ${cursor.value.ingredientes}</p>
                <p>${cursor.value.descricao}</p>
                <img src="${cursor.value.imagem}" alt="Imagem da receita">
            `;
            lista.appendChild(div); // Adiciona o cartão à lista
            cursor.continue(); // Continua com o próximo cursor
        }
    };
}
