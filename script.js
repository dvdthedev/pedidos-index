/**
 * Sistema de Gestão de Pedidos
 * Aplicação frontend para cadastro, edição e listagem de pedidos
 */

// ================================
// CONFIGURAÇÃO E CONSTANTES
// ================================
const CONFIG = {
    API_URL: 'http://localhost:8080/pedidos',
    VALIDATION_DELAY: 500,
    TOAST_DURATION: 3000,
    TOOLTIP_DURATION: 4000,
    MAX_FUTURE_DAYS: 365,
    MIN_SIGNAL_PERCENTAGE: 0.2
};

// ================================
// SELETORES DOM
// ================================
class DOMElements {
    constructor() {
        // Seções principais
        this.secaoFormulario = document.getElementById('secao-formulario');
        this.secaoLista = document.getElementById('secao-lista');
        
        // Formulário e tabela
        this.formPedido = document.getElementById('form-pedido');
        this.corpoTabelaPedidos = document.getElementById('corpo-tabela-pedidos');
        this.tituloFormulario = document.getElementById('titulo-formulario');
        this.pedidoIdInput = document.getElementById('pedidoId');
        this.mensagemListaVazia = document.getElementById('mensagem-lista-vazia');
        
        // Botões de navegação
        this.btnNovoPedido = document.getElementById('btn-novo-pedido');
        this.btnListarPedidos = document.getElementById('btn-listar-pedidos');
        this.btnListarPedidosAntigos = document.getElementById('btn-listar-pedidos-antigos');
        this.btnCancelar = document.getElementById('btn-cancelar');
        
        // Modal de exclusão
        this.modalExclusao = document.getElementById('modal-exclusao');
        this.btnCancelarExclusao = document.getElementById('btn-cancelar-exclusao');
        this.btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');
        
        // Campos do formulário
        this.campos = {
            produto: document.getElementById('produto'),
            quantidade: document.getElementById('quantidade'),
            valorTotal: document.getElementById('valorTotal'),
            descricao: document.getElementById('descricao'),
            nomeCliente: document.getElementById('nomeCliente'),
            contato: document.getElementById('contato'),
            valorSinal: document.getElementById('valorSinal'),
            dataEntrega: document.getElementById('dataEntrega'),
            horaEntrega: document.getElementById('horaEntrega')
        };
    }
}

// ================================
// CLASSE DE VALIDAÇÃO E NOTIFICAÇÕES
// ================================
class ValidadorNotificacoes {
    constructor() {
        this.criarToastElement();
    }

    /**
     * Cria o elemento toast no DOM se não existir
     */
    criarToastElement() {
        if (!document.getElementById('toast')) {
            const toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            toast.innerHTML = `
                <span id="toastMessage"></span>
                <button style="background:none;border:none;color:white;float:right;font-size:18px;cursor:pointer;margin-left:10px;" 
                        onclick="this.parentElement.classList.remove('show')">&times;</button>
            `;
            document.body.appendChild(toast);
        }
    }

    /**
     * Exibe tooltip de erro em campo específico
     */
    mostrarErroTooltip(input, mensagem) {
        this.limparErroTooltip(input);
        
        input.classList.add('error');
        
        let tooltip = input.parentElement.querySelector('.error-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'error-tooltip';
            input.parentElement.appendChild(tooltip);
        }
        
        tooltip.textContent = mensagem;
        tooltip.classList.add('show');
        
        // Auto-remove após tempo configurado
        setTimeout(() => {
            this.limparErroTooltip(input);
        }, CONFIG.TOOLTIP_DURATION);
        
        // Remove erro ao focar no campo
        const removerErro = () => {
            this.limparErroTooltip(input);
            input.removeEventListener('focus', removerErro);
        };
        input.addEventListener('focus', removerErro);
    }

