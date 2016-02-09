#Trabalho Final de Programação Linear

**Nome:** Guilherme Vincenzi Cavichioli

## Método Simplex

O método simplex, criado por Goerge Dantzig, auxilia na resolução de problemas de programação linear. Consite de uma função objetivo para
maximização ou minimização de resultados, estando sujeita à restrições. Estas são (in)equações que restringem as variáveis e representam condições
do mundo real.

Para exemplificar, temos o seguinte Problema de Programação Linear (PPL):

$$(MAX) Z = x1 + x2 + x3$$

Sujeito à:

$$2x\textsubscript{1} + x\textsubscript{2} - x\textsubscript{3} <= 10$$
$$x\textsubscript{1} + x\textsubscript{2} + 2x\textsubscript{3} <= 20$$
$$2x\textsubscript{1} + x\textsubscript{2} + 3x\textsubscript{3} <= 60$$

#### **Obs.:** Este será o exemplo executado no decorrer do tutorial

___

## O código

O trabalho foi feito totalmente em JavaScript utilizando de expressões regulares para processar as entradas de dados.

### Processando as entradas
