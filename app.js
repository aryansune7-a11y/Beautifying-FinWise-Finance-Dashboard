// Default state for fallback initialization
const defaultState = {
  profile: { name: 'Friend', income: 60000, savings: 12000, style: '50-30-20' },
  expenses: [
    { id: 1, name: 'Grocery shopping', amount: 3200, cat: 'food', date: '2026-05-20' },
    { id: 2, name: 'Auto rickshaw', amount: 450, cat: 'transport', date: '2026-05-19' },
    { id: 3, name: 'Electricity bill', amount: 1800, cat: 'bills', date: '2026-05-18' },
    { id: 4, name: 'Netflix subscription', amount: 649, cat: 'entertainment', date: '2026-05-17' },
    { id: 5, name: 'Pharmacy medicines', amount: 720, cat: 'health', date: '2026-05-16' },
    { id: 6, name: 'Restaurant gourmet dinner', amount: 1400, cat: 'food', date: '2026-05-15' },
    { id: 7, name: 'Mobile phone recharge', amount: 599, cat: 'bills', date: '2026-05-14' },
    { id: 8, name: 'Petrol refill', amount: 1100, cat: 'transport', date: '2026-05-13' }
  ],
  goals: [
    { id: 1, name: 'Emergency fund', target: 100000, saved: 35000, date: '2026-12-31' },
    { id: 2, name: 'New professional laptop', target: 80000, saved: 20000, date: '2026-09-30' },
    { id: 3, name: 'Goa summer trip', target: 25000, saved: 18000, date: '2026-08-15' }
  ],
  nextId: 9,
  currentFilterCat: 'all'
};

// Initialize active state
let state = { ...defaultState };

// Load user data from local storage on startup
function loadStateFromLocalStorage() {
  const savedState = localStorage.getItem('finwise-state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      // Ensure filter resets on refresh for cleaner startup
      state.currentFilterCat = 'all';
    } catch (e) {
      console.error('Failed to parse saved state, utilizing default metrics.', e);
    }
  }
}

// Save user data to browser local storage
function saveStateToLocalStorage() {
  localStorage.setItem('finwise-state', JSON.stringify(state));
}

// Initial state load
loadStateFromLocalStorage();

let spendChartInst, savingsChartInst, goalChartInst, budgetChartInst;

// Helper functions
function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function totalExpenses() {
  return state.expenses.reduce((s, e) => s + e.amount, 0);
}

// Modern styled toast alerts
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  
  toastMsg.textContent = message;
  
  // Update icons based on feedback categories
  if (type === 'success') {
    toast.style.borderLeftColor = 'var(--accent-success)';
    toastIcon.className = 'ti ti-circle-check toast-icon';
    toastIcon.style.color = 'var(--accent-success)';
  } else if (type === 'warning') {
    toast.style.borderLeftColor = 'var(--accent-warning)';
    toastIcon.className = 'ti ti-alert-triangle toast-icon';
    toastIcon.style.color = 'var(--accent-warning)';
  } else {
    toast.style.borderLeftColor = 'var(--accent-danger)';
    toastIcon.className = 'ti ti-alert-circle toast-icon';
    toastIcon.style.color = 'var(--accent-danger)';
  }
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Toggle stylesheet visual modes
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const mobileThemeToggleIcon = document.querySelector('#mobile-theme-toggle i');
  
  if (body.classList.contains('dark-theme')) {
    body.classList.remove('dark-theme');
    themeIcon.className = 'ti ti-moon';
    if (mobileThemeToggleIcon) mobileThemeToggleIcon.className = 'ti ti-moon';
    localStorage.setItem('finwise-theme', 'light');
  } else {
    body.classList.add('dark-theme');
    themeIcon.className = 'ti ti-sun';
    if (mobileThemeToggleIcon) mobileThemeToggleIcon.className = 'ti ti-sun';
    localStorage.setItem('finwise-theme', 'dark');
  }
  
  // Re-trigger visual graphics loads to match correct text values and grid line colors
  if (document.getElementById('section-dashboard').classList.contains('active')) {
    renderDashboard();
  } else if (document.getElementById('section-goals').classList.contains('active')) {
    renderGoals();
  } else if (document.getElementById('section-settings').classList.contains('active')) {
    renderSettings();
  }
}

// Load visual theme configurations from storage on startup
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('finwise-theme');
  const themeIcon = document.getElementById('theme-icon');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    themeIcon.className = 'ti ti-moon';
  }
  
  // Default input dates to today
  const today = new Date().toISOString().split('T')[0];
  const expDateEl = document.getElementById('exp-date');
  if(expDateEl) expDateEl.value = today;
  
  const goalDateEl = document.getElementById('goal-date');
  if(goalDateEl) {
    // Set standard goal target to 3 months out by default
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    goalDateEl.value = futureDate.toISOString().split('T')[0];
  }

  // Sync settings fields
  document.getElementById('set-name').value = state.profile.name;
  document.getElementById('set-income').value = state.profile.income;
  document.getElementById('set-savings').value = state.profile.savings;
  document.getElementById('set-style').value = state.profile.style;

  // Primary startup operations
  updateStateSyncs();
  renderDashboard();
});

