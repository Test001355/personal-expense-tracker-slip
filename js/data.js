/**
 * Data Model, Rule-Based Category Suggestion Engine & LocalStorage Service
 * Project: Personal Expense Tracker Web App with Slip-Based Input
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'sliptrack_transactions_v1',
  CATEGORIES: 'sliptrack_categories_v1',
  BUDGET: 'sliptrack_monthly_budget_v1',
  THEME: 'sliptrack_theme_v1'
};

// 11. หมวดหมู่ค่าใช้จ่ายเริ่มต้น (Default Categories)
const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'อาหารและเครื่องดื่ม', type: 'expense' },
  { id: 'cat-2', name: 'เดินทาง', type: 'expense' },
  { id: 'cat-3', name: 'การเรียน', type: 'expense' },
  { id: 'cat-4', name: 'ช้อปปิ้ง', type: 'expense' },
  { id: 'cat-5', name: 'บิลและค่าสาธารณูปโภค', type: 'expense' },
  { id: 'cat-6', name: 'สุขภาพ', type: 'expense' },
  { id: 'cat-7', name: 'ความบันเทิง', type: 'expense' },
  { id: 'cat-8', name: 'รายรับ', type: 'income' },
  { id: 'cat-9', name: 'อื่น ๆ', type: 'expense' }
];

// 12. ตารางคำสำคัญสำหรับการแนะนำหมวดหมู่แบบง่าย (Rule-Based Keyword Engine)
const KEYWORD_RULES = [
  {
    category: 'อาหารและเครื่องดื่ม',
    displayKeywords: '7-Eleven, Lotus, Big C, Cafe, Food, เซเว่น, โลตัส, กาแฟ, ข้าว',
    keywords: ['7-eleven', '7eleven', 'เซเว่น', 'lotus', 'โลตัส', 'big c', 'บิ๊กซี', 'cafe', 'amazon', 'starbucks', 'coffee', 'กาแฟ', 'food', 'อาหาร', 'ข้าว', 'ชาบู', 'mk', 'kfc', 'grabfood', 'lineman']
  },
  {
    category: 'เดินทาง',
    displayKeywords: 'Grab, Bolt, Bus, Taxi, Fuel, Gas, BTS, MRT, น้ำมัน, วิน',
    keywords: ['grab', 'bolt', 'bus', 'taxi', 'fuel', 'gas', 'bts', 'mrt', 'แกร็บ', 'รถเมล์', 'แท็กซี่', 'น้ำมัน', 'ปั๊ม', 'ptt', 'shell', 'เดินทาง', 'วิน']
  },
  {
    category: 'การเรียน',
    displayKeywords: 'Book, Course, Tuition, Stationery, หนังสือ, คอร์สเรียน, เครื่องเขียน',
    keywords: ['book', 'course', 'tuition', 'stationery', 'b2s', 'se-ed', 'นายอินทร์', 'หนังสือ', 'คอร์ส', 'ค่าเทอม', 'เครื่องเขียน', 'เรียน', 'ชีท']
  },
  {
    category: 'ช้อปปิ้ง',
    displayKeywords: 'Shopee, Lazada, Shopping, Mall, TikTok Shop, เสื้อผ้า, ห้าง',
    keywords: ['shopee', 'lazada', 'shopping', 'mall', 'central', 'uniqlo', 'tiktok', 'ช้อปปิ้ง', 'เสื้อผ้า', 'รองเท้า', 'ของใช้']
  },
  {
    category: 'บิลและค่าสาธารณูปโภค',
    displayKeywords: 'Electric, Water, Internet, Phone, AIS, True, ค่าไฟ, ค่าน้ำ, ค่าเน็ต',
    keywords: ['electric', 'water', 'internet', 'phone', 'ais', 'true', 'dtac', '3bb', 'pea', 'mea', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าเน็ต', 'ค่าโทรศัพท์', 'หอพัก', 'ค่าเช่า']
  },
  {
    category: 'สุขภาพ',
    displayKeywords: 'Hospital, Clinic, Medicine, Watsons, Boots, โรงพยาบาล, คลินิก, ยา',
    keywords: ['hospital', 'clinic', 'medicine', 'pharmacy', 'watsons', 'boots', 'โรงพยาบาล', 'คลินิก', 'ยา', 'หมอ', 'ทำฟัน', 'วิตามิน']
  },
  {
    category: 'ความบันเทิง',
    displayKeywords: 'Movie, Game, Music, Netflix, Spotify, Steam, Major, SF, ดูหนัง, เกม',
    keywords: ['movie', 'game', 'music', 'netflix', 'spotify', 'youtube', 'steam', 'major', 'sf cinema', 'ดูหนัง', 'เกม', 'คอนเสิร์ต', 'บันเทิง']
  },
  {
    category: 'รายรับ',
    displayKeywords: 'Salary, Freelance, Part-time, เงินเดือน, ค่าขนม, โอนเข้า, รายได้',
    keywords: ['salary', 'freelance', 'part-time', 'income', 'เงินเดือน', 'ค่าขนม', 'ผู้ปกครอง', 'รางวัล', 'ทุนการศึกษา']
  }
];

/**
 * สร้างรูปภาพสลิปจำลองในรูปแบบ SVG Data URL สำหรับรายการตัวอย่าง
 */
