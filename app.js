const ANON_KEY = "sb_publishable_Ts2s7pcc7L8cYTk2odBP3w_dc0vn3-n";
const BASE_URL = "https://aclhknqvqbcqekqxdpdj.supabase.co/rest/v1";
let myChart = null;
const cardGlassEffect =document.querySelector(".card glass-effect")
let adminSalesCache = []; 
// --- مدیریت نمایش پنل بر اساس نقش کاربر ---
// ۱. اصلاح بخش ادمین در renderDashboard
function renderDashboard(user) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-panel').style.display = 'block';
    document.getElementById('admin-name').innerText = user.name;

    const statsBar = document.querySelector('.stats-bar');
    const allSections = document.querySelectorAll('.grid-container section');
    const userRole = user.role.toLowerCase().trim();

    if (userRole === 'admin') {
        if (statsBar) statsBar.style.display = 'none';

        allSections.forEach(section => {
            const title = section.querySelector('h3') ? section.querySelector('h3').innerText : "";
            
            if (title.includes("ثبت فروش")) {
                section.style.display = 'block';
                section.style.gridColumn = "1 / -1";
            } else if (title.includes("گزارش فروش")) {
                // نمایش بخش گزارش برای ادمین جهت نمایش خروجی فیلتر شده
                section.style.display = 'block';
                section.style.gridColumn = "1 / -1";
            } else {
                section.style.display = 'none';
            }
        });

        // فراخوانی دیتای مخصوص ادمین
        loadDataForAdmin(user.name);

    } else {
        // حالت سوپرادمین (کد خودت بدون تغییر)
        if (statsBar) statsBar.style.display = 'flex';
        allSections.forEach(section => {
            section.style.display = 'block';
            section.style.gridColumn = ""; 
        });
        const adminSection = document.getElementById('admin-management-section');
        if (adminSection) adminSection.style.display = 'block'; 
        loadDataFromDatabase();
        loadAdminsList();
    }
}

// ۲. تابع جدید برای لود دیتای ادمین و فیلتر ماهانه


async function loadDataForAdmin(adminName) {
    const url = `${BASE_URL}/sales?select=*&admin_name=eq.${adminName}&order=created_at.desc`;
    try {
        const res = await fetch(url, { 
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } 
        });
        adminSalesCache = await res.json();
        
        // ساخت باکس فیلتر و نمایش در بخش گزارش
        const container = document.getElementById('report-container');
        container.innerHTML = `
            <div class="admin-filter-area glass-effect" style="margin-bottom: 20px; padding: 15px; display: flex; gap: 15px; align-items: center;">
                <label>مشاهده فروش ماه:</label>
                <select id="admin-month-filter" onchange="filterAdminSales()" style="margin-bottom:0; width: 200px;">
                    <option value="all">همه ماه‌ها</option>
                    <option value="1">فروردین</option><option value="2">اردیبهشت</option><option value="3">خرداد</option>
                    <option value="4">تیر</option><option value="5">مرداد</option><option value="6">شهریور</option>
                    <option value="7">مهر</option><option value="8">آبان</option><option value="9">آذر</option>
                    <option value="10">دی</option><option value="11">بهمن</option><option value="12">اسفند</option>
                </select>
                <div class="stat-item">سود شما در این بازه: <span id="admin-period-profit" class="blue-text">۰</span> تومان</div>
            </div>
            <div id="admin-table-wrapper"></div>
        `;
        filterAdminSales(); // اجرای اولیه برای نمایش همه
    } catch (err) { console.error(err); }
}

