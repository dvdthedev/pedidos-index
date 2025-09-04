// URL base da sua API. Altere se o seu backend estiver rodando em outra porta ou host.
const API_URL = 'http://localhost:8080/pedidos';

// --- Seletores de Elementos do DOM ---
const secaoFormulario = document.getElementById('secao-formulario');
const secaoLista = document.getElementById('secao-lista');
const formPedido = document.getElementById('form-pedido');
const corpoTabelaPedidos = document.getElementById('corpo-tabela-pedidos');
const tituloFormulario = document.getElementById('titulo-formulario');
const pedidoIdInput = document.getElementById('pedidoId');
const mensagemListaVazia = document.getElementById('mensagem-lista-vazia');

// Botões de Navegação
const btnNovoPedido = document.getElementById('btn-novo-pedido');
const btnListarPedidos = document.getElementById('btn-listar-pedidos');
const btnCancelar = document.getElementById('btn-cancelar');

// Elementos do Modal de Exclusão
const modalExclusao = document.getElementById('modal-exclusao');
const btnCancelarExclusao = document.getElementById('btn-cancelar-exclusao');
const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');
let idParaExcluir = null;


// Funções utilitárias para validação elegante
class ValidadorElegante {
    constructor() {
        this.criarToast();
    }

    // Cria o elemento toast se não existir
    criarToast() {
        if (!document.getElementById('toast')) {
            const toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            toast.innerHTML = `
                <span id="toastMessage"></span>
                <button style="background:none;border:none;color:white;float:right;font-size:18px;cursor:pointer;margin-left:10px;" onclick="this.parentElement.classList.remove('show')">&times;</button>
            `;
            document.body.appendChild(toast);
        }
    }

    // Valida se a data/hora está no futuro
    validarDataFutura(data, hora) {
        if (!data || !hora) {
            return {
                valido: false,
                erro: 'Data e hora são obrigatórias'
            };
        }

        const agora = new Date();
        const dataHora = new Date(`${data}T${hora}:00`);

        if (dataHora <= agora) {
            const diferenca = Math.ceil((agora - dataHora) / (1000 * 60 * 60 * 24));
            let mensagem;
            
            if (diferenca === 0) {
                mensagem = 'A entrega deve ser agendada para o futuro';
            } else if (diferenca === 1) {
                mensagem = 'Esta data foi ontem. Selecione uma data futura';
            } else {
                mensagem = `Esta data foi há ${diferenca} dias atrás`;
            }

            return {
                valido: false,
                erro: mensagem
            };
        }

        return { valido: true };
    }

    // Mostra tooltip de erro no campo
    mostrarErroTooltip(input, mensagem) {
        // Remove erros existentes
        this.limparErroTooltip(input);

        // Adiciona classe de erro
        input.classList.add('error');

        // Cria ou atualiza tooltip
        let tooltip = input.parentElement.querySelector('.error-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'error-tooltip';
            input.parentElement.appendChild(tooltip);
        }

        tooltip.textContent = mensagem;
        tooltip.classList.add('show');

        // Auto-remove após 5 segundos
        setTimeout(() => {
            this.limparErroTooltip(input);
        }, 5000);

        // Remove erro quando usuario focar no campo
        const removerErro = () => {
            this.limparErroTooltip(input);
            input.removeEventListener('focus', removerErro);
        };
        input.addEventListener('focus', removerErro);
    }

    // Limpa tooltip de erro
    limparErroTooltip(input) {
        input.classList.remove('error');
        const tooltip = input.parentElement.querySelector('.error-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }

    // Mostra notificação toast
    mostrarToast(mensagem, tipo = 'error') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = mensagem;
        toast.className = `toast ${tipo} show`;
        
        // Auto-hide após 4 segundos
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
}

// Instância global do validador
const validador = new ValidadorElegante();


// --- Funções de Controle da UI ---

// Alterna a visibilidade entre o formulário e a lista
const mostrarSecao = (secao) => {
    secaoFormulario.classList.add('hidden', 'opacity-0');
    secaoLista.classList.add('hidden', 'opacity-0');

    secao.classList.remove('hidden');
    setTimeout(() => secao.classList.remove('opacity-0'), 50); // Efeito de fade-in
};

// Reseta o formulário para o estado inicial de cadastro
const resetarFormulario = () => {
    formPedido.reset();
    pedidoIdInput.value = '';
    tituloFormulario.textContent = 'Cadastrar Novo Pedido';
    btnCancelar.style.display = 'none';
};

// --- Funções de Comunicação com a API (CRUD) ---

// 1. READ - Buscar e listar todos os pedidos
const listarPedidos = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Erro ao buscar pedidos.');
        }
        const pedidos = await response.json();
        renderizarTabela(pedidos);
    } catch (error) {
        console.error('Falha na listagem:', error);
        alert('Não foi possível carregar os pedidos.');
    }
};

// Renderiza os dados dos pedidos na tabela HTML
const renderizarTabela = (pedidos) => {
    corpoTabelaPedidos.innerHTML = ''; // Limpa a tabela antes de preencher

    if (pedidos.length === 0) {
        mensagemListaVazia.classList.remove('hidden');
    } else {
        mensagemListaVazia.classList.add('hidden');
        pedidos.forEach(pedido => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-amber-50';

            // Formata a data e o valor para exibição
            const valorFormatado = `R$ ${pedido.valorTotal.toFixed(2).replace('.', ',')}`;
            const dataFormatada = new Date(pedido.dataHora).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            tr.innerHTML = `
                <td class="py-3 px-4">${pedido.produto}</td>
                <td class="py-3 px-4">${pedido.nomeCliente}</td>
                <td class="py-3 px-4">${valorFormatado}</td>
                <td class="py-3 px-4">${dataFormatada}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick="prepararEdicao(${pedido.id})" class="text-blue-600 hover:text-blue-800 font-semibold mr-3">Editar</button>
                    <button onclick="abrirModalExclusao(${pedido.id})" class="text-red-600 hover:text-red-800 font-semibold">Excluir</button>
                </td>
            `;
            corpoTabelaPedidos.appendChild(tr);
        });
    }
};

