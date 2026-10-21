/**
 * Chart Manager — Renders Expense Summary Charts by Category (FR-10)
 * Supports Pie/Doughnut Chart and Bar Chart via Chart.js
 */

const CHART_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b'  // Slate
];

let pieChartInstance = null;
let barChartInstance = null;

const ChartManager = {
  updateCharts(transactions) {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const categoryTotals = {};

    expenses.forEach((tx) => {
      const cat = tx.category || 'อื่น ๆ';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
    });

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    const hasData = labels.length > 0;
    const chartLabels = hasData ? labels : ['ยังไม่มีรายการรายจ่าย'];
    const chartData = hasData ? dataValues : [1];
    const chartBg = hasData
      ? chartLabels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
      : ['#cbd5e1'];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.25)';

    // 1. Pie / Doughnut Chart
    const pieCtx = document.getElementById('expensePieChart');
    if (pieCtx) {
      if (pieChartInstance) pieChartInstance.destroy();
      pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [
            {
              data: chartData,
              backgroundColor: chartBg,
              borderWidth: 2,
              borderColor: isDark ? '#1e293b' : '#ffffff'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: textColor,
                font: { family: "'Prompt', sans-serif", size: 12 },
                padding: 14
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (!hasData) return ' ฿0.00';
                  const val = ctx.parsed || 0;
                  const total = dataValues.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 2. Bar Chart
    const barCtx = document.getElementById('expenseBarChart');
    if (barCtx) {
      if (barChartInstance) barChartInstance.destroy();
      barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'ยอดรวมรายจ่าย (บาท)',
              data: hasData ? dataValues : [0],
              backgroundColor: chartBg,
              borderRadius: 8,
              maxBarThickness: 46
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: textColor, font: { family: "'Prompt', sans-serif" } },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: textColor,
                font: { family: "'Prompt', sans-serif" },
                callback: (v) => '฿' + Number(v).toLocaleString('th-TH')
              },
              grid: { color: gridColor }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ฿${Number(ctx.parsed.y).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
              }
            }
          }
        }
      });
    }
  }
};
