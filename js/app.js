/**
 * Main Application Controller (app.js)
 * Personal Expense Tracker Web App with Slip-Based Input
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentSlipDataUrl = '';
  let manualSlipDataUrl = '';
  let editSlipDataUrl = '';
  let currentViewMode = 'table'; // 'table' or 'cards'

  // Page Titles Metadata
  const PAGE_META = {
    dashboard: {
      title: 'Dashboard สรุปภาพรวม',
      subtitle: 'ติดตามรายรับ–รายจ่ายส่วนบุคคล ยอดคงเหลือ และกราฟสรุปตามหมวดหมู่'
    },
    transactions: {
      title: 'รายการธุรกรรมทั้งหมด',
      subtitle: 'ค้นหา กรองข้อมูล ดูหลักฐานสลิป แก้ไข และลบรายการรายรับ–รายจ่าย'
    },
    'add-transaction': {
      title: 'เพิ่มรายการรายรับ–รายจ่าย (กรอกเอง)',
      subtitle: 'บันทึกข้อมูลรายรับหรือรายจ่ายด้วยตนเอง พร้อมระบบแนะนำหมวดหมู่อัตโนมัติ'
    },
    'upload-slip': {
      title: 'อัปโหลดสลิปเพื่อบันทึกค่าใช้จ่าย',
      subtitle: 'อัปโหลดรูปภาพสลิปโอนเงิน ดูตัวอย่างสลิปควบคู่กับการกรอกข้อมูลและแนะนำหมวดหมู่'
    },
    categories: {
      title: 'หมวดหมู่ & กฎแนะนำอัตโนมัติ (Rule-Based)',
      subtitle: 'จัดการหมวดหมู่ค่าใช้จ่ายและตารางคำสำคัญสำหรับแนะนำหมวดหมู่'
    }
  };

  // Initialize Default Dates
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('manualDate').value = todayStr;
  document.getElementById('slipDate').value = todayStr;

  // DOM Elements for Navigation & Search/Filter (Declared before initial render)
  const navButtons = document.querySelectorAll('.nav-item');
  const pageSections = document.querySelectorAll('.page-section');
  const sidebar = document.getElementById('sidebar');

  const searchInput = document.getElementById('searchKeyword');
  const filterType = document.getElementById('filterType');
  const filterCategory = document.getElementById('filterCategory');
  const filterDateFrom = document.getElementById('filterDateFrom');
  const filterDateTo = document.getElementById('filterDateTo');

  // ==================== NAVIGATION ====================
  function navigateTo(pageId) {
    navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    pageSections.forEach((sec) => {
      sec.classList.toggle('active', sec.id === `page-${pageId}`);
    });

    if (PAGE_META[pageId]) {
      document.getElementById('pageTitle').textContent = PAGE_META[pageId].title;
      document.getElementById('pageSubtitle').textContent = PAGE_META[pageId].subtitle;
    }

    sidebar.classList.remove('open');
    if (pageId === 'dashboard') {
      refreshAllViews();
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.goto));
  });

  document.getElementById('btnMobileMenu').addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // ==================== CATEGORY SELECTS & RULE ENGINE ====================
  function populateCategorySelects() {
    const categories = DataService.getCategories();
    const selects = [
      document.getElementById('manualCategory'),
      document.getElementById('slipCategory'),
      document.getElementById('editCategory')
    ];

    selects.forEach((sel) => {
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = '';
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.type === 'income' ? 'รายรับ' : 'รายจ่าย'})`;
        sel.appendChild(opt);
      });
      if (currentVal && categories.some((c) => c.name === currentVal)) {
        sel.value = currentVal;
      }
    });

    // Filter Category Dropdown
    const filterCat = document.getElementById('filterCategory');
    if (filterCat) {
      const prev = filterCat.value;
      filterCat.innerHTML = '<option value="all">ทุกหมวดหมู่</option>';
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        filterCat.appendChild(opt);
      });
      if (prev) filterCat.value = prev;
    }
  }

  function renderCategoriesAndRulesPage() {
    const categories = DataService.getCategories();
    const container = document.getElementById('categoryListContainer');
    container.innerHTML = categories
      .map(
        (c) => `
      <span class="category-chip">
        <span class="badge ${c.type === 'income' ? 'badge-income' : 'badge-expense'}">
          ${c.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
        </span>
        <strong>${escapeHtml(c.name)}</strong>
      </span>
    `
      )
      .join('');

    const rulesBody = document.getElementById('keywordRulesTableBody');
    rulesBody.innerHTML = KEYWORD_RULES.map(
      (r) => `
      <tr>
        <td><code>${escapeHtml(r.displayKeywords)}</code></td>
        <td><span class="badge badge-category">${escapeHtml(r.category)}</span></td>
      </tr>
    `
    ).join('');
  }

  document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('newCatName');
    const typeSelect = document.getElementById('newCatType');
    const added = DataService.addCategory(nameInput.value, typeSelect.value);
    if (!added) {
      showToast('มีหมวดหมู่นี้อยู่ในระบบแล้ว', 'warning');
      return;
    }
    nameInput.value = '';
    populateCategorySelects();
    renderCategoriesAndRulesPage();
    showToast(`เพิ่มหมวดหมู่ "${added.name}" สำเร็จ!`);
  });

  // ==================== DASHBOARD & SUMMARY (FR-09, FR-10) ====================
  function refreshAllViews() {
    const transactions = DataService.getTransactions();

    // Calculate Totals
    const incomeList = transactions.filter((t) => t.type === 'income');
    const expenseList = transactions.filter((t) => t.type === 'expense');
    const slipList = transactions.filter((t) => Boolean(t.slip_image_url));

    const totalIncome = incomeList.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = expenseList.reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    document.getElementById('totalIncomeDisplay').textContent = formatCurrency(totalIncome);
    document.getElementById('incomeCountDisplay').textContent = `${incomeList.length} รายการ`;

    document.getElementById('totalExpenseDisplay').textContent = formatCurrency(totalExpense);
    document.getElementById('expenseCountDisplay').textContent = `${expenseList.length} รายการ`;

    const balanceEl = document.getElementById('netBalanceDisplay');
    balanceEl.textContent = formatCurrency(netBalance);
    balanceEl.style.color = netBalance >= 0 ? 'var(--primary)' : 'var(--expense)';
    document.getElementById('slipCountDisplay').textContent = `แนบสลิป ${slipList.length} รายการ`;

    // Update Budget Progress
    updateBudgetUI(totalExpense);

    // Update Charts
    ChartManager.updateCharts(transactions);

    // Render Recent 5 Transactions on Dashboard
    renderRecentTransactions(transactions.slice(0, 5));

    // Render Filtered Transactions on Transaction List Page
    applyFiltersAndRender();
  }

  function updateBudgetUI(totalExpense) {
    const budget = DataService.getMonthlyBudget();
    const pct = budget > 0 ? Math.min((totalExpense / budget) * 100, 100) : 0;

    document.getElementById('budgetStatusText').textContent = `${formatCurrency(totalExpense)} / ${formatCurrency(budget)}`;
    const bar = document.getElementById('budgetProgressBar');
    bar.style.width = `${pct}%`;

    const alertText = document.getElementById('budgetAlertText');
    if (totalExpense > budget) {
      bar.style.background = 'var(--expense)';
      alertText.textContent = `⚠️ ใช้จ่ายเกินงบที่ตั้งไว้ ${formatCurrency(totalExpense - budget)}!`;
    } else if (pct >= 80) {
      bar.style.background = 'var(--warning)';
      alertText.textContent = `ใกล้ถึงงบประมาณแล้ว (${pct.toFixed(0)}%)`;
    } else {
      bar.style.background = 'var(--primary)';
      alertText.textContent = '';
    }
  }

  document.getElementById('btnEditBudget').addEventListener('click', () => {
    const current = DataService.getMonthlyBudget();
    const input = prompt('ตั้งงบประมาณรายจ่ายต่อเดือน (บาท):', current);
    if (input !== null && !isNaN(parseFloat(input)) && parseFloat(input) > 0) {
      DataService.setMonthlyBudget(parseFloat(input));
      refreshAllViews();
      showToast('บันทึกงบประมาณรายเดือนเรียบร้อยแล้ว');
    }
  });

  function renderRecentTransactions(recentList) {
    const tbody = document.getElementById('recentTransactionsBody');
    if (recentList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">ยังไม่มีรายการธุรกรรม</td></tr>`;
      return;
    }

    tbody.innerHTML = recentList
      .map(
        (tx) => `
      <tr>
        <td>${escapeHtml(tx.transaction_date)}</td>
        <td>
          <strong>${escapeHtml(tx.merchant)}</strong>
          ${tx.description ? `<div style="font-size:0.78rem;color:var(--text-secondary)">${escapeHtml(tx.description)}</div>` : ''}
        </td>
        <td><span class="badge badge-category">${escapeHtml(tx.category)}</span></td>
        <td>${escapeHtml(tx.payment_method || '-')}</td>
        <td>
          ${
            tx.slip_image_url
              ? `<button class="slip-thumb-btn" data-edit-id="${tx.id}"><i class="ri-image-2-line"></i> ดูสลิป</button>`
              : `<span style="color:var(--text-muted);font-size:0.8rem">-</span>`
          }
        </td>
        <td class="text-right ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}">
          ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
        </td>
        <td class="text-center">
          <div class="action-btn-group">
            <button class="action-icon-btn" data-edit-id="${tx.id}" title="ดูรายละเอียด / แก้ไข">
              <i class="ri-edit-line"></i>
            </button>
            <button class="action-icon-btn delete" data-delete-id="${tx.id}" title="ลบรายการ">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  }

  // ==================== SEARCH & FILTER (FR-06, FR-07) ====================
  [searchInput, filterType, filterCategory, filterDateFrom, filterDateTo].forEach((el) => {
    el.addEventListener('input', applyFiltersAndRender);
    el.addEventListener('change', applyFiltersAndRender);
  });

  document.getElementById('btnResetFilters').addEventListener('click', () => {
    searchInput.value = '';
    filterType.value = 'all';
    filterCategory.value = 'all';
    filterDateFrom.value = '';
    filterDateTo.value = '';
    applyFiltersAndRender();
  });

  function applyFiltersAndRender() {
    const allTx = DataService.getTransactions();
    const kw = searchInput.value.trim().toLowerCase();
    const typeVal = filterType.value;
    const catVal = filterCategory.value;
    const fromVal = filterDateFrom.value;
    const toVal = filterDateTo.value;

    const filtered = allTx.filter((tx) => {
      if (typeVal !== 'all' && tx.type !== typeVal) return false;
      if (catVal !== 'all' && tx.category !== catVal) return false;
      if (fromVal && tx.transaction_date < fromVal) return false;
      if (toVal && tx.transaction_date > toVal) return false;
      if (kw) {
        const hay = `${tx.merchant} ${tx.description} ${tx.category} ${tx.payment_method}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });

    document.getElementById('filteredCount').textContent = filtered.length;
    const sumFiltered = filtered.reduce(
      (acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)),
      0
    );
    document.getElementById('filteredSummaryText').textContent = `ยอดสุทธิของรายการที่กรอง: ${formatCurrency(sumFiltered)}`;

    // Render Table
    const tbody = document.getElementById('allTransactionsBody');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
    } else {
      tbody.innerHTML = filtered
        .map(
          (tx) => `
        <tr>
          <td>${escapeHtml(tx.transaction_date)}</td>
          <td>
            <span class="badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}">
              ${tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
            </span>
          </td>
          <td><strong>${escapeHtml(tx.merchant)}</strong></td>
          <td>${escapeHtml(tx.description || '-')}</td>
          <td><span class="badge badge-category">${escapeHtml(tx.category)}</span></td>
          <td>${escapeHtml(tx.payment_method || '-')}</td>
          <td>
            ${
              tx.slip_image_url
                ? `<button class="slip-thumb-btn" data-edit-id="${tx.id}"><i class="ri-image-2-line"></i> มีรูปสลิป</button>`
                : `<span style="color:var(--text-muted);font-size:0.8rem">ไม่มีสลิป</span>`
            }
          </td>
          <td class="text-right ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}">
            ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
          </td>
          <td class="text-center">
            <div class="action-btn-group">
              <button class="action-icon-btn" data-edit-id="${tx.id}" title="ดูรายละเอียด / แก้ไข">
                <i class="ri-edit-line"></i>
              </button>
              <button class="action-icon-btn delete" data-delete-id="${tx.id}" title="ลบรายการ">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join('');
    }

    // Render Card Grid View
    const cardGrid = document.getElementById('transactionsCardView');
    if (filtered.length === 0) {
      cardGrid.innerHTML = `<p class="text-center" style="grid-column:1/-1;padding:24px;">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</p>`;
    } else {
      cardGrid.innerHTML = filtered
        .map(
          (tx) => `
        <div class="tx-card">
          <div class="tx-card-top">
            <span class="badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}">
              ${tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
            </span>
            <small style="color:var(--text-muted)">${escapeHtml(tx.transaction_date)}</small>
          </div>
          <div class="tx-card-merchant">${escapeHtml(tx.merchant)}</div>
          <div class="tx-card-desc">${escapeHtml(tx.description || 'ไม่มีรายละเอียดเพิ่มเติม')}</div>
          <div><span class="badge badge-category">${escapeHtml(tx.category)}</span></div>
          ${
            tx.slip_image_url
              ? `<img src="${tx.slip_image_url}" alt="Slip" class="tx-card-slip-img" data-edit-id="${tx.id}" title="คลิกเพื่อดูรูปสลิปขยาย" />`
              : ''
          }
          <div class="tx-card-footer">
            <span class="${tx.type === 'income' ? 'amount-income' : 'amount-expense'}" style="font-size:1.1rem">
              ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
            </span>
            <div class="action-btn-group">
              <button class="action-icon-btn" data-edit-id="${tx.id}" title="แก้ไข"><i class="ri-edit-line"></i></button>
              <button class="action-icon-btn delete" data-delete-id="${tx.id}" title="ลบ"><i class="ri-delete-bin-line"></i></button>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }
  }

  // View Switcher (Table vs Cards)
  document.getElementById('btnViewTable').addEventListener('click', () => {
    currentViewMode = 'table';
    document.getElementById('btnViewTable').classList.add('active');
    document.getElementById('btnViewCards').classList.remove('active');
    document.getElementById('transactionsTableView').classList.remove('hidden');
    document.getElementById('transactionsCardView').classList.add('hidden');
  });

  document.getElementById('btnViewCards').addEventListener('click', () => {
    currentViewMode = 'cards';
    document.getElementById('btnViewCards').classList.add('active');
    document.getElementById('btnViewTable').classList.remove('active');
    document.getElementById('transactionsCardView').classList.remove('hidden');
    document.getElementById('transactionsTableView').classList.add('hidden');
  });

  // ==================== MANUAL ADD TRANSACTION & KEYWORD SUGGESTION (FR-01, FR-08) ====================
  const manualMerchant = document.getElementById('manualMerchant');
  const manualDesc = document.getElementById('manualDescription');
  const manualCatSelect = document.getElementById('manualCategory');
  const manualSuggestionBadge = document.getElementById('manualSuggestionBadge');
  const manualSuggestedCatText = document.getElementById('manualSuggestedCatText');

  function handleManualKeywordSuggestion() {
    const combined = `${manualMerchant.value} ${manualDesc.value}`;
    const match = suggestCategoryByKeyword(combined);
    if (match) {
      manualSuggestedCatText.textContent = `${match.category} (พบคำว่า "${match.matchedKeyword}")`;
      manualSuggestionBadge.classList.remove('hidden');
      manualCatSelect.value = match.category;
    } else {
      manualSuggestionBadge.classList.add('hidden');
    }
  }

  manualMerchant.addEventListener('input', handleManualKeywordSuggestion);
  manualDesc.addEventListener('input', handleManualKeywordSuggestion);

  document.getElementById('btnApplyManualSuggestion').addEventListener('click', () => {
    const match = suggestCategoryByKeyword(`${manualMerchant.value} ${manualDesc.value}`);
    if (match) {
      manualCatSelect.value = match.category;
      showToast(`เลือกหมวดหมู่ "${match.category}" แล้ว`);
    }
  });

  // Manual form optional slip attachment
  const manualSlipInput = document.getElementById('manualSlipInput');
  const manualSlipPreviewWrap = document.getElementById('manualSlipPreviewWrap');
  const manualSlipPreviewImg = document.getElementById('manualSlipPreviewImg');

  manualSlipInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    manualSlipDataUrl = await readImageAndCompress(file);
    manualSlipPreviewImg.src = manualSlipDataUrl;
    manualSlipPreviewWrap.classList.remove('hidden');
  });

  document.getElementById('btnRemoveManualSlip').addEventListener('click', () => {
    manualSlipDataUrl = '';
    manualSlipInput.value = '';
    manualSlipPreviewWrap.classList.add('hidden');
  });

  document.getElementById('manualTransactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const typeVal = document.querySelector('input[name="manual_type"]:checked').value;
    const newTx = DataService.addTransaction({
      type: typeVal,
      amount: document.getElementById('manualAmount').value,
      transaction_date: document.getElementById('manualDate').value,
      merchant: manualMerchant.value,
      category: manualCatSelect.value,
      payment_method: document.getElementById('manualPaymentMethod').value,
      description: manualDesc.value,
      slip_image_url: manualSlipDataUrl
    });

    e.target.reset();
    document.getElementById('manualDate').value = todayStr;
    manualSlipDataUrl = '';
    manualSlipPreviewWrap.classList.add('hidden');
    manualSuggestionBadge.classList.add('hidden');

    refreshAllViews();
    showToast(`บันทึกรายการ "${newTx.merchant}" จำนวน ${formatCurrency(newTx.amount)} สำเร็จ!`);
    navigateTo('dashboard');
  });

  // ==================== UPLOAD SLIP WORKFLOW (FR-02, FR-03, FR-08) ====================
  const slipDropzone = document.getElementById('slipDropzone');
  const slipFileInput = document.getElementById('slipFileInput');
  const dropzonePlaceholder = document.getElementById('dropzonePlaceholder');
  const slipPreviewContainer = document.getElementById('slipPreviewContainer');
  const slipPreviewImage = document.getElementById('slipPreviewImage');
  const slipMerchant = document.getElementById('slipMerchant');
  const slipAmount = document.getElementById('slipAmount');
  const slipCategory = document.getElementById('slipCategory');
  const slipDescription = document.getElementById('slipDescription');
  const slipSuggestionText = document.getElementById('slipSuggestionText');

  slipDropzone.addEventListener('click', (e) => {
    if (
      e.target.closest('.btn-sample-slip') ||
      e.target.closest('#btnChangeSlip') ||
      e.target.closest('#btnClearSlip')
    ) {
      return;
    }
    if (!currentSlipDataUrl) {
      slipFileInput.click();
    }
  });

  document.getElementById('btnChangeSlip').addEventListener('click', () => {
    slipFileInput.click();
  });

  document.getElementById('btnClearSlip').addEventListener('click', () => {
    clearSlipUploadPreview();
  });

  function clearSlipUploadPreview() {
    currentSlipDataUrl = '';
    slipFileInput.value = '';
    slipPreviewImage.src = '';
    slipPreviewContainer.classList.add('hidden');
    dropzonePlaceholder.classList.remove('hidden');
  }

  function showSlipUploadPreview(dataUrl) {
    currentSlipDataUrl = dataUrl;
    slipPreviewImage.src = dataUrl;
    dropzonePlaceholder.classList.add('hidden');
    slipPreviewContainer.classList.remove('hidden');
  }

  slipDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    slipDropzone.classList.add('dragover');
  });

  slipDropzone.addEventListener('dragleave', () => {
    slipDropzone.classList.remove('dragover');
  });

  slipDropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    slipDropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dataUrl = await readImageAndCompress(file);
      showSlipUploadPreview(dataUrl);
      showToast('อัปโหลดรูปสลิปเรียบร้อยแล้ว กรุณากรอกข้อมูลจากสลิปด้านขวา');
    }
  });

  slipFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readImageAndCompress(file);
    showSlipUploadPreview(dataUrl);
    showToast('อัปโหลดรูปสลิปเรียบร้อยแล้ว กรุณากรอกข้อมูลจากสลิปด้านขวา');
  });

  // Sample Slip Preset Buttons for instant testing
  const SAMPLE_SLIP_PRESETS = {
    '7eleven': {
      bankName: 'K PLUS',
      merchant: '7-Eleven สาขาหน้ามอ',
      amount: 85,
      description: 'ซื้อแซนด์วิชและกาแฟเย็น',
      accentColor: '#059669'
    },
    grab: {
      bankName: 'SCB EASY',
      merchant: 'Grab Transport',
      amount: 140,
      description: 'ค่าเดินทางด้วย GrabBike',
      accentColor: '#4f46e5'
    },
    shopee: {
      bankName: 'ShopeePay',
      merchant: 'Shopee Thailand',
      amount: 459,
      description: 'สั่งซื้อของใช้ส่วนตัวออนไลน์',
      accentColor: '#ea580c'
    }
  };

  document.querySelectorAll('.btn-sample-slip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      const preset = SAMPLE_SLIP_PRESETS[presetKey];
      if (!preset) return;

      const mockUrl = generateMockSlipDataUrl({
        bankName: preset.bankName,
        merchant: preset.merchant,
        amount: preset.amount,
        date: todayStr,
        refNo: 'SLIP' + Math.floor(100000 + Math.random() * 900000),
        accentColor: preset.accentColor
      });

      showSlipUploadPreview(mockUrl);
      slipMerchant.value = preset.merchant;
      slipAmount.value = preset.amount;
      slipDescription.value = preset.description;
      updateSlipRuleSuggestion();
      showToast(`โหลดสลิปตัวอย่าง "${preset.merchant}" พร้อมแนะนำหมวดหมู่อัตโนมัติแล้ว!`);
    });
  });

  function updateSlipRuleSuggestion() {
    const combined = `${slipMerchant.value} ${slipDescription.value}`;
    const match = suggestCategoryByKeyword(combined);
    if (match) {
      slipCategory.value = match.category;
      slipSuggestionText.innerHTML = `ตรวจพบคำสำคัญ <strong>"${escapeHtml(match.matchedKeyword)}"</strong> → ระบบเลือกหมวดหมู่ <strong>"${escapeHtml(match.category)}"</strong> ให้อัตโนมัติ`;
    } else {
      slipSuggestionText.innerHTML = `พิมพ์ชื่อร้านค้าหรือคำสำคัญ เช่น <code>7-Eleven</code>, <code>Grab</code>, <code>Shopee</code>, <code>Electric</code> เพื่อให้ระบบแนะนำหมวดหมู่อัตโนมัติ`;
    }
  }

  slipMerchant.addEventListener('input', updateSlipRuleSuggestion);
  slipDescription.addEventListener('input', updateSlipRuleSuggestion);

  document.getElementById('slipTransactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentSlipDataUrl) {
      showToast('กรุณาอัปโหลดรูปภาพสลิป หรือกดปุ่มเลือกสลิปตัวอย่างด้านซ้ายก่อนบันทึก', 'warning');
      return;
    }

    const saved = DataService.addTransaction({
      type: document.getElementById('slipType').value,
      amount: slipAmount.value,
      category: slipCategory.value,
      transaction_date: document.getElementById('slipDate').value,
      merchant: slipMerchant.value,
      payment_method: document.getElementById('slipPaymentMethod').value,
      description: slipDescription.value,
      slip_image_url: currentSlipDataUrl
    });

    e.target.reset();
    document.getElementById('slipDate').value = todayStr;
    clearSlipUploadPreview();
    updateSlipRuleSuggestion();
    refreshAllViews();
    showToast(`บันทึกสลิป "${saved.merchant}" (${formatCurrency(saved.amount)}) สำเร็จ!`);
    navigateTo('dashboard');
  });

  // ==================== EDIT & DELETE MODAL (FR-04, FR-05) ====================
  const modal = document.getElementById('transactionModal');

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) {
      openEditModal(editBtn.dataset.editId);
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) {
      handleDeleteTransaction(deleteBtn.dataset.deleteId);
    }
  });

  function openEditModal(txId) {
    const tx = DataService.getTransactions().find((t) => t.id === txId);
    if (!tx) return;

    document.getElementById('editId').value = tx.id;
    document.getElementById('editType').value = tx.type;
    document.getElementById('editAmount').value = tx.amount;
    document.getElementById('editMerchant').value = tx.merchant;
    document.getElementById('editCategory').value = tx.category;
    document.getElementById('editDate').value = tx.transaction_date;
    document.getElementById('editPaymentMethod').value = tx.payment_method || '';
    document.getElementById('editDescription').value = tx.description || '';
    document.getElementById('editSlipFile').value = '';

    editSlipDataUrl = tx.slip_image_url || '';
    updateModalSlipDisplay(editSlipDataUrl);

    modal.classList.remove('hidden');
  }

  function updateModalSlipDisplay(url) {
    const img = document.getElementById('editSlipImage');
    const emptyText = document.getElementById('editNoSlipText');
    if (url) {
      img.src = url;
      img.classList.remove('hidden');
      emptyText.classList.add('hidden');
    } else {
      img.src = '';
      img.classList.add('hidden');
      emptyText.classList.remove('hidden');
    }
  }

  document.getElementById('editSlipFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editSlipDataUrl = await readImageAndCompress(file);
    updateModalSlipDisplay(editSlipDataUrl);
  });

  function closeEditModal() {
    modal.classList.add('hidden');
  }

  document.getElementById('btnCloseModal').addEventListener('click', closeEditModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeEditModal);

  document.getElementById('editTransactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    DataService.updateTransaction(id, {
      type: document.getElementById('editType').value,
      amount: document.getElementById('editAmount').value,
      merchant: document.getElementById('editMerchant').value,
      category: document.getElementById('editCategory').value,
      transaction_date: document.getElementById('editDate').value,
      payment_method: document.getElementById('editPaymentMethod').value,
      description: document.getElementById('editDescription').value,
      slip_image_url: editSlipDataUrl
    });

    closeEditModal();
    refreshAllViews();
    showToast('บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว');
  });

  document.getElementById('btnDeleteFromModal').addEventListener('click', () => {
    const id = document.getElementById('editId').value;
    closeEditModal();
    handleDeleteTransaction(id);
  });

  function handleDeleteTransaction(id) {
    const tx = DataService.getTransactions().find((t) => t.id === id);
    if (!tx) return;
    if (confirm(`ยืนยันการลบรายการ "${tx.merchant}" จำนวน ${formatCurrency(tx.amount)} หรือไม่?`)) {
      DataService.deleteTransaction(id);
      refreshAllViews();
      showToast('ลบรายการเรียบร้อยแล้ว');
    }
  }

  // ==================== EXPORT CSV & SAMPLE RESET & THEME ====================
  document.getElementById('btnExportCSV').addEventListener('click', () => {
    const list = DataService.getTransactions();
    if (list.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับ Export', 'warning');
      return;
    }

    const headers = ['id', 'transaction_date', 'type', 'merchant', 'category', 'amount', 'payment_method', 'description', 'has_slip'];
    const csvRows = [
      headers.join(','),
      ...list.map((t) =>
        [
          t.id,
          t.transaction_date,
          t.type,
          `"${(t.merchant || '').replace(/"/g, '""')}"`,
          `"${(t.category || '').replace(/"/g, '""')}"`,
          t.amount,
          `"${(t.payment_method || '').replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.slip_image_url ? 'Yes' : 'No'
        ].join(',')
      )
    ];

    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sliptrack-report-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์รายงาน CSV สำเร็จ!');
  });

  document.getElementById('btnResetSample').addEventListener('click', () => {
    if (confirm('ต้องการรีเซ็ตข้อมูลกลับเป็นข้อมูลตัวอย่างเริ่มต้น (Sample Data) หรือไม่?')) {
      DataService.resetToSampleData();
      populateCategorySelects();
      renderCategoriesAndRulesPage();
      refreshAllViews();
      showToast('โหลดข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว');
    }
  });

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  document.getElementById('btnToggleTheme').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    updateThemeIcon(next);
    refreshAllViews();
  });

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  }

  // ==================== UTILITIES ====================
  function formatCurrency(num) {
    return '฿' + Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="ri-checkbox-circle-fill" style="color:var(--income);font-size:1.1rem"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  /**
   * อ่านไฟล์รูปภาพสลิปและย่อขนาดด้วย Canvas เพื่อประหยัดพื้นที่ LocalStorage
   */
  function readImageAndCompress(file, maxWidth = 700) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ==================== INITIALIZE APPLICATION ====================
  initTheme();
  populateCategorySelects();
  renderCategoriesAndRulesPage();
  refreshAllViews();
});
