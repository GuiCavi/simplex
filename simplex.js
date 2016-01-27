Simplex = (function() {
	function Simplex(options) {
		this.$objetivo = options.objetivo;
		this.$restricoes = options.restricoes;
		this.$processadas = options.processadas;

		this.restricoes = [];
		this.tabela = [];
		this.maiorQueZero = [];
		this.parcelas = [];

		this.processarEntradas();
		this.criarTabela();
	}

	Simplex.prototype.processarEntradas = function() {
		this.restricoes = this.$restricoes.innerText.replace(/\s/gmi, '').match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))+([<|>]?=)(\d*(\.?\d+));/gmi);

		console.log(this.restricoes);

		/**
		 * Remove as restriões de não negatividade e armazena em um array separado
		 */
		for (var i = 0; i < this.restricoes.length; i++) {
			if (/x\d*>=0/gmi.test(this.restricoes[i])) {
				var t = this.restricoes[i];
				this.restricoes.splice(i, 1);
				this.maiorQueZero.push(t);
				i--;
				continue;
			}
		}
		
		/**
		 * Troca os valores de +/-x para +/-1x
		 *
		 * Arruma os sinais das primeiras parcelas
		 *
		 * Separa cada parcela e armazena em um vetor de parcelas
		 */		
		for (var i = 0; i < this.restricoes.length; i++) {
			this.restricoes[i] = this.restricoes[i].replace(/\+x/gmi, '+1x');
			this.restricoes[i] = this.restricoes[i].replace(/\-x/gmi, '-1x');

			if (this.restricoes[i].charAt(0) == 'x') this.restricoes[i] = '+1' + this.restricoes[i];
			else if (this.restricoes[i].charAt(0) != '-') this.restricoes[i] = '+' + this.restricoes[i];

			var coefs = this.restricoes[i].match(/(([+\-\*\/]?((\d*(\.?(\d+)))?)x(\d+)))/gmi);

			for (var j = 0; j < coefs.length; j++) {
				var variavel = coefs[j].match(/x\d*/)[0];
				var coeficiente = coefs[j].match(/[+\-\*\/]?\d*(\.?\d*)?/)[0];

				if (this.parcelas[i] == undefined) this.parcelas[i] = [];

				this.parcelas[i].push({
					tipo: 'variavel',
					variavel: variavel,
					coeficiente: coeficiente
				});
			};
		};

		console.log(this.restricoes);
		var numFolga = 1,
				numArtificial = 1;

		for (var i = 0; i < this.restricoes.length; i++) {
			var segundo = this.restricoes[i].match(/([<|>]?=)(\d*(\.?\d+))/gmi)[0];
			var operador = segundo.match(/[<|>]?=/)[0];
			var valor = segundo.match(/\d+/)[0];
			console.log(segundo, operador, valor);

			var obj = {};
			if (operador == '<=') {
				obj = {
					coeficiente: '1',
					tipo: 'folga',
					variavel: 'f'+ numFolga++
				}
			}
			else if (operador == '>=') {
				obj = {
					coeficiente: '-1',
					tipo: 'folga',
					variavel: 'f'+ numFolga++	
				}
				this.parcelas[i].push(obj);

				obj = {
					coeficiente: '1',
					tipo: 'artificial',
					variavel: 'a'+ numArtificial++	
				}
			}
			else if (operador == '=') {
				obj = {
					coeficiente: '1',
					tipo: 'artificial',
					variavel: 'a'+ numArtificial++	
				}	
			}

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

		// console.log(this.$processadas);
		// this.escreveHtml(this.$processadas);
	};

	// Simplex.prototype.escreveHtml = function() {
	// 	this.$processadas.innerHTML += '<hr>';

	// 	var table = document.createElement('table');
	// 	var tbody = document.createElement('tbody');

	// 	table.appendChild(tbody);

	// 	for (var i = 0; i < this.parcelas.length; i++) {
	// 		var tr = document.createElement('tr');

	// 		for (var j = 0; j < this.parcelas[i].length; j++) {
	// 			td = document.createElement('td');
	// 			console.log(this.parcelas[i][j]);
	// 			td.innerText = (this.parcelas[i][j].coeficiente ? this.parcelas[i][j].coeficiente : 0);

	// 			tr.appendChild(td);
	// 		};

	// 		tbody.appendChild(tr);
	// 	};

	// 	console.log(table);
	// 	this.$processadas.appendChild(table);
	// };
	
	Simplex.prototype.criarTabela = function() {
		for (var i = 0; i < this.parcelas.length; i++) {

			if (this.tabela[i] == undefined) this.tabela[i] = [];
			console.log("Restrição " + (i+1));

			for (var j = 0; j < this.parcelas[i].length; j++) {
				if (this.parcelas[i][j].tipo == 'operador') continue;
				console.log("Variavel " + this.parcelas[i][j].variavel);
				this.tabela[i][this.parcelas[i][j].variavel] = this.parcelas[i][j].coeficiente;
			};
		};

		console.log(this.tabela);
	};

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
