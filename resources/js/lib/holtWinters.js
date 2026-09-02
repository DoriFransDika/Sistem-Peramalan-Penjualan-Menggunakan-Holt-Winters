/**
 * Holt–Winters aditif musiman (periode musim = s bulan).
 * Minimal 20 titik; s = min(12, floor(n/2)) agar n ≥ 2s.
 */

export const MIN_SERIES_LENGTH = 20;

/** @param {number} n panjang deret */
export function seasonLengthForSeries(n) {
    if (n < MIN_SERIES_LENGTH) return null;
    return Math.min(12, Math.floor(n / 2));
}

function mean(arr) {
    const v = arr.filter((x) => x != null && !Number.isNaN(x));
    if (v.length === 0) return 0;
    return v.reduce((a, b) => a + b, 0) / v.length;
}

/**
 * @param {number[]} y - deret observasi
 * @param {number} s - panjang musim (12 untuk bulanan)
 * @param {number} alpha
 * @param {number} beta
 * @param {number} gamma
 * @param {number} h - horizon peramalan
 */
export function holtWintersAdditive(y, s, alpha, beta, gamma, h = 6) {
    const n = y.length;
    if (n < MIN_SERIES_LENGTH) {
        return {
            ok: false,
            reason: `Minimal ${MIN_SERIES_LENGTH} titik data untuk peramalan.`,
            fitted: [],
            forecast: [],
            level: [],
            trend: [],
            seasonal: [],
        };
    }
    if (n < s * 2 || s < 2) {
        return {
            ok: false,
            reason: 'Panjang musim tidak cocok dengan jumlah data.',
            fitted: [],
            forecast: [],
            level: [],
            trend: [],
            seasonal: [],
        };
    }

    const L = new Array(n).fill(0);
    const T = new Array(n).fill(0);
    const S = new Array(n + s + h + 1).fill(0);

    const avgFirst = mean(y.slice(0, s));
    const avgSecond = mean(y.slice(s, 2 * s));
    L[s - 1] = avgFirst;
    T[s - 1] = (avgSecond - avgFirst) / s;

    for (let i = 0; i < s; i += 1) {
        const col = [];
        for (let k = i; k < Math.min(n, 3 * s); k += s) {
            col.push(y[k]);
        }
        S[i] = y[i] - mean(col);
    }
    const adj = mean(S.slice(0, s));
    for (let i = 0; i < s; i += 1) {
        S[i] -= adj;
    }

    for (let t = s; t < n; t += 1) {
        const st = S[t - s];
        L[t] = alpha * (y[t] - st) + (1 - alpha) * (L[t - 1] + T[t - 1]);
        T[t] = beta * (L[t] - L[t - 1]) + (1 - beta) * T[t - 1];
        S[t] = gamma * (y[t] - L[t]) + (1 - gamma) * st;
    }

    const fitted = new Array(n).fill(null);
    for (let t = s; t < n; t += 1) {
        fitted[t] = L[t - 1] + T[t - 1] + S[t - s];
    }

    const forecast = [];
    const Ln = L[n - 1];
    const Tn = T[n - 1];
    for (let m = 1; m <= h; m += 1) {
        const seasIdx = n - s + ((m - 1) % s);
        const season = S[seasIdx] ?? 0;
        const yhat = Ln + m * Tn + season;
        forecast.push({ step: m, value: Math.max(0, yhat) });
    }

    return {
        ok: true,
        fitted,
        forecast,
        level: L,
        trend: T,
        seasonal: S.slice(0, n + h),
    };
}

export function mapePct(actual, predicted) {
    let sum = 0;
    let c = 0;
    for (let i = 0; i < actual.length; i += 1) {
        const a = actual[i];
        const p = predicted[i];
        if (a == null || p == null || Number.isNaN(a) || Number.isNaN(p)) continue;
        const denom = Math.abs(a) < 1e-9 ? 1e-9 : Math.abs(a);
        sum += Math.abs((a - p) / denom);
        c += 1;
    }
    if (c === 0) return Infinity;
    return (sum / c) * 100;
}

/**
 * Grid kecil untuk rekomendasi (α,β,γ) berdasarkan MAPE in-sample setelah musim pertama.
 */
export function recommendHoltWintersParams(y, s) {
    const n = y.length;
    if (n < MIN_SERIES_LENGTH || s == null || n < s * 2) {
        return { alpha: 0.3, beta: 0.1, gamma: 0.3, mape: null, note: 'Data terlalu pendek' };
    }

    const grid = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    let best = { alpha: 0.3, beta: 0.1, gamma: 0.3, mape: Infinity };

    for (const alpha of grid) {
        for (const beta of grid) {
            for (const gamma of grid) {
                const res = holtWintersAdditive(y, s, alpha, beta, gamma, 1);
                if (!res.ok) continue;
                const mape = mapePct(y, res.fitted);
                if (mape < best.mape) {
                    best = { alpha, beta, gamma, mape };
                }
            }
        }
    }

    return { ...best, note: 'Grid 0.1–0.9, meminimalkan MAPE in-sample (setelah inisialisasi musim).' };
}