// ۳. فیلتر کردن و نمایش با innerHTML
function filterAdminSales() {
    const monthFilter = document.getElementById('admin-month-filter');
    const tableWrapper = document.getElementById('admin-table-wrapper');
    const profitDisplay = document.getElementById('admin-period-profit');

    if (!monthFilter || !tableWrapper) return;

    const selectedMonth = monthFilter.value;

    // ۱. فیلتر کردن دیتا (اگر "all" بود همه، در غیر این صورت فیلتر بر اساس ماه)
    const filtered = selectedMonth === 'all' 
        ? adminSalesCache 
        : adminSalesCache.filter(s => s.month_id == selectedMonth);

    // ۲. محاسبه سود کل بازه فیلتر شده
    const totalProfit = filtered.reduce((sum, s) => {
        const rowProfit = s.amount - (s.purchase_price || (s.volume * 1200));
        return sum + rowProfit;
    }, 0);

    if (profitDisplay) {
        profitDisplay.innerText = totalProfit.toLocaleString();
    }

    // ۳. چک کردن اگر دیتایی وجود نداشت
    if (filtered.length === 0) {
        tableWrapper.innerHTML = `
            <div style="text-align:center; padding:30px; color:#aaa; border:1px dashed #444; border-radius:10px; margin-top:20px;">
                تراکنشی در این بازه زمانی یافت نشد.
            </div>`;
        return;
    }

    // ۴. ساخت جدول با وضعیت تسویه داینامیک
    let html = `
        <table class="sales-table">
            <thead>
                <tr>
                    <th>مشتری</th>
                    <th>حجم</th>
                    <th>مبلغ کل</th>
                    <th>سود شما</th>
                    <th>وضعیت تسویه</th>
                </tr>
            </thead>
            <tbody>`;

    filtered.forEach(s => {
        // محاسبه سود ردیف
        const rowProfit = s.amount - (s.purchase_price || (s.volume * 1200));
        
        // --- منطق اصلی وضعیت پرداخت ---
        // چک می‌کنیم اگر مقدار is_paid در دیتابیس true بود
        const isPaid = s.is_paid === true;

        const statusLabel = isPaid 
            ? '<span style="color: #00ff7f; background: rgba(0, 255, 127, 0.1); padding: 5px 10px; border-radius: 6px; font-weight: bold;">✅ پرداخت شده</span>' 
            : '<span style="color: #ff4444; background: rgba(255, 68, 68, 0.1); padding: 5px 10px; border-radius: 6px; font-weight: bold;">⏳ در انتظار</span>';

        html += `
            <tr style="${isPaid ? 'border-right: 4px solid #00ff7f;' : 'border-right: 4px solid #ff4444;'}">
                <td>${s.client_name}</td>
                <td>${s.volume} GB</td>
                <td>${s.amount.toLocaleString()}</td>
                <td class="blue-text">${rowProfit.toLocaleString()}</td>
                <td>${statusLabel}</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    tableWrapper.innerHTML = html;
}

async function loadAdminsList() {
    const tbody = document.getElementById('admins-list');
    if (!tbody) return; // اگر المان در HTML نبود، خارج شو

    // آدرس جدول یوزرها (نام جدول را طبق دیتابیس خودت که در تابع login استفاده کردی تنظیم کن)
    const url = `${BASE_URL}/users?select=*`; 

    try {
        const res = await fetch(url, { 
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } 
        });
        const admins = await res.json();

        tbody.innerHTML = admins.map(admin => `
            <tr>
                <td>${admin.name}</td>
                <td><span class="badge ${admin.role === 'superadmin' ? 'gold' : 'blue'}">${admin.role}</span></td>
                <td><span class="status-online">● فعال</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("خطا در لود لیست ادمین‌ها:", err);
    }
}

async function loadDataFromDatabase() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'superadmin') return;

    let url = `${BASE_URL}/sales?select=*&order=created_at.desc`;

    try {
        const res = await fetch(url, { 
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } 
        });
        const sales = await res.json();
        
        updateStats(sales);
        updateChart(sales);
        renderSalesTable(sales, user.role);
    } catch (err) {
        console.error("خطا در لود دیتا:", err);
    }
}

// --- توابع کمکی (بدون تغییر نسبت به قبل) ---

