Simplex = (function() {
	function Simplex(options) {
		this.$objetivo = options.objetivo;
		this.$restricoes = options.restricoes;
		this.$processadas = options.processadas;

		this.objetivo = [];
		this.restricoes = [];
		this.tabela = [];
		this.maiorQueZero = [];
		this.parcelas = [];
		this.restricoesArtificiais = [];

		this.tipo = '';
		this.numArtificial = 0;
		this.numFolga = 0;

		this.guia = ['z'];
		this.z = [];

		this.processarEntradas();
		this.criarTabela();

		this.start, this.end;

		this.toString();
	}

	function tempo() {
		var time = this.end - this.start;
		return time;
	}

	Simplex.prototype.processarEntradas = function() {
		
		this.objetivo = this.$objetivo.innerText.replace(/\s/gmi, '').match(/\((MAX|MIN)\)z=([\+\-\*\/]?((\d*(\.?\d*))x\d*))+/gmi);
		// console.log('Função objetivo', this.objetivo);

		this.restricoes = this.$restricoes.innerText.replace(/\s/gmi, '').match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))+([<|>]?=)(\d*(\.?\d+));/gmi);
		// console.log('Restrições', this.restricoes);

		/**
		 * Remove as restriões de não negatividade e armazena em um array separado
		 */
		for (var i = 0; i < this.restricoes.length; i++) {
			if (/x\d*>=0/gmi.test(this.restricoes[i])) {
				var t = this.restricoes[i];
				this.restricoes.splice(i, 1);
				this.maiorQueZero.push(t);
				this.guia.push(t.match(/x\d*/)[0]);
				i--;
				continue;
			}

			this.restricoes[i] = this.arrumarSinal(this.restricoes[i]);
		}
		
		this.adicionaCoeficientes(this.restricoes, this.parcelas);

		/**
		 * Cria as parcelas de cada restricao
		 */
		// console.log(this.restricoes);
		var numFolga = 0,
				numArtificial = 0;

		for (var i = 0; i < this.restricoes.length; i++) {
			var segundo = this.restricoes[i].match(/([<|>]?=)(\d*(\.?\d+))/gmi)[0];
			var operador = segundo.match(/[<|>]?=/)[0];
			var valor = segundo.match(/\d+/)[0];
			// console.log(segundo, operador, valor);

			var obj = {};
			if (operador == '<=') {
				obj = {
					coeficiente: '1',
					tipo: 'folga',
					variavel: 'f'+ ++numFolga
				}
			}
			else if (operador == '>=') {
				obj = {
					coeficiente: '-1',
					tipo: 'folga',
					variavel: 'f'+ ++numFolga	
				}
				if (this.guia.indexOf(obj.variavel) == -1) this.guia.push(obj.variavel);
				this.parcelas[i].push(obj);

				obj = {
					coeficiente: '1',
					tipo: 'artificial',
					variavel: 'a'+ ++numArtificial	
				}
			}
			else if (operador == '=') {
				obj = {
					coeficiente: '1',
					tipo: 'artificial',
					variavel: 'a'+ ++numArtificial	
				}	
			}

			if (this.guia.indexOf(obj.variavel) == -1) this.guia.push(obj.variavel);
			this.parcelas[i].push(obj);

			obj = {
				tipo: 'operador',
				valor: '='
			};
			this.parcelas[i].push(obj);

			obj = {
				tipo: 'direito',
				coeficiente: valor,
				variavel: 'b'
			};

			this.parcelas[i].push(obj);
		};
		if (this.guia.indexOf(obj.variavel) == -1) this.guia.push(obj.variavel);
		this.numArtificial = numArtificial;
		this.numFolga = numFolga;

		// console.log(this.$processadas);
		// this.escreveHtml(this.$processadas);
	};

	Simplex.prototype.arrumarSinal = function(eq) {
		eq = eq.replace(/\+x/gmi, '+1x');
		eq = eq.replace(/\-x/gmi, '-1x');

		if (eq.charAt(0) == 'x') eq = '+1' + eq;
		else if (eq.charAt(0) != '-') eq = '+' + eq;

		return eq;
	};

	/**
	 * Troca os valores de +/-x para +/-1x
	 *
	 * Arruma os sinais das primeiras parcelas
	 *
	 * Separa cada parcela e armazena em um vetor de parcelas
	 */
	Simplex.prototype.adicionaCoeficientes = function(origem, destino) {
		for (var i = 0; i < origem.length; i++) {

			var coefs = origem[i].match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))/gmi);

			for (var j = 0; j < coefs.length; j++) {
				var variavel = coefs[j].match(/x\d*/)[0];
				var coeficiente = coefs[j].match(/[+\-\*\/]?\d*(\.?\d*)?/)[0];

				if (destino[i] == undefined) destino[i] = [];

				var o = {
					tipo: 'variavel',
					variavel: variavel,
					coeficiente: coeficiente
				};

				destino[i].push(o);
			};
		};
	};
	
	Simplex.prototype.criarTabela = function() {
		var linha = 0;

		/**
		 * Cria a tabela (Objetivo)
		 */
		
		// Iguala a função objetivo a zero e armazena em Z para facilitar a visualização
		this.igualaZero(this.objetivo.toString(), this.z);
		this.z = this.z[0]; // Conversão Array1[index] = Array2 => Array2[index] = Elemento

		// Cria a primeira linha da tabela com o número de variáveis existentes, preenchida com 0
		this.tabela[linha] = new Array(this.guia.length + 1).join('0').split('').map(parseFloat);
		// Sempre existe o número 1 indicando o coeficiente do Z
		this.tabela[linha][0] = 1;


		// Preenche a primeira linha da tabela com os coeficientes da equação Z
		for (var i = 0; i < this.z.length; i++) {
			// Inverte o sinal do coeficiente e armazena
			this.z[i].coeficiente = (parseFloat(this.z[i].coeficiente) * -1).toString();

			// Descobre qual o índice a variável na tabela
			// Lembre que os valores estão armazenados em um array de objetos
			var variavel = this.z[i].variavel,
					index 	 = this.guia.indexOf(variavel);

			// Armazena na tabela
			this.tabela[linha][index] = parseFloat(this.z[i].coeficiente);
		};

		//Incremento para irmos para outra linha
		linha++;

		/**
		 * Cria a tabela (Restricoes)
		 */
		for (var i = 0; i < this.parcelas.length; i++) {
			// Uma verificação apenas para garantir a consistência
			if (this.tabela[linha] == undefined) {
				this.tabela[linha] = new Array(this.guia.length + 1).join('0').split('').map(parseFloat);
			}

			//Descobrindo quais os coeficientes de cada restrição
			for (var j = 0; j < this.parcelas[i].length; j++) {
				//Se for operador, passa reto
				if (this.parcelas[i][j].tipo == 'operador') continue;

				var variavel = this.parcelas[i][j].variavel,
						index 	 = this.guia.indexOf(variavel);

				this.tabela[linha][index] = parseFloat(this.parcelas[i][j].coeficiente);
			};
			//Vai pra próxima linha
			linha++;
		};

		/**
		 * Verificando se existem variáveis artificiais
		 */
		if (this.numArtificial > 0) {

		}
	};

	Simplex.prototype.igualaZero = function(eq, destino) {		
		// this.tipo = eq.match(/MAX|MIN/)[0];

		var coefs = eq.match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))/gmi);
		// console.log(coefs);

		for (var i = 0; i < coefs.length; i++) {
			coefs[i] = this.arrumarSinal(coefs[i]);
		};

		this.adicionaCoeficientes([coefs.join()], destino);
		// console.log(destino);
	};

	Simplex.prototype.toString = function() {
		console.group('Inicial');
			console.log('Objetivo', this.objetivo);
			console.log('Restrições', this.restricoes);
		console.groupEnd('Inicial');

		console.group('Atributos');
			console.log('Tipo', this.tipo);
			console.log('Número de variáveis de folga', this.numFolga);
			console.log('Número de variáveis artificiais', this.numArtificial);
			console.group('Restrições de não negatividade');
				console.dir(this.maiorQueZero);			
			console.groupEnd('Restrições de não negatividade');
		console.groupEnd('Atributos');

		console.group('Pós processamento');
			console.group('Z');
				console.dir(this.z);		
			console.groupEnd('Z');

			console.group('Parcelas');
				console.dir(this.parcelas);
			console.groupEnd('Parcelas');

			console.group('Guia');
				console.dir(this.guia);
			console.groupEnd('Guia');
		console.groupEnd('Pós processamento');

		console.group('Tabela');
			console.log(this.tabela);
		console.groupEnd('Tabela');
	}

	return Simplex;
})();

var simplex = new Simplex({
	objetivo: document.getElementById('funcao-objetivo'),
	restricoes: document.getElementById('restricoes'),
	processadas: document.getElementById('restricoes-processadas')
});

/**
 * 
 * (([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))+([<|>]?=)(\d*(\.?\d+));
 * 
 * Regex for validating rules
 * (([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))+([<|>]?=)(\d*(\.?\d+));
 * 
 * Regex for get the elements
 * (([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))
 *
 * Regex for get the second member
 * ([<|>]?=)(\d*(\.?\d+))
 */

/*

We'll write a JSON like this

{
	tipo: 'variavel',
	coeficiente: 2,
	variavel: 'x',
	indice: 1
},
{
	tipo: 'variavel',
	coeficiente: 1,
	variavel: 'x',
	indice: 2
},
{
	tipo: 'variavel',
	coeficiente: -1,
	variavel: 'x',
	indice: 3
},
{
	tipo: 'operador',
	simbolo: '<=',
	token: 'MENORIGUAL'
},
{
	tipo: 'valor',
	valor: 10
}

*/ 