    /**
     * Limpa tooltip de erro do campo
     */
    limparErroTooltip(input) {
        input.classList.remove('error');
        const tooltip = input.parentElement.querySelector('.error-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }

    /**
     * Exibe notificação toast
     */
    mostrarToast(mensagem, tipo = 'error') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = mensagem;
        toast.className = `toast ${tipo} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, CONFIG.TOAST_DURATION);
    }

    /**
     * Valida se um valor é positivo
     */
    validarValorPositivo(valor, nomeCampo, input = null) {
        const numero = parseFloat(valor) || 0;
        
        if (numero <= 0) {
            const mensagem = `${nomeCampo} deve ser maior que zero`;
            if (input) {
                this.mostrarErroTooltip(input, mensagem);
            }
            this.mostrarToast(mensagem, 'error');
            return { valido: false, erro: mensagem };
        }
        
        return { valido: true };
    }

    /**
     * Valida valores monetários (total e sinal)
     */
    validarValoresMonetarios(valorTotal, valorSinal, inputTotal = null, inputSinal = null) {
        // Validação do valor total
        const validacaoTotal = this.validarValorPositivo(valorTotal, 'Valor total', inputTotal);
        if (!validacaoTotal.valido) {
            return validacaoTotal;
        }

        // Validação do valor do sinal
        const validacaoSinal = this.validarValorPositivo(valorSinal, 'Valor do sinal', inputSinal);
        if (!validacaoSinal.valido) {
            return validacaoSinal;
        }

        // Verificação das regras de negócio
        const sinalMinimo = valorTotal * CONFIG.MIN_SIGNAL_PERCENTAGE;
        let mensagem = '';
        
        if (valorSinal > valorTotal) {
            mensagem = 'O valor do sinal não pode ser maior que o valor total';
        } else if (valorSinal < sinalMinimo) {
            mensagem = 'O valor do sinal deve ser pelo menos 20% do valor total';
        }
        
        if (mensagem) {
            if (inputSinal) {
                this.mostrarErroTooltip(inputSinal, mensagem);
            }
            this.mostrarToast(mensagem, 'error');
            return { valido: false, erro: mensagem };
        }

        return { valido: true };
    }

    /**
     * Valida se data/hora são futuras e dentro do limite
     */
    validarDataFutura(data, hora, input = null) {
        if (!data || !hora) {
            const mensagem = 'Data e hora são obrigatórias';
            if (input) {
                this.mostrarErroTooltip(input, mensagem);
            }
            this.mostrarToast(mensagem, 'error');
            return { valido: false, erro: mensagem };
        }

        const agora = new Date();
        const dataHora = new Date(`${data}T${hora}:00`);

        // Validação para datas no passado
        if (dataHora <= agora) {
            const mensagem = this.obterMensagemDataPassado(agora, dataHora);
            if (input) {
                this.mostrarErroTooltip(input, mensagem);
            }
            this.mostrarToast(mensagem, 'error');
            return { valido: false, erro: mensagem };
        }

        // Validação para datas muito distantes no futuro
        const dataLimite = new Date();
        dataLimite.setDate(agora.getDate() + CONFIG.MAX_FUTURE_DAYS);

        if (dataHora > dataLimite) {
            const mensagem = `O agendamento não pode exceder ${CONFIG.MAX_FUTURE_DAYS} dias a partir de hoje.`;
            if (input) {
                this.mostrarErroTooltip(input, mensagem);
            }
            this.mostrarToast(mensagem, 'error');
            return { valido: false, erro: mensagem };
        }
           
        return { valido: true };
    }

    /**
     * Gera mensagem adequada para datas no passado
     */
    obterMensagemDataPassado(agora, dataHora) {
        const diferenca = Math.ceil((agora - dataHora) / (1000 * 60 * 60 * 24));
        
        if (diferenca === 0) {
            return 'A entrega deve ser agendada para o futuro';
        } else if (diferenca === 1) {
            return 'Esta data foi ontem. Selecione uma data futura';
        } else {
            return `Esta data foi há ${diferenca} dias atrás`;
        }
    }
}

// ================================
// CLASSE DE CONTROLE DA INTERFACE
// ================================
class UIController {
    constructor(domElements) {
        this.dom = domElements;
    }

    /**
     * Alterna visibilidade entre seções
     */
    mostrarSecao(secao) {
        this.dom.secaoFormulario.classList.add('hidden', 'opacity-0');
        this.dom.secaoLista.classList.add('hidden', 'opacity-0');

        secao.classList.remove('hidden');
        setTimeout(() => secao.classList.remove('opacity-0'), 50);
    }

    /**
     * Reseta formulário para estado inicial
     */
    resetarFormulario() {
        this.dom.formPedido.reset();
        this.dom.pedidoIdInput.value = '';
        this.dom.tituloFormulario.textContent = 'Cadastrar Novo Pedido';
        this.dom.btnCancelar.style.display = 'none';
    }

    /**
     * Renderiza dados dos pedidos na tabela
     */
    renderizarTabela(pedidos) {
        this.dom.corpoTabelaPedidos.innerHTML = '';

        if (pedidos.length === 0) {
            this.dom.mensagemListaVazia.classList.remove('hidden');
            return;
        }

        this.dom.mensagemListaVazia.classList.add('hidden');
        pedidos.forEach(pedido => {
            const tr = this.criarLinhaTabela(pedido);
            this.dom.corpoTabelaPedidos.appendChild(tr);
        });
    }

    /**
     * Cria uma linha da tabela para um pedido
     */
    criarLinhaTabela(pedido) {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-amber-50';

        const valorFormatado = this.formatarMoeda(pedido.valorTotal);
        const dataFormatada = this.formatarDataHora(pedido.dataHora);

        tr.innerHTML = `
            <td class="py-3 px-4">${pedido.produto}</td>
            <td class="py-3 px-4">${pedido.nomeCliente}</td>
            <td class="py-3 px-4">${valorFormatado}</td>
            <td class="py-3 px-4">${dataFormatada}</td>
            <td class="py-3 px-4 text-center">
                <button onclick="gerenciadorPedidos.prepararEdicao(${pedido.id})" 
                        class="text-blue-600 hover:text-blue-800 font-semibold mr-3">Editar</button>
                <button onclick="gerenciadorPedidos.abrirModalExclusao(${pedido.id})" 
                        class="text-red-600 hover:text-red-800 font-semibold">Excluir</button>
            </td>
        `;
        
        return tr;
    }

    /**
     * Formata valor monetário
     */
    formatarMoeda(valor) {
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }

    /**
     * Formata data e hora para exibição
     */
    formatarDataHora(dataHora) {
        return new Date(dataHora).toLocaleString('pt-BR', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    /**
     * Preenche formulário com dados do pedido
     */
    preencherFormulario(pedido) {
        this.dom.pedidoIdInput.value = pedido.id;
        this.dom.campos.produto.value = pedido.produto;
        this.dom.campos.quantidade.value = pedido.quantidade;
        this.dom.campos.valorTotal.value = pedido.valorTotal;
        this.dom.campos.descricao.value = pedido.descricao;
        this.dom.campos.nomeCliente.value = pedido.nomeCliente;
        this.dom.campos.contato.value = pedido.contato;
        this.dom.campos.valorSinal.value = pedido.valorSinal;
        
        if (pedido.dataHora) {
            const [data, hora] = pedido.dataHora.split('T');
            this.dom.campos.dataEntrega.value = data;
            this.dom.campos.horaEntrega.value = hora.substring(0, 5);
        }
        
        this.dom.tituloFormulario.textContent = 'Editar Pedido';
        this.dom.btnCancelar.style.display = 'inline-block';
    }
}

// ================================
// CLASSE DE COMUNICAÇÃO COM API
// ================================
class APIService {
    constructor() {
        this.baseUrl = CONFIG.API_URL;
    }

    /**
     * Busca todos os pedidos
     */
    async listarPedidos() {
        try {
            const response = await fetch(this.baseUrl);
            if (!response.ok) {
                throw new Error('Erro ao buscar pedidos.');
            }
            return await response.json();
        } catch (error) {
            console.error('Falha na listagem:', error);
            throw new Error('Não foi possível carregar os pedidos.');
        }
    }

    /**
     * Busca pedidos antigos/passados
     */
    async listarPedidosAntigos() {
        try {
            const response = await fetch(`${this.baseUrl}/passado`);
            if (!response.ok) {
                throw new Error('Erro ao buscar pedidos.');
            }
            return await response.json();
        } catch (error) {
            console.error('Falha na listagem:', error);
            throw new Error('Não foi possível carregar os pedidos.');
        }
    }

    /**
     * Busca um pedido específico por ID
     */
    async buscarPedido(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`);
            if (!response.ok) {
                throw new Error('Pedido não encontrado.');
            }
            return await response.json();
        } catch (error) {
            console.error('Falha ao buscar pedido:', error);
            throw new Error('Não foi possível carregar os dados do pedido para edição.');
        }
    }

    /**
     * Salva um pedido (criar ou atualizar)
     */
    async salvarPedido(pedidoData, id = null) {
        const isUpdating = !!id;
        const url = isUpdating ? `${this.baseUrl}/${id}` : this.baseUrl;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData),
            });

            if (!response.ok) {
                throw new Error('Erro ao salvar o pedido.');
            }

            return { success: true, isUpdating };
        } catch (error) {
            console.error('Falha ao salvar:', error);
            throw new Error('Não foi possível salvar o pedido. Verifique os dados e tente novamente.');
        }
    }

    /**
     * Exclui um pedido
     */
    async excluirPedido(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir o pedido.');
            }

            return { success: true };
        } catch (error) {
            console.error('Falha ao excluir:', error);
            throw new Error('Não foi possível excluir o pedido.');
        }
    }
}