function renderSalesTable(sales, role) {
    const container = document.getElementById('report-container');
    let html = `<table class="sales-table"><thead><tr>
                <th>فروشنده</th><th>خریدار</th><th>حجم (GB)</th><th>مبلغ کل</th><th>وضعیت</th><th>عملیات</th>
                </tr></thead><tbody>`;

    sales.forEach(s => {
        const isChecked = s.is_paid ? 'checked' : '';
        html += `<tr id="row-${s.id}">
                <td>${s.admin_name}</td><td>${s.client_name}</td><td>${s.volume}</td><td>${s.amount.toLocaleString()}</td>
                <td><input type="checkbox" ${isChecked} onclick="togglePayment('${s.id}', this.checked)"></td>
                <td><button onclick="deleteSale('${s.id}')" class="btn-delete">🗑️ حذف</button></td></tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function addSale() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const client = document.getElementById('client-name').value;
    const volume = document.getElementById('sale-volume').value;
    const amount = document.getElementById('sale-amount').value;
    const month = document.getElementById('sale-month').value;

    if (!client || !volume || !amount) return alert("لطفاً همه فیلدها را پر کنید");

    const payload = {
        admin_name: user.name,
        client_name: client,
        volume: parseFloat(volume),
        amount: parseInt(amount),
        purchase_price: parseFloat(volume) * 1200,
        month_id: parseInt(month),
        created_at: new Date().toISOString()
    };

    try {
        const res = await fetch(`${BASE_URL}/sales`, {
            method: "POST",
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("تراکنش ثبت شد ✅");
            
            // --- اصلاح این بخش برای آپدیت بدون رفرش ---
            if (user.role.toLowerCase().trim() === 'superadmin') {
                loadDataFromDatabase(); // آپدیت دیتای سوپر ادمین
            } else {
                loadDataForAdmin(user.name); // آپدیت دیتای ادمین عادی (بدون رفرش)
            }
            // ---------------------------------------

            // پاک کردن فرم بعد از ثبت
            document.getElementById('client-name').value = '';
            document.getElementById('sale-volume').value = '';
            document.getElementById('sale-amount').value = '';
        }
    } catch (err) { console.error(err); }
}

async function login() {
    const userInp = document.getElementById('admin-user').value.trim();
    const passInp = document.getElementById('admin-pass').value.trim();
    const url = `${BASE_URL}/users?select=*&name=ilike.${userInp}&password=eq.${passInp}`;

    try {
        const res = await fetch(url, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } });
        const data = await res.json();
        if (data && data.length > 0) {
            localStorage.setItem('currentUser', JSON.stringify(data[0]));
            location.reload();
        } else { alert("کاربر یافت نشد!"); }
    } catch (err) { alert("خطا در اتصال"); }
}

function calcPurchase() {
    const vol = document.getElementById('sale-volume').value || 0;
    const purchasePrice = vol * 1200;
    document.getElementById('purchase-price-display').innerText = purchasePrice.toLocaleString();
}

function updateStats(sales) {
    const totalProfit = sales.reduce((sum, s) => sum + (s.amount - s.purchase_price), 0);
    document.getElementById('total-count').innerText = sales.length;
    document.getElementById('total-profit').innerText = totalProfit.toLocaleString();
}

function updateChart(sales) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const monthlyData = Array(12).fill(0);
    sales.forEach(s => { if (s.month_id >= 1 && s.month_id <= 12) monthlyData[s.month_id - 1] += s.amount; });
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'],
            datasets: [{ label: 'فروش (تومان)', data: monthlyData, borderColor: '#00d2ff', fill: true, tension: 0.4 }]
        }
    });
}

async function togglePayment(saleId, status) {
    try {
        const res = await fetch(`${BASE_URL}/sales?id=eq.${saleId}`, {
            method: "PATCH",
            headers: { 
                "apikey": ANON_KEY, 
                "Authorization": `Bearer ${ANON_KEY}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ is_paid: status }) // اینجا مقدار true یا false رو می‌فرسته
        });

        if (res.ok) {
            console.log("وضعیت پرداخت در دیتابیس آپدیت شد ✅");
            // بعد از آپدیت، دیتای جدید رو لود کن که همه چی هماهنگ باشه
            loadDataFromDatabase(); 
        }
    } catch (err) {
        console.error("خطا در آپدیت:", err);
    }
}

async function deleteSale(saleId) {
    if (!confirm("حذف شود؟")) return;
    const res = await fetch(`${BASE_URL}/sales?id=eq.${saleId}`, {
        method: "DELETE",
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
    });
    if (res.ok) loadDataFromDatabase();
}

function logout() { localStorage.removeItem('currentUser'); location.reload(); }

window.onload = () => {
    const user = localStorage.getItem('currentUser');
    if (user) renderDashboard(JSON.parse(user));
};

function filterTable() {
    // گرفتن متن تایپ شده
    const input = document.getElementById("search-input");
    const filter = input.value.toLowerCase();
    const table = document.querySelector(".sales-table");
    
    // اگر جدول هنوز ساخته نشده بود، خارج شو
    if (!table) return;

    const tr = table.getElementsByTagName("tr");

    // پیمایش تمام ردیف‌های جدول (به جز سرتیتر)
    for (let i = 1; i < tr.length; i++) {
        const tdSeller = tr[i].getElementsByTagName("td")[0]; // ستون فروشنده
        const tdBuyer = tr[i].getElementsByTagName("td")[1];  // ستون خریدار
        
        if (tdSeller || tdBuyer) {
            const txtValueSeller = tdSeller.textContent || tdSeller.innerText;
            const txtValueBuyer = tdBuyer.textContent || tdBuyer.innerText;
            
            // چک کردن اینکه آیا متن جستجو در نام فروشنده یا خریدار هست یا نه
            if (txtValueSeller.toLowerCase().indexOf(filter) > -1 || 
                txtValueBuyer.toLowerCase().indexOf(filter) > -1) {
                tr[i].style.display = ""; // نمایش ردیف
            } else {
                tr[i].style.display = "none"; // مخفی کردن ردیف
            }
        }
    }
}