// Sync elements across panels
function updateStateSyncs() {
  // Update sidebar username display
  document.getElementById('profile-greet-name').textContent = state.profile.name;
  document.getElementById('avatar-letter').textContent = state.profile.name.charAt(0).toUpperCase();
  
  // Sync names in AI Chat welcome block
  const userWelcName = document.querySelector('.ai-bot-user-name');
  if (userWelcName) userWelcName.textContent = state.profile.name;
}

// Sidebar & Screen Section Router
function showSection(sectionId) {
  // Deactivate all panels
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  
  // Activate target panel
  const targetSec = document.getElementById('section-' + sectionId);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  // Update active nav button (Desktop Sidebar)
  document.querySelectorAll('.sidebar .nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const actDkBtn = document.getElementById('nav-btn-' + sectionId);
  if (actDkBtn) actDkBtn.classList.add('active');

  // Update active nav button (Mobile Bottom nav)
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const actMbBtn = document.getElementById('mobile-btn-' + sectionId);
  if (actMbBtn) actMbBtn.classList.add('active');

  // Adjust dynamic headers text values
  const headTitle = document.getElementById('page-display-title');
  const headDesc = document.getElementById('page-display-desc');
  
  if (sectionId === 'dashboard') {
    headTitle.textContent = 'Dashboard';
    headDesc.textContent = 'High-level real-time personal finance visual indicators.';
    renderDashboard();
  } else if (sectionId === 'expenses') {
    headTitle.textContent = 'Transaction Ledger';
    headDesc.textContent = 'Track, search, filter, and record daily transactions.';
    renderExpenses();
  } else if (sectionId === 'goals') {
    headTitle.textContent = 'Wealth Goals';
    headDesc.textContent = 'Plan direct milestones, emergency safety buffers and check forecasts.';
    renderGoals();
  } else if (sectionId === 'ai') {
    headTitle.textContent = 'AI Wealth Advisor';
    headDesc.textContent = 'Query live budget intelligence patterns via chat.';
    renderAI();
  } else if (sectionId === 'settings') {
    headTitle.textContent = 'Settings & Profile';
    headDesc.textContent = 'Manage allocation methodologies and income thresholds.';
    renderSettings();
  }
}

// Chart customization variables to query color systems
function getThemeColors() {
  const isDark = document.body.classList.contains('dark-theme');
  return {
    text: isDark ? '#cbd5e1' : '#475569',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? '#0f1524' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  };
}

// DASHBOARD RENDERING ROUTINE
function renderDashboard() {
  const total = totalExpenses();
  const income = state.profile.income;
  const remaining = income - total;
  const spentPct = Math.round((total / income) * 100);
  const saveTarget = state.profile.savings;
  const actualSavingsPct = Math.round((Math.max(0, remaining) / income) * 100);

  // Dynamic Stats Grid Injection
  const grid = document.getElementById('metric-grid');
  grid.innerHTML = `
    <div class="metric-card accent-indigo">
      <div class="metric-header">
        <span class="metric-label">Monthly Income</span>
        <div class="metric-icon-wrap indigo"><i class="ti ti-wallet"></i></div>
      </div>
      <div class="metric-value">${fmt(income)}</div>
      <div class="metric-sub">
        <span class="badge-date" style="font-size:10px; background:rgba(99, 102, 241, 0.1); color:var(--accent-secondary); border-color:transparent;">
          Limit Base
        </span>
      </div>
    </div>

    <div class="metric-card ${spentPct > 85 ? 'accent-danger' : spentPct > 70 ? 'accent-warning' : 'accent-emerald'}">
      <div class="metric-header">
        <span class="metric-label">Total Outflow</span>
        <div class="metric-icon-wrap ${spentPct > 85 ? 'rose' : spentPct > 70 ? 'amber' : 'emerald'}"><i class="ti ti-cash-register"></i></div>
      </div>
      <div class="metric-value">${fmt(total)}</div>
      <div class="metric-sub">
        <span class="${spentPct > 85 ? 'cat-badge-entertainment' : spentPct > 70 ? 'cat-badge-bills' : 'cat-badge-food'}" style="font-size:11px; padding: 2px 8px; border-radius: 12px; font-weight:600;">
          ${spentPct}% of income
        </span>
      </div>
    </div>

    <div class="metric-card ${remaining < 0 ? 'accent-danger' : 'accent-emerald'}">
      <div class="metric-header">
        <span class="metric-label">Net Surplus</span>
        <div class="metric-icon-wrap ${remaining < 0 ? 'rose' : 'emerald'}"><i class="ti ti-coin"></i></div>
      </div>
      <div class="metric-value" style="color: ${remaining < 0 ? 'var(--accent-danger)' : 'var(--text-primary)'}">${fmt(Math.abs(remaining))}</div>
      <div class="metric-sub">
        <span style="font-size:11.5px; font-weight:500; color: ${remaining < 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)'}">
          ${remaining < 0 ? 'Over budget surplus deficit' : 'Available for invest'}
        </span>
      </div>
    </div>

    <div class="metric-card accent-warning">
      <div class="metric-header">
        <span class="metric-label">Savings Target</span>
        <div class="metric-icon-wrap amber"><i class="ti ti-pig"></i></div>
      </div>
      <div class="metric-value">${fmt(saveTarget)}</div>
      <div class="metric-sub">
        <span class="cat-badge-bills" style="font-size:11px; padding: 2px 8px; border-radius: 12px; font-weight:600;">
          Active Target (${Math.round((saveTarget/income)*100)}%)
        </span>
      </div>
    </div>
  `;

  // Chart.js Category Bar Chart Engine
  const colors = getThemeColors();
  const cats = ['food', 'transport', 'bills', 'entertainment', 'health', 'other'];
  const catLabels = ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Other'];
  const catColors = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9', '#64748b'];
  const catTotals = cats.map(c => state.expenses.filter(e => e.cat === c).reduce((s, e) => s + e.amount, 0));

  if (spendChartInst) spendChartInst.destroy();
  const spendCtx = document.getElementById('spendChart').getContext('2d');
  spendChartInst = new Chart(spendCtx, {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [{
        data: catTotals,
        backgroundColor: catColors.map(c => c + 'cc'),
        borderColor: catColors,
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: catColors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: { label: c => ` Spent: ₹${c.raw.toLocaleString('en-IN')}` }
        }
      },
      scales: {
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            font: { family: 'Plus Jakarta Sans', size: 10 },
            callback: v => '₹' + Math.round(v/1000) + 'k'
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: colors.text, font: { family: 'Plus Jakarta Sans', size: 10 } }
        }
      }
    }
  });

  // Gradient Line Chart Savings Projections
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const historicalSavings = [8200, 9500, 7800, 11000, 10200, Math.max(0, remaining)];
  
  if (savingsChartInst) savingsChartInst.destroy();
  const savingsCtx = document.getElementById('savingsChart').getContext('2d');
  
  const gradFill = savingsCtx.createLinearGradient(0, 0, 0, 200);
  gradFill.addColorStop(0, 'rgba(52, 211, 153, 0.2)');
  gradFill.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

  savingsChartInst = new Chart(savingsCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Savings Outflow',
        data: historicalSavings,
        borderColor: '#34d399',
        backgroundColor: gradFill,
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: { label: c => ` Saved: ₹${c.raw.toLocaleString('en-IN')}` }
        }
      },
      scales: {
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            font: { family: 'Plus Jakarta Sans', size: 10 },
            callback: v => '₹' + Math.round(v/1000) + 'k'
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: colors.text, font: { family: 'Plus Jakarta Sans', size: 10 } }
        }
      }
    }
  });

  // Goal Doughnut mini chart on Dashboard Sidebar
  const gLabels = state.goals.map(g => g.name);
  const gTargets = state.goals.map(g => g.target);
  const gFills = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9'];

  if (goalChartInst) goalChartInst.destroy();
  goalChartInst = new Chart(document.getElementById('goalChart'), {
    type: 'doughnut',
    data: {
      labels: gLabels,
      datasets: [{
        data: gTargets,
        backgroundColor: gFills.slice(0, state.goals.length),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 10
        }
      },
      cutout: '72%'
    }
  });

  // Dynamically build smart alerts in alerts deck
  const alertDeck = document.getElementById('alerts-list');
  const smartAlerts = [];

  if (total > income * 0.8) {
    smartAlerts.push({
      type: 'danger',
      icon: 'ti-alert-octagon',
      msg: `Heavy Spending: You spent ${spentPct}% of monthly income. It is highly advised to pause discretionary transactions to preserve cash.`,
      time: 'Just now'
    });
  }

  const foodSp = state.expenses.filter(e => e.cat === 'food').reduce((s, e) => s + e.amount, 0);
  if (foodSp > income * 0.2) {
    smartAlerts.push({
      type: 'warn',
      icon: 'ti-chef-hat',
      msg: `Food & Dining Outflow is at ${fmt(foodSp)} — exceeding standard recommended limit of 20%. Try meal prepping to save.`,
      time: '2 hours ago'
    });
  }

  if (remaining >= saveTarget) {
    smartAlerts.push({
      type: 'success',
      icon: 'ti-circle-dashed-check',
      msg: `Outstanding job! Your active surplus of ${fmt(remaining)} successfully exceeds your target budget target of ${fmt(saveTarget)}.`,
      time: 'Updated today'
    });
  } else {
    smartAlerts.push({
      type: 'warn',
      icon: 'ti-trending-down-3',
      msg: `Surplus Deficit: Current available cash (${fmt(remaining)}) is lower than your target savings target (${fmt(saveTarget)}). Try trimming utilities or streaming.`,
      time: 'Updated today'
    });
  }

  alertDeck.innerHTML = smartAlerts.map(a => `
    <div class="alert-card ${a.type}">
      <div class="alert-icon-container"><i class="ti ${a.icon}"></i></div>
      <div class="alert-body">
        <div class="alert-message">${a.msg}</div>
        <div class="alert-meta">${a.time}</div>
      </div>
    </div>
  `).join('');

  // Build mini-goals list inside dashboard sidebar
  const dashMiniGoals = document.getElementById('dashboard-goals-mini');
  dashMiniGoals.innerHTML = state.goals.slice(0, 3).map((g, i) => {
    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
    const color = gFills[i % gFills.length];
    return `
      <div style="margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:600; margin-bottom:4px;">
          <span style="color:var(--text-secondary);">${g.name}</span>
          <span style="color:${color};">${pct}%</span>
        </div>
        <div class="progress-bar-fancy" style="height:5px;">
          <div class="progress-bar-fancy-fill" style="width:${pct}%; background:${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// EXPENSES MANAGEMENT ENGINE
function renderExpenses() {
  // Re-trigger dynamic category filter badges
  const pillsContainer = document.getElementById('filter-pills-list');
  const cats = ['all', 'food', 'transport', 'bills', 'entertainment', 'health', 'other'];
  pillsContainer.innerHTML = cats.map(c => `
    <button class="filter-pill ${state.currentFilterCat === c ? 'active' : ''}" onclick="setExpenseFilter('${c}')">
      ${c.toUpperCase()}
    </button>
  `).join('');

  filterExpenses();
}

function setExpenseFilter(cat) {
  state.currentFilterCat = cat;
  renderExpenses();
}

function filterExpenses() {
  const searchVal = document.getElementById('expense-search').value.toLowerCase();
  const listEl = document.getElementById('expense-list');
  
  const filtered = state.expenses.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchVal);
    const matchesCat = state.currentFilterCat === 'all' || e.cat === state.currentFilterCat;
    return matchesSearch && matchesCat;
  });

  if (!filtered.length) {
    listEl.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 2.5rem; text-align:center;">
        <i class="ti ti-ghost" style="font-size:36px; color:var(--text-tertiary); margin-bottom:10px;"></i>
        <div style="font-size:13px; color:var(--text-tertiary); font-weight:500;">No matching ledger logs found.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = [...filtered].reverse().map(e => `
    <div class="expense-item">
      <div class="expense-meta-info">
        <span class="expense-cat-badge cat-badge-${e.cat}">
          <i class="ti ${getCategoryIcon(e.cat)}"></i>
          ${e.cat}
        </span>
        <div>
          <div class="expense-title">${e.name}</div>
          <div class="expense-details-sub">${e.date}</div>
        </div>
      </div>
      
      <div class="expense-right-panel">
        <span class="expense-amount-label">${fmt(e.amount)}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})" aria-label="Delete transactions">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function getCategoryIcon(cat) {
  switch(cat) {
    case 'food': return 'ti-meat';
    case 'transport': return 'ti-bus-stop';
    case 'bills': return 'ti-file-invoice';
    case 'entertainment': return 'ti-device-gamepad-2';
    case 'health': return 'ti-pill';
    default: return 'ti-dots-circle-horizontal';
  }
}