// ================================
// CLASSE PRINCIPAL - GERENCIADOR DE PEDIDOS
// ================================
class GerenciadorPedidos {
    constructor() {
        this.dom = new DOMElements();
        this.validador = new ValidadorNotificacoes();
        this.ui = new UIController(this.dom);
        this.api = new APIService();
        this.idParaExcluir = null;
        
        this.inicializar();
    }

    /**
     * Inicializa a aplicação
     */
    inicializar() {
        this.configurarEventListeners();
        this.configurarValidacaoTempoReal();
        this.ui.mostrarSecao(this.dom.secaoFormulario);
    }

    /**
     * Configura todos os event listeners
     */
    configurarEventListeners() {
        // Formulário
        this.dom.formPedido.addEventListener('submit', (e) => this.salvarPedido(e));
        
        // Botões de navegação
        this.dom.btnNovoPedido.addEventListener('click', () => this.novoPedido());
        this.dom.btnListarPedidos.addEventListener('click', () => this.listarPedidos());
        this.dom.btnListarPedidosAntigos.addEventListener('click', () => this.listarPedidosAntigos());
        this.dom.btnCancelar.addEventListener('click', () => this.cancelarEdicao());
        
        // Modal de exclusão
        this.dom.btnCancelarExclusao.addEventListener('click', () => this.fecharModalExclusao());
        this.dom.btnConfirmarExclusao.addEventListener('click', () => this.excluirPedido());
    }

