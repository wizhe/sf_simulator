// main.js

const successRates = {
  0: 95,
  1: 90,
  2: 85,
  3: 85,
  4: 80,
  5: 75,
  6: 70,
  7: 65,
  8: 60,
  9: 55,
  10: 50,
  11: 45,
  12: 40,
  13: 35,
  14: 30,
  15: 30,
  16: 30,
  17: 15,
  18: 15,
  19: 15,
  20: 30,
  21: 15,
  22: 15,
  23: 10,
  24: 10,
  25: 10,
  26: 7,
  27: 5,
  28: 3,
  29: 1
}

const failRates = {
  0: 5,
  1: 10,
  2: 15,
  3: 15,
  4: 20,
  5: 25,
  6: 30,
  7: 35,
  8: 40,
  9: 45,
  10: 50,
  11: 55,
  12: 60,
  13: 65,
  14: 70,
  15: 67.9,
  16: 67.9,
  17: 78.2,
  18: 78.2,
  19: 76.5,
  20: 59.5,
  21: 72.25,
  22: 68,
  23: 72,
  24: 72,
  25: 72,
  26: 74.4,
  27: 76,
  28: 77.6,
  29: 79.2
}

const boomRates = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 0,
  15: 2.1,
  16: 2.1,
  17: 6.8,
  18: 6.8,
  19: 8.5,
  20: 10.5,
  21: 12.75,
  22: 17,
  23: 18,
  24: 18,
  25: 18,
  26: 18.6,
  27: 19,
  28: 19.4,
  29: 19.8
}

const boomResult =  {
  15: 12,
  16: 12,
  17: 12,
  18: 12,
  19: 12,
  20: 15,
  21: 17,
  22: 17,
  23: 19,
  24: 19,
  25: 19,
  26: 20,
  27: 20,
  28: 20,
  29: 20,
}

function shortenNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toString();
}

let costHistogramChart = null;
let boomHistogramChart = null;


function getPercentile(sortedArray, p) {
  const n = sortedArray.length;
  if (n === 0) return 0;
  const idx = Math.floor(p * (n - 1));
  return sortedArray[idx];
}

function makeHistogram(data, nBins = 30) {
  if (data.length === 0) {
    return { labels: [], counts: [] };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);

  if (min === max) {
    return {
      labels: [min.toLocaleString()],
      counts: [data.length],
    };
  }

  const binSize = (max - min) / nBins;
  const counts = new Array(nBins).fill(0);
  const labels = [];

  for (let i = 0; i < nBins; i++) {
    const start = min + i * binSize;
    const end = start + binSize;
    labels.push(`${shortenNumber(Math.round(start))}–${shortenNumber(Math.round(end))}`);
  }

  for (const value of data) {
    let idx = Math.floor((value - min) / binSize);
    if (idx === nBins) idx = nBins - 1;
    counts[idx]++;
  }

  return { labels, counts };
}

function makeDiscreteHistogram(data) {
  const freq = {};
  for (const v of data) {
    freq[v] = (freq[v] || 0) + 1;
  }
  const labels = Object.keys(freq).map(Number).sort((a, b) => a - b);
  const counts = labels.map(l => freq[l]);
  return { labels: labels.map(String), counts };
}




function buildCostTable(itemLevel, maxStar) {
  const costTable = new Array(maxStar + 1).fill(0);

  for (let star = 0; star < Math.min(10, maxStar + 1); star++) {
    const x = star + 1;
    costTable[star] = 100 * Math.round(10 + (itemLevel**3 * x)/2500);
  }

  const vals = {
    10: [11, 40000],
    11: [12, 22000],
    12: [13, 15000],
    13: [14, 11000],
    14: [15, 7500],
    15: [16, 20000],
    16: [17, 20000],
    17: [18, 15000],
    18: [19, 7000],
    19: [20, 4500],
    20: [21, 20000],
    21: [22, 12500],
    22: [23, 20000],
    23: [24, 20000],
    24: [25, 20000],
    25: [26, 20000],
    26: [27, 20000],
    27: [28, 20000],
    28: [29, 20000],
    29: [30, 20000],
  }

  for (const [starStr, [x,y]] of Object.entries(vals)) {
    const star = Number(starStr);
    if (star > maxStar) {
      continue;
    }
    costTable[star] = 100 * Math.round(10 + (itemLevel**3 * (x**2.7))/y);
  }

  return costTable;
}

function simulateSingleRun(target, start, starcatch, safeguard, event30Off, event30BoomReduction, costTable) {
  const success = successRates;
  const boomRate = boomRates;
  const boomRes = boomResult;

  let star = start;
  let runCost = 0;
  let boomCount = 0;

  const eventDiscountMultiplier = event30Off ? 0.7 : 1.0;
  const eventBoomMultiplier = event30BoomReduction ? 0.7 : 1.0;
  const starcatchMultiplier = starcatch ? 1.05 : 1.0;

  while (star < target) {
    let safeguardBoomMultiplier, safeguardCostMultiplier;
    if (safeguard && 15 <= star && star < 18) {
      safeguardBoomMultiplier = 0;
      safeguardCostMultiplier = 3.0;
    }
    else {
      safeguardBoomMultiplier = 1.0;
      safeguardCostMultiplier = 1.0;
    }

    const roll = Math.random() * 100;
    const suc = success[star] * starcatchMultiplier;
    const boom = boomRate[star] * eventBoomMultiplier * safeguardBoomMultiplier;
    const cost = costTable[star] * eventDiscountMultiplier * safeguardCostMultiplier;

    if (roll <= suc) {
      star++;
    }
    else if (star >= 15 && roll > suc && roll <= (suc+boom)) {
      star = boomRes[star];
      boomCount++;
    }
  
    runCost += cost;
  }
  return {runCost, boomCount};
}