function addExpense() {
  const name = document.getElementById('exp-name').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const cat = document.getElementById('exp-cat').value;
  const date = document.getElementById('exp-date').value;

  if (!name || isNaN(amount) || amount <= 0) {
    showToast('Please type a valid description and positive financial amount!', 'error');
    return;
  }
  if (!date) {
    showToast('Please assign a correct date to the ledger item!', 'error');
    return;
  }

  state.expenses.push({ id: state.nextId++, name, amount, cat, date });
  document.getElementById('exp-name').value = '';
  document.getElementById('exp-amount').value = '';
  
  showToast(`Logged ₹${amount.toLocaleString('en-IN')} under ${cat.toUpperCase()} category!`);
  
  saveStateToLocalStorage();
  renderExpenses();
  updateStateSyncs();
}

function deleteExpense(id) {
  const target = state.expenses.find(e => e.id === id);
  state.expenses = state.expenses.filter(e => e.id !== id);
  
  if (target) {
    showToast(`Removed transaction "${target.name}" from history ledger!`, 'warning');
  }
  
  saveStateToLocalStorage();
  renderExpenses();
  updateStateSyncs();
}

// WEALTH GOALS ENGINE
function renderGoals() {
  const el = document.getElementById('goals-list');
  const gFills = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9'];
  
  if (!state.goals.length) {
    el.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; text-align:center;">
        <i class="ti ti-target-off" style="font-size:32px; color:var(--text-tertiary); margin-bottom:8px;"></i>
        <div style="font-size:13px; color:var(--text-tertiary);">No assets goals listed. Initialize your first one!</div>
      </div>
    `;
    return;
  }

  el.innerHTML = state.goals.map((g, i) => {
    const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
    // Calculate dynamic timelines
    const daysRem = Math.max(1, Math.round((new Date(g.date) - new Date()) / (1000*60*60*24)));
    const monthsRem = Math.max(1, Math.round(daysRem / 30));
    const needed = Math.max(0, g.target - g.saved);
    const monthlyInstallment = Math.round(needed / monthsRem);
    const color = gFills[i % gFills.length];

    return `
      <div class="goal-card-fancy">
        <div class="goal-card-header">
          <span class="goal-card-title">${g.name}</span>
          <span class="goal-card-percent" style="color:${color};">${pct}%</span>
        </div>
        
        <div class="progress-bar-fancy">
          <div class="progress-bar-fancy-fill" style="width:${pct}%; background:${color};"></div>
        </div>
        
        <div class="goal-card-footer">
          <span>${fmt(g.saved)} saved of ${fmt(g.target)}</span>
          <span><strong>${fmt(monthlyInstallment)}/mo</strong> needed (${monthsRem} mo left)</span>
        </div>
      </div>
    `;
  }).join('');
}

function addGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
  const date = document.getElementById('goal-date').value;

  if (!name || isNaN(target) || target <= 0) {
    showToast('Please type a descriptive name and accurate target goals budget!', 'error');
    return;
  }
  if (!date) {
    showToast('Please allocate a valid timeline targets completion date!', 'error');
    return;
  }

  state.goals.push({ id: state.nextId++, name, target, saved, date });
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-saved').value = '';

  showToast(`Initiated active tracking for Wealth Goal: "${name}"!`);
  
  saveStateToLocalStorage();
  renderGoals();
  updateStateSyncs();
}

// AI ADVISOR CHAT ENGINE (Premium Simulated Chat Room)
function renderAI() {
  // Calculate dynamic health score
  const total = totalExpenses();
  const income = state.profile.income;
  const saveTarget = state.profile.savings;
  const remaining = income - total;
  
  // Formulas evaluating budget variables
  const saveCapacityPct = Math.round((Math.max(0, remaining) / income) * 100);
  const targetDelta = saveCapacityPct - Math.round((saveTarget / income) * 100);
  
  let score = 50; // default base line score
  score += Math.round(saveCapacityPct * 0.5); // savings capacity rewards
  score += targetDelta > 0 ? 15 : targetDelta < -5 ? -15 : 0; // target variance rewards/deductions
  score -= (total > income) ? 25 : 0; // deficit penalty
  
  const healthScore = Math.max(10, Math.min(100, score));
  
  let lbl = 'Needs Attention';
  let strokeColor = 'var(--accent-danger)';
  let statusText = 'Critical Shortfall';
  
  if (healthScore >= 80) {
    lbl = 'Excellent';
    strokeColor = 'var(--accent-success)';
    statusText = 'Superb surplus levels!';
  } else if (healthScore >= 60) {
    lbl = 'Healthy';
    strokeColor = 'var(--accent-warning)';
    statusText = 'On track, minor excess.';
  } else if (healthScore >= 45) {
    lbl = 'Moderate';
    strokeColor = 'var(--accent-warning)';
    statusText = 'Stretched cash buffers.';
  }

  // Sync SVG elements
  document.getElementById('health-score-val').textContent = healthScore;
  document.getElementById('health-score-lbl').textContent = lbl;
  document.getElementById('health-meter-status-txt').textContent = statusText;
  document.getElementById('health-meter-status-txt').style.color = strokeColor;
  
  const fillBarMini = document.getElementById('health-meter-mini-progress');
  fillBarMini.style.width = healthScore + '%';
  fillBarMini.style.background = strokeColor;

  // Animate circular dashboard meter
  const svgFill = document.getElementById('health-circle-svg-fill');
  svgFill.style.stroke = strokeColor;
  // Formula mapping score value to stroke circle dash offset metrics
  const dashOffset = 440 - (440 * healthScore) / 100;
  svgFill.style.strokeDashoffset = dashOffset;
}

function clearChat() {
  const chatBody = document.getElementById('ai-chat-body');
  chatBody.innerHTML = `
    <div class="chat-bubble bot">
      Chat cleared. I've wiped active queries memory logs. 
      What finance projections can I execute next for you, <strong>${state.profile.name}</strong>?
    </div>
  `;
  showToast('Advisor chat history reset!', 'warning');
}

function submitChatPrompt(prompt) {
  // Append user bubble to view
  appendChatBubble(prompt, 'user');
  
  // Inject AI loading typing pulse state
  const chatBody = document.getElementById('ai-chat-body');
  const loadId = 'bot-load-' + Date.now();
  
  const loadBubble = document.createElement('div');
  loadBubble.className = 'chat-bubble bot';
  loadBubble.id = loadId;
  loadBubble.innerHTML = `
    <div class="loading-dots">
      Analyzing metrics <span></span><span></span><span></span>
    </div>
  `;
  chatBody.appendChild(loadBubble);
  chatBody.scrollTop = chatBody.scrollHeight;

  // Trigger simulated delay to act like genuine AI intelligence
  setTimeout(() => {
    const loadedEl = document.getElementById(loadId);
    if (loadedEl) loadedEl.remove();
    
    const response = generateAIIntelligenceResponse(prompt);
    appendChatBubble(response, 'bot');
  }, 1500);
}

function sendChatFromInput() {
  const input = document.getElementById('ai-user-input');
  const val = input.value.trim();
  if (!val) return;
  
  input.value = '';
  submitChatPrompt(val);
}

function appendChatBubble(text, sender) {
  const chatBody = document.getElementById('ai-chat-body');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerHTML = text;
  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Dynamic AI Prompt Processing Engine
function generateAIIntelligenceResponse(prompt) {
  const q = prompt.toLowerCase();
  const income = state.profile.income;
  const total = totalExpenses();
  const surplus = income - total;
  
  // Category calculations
  const foodSp = state.expenses.filter(e => e.cat === 'food').reduce((s, e) => s + e.amount, 0);
  const transportSp = state.expenses.filter(e => e.cat === 'transport').reduce((s, e) => s + e.amount, 0);
  const billsSp = state.expenses.filter(e => e.cat === 'bills').reduce((s, e) => s + e.amount, 0);
  const entSp = state.expenses.filter(e => e.cat === 'entertainment').reduce((s, e) => s + e.amount, 0);

  // AI Advisor Response 1: Spending habits and budget analysis
  if (q.includes('spending') || q.includes('habit') || q.includes('budget') || q.includes('analyze')) {
    const foodPct = Math.round((foodSp / income) * 100);
    const entPct = Math.round((entSp / income) * 100);
    const surplusState = surplus < 0 
      ? `<span style="color:var(--accent-danger); font-weight:700;">deficit of ${fmt(Math.abs(surplus))}</span> (Over budget!)` 
      : `<span style="color:var(--accent-success); font-weight:700;">surplus of ${fmt(surplus)}</span>`;

    return `
      <h3>📊 Real-Time Financial Health & Budget Audit</h3>
      Based on your recorded ledger entries and configured monthly income limit of <strong>${fmt(income)}</strong>, here is my detailed evaluation:
      <br><br>
      * <strong>Current Monthly Outflow:</strong> ${fmt(total)} (${Math.round((total/income)*100)}% of income).
      * <strong>Active Cash Surplus:</strong> ${surplusState}.
      
      <h4>⚠️ Category Allocation Outlier Flags:</h4>
      <ul>
        <li><strong>Food & Dining:</strong> You spent <strong>${fmt(foodSp)}</strong> (${foodPct}% of budget). Recommended limit is 15-20%. ${foodPct > 20 ? '🚨 Over limit!' : '✓ Within healthy levels.'}</li>
        <li><strong>Entertainment & Leisures:</strong> You spent <strong>${fmt(entSp)}</strong> (${entPct}% of budget). Recommended limit is 5-10%. ${entPct > 10 ? '🚨 Over limit!' : '✓ Within healthy levels.'}</li>
      </ul>

      <h4>💡 Strategic Advisor Optimization Action:</h4>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Current</th>
            <th>Target Threshold</th>
            <th>Estimated Monthly Saving</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Food Outlets</td>
            <td>${fmt(foodSp)}</td>
            <td>${fmt(income * 0.15)}</td>
            <td>${fmt(Math.max(0, foodSp - income * 0.15))}</td>
          </tr>
          <tr>
            <td>Leisures</td>
            <td>${fmt(entSp)}</td>
            <td>${fmt(income * 0.08)}</td>
            <td>${fmt(Math.max(0, entSp - income * 0.08))}</td>
          </tr>
        </tbody>
      </table>
      <br>
      We advise moving <strong>${fmt(Math.max(2000, surplus * 0.5))}</strong> immediately into an index fund direct SIP to automate growth.
    `;
  }

  // AI Advisor Response 2: Investment options tailored to India
  if (q.includes('investment') || q.includes('invest') || q.includes('save ₹10,000') || q.includes('stock')) {
    const savingsTarget = state.profile.savings;
    const indexFundSIP = Math.round(savingsTarget * 0.5);
    const debtSIP = Math.round(savingsTarget * 0.3);
    const goldSIP = Math.round(savingsTarget * 0.2);

    return `
      <h3>💼 Tailored Wealth Accumulation & SIP Plan (India)</h3>
      Based on your settings, you are targeting a savings rate of <strong>${fmt(savingsTarget)}/month</strong>. 
      Here is a high-yield diversified portfolio plan constructed to optimize long-term inflation-adjusted growth:
      <br><br>
      
      <h4>🎯 Strategic Asset Allocation Framework:</h4>
      <table>
        <thead>
          <tr>
            <th>Asset Class</th>
            <th>Allocation %</th>
            <th>Recommended Monthly Amount</th>
            <th>Recommended Direct Mutual Funds / Route</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Large & Midcap Equity Mutual Funds</strong></td>
            <td>50%</td>
            <td>${fmt(indexFundSIP)}</td>
            <td>Direct Nifty 50 Index Mutual Fund (e.g. UTI or HDFC Nifty 50 Direct Plan)</td>
          </tr>
          <tr>
            <td><strong>Conservative Debt / Arbitrage Funds</strong></td>
            <td>30%</td>
            <td>${fmt(debtSIP)}</td>
            <td>Liquid Funds or Arbitrage Mutual Funds (ideal for short-term targets under 3 years)</td>
          </tr>
          <tr>
            <td><strong>Sovereign Gold Bonds (SGB) / Gold ETFs</strong></td>
            <td>20%</td>
            <td>${fmt(goldSIP)}</td>
            <td>Gold BeES ETF or SGB issues on stock broker platforms for tax-free maturity gains</td>
          </tr>
        </tbody>
      </table>

      <h4>🚀 Immediate Execution Steps:</h4>
      1. <strong>Automate Direct SIPs:</strong> Access platforms like Coin (Zerodha), Groww, or Kuvera to establish automated monthly SIP mandates.
      2. <strong>Avoid Regular Plans:</strong> Ensure you select "Direct" schemes over "Regular" schemes to bypass intermediary commission cuts and save up to 1% annually!
      3. <strong>Rebalance Annually:</strong> Shift dividends or surpluses once a year to maintain your 50/30/20 equity-to-debt split.
    `;
  }

  // AI Advisor Response 3: 6-Month Emergency fund plan
  if (q.includes('emergency') || q.includes('lakh') || q.includes('fund') || q.includes('6-month')) {
    const months = 6;
    const targetAmount = 100000;
    const monthlyInstallment = Math.round(targetAmount / months);
    
    // Check if user has emergency goal in state
    const eGoal = state.goals.find(g => g.name.toLowerCase().includes('emergency'));
    const alreadySaved = eGoal ? eGoal.saved : 35000;
    const needed = targetAmount - alreadySaved;
    const adjustedMonthly = Math.round(needed / months);

    return `
      <h3>🛡️ Bulletproof 6-Month Emergency Reserve Plan</h3>
      An emergency reserve ensures you never have to liquidate equity assets at a loss during job transition gaps or medical events.
      <br><br>
      
      <h4>📊 Safety Metrics Breakdown:</h4>
      <ul>
        <li><strong>Target Emergency Fund Size:</strong> ${fmt(targetAmount)}</li>
        <li><strong>Currently Accumulated:</strong> ${fmt(alreadySaved)}</li>
        <li><strong>Surplus Target Balance Needed:</strong> ${fmt(needed)}</li>
        <li><strong>Paced 6-Month Contribution Target:</strong> <strong>${fmt(adjustedMonthly)} per month</strong></li>
      </ul>

      <h4>📈 Strategic Phase Progression:</h4>
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Target Balance</th>
            <th>Timeframe</th>
            <th>Storage Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Phase 1: Basic Buffer</strong></td>
            <td>₹25,000</td>
            <td>Month 1-2</td>
            <td>Standard Savings Account / Hard Cash</td>
          </tr>
          <tr>
            <td><strong>Phase 2: Intermediate Core</strong></td>
            <td>₹60,000</td>
            <td>Month 3-4</td>
            <td>High-Yield Sweep-in FD (Liquid instant withdrawal)</td>
          </tr>
          <tr>
            <td><strong>Phase 3: Final Shield</strong></td>
            <td>₹1,00,000</td>
            <td>Month 5-6</td>
            <td>Liquid Mutual Funds (Earns 6.5%+ interest with T+1 redemption)</td>
          </tr>
        </tbody>
      </table>

      <h4>⚡ Tips to Speed Up Phase Completion:</h4>
      * Move variable annual payouts, bonuses, or side-hustle freelancing checks directly to this fund.
      * Set up an automated standing bank order to execute on the 5th day of every month (right after pay-day) to prevent impulse spending of the emergency cash block.
    `;
  }

  // AI Advisor Response 4: Custom contextual prompt response
  return `
    <h3>🧠 FinWise AI Contextual Inquiry Response</h3>
    Hello <strong>${state.profile.name}</strong>, I've parsed your custom question and evaluated your live metrics profile:
    <br><br>
    * Your monthly liquid income is <strong>${fmt(income)}</strong>, and you have recorded <strong>${state.expenses.length} active transactions</strong> in your ledger.
    * Outflow stands at <strong>${fmt(total)}</strong>, yielding an active investible surplus of <strong>${fmt(surplus)}</strong>.
    
    <h4>🧐 Strategic Feedback:</h4>
    To optimize your request, we advise keeping a close eye on discretionary bills. If you want a deep dive into specific topics, try asking me about <strong>spending habits audits</strong>, <strong>Indian investment mutual funds SIP layouts</strong>, or <strong>6-month emergency reserve pacing lists</strong>!
  `;
}

// SETTINGS SETUP CONFIGURATION ENGINE
function renderSettings() {
  document.getElementById('set-income').value = state.profile.income;
  document.getElementById('set-savings').value = state.profile.savings;
  document.getElementById('set-name').value = state.profile.name;
  document.getElementById('set-style').value = state.profile.style;

  updateAllocationPie();
}

function updateAllocationPie() {
  const inc = parseFloat(document.getElementById('set-income').value) || 60000;
  const style = document.getElementById('set-style').value;
  const colors = getThemeColors();
  
  let chartData = [];
  let chartLabels = [];
  let bgColors = [];

  if (style === '50-30-20') {
    const needs = Math.round(inc * 0.5);
    const wants = Math.round(inc * 0.3);
    const save = Math.round(inc * 0.2);
    
    chartLabels = [`Needs (50%) — ${fmt(needs)}`, `Wants (30%) — ${fmt(wants)}`, `Savings (20%) — ${fmt(save)}`];
    chartData = [50, 30, 20];
    bgColors = ['#10b98199', '#6366f199', '#f59e0b99'];
  } else if (style === '80-20') {
    const living = Math.round(inc * 0.8);
    const save = Math.round(inc * 0.2);
    
    chartLabels = [`Living Expenses (80%) — ${fmt(living)}`, `Wealth Savings (20%) — ${fmt(save)}`];
    chartData = [80, 20];
    bgColors = ['#6366f199', '#10b98199'];
  } else {
    const living = Math.round(inc * 0.7);
    const envelopes = Math.round(inc * 0.3);
    
    chartLabels = [`Envelopes (70%) — ${fmt(living)}`, `Buffer (30%) — ${fmt(envelopes)}`];
    chartData = [70, 30];
    bgColors = ['#10b98199', '#f43f5e99'];
  }

  if (budgetChartInst) budgetChartInst.destroy();
  const budgetCtx = document.getElementById('budgetChart').getContext('2d');
  budgetChartInst = new Chart(budgetCtx, {
    type: 'pie',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: bgColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.text,
            font: { family: 'Plus Jakarta Sans', size: 11 },
            padding: 10
          }
        }
      }
    }
  });
}

function saveProfile() {
  const inc = parseFloat(document.getElementById('set-income').value);
  const target = parseFloat(document.getElementById('set-savings').value);
  const name = document.getElementById('set-name').value.trim();
  const style = document.getElementById('set-style').value;

  if (isNaN(inc) || inc <= 0) {
    showToast('Please type a valid monthly liquid income value!', 'error');
    return;
  }
  if (isNaN(target) || target <= 0) {
    showToast('Please type a valid savings budget target value!', 'error');
    return;
  }
  if (!name) {
    showToast('Please specify a profile display name!', 'error');
    return;
  }

  state.profile.income = inc;
  state.profile.savings = target;
  state.profile.name = name;
  state.profile.style = style;

  saveStateToLocalStorage();
  updateStateSyncs();
  renderSettings();
  
  showToast('Profile credentials and methodologies updated successfully!');
  
  // Auto redirect to main dashboard to view dynamic changes
  setTimeout(() => {
    showSection('dashboard');
  }, 1000);
}

// FILE-BASED BACKUP & STORAGE ENGINE (Export & Import Data)

// Generates a physical backup file (.json) for the user to download to their local computer
function exportDataToFile() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `finwise_backup_${state.profile.name.toLowerCase()}_2026.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Financial records file downloaded successfully!');
  } catch (err) {
    showToast('Failed to export data to file!', 'error');
    console.error(err);
  }
}

