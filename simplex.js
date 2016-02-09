Simplex = (function() {
	function Simplex(options) {
		this.$objetivo = options.objetivo;
		this.$restricoes = options.restricoes;
		this.$resultado = options.resultado;
		this.$resultadoVetores = options.resultadoVetores;

		this.reset();

		// this.toString();
	}

	function tempo() {
		var time = this.end - this.start;
		return time;
	}

	Simplex.prototype.reset = function() {
		this.objetivo = [];
		this.restricoes = [];
		this.maiorQueZero = [];
		this.parcelas = [];
		this.restricoesArtificiais = [];

		this.tipo = '';
		this.numArtificial = 0;
		this.numFolga = 0;

		this.guia = ['z'];
		this.z = [];

		this.start, this.end;

		this.tabelas = [];
		this.tabela = [];

		this.entrantes = [];
		this.entrante;

		this.saintes = []
		this.sainte;

		this.pivo;

		this.nlps = [];
		this.nlp;

		this.vnbs = [];
		this.vbs = [];
		this.valorZ;
	};

	Simplex.prototype.calcular = function() {

		this.reset();

		this.processarEntradas();
		this.criarTabela();
		this.resolve();
	};

	Simplex.prototype.processarEntradas = function() {
		var objetivoRE = /\((MAX|MIN)\)z=([\+\-\*\/]?((\d*(\.?\d*))x\d*))+/gmi,
				restricoesRE = /(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))+([<|>]?=)(\d*(\.?\d+));/gmi,
				whiteSpaceRE = /\s/gmi;

		this.objetivo = this.$objetivo.replace(whiteSpaceRE, '').match(objetivoRE);

		this.restricoes = this.$restricoes.replace(whiteSpaceRE, '').match(restricoesRE);

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
		var numFolga = 0,
				numArtificial = 0;

		for (var i = 0; i < this.restricoes.length; i++) {
			var segundo = this.restricoes[i].match(/([<|>]?=)(\d*(\.?\d+))/gmi)[0];
			var operador = segundo.match(/[<|>]?=/)[0];
			var valor = segundo.match(/\d+/)[0];

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
	};

	/**
	 * Arruma o sinal da equação
	 */
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

			//Extrai os coeficientes da equação em questão
			var coefs = origem[i].match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))/gmi);

			for (var j = 0; j < coefs.length; j++) {
				// Extrai qual a variável regida por aquela parcela
				var variavel = coefs[j].match(/x\d*/)[0];
				// Extrai o coeficiente da parcela
				var coeficiente = coefs[j].match(/[+\-\*\/]?\d*(\.?\d*)?/)[0];

				// Evita erro por undefined
				if (destino[i] == undefined) destino[i] = [];

				var o = {
					tipo: 'variavel',
					variavel: variavel,
					coeficiente: coeficiente
				};

				// Adiciona a nova parcela
				destino[i].push(o);
			};
		};
	};

	/**
	 * Cria a tabela com os coeficientes
	 */
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

		this.tabelas.push(this.tabela);
	};

	/**
	 * Iguala uma equação a zero
	 */
	Simplex.prototype.igualaZero = function(eq, destino) {
		// Extrai o tipo do PPL (Minimização ou Maximização)
		this.tipo = eq.match(/MAX|MIN/)[0];

		// Extrao os coeficientes da equação Z
		var coefs = eq.match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))/gmi);

		// Arruma os sinais dos coeficientes
		for (var i = 0; i < coefs.length; i++) {
			coefs[i] = this.arrumarSinal(coefs[i]);
		};

		// Adiciona os coeficientes no array de parcelas
		this.adicionaCoeficientes([coefs.join()], destino);
	};

	/**
	 * Resolve o simplex (Geral)
	 */
	Simplex.prototype.resolve = function() {
		/**
		 * Verificando se existem variáveis artificiais
		 */
		if (this.numArtificial > 0) {
			console.log('Existem restrições que implicam em variáveis artificiais. Ainda não foi construído o método para resolver esse tipo de PPL, tente usar apenas restrições simples');
			// this.encontraRestricoesArtificiais();
			return;
		}

		// Enquanto não terminou
		while(!this.terminou()) {
			// Encontra a variável entrante (coluna)
			this.encontraEntrante();

			// Encontra a variável sainte (linha)
			this.encontraSainte();

			// Encontra o elemento pivô
			this.encontraPivo();

			// Calcula a Nova Linha Pivô
			this.calculaNLP();

			//Calcula as novas linhas
			this.calculaNovasLinhas();
		}

		this.calculaResultado();

		this.mostraResultado();
	};

	Simplex.prototype.calculaResultado = function() {
		// Clona o array de guia para saber quais são as variáveis não básicas
		this.vnbs = this.guia.slice(1, this.guia.length-1);

		for (var i = 1; i < this.tabela[0].length - 1; i++) {
			for (var j = 1; j < this.tabela.length; j++) {
				if (this.tabela[j][i] == 0) continue;
				else if(this.tabela[j][i] == 1) {
					this.vbs.push({
						variavel: this.guia[i],
						valor: this.tabela[j][this.guia.indexOf('b')]
					});

					// Encontra as varíáveis não básicas
					this.vnbs.splice(this.guia[i], 1);
				}
				else {
					break;
				}
			}
		};
	};

	/**
	 * Encontra a coluna entrante
	 */
	Simplex.prototype.encontraEntrante = function() {
		var menor = this.tabela[0][1],
				menorIndex = 1;

		for (var i = 2; i < this.tabela[0].length - 1; i++) {
			if (this.tabela[0][i] < menor) {
				menor = this.tabela[0][i];
				menorIndex = i;
			}
		}

		this.entrantes.push(menorIndex);
		this.entrante = menorIndex;
	};

	/**
	 * Verifica se terminou a execução do Simplex
	 * @return boolean FALSE senão terminou / TRUE caso tenha acabado
	 */
	Simplex.prototype.terminou = function() {
		for (var i = 1; i < this.tabela[0].length - 1; i++) {
			if (this.tabela[0][i] < 0) {
				return false;
			}
		};
		return true;
	}

	/**
	 * Encontra a linha sainte
	 */
	Simplex.prototype.encontraSainte = function() {
		var len = this.tabela.length;
		var menor, sainte;

		// Aqui, já deixamos preparado para trabalhar o simplex de duas fases
		if (this.numArtificial > 0) len--;

		for (var i = 1; i < len; i++) {
			var b = this.tabela[i][this.guia.indexOf('b')],
					valor = this.tabela[i][this.entrante],
					razao = b / valor;

			// Valores negativos são ignorados
			if (razao < 0) continue;

			// Procuramos o menor valor positivo
			if (menor == undefined || menor > razao) {
				menor = razao;
				sainte = i;
			}
		};

		this.saintes.push(sainte);
		this.sainte = sainte;
	};

	/**
	 * Armazena o elemento pivô
	 */
	Simplex.prototype.encontraPivo = function() {
		this.pivo = this.tabela[this.sainte][this.entrante];
	};

	/**
	 * Calcula a nova linha pivô
	 */
	Simplex.prototype.calculaNLP = function() {
		var nlp = [];

		// NLP é a linha sainte dividida pelo elemento pivô
		for (var i = 0; i < this.tabela[this.sainte].length; i++) {
			nlp.push(this.tabela[this.sainte][i] / this.pivo);
		};

		this.nlps.push(nlp);
		this.nlp = nlp;
	};

	/**
	 * Recalcula as linhas, gerando uma nova tabela
	 */
	Simplex.prototype.calculaNovasLinhas = function() {
		var novasLinhas = [];
		for (var i = 0; i < this.tabela.length; i++) {
			novasLinhas[i] = [];

			//Se for a linha sainte, não precisa calcular pois o resultado está em NLP
			if (i == this.sainte) {
				novasLinhas[i] = this.nlp;
				continue;
			}

			// Encontra o elemento multiplicador da linha
			var elementoMult = this.tabela[i][this.entrante] * -1;
			var tempNLP = [];

			// Calcula a NLP multiplicada
			for (var j = 0; j < this.nlp.length; j++) {
				tempNLP.push(this.nlp[j] * elementoMult);
			};

			// E depois, soma na linha antiga
			for (var j = 0; j < this.tabela[i].length; j++) {
				novasLinhas[i].push(tempNLP[j] + this.tabela[i][j]);
			}
		};

		this.tabelas.push(novasLinhas);
		this.tabela = novasLinhas;
	};

	Simplex.prototype.mostraResultado = function() {

		// Cria o header das tabelas
		var $trHeader = document.createElement('tr');

		for (var i = 0; i < this.guia.length; i++) {
			var $th = document.createElement('th');
			$th.textContent = this.guia[i];

			$trHeader.appendChild($th);
		};

		// Preenche as tabelas
		for (var i = 0; i < this.tabelas.length; i++) {
			var $h2 = document.createElement('h2');
			$h2.textContent = (i == 0 ? 'Original' : i + ' iteração');
			this.$resultado.appendChild($h2);

			var $table = document.createElement('table');
			$table.classList.add('table-resultado');

			var $thead = document.createElement('thead'),
					$tbody = document.createElement('tbody');

			$thead.appendChild($trHeader.cloneNode(true));
			$table.appendChild($thead);
			$table.appendChild($tbody);

			for (var j = 0; j < this.tabelas[i].length; j++) {
				var $tr = document.createElement('tr');
				if (this.saintes[i] == j) $tr.classList.add('sainte');

				for (var k = 0; k < this.tabelas[i][j].length; k++) {
					var $td = document.createElement('td');
					$td.textContent =
						this.tabelas[i][j][k] % 1 != 0 ?
						parseFloat(this.tabelas[i][j][k]).toPrecision(5) :
						this.tabelas[i][j][k];

						if (this.entrantes[i] == k && this.saintes[i] == j) $td.classList.add('pivo');
						else if (this.entrantes[i] == k) $td.classList.add('entrante');

					$tr.appendChild($td);
				};

				$tbody.appendChild($tr);
			};

			this.$resultado.appendChild($table);
		};

		// Anexa a lista no lugar certo
		this.$resultadoVetores.appendChild(listaVariaveisBasicas(this.vbs));

		// Cria a lista de variáveis não básicas
		this.$resultadoVetores.appendChild(listaVariaveisNaoBasicas(this.vnbs));

		// Encontra o valor do Z
		this.$resultadoVetores.appendChild(valorZ(this.tabela[0], this.guia));
	};

	function listaVariaveisBasicas(vbs) {
		// Cria a lista de variáveis básicas
		var $ul = document.createElement('ul');

		// Um cabeçalho
		var $h2 = document.createElement('h2');
		$h2.textContent = 'Váriaveis básicas';
		$ul.appendChild($h2);
		$ul.classList.add('vnbs');

		// Preenche a lista com as variáveis básicas
		for (var i = 0; i < vbs.length; i++) {
			var $li = document.createElement('li');
			$li.textContent = vbs[i].variavel + ' = ' + vbs[i].valor.toPrecision(5);

			$ul.appendChild($li);
		};

		return $ul;
	}

	function listaVariaveisNaoBasicas(vnbs) {
		// Cria a lista de variáveis básicas
		var $ul = document.createElement('ul');

		// Um cabeçalho
		var $h2 = document.createElement('h2');
		$h2.textContent = 'Váriaveis não básicas';
		$ul.appendChild($h2);
		$ul.classList.add('vbs');

		// Preenche a lista com as variáveis básicas
		for (var i = 0; i < vnbs.length; i++) {
			var $li = document.createElement('li');
			$li.textContent = vnbs[i] + ' = ' + 0;

			$ul.appendChild($li);
		};

		return $ul;
	}

	function valorZ(eqZ, guia) {
		var valor = eqZ[guia.indexOf('b')];

		var $h2 = document.createElement('h2');
		$h2.textContent = 'Valor de Z';

		var $ul = document.createElement('ul');
		var $li = document.createElement('li');

		$li.textContent = 'Z = ' + valor;

		$ul.appendChild($h2);
		$ul.appendChild($li);

		return $ul;
	}

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
			console.dir(this.tabela);
		console.groupEnd('Tabela');
	}

	Simplex.prototype.encontraRestricoesArtificiais = function () {
		for (var i = 0; i < this.parcelas.length; i++) {
			for (var j = 0; j < this.parcelas[i].length; j++) {
				if (this.parcelas[i][j].tipo == 'artificial') {
					this.restricoesArtificiais.push(this.parcelas[i]);
					break;
				}
			};
		};
	}

	return Simplex;
})();

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