function simulateManyRuns(nRuns, itemLevel, target, start, starcatch, safeguard, event30Off, event30BoomReduction) {
  const costTable = buildCostTable(itemLevel, target);
  const costs = [];
  const booms = [];

  for (let i = 0; i < nRuns; i++) {
    const { runCost, boomCount } = simulateSingleRun(target, start, starcatch, safeguard, event30Off, event30BoomReduction, costTable);
    costs.push(runCost);
    booms.push(boomCount);
  }

  costs.sort((a, b) => a - b);
  booms.sort((a, b) => a - b);

  const avgCost = costs.reduce((a, b) => a + b, 0) / nRuns;
  const medCost = costs[Math.floor(nRuns / 2)];
  const avgBooms = booms.reduce((a, b) => a + b, 0) / nRuns;
  const medBooms = booms[Math.floor(nRuns / 2)];

  return { avgCost, medCost, avgBooms, medBooms, costs, booms };
}

document.getElementById("simulate-button").addEventListener("click", () => {

  const itemLevel = parseInt(document.getElementById("item-level").value);
  const start = parseInt(document.getElementById("start").value);
  const target = parseInt(document.getElementById("target").value);
  const runs = parseInt(document.getElementById("runs").value);
  const starcatch = document.getElementById("starcatch").checked;
  const safeguard = document.getElementById("safeguard").checked;
  const event30Off = document.getElementById("event-30-off").checked;
  const event30BoomRed = document.getElementById("event-30-boom-red").checked;

  const results = simulateManyRuns(runs, itemLevel, target, start, starcatch, safeguard, event30Off, event30BoomRed);

  // Basic stats
  document.getElementById("avg-cost").textContent = `Average Cost: ${results.avgCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("median-cost").textContent = `Median Cost: ${results.medCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("avg-booms").textContent = `Average Booms: ${results.avgBooms.toFixed(2)}`;
  document.getElementById("median-booms").textContent = `Median Booms: ${results.medBooms}`;

  // Cost percentiles and range
  const sortedCosts = [...results.costs].sort((a, b) => a - b);

  const minCost = sortedCosts[0];
  const maxCost = sortedCosts[sortedCosts.length - 1];
  document.getElementById("cost-range").textContent = `Cost Range: ${minCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} - ${maxCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const p50 = getPercentile(sortedCosts, 0.5);
  const p75 = getPercentile(sortedCosts, 0.75);
  const p90 = getPercentile(sortedCosts, 0.9);
  const p95 = getPercentile(sortedCosts, 0.95);
  const p99 = getPercentile(sortedCosts, 0.99);

  document.getElementById("p50").textContent = `P50: ${p50.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("p75").textContent = `P75: ${p75.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("p90").textContent = `P90: ${p90.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("p95").textContent = `P95: ${p95.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("p99").textContent = `P99: ${p99.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  // Cost Histogram
  const { labels, counts } = makeHistogram(results.costs, 30);

  const ctx = document.getElementById("cost-histogram").getContext("2d");

  if (costHistogramChart) {
    costHistogramChart.data.labels = labels;
    costHistogramChart.data.datasets[0].data = counts;
    costHistogramChart.update();
  } else {
    costHistogramChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of runs in cost range',
          data: counts,
          backgroundColor: '#E5AF24',
          borderColor: '#C99718',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          x: {
            title: { display: true, text: 'Total cost per run' }
          },
          y: {
            title: { display: true, text: 'Runs' }
          }
        }
      }
    });
  }
  // Boom percentiles and range
  const sortedBooms = [...results.booms].sort((a, b) => a - b);

  const minBooms = sortedBooms[0];
  const maxBooms = sortedBooms[sortedBooms.length - 1];
  document.getElementById("boom-range").textContent = `Boom Range: ${minBooms} - ${maxBooms}`;

  const b50 = getPercentile(sortedBooms, 0.5);
  const b75 = getPercentile(sortedBooms, 0.75);
  const b90 = getPercentile(sortedBooms, 0.9);
  const b95 = getPercentile(sortedBooms, 0.95);
  const b99 = getPercentile(sortedBooms, 0.99);

  document.getElementById("boom-p50").textContent = `P50: ${b50}`;
  document.getElementById("boom-p75").textContent = `P75: ${b75}`;
  document.getElementById("boom-p90").textContent = `P90: ${b90}`;
  document.getElementById("boom-p95").textContent = `P95: ${b95}`;
  document.getElementById("boom-p99").textContent = `P99: ${b99}`;

  // Boom histogram
  const boomHist = makeDiscreteHistogram(results.booms);
  const boomCtx = document.getElementById("boom-histogram").getContext("2d");

  if (boomHistogramChart) {
    boomHistogramChart.data.labels = boomHist.labels;
    boomHistogramChart.data.datasets[0].data = boomHist.counts;
    boomHistogramChart.update();
  } else {
    boomHistogramChart = new Chart(boomCtx, {
      type: 'bar',
      data: {
        labels: boomHist.labels,
        datasets: [{
          label: 'Number of runs with this number of booms',
          data: boomHist.counts,
          backgroundColor: '#A63D40',
          borderColor: '#863234',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          x: {
            title: { display: true, text: 'Booms per run' }
          },
          y: {
            title: { display: true, text: 'Runs' }
          }
        }
      }
    });
  }

});