// 2. CREATE / UPDATE - Salvar (criar ou atualizar) um pedido
const salvarPedido = async (event) => {
    event.preventDefault();

    const id = pedidoIdInput.value;
    const dataEntrega = document.getElementById('dataEntrega').value;
    const horaEntrega = document.getElementById('horaEntrega').value;
    const dataEntregaInput = document.getElementById('dataEntrega');

    // VALIDAÇÃO ELEGANTE DA DATA
    const validacao = validador.validarDataFutura(dataEntrega, horaEntrega);
    
    if (!validacao.valido) {
        // Mostra erro no campo específico
        validador.mostrarErroTooltip(dataEntregaInput, validacao.erro);
        
        // Mostra também notificação toast
        validador.mostrarToast('Por favor, selecione uma data futura para entrega', 'error');
        
        // Foca no campo com erro
        dataEntregaInput.focus();
        return;
    }

    // Limpa qualquer erro anterior
    validador.limparErroTooltip(dataEntregaInput);

    const pedidoData = {
        produto: document.getElementById('produto').value,
        quantidade: parseFloat(document.getElementById('quantidade').value),
        valorTotal: parseFloat(document.getElementById('valorTotal').value),
        descricao: document.getElementById('descricao').value,
        nomeCliente: document.getElementById('nomeCliente').value,
        contato: document.getElementById('contato').value,
        valorSinal: parseFloat(document.getElementById('valorSinal').value) || 0,
        dataHora: `${dataEntrega}T${horaEntrega}:00`
    };

    const isUpdating = !!id;
    const url = isUpdating ? `${API_URL}/${id}` : API_URL;
    const method = isUpdating ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pedidoData),
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar o pedido.');
        }

        // SUCESSO COM NOTIFICAÇÃO ELEGANTE
        validador.mostrarToast(
            isUpdating ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!', 
            'success'
        );

        resetarFormulario();
        mostrarSecao(secaoLista);
        await listarPedidos();

    } catch (error) {
        console.error('Falha ao salvar:', error);
        
        // ERRO COM NOTIFICAÇÃO ELEGANTE
        validador.mostrarToast(
            'Não foi possível salvar o pedido. Verifique os dados e tente novamente.',
            'error'
        );
    }
};

// 3. UPDATE (preparação) - Busca dados de um pedido para edição
const prepararEdicao = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error('Pedido não encontrado.');
        }
        const pedido = await response.json();

        // Preenche o formulário com os dados do pedido
        pedidoIdInput.value = pedido.id;
        document.getElementById('produto').value = pedido.produto;
        document.getElementById('quantidade').value = pedido.quantidade;
        document.getElementById('valorTotal').value = pedido.valorTotal;
        document.getElementById('descricao').value = pedido.descricao;
        document.getElementById('nomeCliente').value = pedido.nomeCliente;
        document.getElementById('contato').value = pedido.contato;
        document.getElementById('valorSinal').value = pedido.valorSinal;
        
        // Preenche os campos de data e hora
        if (pedido.dataHora) {
            const [data, hora] = pedido.dataHora.split('T');
            document.getElementById('dataEntrega').value = data;
            document.getElementById('horaEntrega').value = hora.substring(0, 5);
        }
        
        tituloFormulario.textContent = 'Editar Pedido';
        btnCancelar.style.display = 'inline-block';
        mostrarSecao(secaoFormulario);

    } catch (error) {
        console.error('Falha ao preparar edição:', error);
        alert('Não foi possível carregar os dados do pedido para edição.');
    }
};

// 4. DELETE - Excluir um pedido
const excluirPedido = async () => {
    if (!idParaExcluir) return;

    try {
        const response = await fetch(`${API_URL}/${idParaExcluir}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir o pedido.');
        }
        
        fecharModalExclusao();
        await listarPedidos(); // Atualiza a lista após a exclusão

    } catch (error) {
        console.error('Falha ao excluir:', error);
        alert('Não foi possível excluir o pedido.');
    }
};

// Funções do Modal de Exclusão
const abrirModalExclusao = (id) => {
    idParaExcluir = id;
    modalExclusao.classList.remove('hidden');
};

const fecharModalExclusao = () => {
    idParaExcluir = null;
    modalExclusao.classList.add('hidden');
};


// --- Event Listeners ---

// Carrega a lista de pedidos quando a página é carregada
document.addEventListener('DOMContentLoaded', () => {
    mostrarSecao(secaoFormulario); // Começa na tela de cadastro
});

// Ação do formulário ao ser submetido
formPedido.addEventListener('submit', salvarPedido);

// Ações dos botões de navegação
btnNovoPedido.addEventListener('click', () => {
    resetarFormulario();
    mostrarSecao(secaoFormulario);
});

btnListarPedidos.addEventListener('click', () => {
    mostrarSecao(secaoLista);
    listarPedidos();
});

btnCancelar.addEventListener('click', () => {
    resetarFormulario();
    mostrarSecao(secaoFormulario);
});

// Ações dos botões do modal
btnCancelarExclusao.addEventListener('click', fecharModalExclusao);
btnConfirmarExclusao.addEventListener('click', excluirPedido);