function generateMockSlipDataUrl({ bankName, merchant, amount, date, refNo, accentColor = '#1e40af' }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="460" viewBox="0 0 380 460">
    <rect width="380" height="460" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect width="380" height="86" rx="18" fill="${accentColor}"/>
    <rect y="68" width="380" height="18" fill="${accentColor}"/>
    <circle cx="48" cy="43" r="20" fill="#ffffff" fill-opacity="0.2"/>
    <path d="M40 43 L46 49 L58 37" stroke="#ffffff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <text x="80" y="38" font-family="Prompt, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${bankName} • โอนเงินสำเร็จ</text>
    <text x="80" y="60" font-family="Prompt, sans-serif" font-size="12" fill="#e2e8f0">${date} • เวลา 12:45 น.</text>

    <text x="30" y="125" font-family="Prompt, sans-serif" font-size="13" fill="#64748b">จากบัญชี (ผู้โอน)</text>
    <text x="30" y="146" font-family="Prompt, sans-serif" font-size="15" font-weight="600" fill="#0f172a">นักศึกษา (xxx-x-x8421-x)</text>

    <line x1="30" y1="168" x2="350" y2="168" stroke="#e2e8f0" stroke-dasharray="4 4"/>

    <text x="30" y="198" font-family="Prompt, sans-serif" font-size="13" fill="#64748b">ไปยังผู้รับเงิน / ร้านค้า (Merchant)</text>
    <text x="30" y="222" font-family="Prompt, sans-serif" font-size="17" font-weight="700" fill="${accentColor}">${merchant}</text>

    <rect x="26" y="248" width="328" height="78" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="44" y="275" font-family="Prompt, sans-serif" font-size="13" fill="#475569">จำนวนเงินทั้งสิ้น (Amount)</text>
    <text x="44" y="308" font-family="Prompt, sans-serif" font-size="24" font-weight="700" fill="#0f172a">฿${Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</text>

    <text x="30" y="358" font-family="Prompt, sans-serif" font-size="12" fill="#64748b">ค่าธรรมเนียม: ฿0.00</text>
    <text x="30" y="380" font-family="Prompt, sans-serif" font-size="12" fill="#64748b">รหัสอ้างอิงสลิป: ${refNo}</text>

    <rect x="275" y="345" width="70" height="70" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/>
    <text x="310" y="384" text-anchor="middle" font-family="monospace" font-size="11" fill="#475569">QR SLIP</text>
    <text x="190" y="438" text-anchor="middle" font-family="Prompt, sans-serif" font-size="11" fill="#94a3b8">SlipTrack Verified Electronic Receipt</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ข้อมูลตัวอย่างเริ่มต้น (Sample Data สำหรับทดสอบระบบ)
function getInitialSampleTransactions() {
  const today = new Date();
  const formatDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'tx-101',
      type: 'income',
      amount: 12000,
      category: 'รายรับ',
      transaction_date: formatDate(6),
      merchant: 'เงินเดือน / ค่าขนมรายเดือน',
      description: 'รายรับประจำเดือนจากทางบ้านและงาน Part-time',
      payment_method: 'โอนเงิน / สแกน QR',
      slip_image_url: '',
      created_at: new Date().toISOString()
    },
    {
      id: 'tx-102',
      type: 'expense',
      amount: 85,
      category: 'อาหารและเครื่องดื่ม',
      transaction_date: formatDate(4),
      merchant: '7-Eleven สาขามหาวิทยาลัย',
      description: 'ซื้อข้าวกล่อง กาแฟ และน้ำดื่มมื้อเช้า',
      payment_method: 'พร้อมเพย์ (PromptPay)',
      slip_image_url: generateMockSlipDataUrl({
        bankName: 'K PLUS',
        merchant: '7-Eleven (CP ALL)',
        amount: 85,
        date: formatDate(4),
        refNo: '20261017711092',
        accentColor: '#059669'
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 'tx-103',
      type: 'expense',
      amount: 140,
      category: 'เดินทาง',
      transaction_date: formatDate(3),
      merchant: 'Grab Transport',
      description: 'ค่ารถเดินทางไปเรียนตอนเช้าและกลับหอพัก',
      payment_method: 'โอนเงิน / สแกน QR',
      slip_image_url: generateMockSlipDataUrl({
        bankName: 'SCB EASY',
        merchant: 'GrabTaxi (Thailand)',
        amount: 140,
        date: formatDate(3),
        refNo: '20261018998123',
        accentColor: '#4f46e5'
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 'tx-104',
      type: 'expense',
      amount: 459,
      category: 'ช้อปปิ้ง',
      transaction_date: formatDate(2),
      merchant: 'Shopee Thailand',
      description: 'ซื้อของใช้ในหอพักและอุปกรณ์จัดโต๊ะอ่านหนังสือ',
      payment_method: 'e-Wallet (TrueMoney / ShopeePay)',
      slip_image_url: generateMockSlipDataUrl({
        bankName: 'ShopeePay',
        merchant: 'Shopee Thailand',
        amount: 459,
        date: formatDate(2),
        refNo: 'SP202610194410',
        accentColor: '#ea580c'
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 'tx-105',
      type: 'expense',
      amount: 320,
      category: 'การเรียน',
      transaction_date: formatDate(1),
      merchant: 'B2S Book & Stationery',
      description: 'ซื้อหนังสือเรียน Web Programming และสมุดจดเลคเชอร์',
      payment_method: 'พร้อมเพย์ (PromptPay)',
      slip_image_url: '',
      created_at: new Date().toISOString()
    },
    {
      id: 'tx-106',
      type: 'expense',
      amount: 650,
      category: 'บิลและค่าสาธารณูปโภค',
      transaction_date: formatDate(0),
      merchant: 'AIS Fibre & Mobile Bill',
      description: 'ชำระค่าอินเทอร์เน็ตรายเดือนและแพ็กเกจมือถือ',
      payment_method: 'โอนเงิน / สแกน QR',
      slip_image_url: generateMockSlipDataUrl({
        bankName: 'Krungthai NEXT',
        merchant: 'AIS Public Co., Ltd.',
        amount: 650,
        date: formatDate(0),
        refNo: 'KT202610218832',
        accentColor: '#0284c7'
      }),
      created_at: new Date().toISOString()
    }
  ];
}

/**
 * ฟังก์ชันแนะนำหมวดหมู่แบบง่ายจากคำสำคัญ (FR-08 / หัวข้อที่ 12)
 * @param {string} text ชื่อร้านค้า หรือรายละเอียดที่ผู้ใช้กรอก
 * @returns {{ category: string, matchedKeyword: string } | null}
 */
function suggestCategoryByKeyword(text) {
  if (!text || !text.trim()) return null;
  const normalized = text.toLowerCase().trim();

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        return {
          category: rule.category,
          matchedKeyword: kw
        };
      }
    }
  }
  return null;
}

// Data Service Object
const DataService = {
  getTransactions() {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      const sample = getInitialSampleTransactions();
      this.saveTransactions(sample);
      return sample;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  saveTransactions(list) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
  },

  addTransaction(txData) {
    const list = this.getTransactions();
    const newTx = {
      id: 'tx-' + Date.now(),
      type: txData.type || 'expense',
      amount: parseFloat(txData.amount) || 0,
      category: txData.category || 'อื่น ๆ',
      transaction_date: txData.transaction_date || new Date().toISOString().split('T')[0],
      description: txData.description || '',
      merchant: txData.merchant || '',
      payment_method: txData.payment_method || 'โอนเงิน / สแกน QR',
      slip_image_url: txData.slip_image_url || '',
      created_at: new Date().toISOString()
    };
    list.unshift(newTx);
    this.saveTransactions(list);
    return newTx;
  },

  updateTransaction(id, updatedFields) {
    const list = this.getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    list[idx] = {
      ...list[idx],
      ...updatedFields,
      amount: parseFloat(updatedFields.amount) || 0
    };
    this.saveTransactions(list);
    return list[idx];
  },

  deleteTransaction(id) {
    const list = this.getTransactions().filter((t) => t.id !== id);
    this.saveTransactions(list);
  },

  resetToSampleData() {
    const sample = getInitialSampleTransactions();
    this.saveTransactions(sample);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return sample;
  },

  getCategories() {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  },

  addCategory(name, type = 'expense') {
    const cats = this.getCategories();
    if (cats.some((c) => c.name === name.trim())) return null;
    const newCat = {
      id: 'cat-' + Date.now(),
      name: name.trim(),
      type
    };
    cats.push(newCat);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
    return newCat;
  },

  getMonthlyBudget() {
    const val = localStorage.getItem(STORAGE_KEYS.BUDGET);
    return val ? parseFloat(val) : 10000;
  },

  setMonthlyBudget(amount) {
    localStorage.setItem(STORAGE_KEYS.BUDGET, String(parseFloat(amount) || 10000));
  }
};