// Reads an uploaded backup file (.json) to restore user records
function importDataFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      
      // Basic structure validation to ensure it matches FinWise state format
      if (importedState && importedState.profile && Array.isArray(importedState.expenses) && Array.isArray(importedState.goals)) {
        state = importedState;
        
        // Save to browser storage
        saveStateToLocalStorage();
        
        // Sync values across views
        updateStateSyncs();
        
        // Sync inputs in setup form
        document.getElementById('set-name').value = state.profile.name;
        document.getElementById('set-income').value = state.profile.income;
        document.getElementById('set-savings').value = state.profile.savings;
        document.getElementById('set-style').value = state.profile.style;

        showToast('Financial records imported successfully from file!');
        
        // Reset file input value
        event.target.value = '';
        
        // Route back to dashboard to see active imports
        showSection('dashboard');
      } else {
        showToast('Invalid backup file structure! File matching failed.', 'error');
      }
    } catch (err) {
      showToast('Error parsing file! Please upload a valid .json record file.', 'error');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// Reset data to defaults (Optional feature for user convenience)
function resetDataToDefault() {
  if (confirm('Are you sure you want to restore the platform to default demo records? This will delete all your current transactions!')) {
    state = { ...defaultState };
    saveStateToLocalStorage();
    updateStateSyncs();
    
    // Sync setup form
    document.getElementById('set-name').value = state.profile.name;
    document.getElementById('set-income').value = state.profile.income;
    document.getElementById('set-savings').value = state.profile.savings;
    document.getElementById('set-style').value = state.profile.style;
    
    showToast('Financial records reset to default demo values!', 'warning');
    showSection('dashboard');
  }
}
