document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const user = getUser();
  const logoutBtn = document.getElementById('logoutBtn');
  const alertContainer = document.getElementById('alertContainer');
  const adminSetupCard = document.getElementById('adminSetupCard');
  const claimAdminBtn = document.getElementById('claimAdminBtn');

  const statTotalAmount = document.getElementById('statTotalAmount');
  const statTotalCount = document.getElementById('statTotalCount');
  const statTotalColleagues = document.getElementById('statTotalColleagues');

  const searchInput = document.getElementById('searchInput');
  const recordCountDisplay = document.getElementById('recordCountDisplay');
  const transactionsContainer = document.getElementById('transactionsContainer');

  let allPayments = [];

  // Logout Listener
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Check admin role
  if (user && user.role !== 'admin') {
    adminSetupCard.classList.remove('hidden');
    showAlert('Your account currently has standard user permissions. Click "Grant Admin Access" to activate admin rights.', 'warning');
  }

  // Claim admin listener
  if (claimAdminBtn) {
    claimAdminBtn.addEventListener('click', async () => {
      try {
        const response = await authFetch('/api/admin/make-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await response.json();
        if (data.success) {
          user.role = 'admin';
          setAuth(getToken(), user);
          adminSetupCard.classList.add('hidden');
          showAlert('Admin access granted! Loading all system transactions...', 'success');
          initAdminDashboard();
        } else {
          showAlert(data.message || 'Failed to activate admin access.', 'error');
        }
      } catch (err) {
        console.error('Claim admin error:', err);
        showAlert(err.message || 'Error granting admin access.', 'error');
      }
    });
  }

  // Search input filter listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterTransactions(query);
    });
  }

  async function initAdminDashboard() {
    await loadStats();
    await loadAllPayments();
  }

  async function loadStats() {
    try {
      const response = await authFetch('/api/admin/stats');
      const data = await response.json();

      if (data.success && data.stats) {
        const formattedAmount = new Intl.NumberFormat('en-AE', {
          style: 'currency',
          currency: 'AED'
        }).format(data.stats.totalAmount || 0);

        statTotalAmount.textContent = formattedAmount;
        statTotalCount.textContent = data.stats.totalTransactions || 0;
        statTotalColleagues.textContent = data.stats.activeColleaguesCount || 0;
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  }

  async function loadAllPayments() {
    try {
      const response = await authFetch('/api/admin/payments');
      const data = await response.json();

      if (data.success && data.payments) {
        allPayments = data.payments;
        renderTransactions(allPayments);
      } else {
        if (response.status === 403) {
          adminSetupCard.classList.remove('hidden');
          transactionsContainer.innerHTML = `
            <div class="p-8 text-center text-slate-500">
              <i class="fas fa-lock text-3xl mb-2 text-purple-400"></i>
              <p class="text-sm font-semibold">Admin authorization required to view all transactions.</p>
              <p class="text-xs text-slate-400 mt-1">Click the "Grant Admin Access" button above to activate your admin role.</p>
            </div>
          `;
        } else {
          transactionsContainer.innerHTML = `<div class="p-6 text-center text-slate-400">Unable to load transactions.</div>`;
        }
      }
    } catch (err) {
      console.error('Error fetching admin payments:', err);
      transactionsContainer.innerHTML = `<div class="p-6 text-center text-slate-400">Failed to load system transactions.</div>`;
    }
  }

  function filterTransactions(query) {
    if (!query) {
      renderTransactions(allPayments);
      return;
    }

    const filtered = allPayments.filter(p => {
      const colleagueName = p.user ? p.user.username.toLowerCase() : '';
      const colleagueEmail = p.user ? p.user.email.toLowerCase() : '';
      const description = (p.description || '').toLowerCase();
      return colleagueName.includes(query) || colleagueEmail.includes(query) || description.includes(query);
    });

    renderTransactions(filtered);
  }

  function renderTransactions(payments) {
    if (recordCountDisplay) {
      recordCountDisplay.textContent = `Showing ${payments.length} of ${allPayments.length} records`;
    }

    if (payments.length === 0) {
      transactionsContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <i class="fas fa-search text-3xl mb-2 text-slate-300"></i>
          <p class="text-sm font-medium">No matching payment records found.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
              <th class="px-6 py-3.5">Submitting Colleague</th>
              <th class="px-6 py-3.5">Date</th>
              <th class="px-6 py-3.5">Amount</th>
              <th class="px-6 py-3.5">Purpose / Description</th>
              <th class="px-6 py-3.5">Receipt Attachment</th>
              <th class="px-6 py-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
    `;

    payments.forEach(p => {
      const colleagueName = p.user ? p.user.username : 'Unknown Colleague';
      const colleagueEmail = p.user ? p.user.email : '';
      const initial = colleagueName.charAt(0).toUpperCase();

      const dateFormatted = new Date(p.paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const amountFormatted = new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED'
      }).format(p.amount);

      const statusBadge = p.emailSentStatus
        ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fas fa-paper-plane mr-1 text-xs"></i> Emailed</span>`
        : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><i class="fas fa-clock mr-1 text-xs"></i> Logged</span>`;

      html += `
        <tr class="hover:bg-slate-50/60 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center border border-purple-200">
                ${initial}
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900 leading-tight">${escapeHtml(colleagueName)}</p>
                <p class="text-xs text-slate-400 leading-tight">${escapeHtml(colleagueEmail)}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-slate-800">${dateFormatted}</td>
          <td class="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">${amountFormatted}</td>
          <td class="px-6 py-4 max-w-xs truncate text-slate-600" title="${escapeHtml(p.description)}">${escapeHtml(p.description)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-slate-500">
            <span class="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <i class="fas fa-paperclip text-slate-400"></i> ${escapeHtml(p.receiptOriginalName || 'Receipt')}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right">${statusBadge}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    transactionsContainer.innerHTML = html;
  }

  function showAlert(message, type = 'error') {
    alertContainer.innerHTML = '';
    const styles = {
      error: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-purple-50 text-purple-700 border-purple-200'
    };

    const icons = {
      error: '<i class="fas fa-exclamation-circle text-red-500 mr-2.5 text-lg"></i>',
      success: '<i class="fas fa-check-circle text-emerald-500 mr-2.5 text-lg"></i>',
      warning: '<i class="fas fa-user-shield text-purple-500 mr-2.5 text-lg"></i>'
    };

    const alertDiv = document.createElement('div');
    alertDiv.className = `p-4 rounded-xl border ${styles[type]} flex items-center text-sm font-medium animate-fade-in shadow-sm`;
    alertDiv.innerHTML = `${icons[type]} <span class="flex-1">${message}</span>`;

    alertContainer.appendChild(alertDiv);
    alertContainer.classList.remove('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Initialize
  initAdminDashboard();
});