    /**
     * Configura validação em tempo real para campos monetários
     */
    configurarValidacaoTempoReal() {
        let timeoutId;
        
        const validarComDelay = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const valorTotal = parseFloat(this.dom.campos.valorTotal.value) || 0;
                const valorSinal = parseFloat(this.dom.campos.valorSinal.value) || 0;
                
                if (valorTotal > 0 && valorSinal > 0) {
                    this.validador.validarValoresMonetarios(
                        valorTotal,
                        valorSinal,
                        this.dom.campos.valorTotal,
                        this.dom.campos.valorSinal
                    );
                }
            }, CONFIG.VALIDATION_DELAY);
        };
        
        this.dom.campos.valorTotal.addEventListener('input', validarComDelay);
        this.dom.campos.valorSinal.addEventListener('input', validarComDelay);
        
        // Limpa erros ao focar
        this.dom.campos.valorTotal.addEventListener('focus', () => {
            this.validador.limparErroTooltip(this.dom.campos.valorTotal);
        });
        this.dom.campos.valorSinal.addEventListener('focus', () => {
            this.validador.limparErroTooltip(this.dom.campos.valorSinal);
        });
    }

    /**
     * Cria um novo pedido
     */
    novoPedido() {
        this.ui.resetarFormulario();
        this.ui.mostrarSecao(this.dom.secaoFormulario);
    }

    /**
     * Lista todos os pedidos
     */
    async listarPedidos() {
        try {
            this.ui.mostrarSecao(this.dom.secaoLista);
            const pedidos = await this.api.listarPedidos();
            this.ui.renderizarTabela(pedidos);
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * Lista pedidos antigos
     */
    async listarPedidosAntigos() {
        try {
            this.ui.mostrarSecao(this.dom.secaoLista);
            const pedidos = await this.api.listarPedidosAntigos();
            this.ui.renderizarTabela(pedidos);
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * Salva um pedido (criar ou atualizar)
     */
    async salvarPedido(event) {
        event.preventDefault();

        const dadosFormulario = this.coletarDadosFormulario();
        
        if (!this.validarDadosFormulario(dadosFormulario)) {
            return;
        }

        this.limparErrosFormulario();

        try {
            const id = this.dom.pedidoIdInput.value;
            const resultado = await this.api.salvarPedido(dadosFormulario.pedidoData, id);
            
            const mensagem = resultado.isUpdating ? 
                'Pedido atualizado com sucesso!' : 
                'Pedido criado com sucesso!';
            
            this.validador.mostrarToast(mensagem, 'success');
            this.ui.resetarFormulario();
            this.ui.mostrarSecao(this.dom.secaoLista);
            await this.listarPedidos();

        } catch (error) {
            this.validador.mostrarToast(error.message, 'error');
        }
    }

    /**
     * Coleta dados do formulário
     */
    coletarDadosFormulario() {
        const campos = this.dom.campos;
        
        return {
            dataEntrega: campos.dataEntrega.value,
            horaEntrega: campos.horaEntrega.value,
            valorTotal: parseFloat(campos.valorTotal.value) || 0,
            valorSinal: parseFloat(campos.valorSinal.value) || 0,
            pedidoData: {
                produto: campos.produto.value,
                quantidade: parseFloat(campos.quantidade.value),
                valorTotal: parseFloat(campos.valorTotal.value) || 0,
                descricao: campos.descricao.value,
                nomeCliente: campos.nomeCliente.value,
                contato: campos.contato.value,
                valorSinal: parseFloat(campos.valorSinal.value) || 0,
                dataHora: `${campos.dataEntrega.value}T${campos.horaEntrega.value}:00`
            }
        };
    }

    /**
     * Valida dados do formulário
     */
    validarDadosFormulario(dados) {
        // Validação de data
        const validacaoData = this.validador.validarDataFutura(
            dados.dataEntrega,
            dados.horaEntrega,
            this.dom.campos.dataEntrega
        );
        
        if (!validacaoData.valido) {
            return false;
        }

        // Validação de valores monetários
        const validacaoValores = this.validador.validarValoresMonetarios(
            dados.valorTotal,
            dados.valorSinal,
            this.dom.campos.valorTotal,
            this.dom.campos.valorSinal
        );
        
        return validacaoValores.valido;
    }

    /**
     * Limpa erros dos campos do formulário
     */
    limparErrosFormulario() {
        this.validador.limparErroTooltip(this.dom.campos.dataEntrega);
        this.validador.limparErroTooltip(this.dom.campos.valorTotal);
        this.validador.limparErroTooltip(this.dom.campos.valorSinal);
    }

    /**
     * Prepara edição de um pedido
     */
    async prepararEdicao(id) {
        try {
            const pedido = await this.api.buscarPedido(id);
            this.ui.preencherFormulario(pedido);
            this.ui.mostrarSecao(this.dom.secaoFormulario);
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * Cancela edição e volta para formulário limpo
     */
    cancelarEdicao() {
        this.ui.resetarFormulario();
        this.ui.mostrarSecao(this.dom.secaoFormulario);
    }

    /**
     * Abre modal de confirmação de exclusão
     */
    abrirModalExclusao(id) {
        this.idParaExcluir = id;
        this.dom.modalExclusao.classList.remove('hidden');
    }

    /**
     * Fecha modal de exclusão
     */
    fecharModalExclusao() {
        this.idParaExcluir = null;
        this.dom.modalExclusao.classList.add('hidden');
    }

    /**
     * Exclui um pedido
     */
    async excluirPedido() {
        if (!this.idParaExcluir) return;

        try {
            await this.api.excluirPedido(this.idParaExcluir);
            this.fecharModalExclusao();
            await this.listarPedidos();
        } catch (error) {
            alert(error.message);
        }
    }
}

// ================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ================================
let gerenciadorPedidos;

document.addEventListener('DOMContentLoaded', () => {
    gerenciadorPedidos = new GerenciadorPedidos();
});