const ANON_KEY = "sb_publishable_Ts2s7pcc7L8cYTk2odBP3w_dc0vn3-n";
const BASE_URL = "https://aclhknqvqbcqekqxdpdj.supabase.co/rest/v1";
let myChart = null;
const cardGlassEffect =document.querySelector(".card glass-effect")
// --- مدیریت نمایش پنل بر اساس نقش کاربر ---
function renderDashboard(user) {
    // ۱. نمایش پنل اصلی
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-panel').style.display = 'block';
    document.getElementById('admin-name').innerText = user.name;

    const statsBar = document.querySelector('.stats-bar');
    const allSections = document.querySelectorAll('.grid-container section');

    // چک کردن دقیق نقش کاربر (حذف فضاهای خالی و تبدیل به حروف کوچک)
    const userRole = user.role.toLowerCase().trim();

    if (userRole === 'admin') {
        // مخفی کردن نوار آمار
        if (statsBar) statsBar.classList.add("hidden")

        allSections.forEach(section => {
            const title = section.querySelector('h3') ? section.querySelector('h3').innerText : "";
            
            if (title.includes("ثبت فروش")) {
                // این بخش بماند و تمام عرض شود
                section.style.display = 'block';
                section.style.gridColumn = "1 / -1";
            } else {
                // بقیه بخش‌ها (آنالیز و گزارش) مخفی شوند
                section.style.setProperty('display', 'none', 'important');
            }
        });
     // ... داخل تابع renderDashboard ...
} else {
    // حالت سوپرادمین
    if (statsBar) statsBar.style.display = 'flex';
    allSections.forEach(section => {
        section.style.display = 'block';
        section.style.gridColumn = ""; 
    });
    
    // این دو خط را حتماً اضافه کن:
    const adminSection = document.getElementById('admin-management-section');
    if (adminSection) adminSection.style.display = 'block'; 
    
    loadDataFromDatabase();
    loadAdminsList(); // صدا زدن تابع لود ادمین‌ها
    }
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
            if (user.role === 'superadmin') loadDataFromDatabase();
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
    await fetch(`${BASE_URL}/sales?id=eq.${saleId}`, {
        method: "PATCH",
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_paid: status })
    });
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