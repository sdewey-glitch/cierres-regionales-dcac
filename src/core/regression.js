"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRegression = runRegression;
// Resuelve un sistema lineal A * W = B usando eliminación gaussiana con pivoteo parcial
function solveLinearSystem(A, B) {
    const n = B.length;
    // Copias profundas para no alterar las matrices originales
    const a = A.map(row => [...row]);
    const b = [...B];
    for (let i = 0; i < n; i++) {
        // Buscar el pivote máximo en la columna i
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
                maxRow = k;
            }
        }
        // Intercambiar filas si es necesario
        if (maxRow !== i) {
            const tempRow = a[i];
            a[i] = a[maxRow];
            a[maxRow] = tempRow;
            const tempVal = b[i];
            b[i] = b[maxRow];
            b[maxRow] = tempVal;
        }
        // Verificar si la matriz es singular o casi singular
        if (Math.abs(a[i][i]) < 1e-12) {
            throw new Error('Matriz singular o degenerada. Los datos históricos no tienen suficiente variabilidad para realizar la regresión.');
        }
        // Hacer ceros debajo del elemento diagonal
        for (let k = i + 1; k < n; k++) {
            const factor = a[k][i] / a[i][i];
            for (let j = i; j < n; j++) {
                a[k][j] -= factor * a[i][j];
            }
            b[k] -= factor * b[i];
        }
    }
    // Sustitución hacia atrás
    const W = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = b[i];
        for (let j = i + 1; j < n; j++) {
            sum -= a[i][j] * W[j];
        }
        W[i] = sum / a[i][i];
    }
    return W;
}
/**
 * Realiza una regresión lineal OLS: target = intercepto + coefP * p + coefR * r + coefO * o
 */
function runRegression(data) {
    const N = data.length;
    if (N < 4) {
        throw new Error(`Se requieren al menos 4 registros históricos para calibrar un modelo de 4 parámetros. Datos actuales: ${N}`);
    }
    // Construcción de la matriz de diseño X^T * X (tamaño 4x4) y el vector X^T * y (tamaño 4x1)
    // Índice 0: Intercepto, 1: Componente P, 2: Componente R, 3: Componente O
    const A = Array.from({ length: 4 }, () => new Array(4).fill(0));
    const B = new Array(4).fill(0);
    for (const d of data) {
        const x = [1, d.p, d.r, d.o];
        const y = d.target;
        // Acumular para A = X^T * X
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                A[i][j] += x[i] * x[j];
            }
            // Acumular para B = X^T * y
            B[i] += x[i] * y;
        }
    }
    // Resolver el sistema A * W = B
    const W = solveLinearSystem(A, B);
    const intercepto = W[0];
    const coefP = W[1];
    const coefR = W[2];
    const coefO = W[3];
    // Calcular métricas de ajuste (R^2 y RMSE)
    let sumY = 0;
    for (const d of data) {
        sumY += d.target;
    }
    const meanY = sumY / N;
    let totalSumSq = 0; // Suma total de cuadrados (SST)
    let residualSumSq = 0; // Suma residual de cuadrados (SSE)
    for (const d of data) {
        const predicted = intercepto + coefP * d.p + coefR * d.r + coefO * d.o;
        const actual = d.target;
        totalSumSq += Math.pow(actual - meanY, 2);
        residualSumSq += Math.pow(actual - predicted, 2);
    }
    const r2 = totalSumSq > 0 ? (1 - (residualSumSq / totalSumSq)) : 1.0;
    const rmse = Math.sqrt(residualSumSq / N);
    return {
        coefP,
        coefR,
        coefO,
        intercepto,
        r2: Math.max(0, Math.min(1, r2)), // Limitar a [0, 1]
        rmse
    };
}
