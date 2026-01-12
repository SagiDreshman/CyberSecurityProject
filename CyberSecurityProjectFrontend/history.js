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

function render(history) {
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

    const itemsHtml = (h.items || []).map(it => `
      <li class="item">
        <span class="sku">SKU: ${it.sku}</span>
        <span class="qty">Qty: ${it.qty}</span>
      </li>
    `).join("");

    card.innerHTML = `
      <div class="card-head">
        <div>
          <div class="card-title">History #${h.id}</div>
          <div class="card-sub">${fmtDate(h.created_at)}</div>
        </div>
        <div class="pill paid">${(h.status || "paid").toUpperCase()}</div>
      </div>

      <div class="card-body">
        <ul class="items">
          ${itemsHtml}
        </ul>
      </div>
    `;

    grid.appendChild(card);
  });
}

async function loadHistory() {
  clearError();

  const token = localStorage.getItem("token");
  if (!token) {
    showError("אתה חייב להתחבר כדי לראות היסטוריה.");
    render([]);
    return;
  }

  try {
    const res = await fetch(API_URL + "/history/my", {
      method: "GET",
      headers: getAuthHeaders()
    });

    const text = await res.text();
    if (!res.ok) {
      showError("שגיאה: " + res.status + "\n" + text);
      return;
    }

    render(JSON.parse(text));
  } catch (e) {
    showError("שגיאת רשת: " + e.message);
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
