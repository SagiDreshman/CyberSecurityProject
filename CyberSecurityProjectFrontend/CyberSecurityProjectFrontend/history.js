const API_URL = "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("he-IL");
}

function moneyILS(x) {
  const n = Number(x || 0);
  return "₪" + n.toFixed(2);
}

function showError(msg) {
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "block";
  errorBox.textContent = msg;
}

function clearError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "none";
  errorBox.textContent = "";
}

async function fetchCatalogMap() {
  try {
    const res = await fetch(API_URL + "/equipment", {
      method: "GET",
      headers: getAuthHeaders()
    });

    const text = await res.text();
    if (!res.ok) return {};

    const list = JSON.parse(text);
    const map = {};
    (list || []).forEach(p => {
      const sku = String(p.sku ?? "");
      if (!sku) return;
      map[sku] = {
        name: p.name ?? "Unknown product",
        price: Number(p.price ?? 0)
      };
    });
    return map;
  } catch (e) {
    return {};
  }
}

function render(history, catalogMap) {
  const grid = document.getElementById("historyGrid");
  const emptyBox = document.getElementById("emptyBox");

  grid.innerHTML = "";

  if (!history || history.length === 0) {
    emptyBox.style.display = "block";
    return;
  }
  emptyBox.style.display = "none";

  history.forEach(h => {
    const card = document.createElement("div");
    card.className = "card";

    let orderTotal = 0;

const merged = {}; 
(h.items || []).forEach(it => {
  const sku = String(it.sku);
  const qty = Number(it.qty || 0);
  merged[sku] = (merged[sku] || 0) + qty;
});

const itemsHtml = Object.entries(merged).map(([sku, qty]) => {
  const prod = catalogMap[sku];
  const name = prod ? prod.name : "Unknown product";
  const unitPrice = prod ? Number(prod.price || 0) : 0;

  const lineTotal = qty * unitPrice;
  orderTotal += lineTotal;

  return `
    <li class="item">
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span class="sku">${name}</span>
        <span class="qty">SKU: ${sku} • Qty: ${qty}</span>
      </div>

      <div style="text-align:right; min-width:140px;">
        <div class="sku">${moneyILS(lineTotal)}</div>
        <div class="qty">${moneyILS(unitPrice)} each</div>
      </div>
    </li>
  `;
}).join("");

    card.innerHTML = `
      <div class="card-head">
        <div>
          <div class="card-title">Order #${h.id}</div>
          <div class="card-sub">${fmtDate(h.created_at)}</div>
        </div>
        <div class="pill paid">${(h.status || "paid").toUpperCase()}</div>
      </div>

      <div class="card-body">
        <ul class="items">
          ${itemsHtml}
        </ul>

        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--line); padding-top:12px;">
          <div class="qty" style="font-size:13px;">Final Total</div>
          <div class="sku" style="font-size:16px;">${moneyILS(orderTotal)}</div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

async function loadHistory() {
  clearError();

  const token = localStorage.getItem("token");
  if (!token) {
    showError("You must login to view your orders history.");
    render([], {});
    return;
  }

  try {
    const catalogMap = await fetchCatalogMap();

    const res = await fetch(API_URL + "/history/my", {
      method: "GET",
      headers: getAuthHeaders()
    });

    const text = await res.text();
    if (!res.ok) {
      showError("Error: " + res.status + "\n" + text);
      return;
    }

    render(JSON.parse(text), catalogMap);
  } catch (e) {
    showError("Network error: " + e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("homeBtn").addEventListener("click", () => {
    window.location.href = "web.html";
  });
  document.getElementById("cartBtn").addEventListener("click", () => {
    window.location.href = "MyCart.html";
  });
  document.getElementById("refreshBtn").addEventListener("click", loadHistory);

  loadHistory();
});