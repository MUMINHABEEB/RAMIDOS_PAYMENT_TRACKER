document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const user = getUser();
  const userNameEl = document.getElementById('userNameDisplay');
  const userEmailEl = document.getElementById('userEmailDisplay');
  const colleagueNameInput = document.getElementById('colleagueName');
  const paymentDateInput = document.getElementById('paymentDate');
  const paymentForm = document.getElementById('paymentForm');
  
  const receiptInput = document.getElementById('receiptInput');
  const dropzone = document.getElementById('dropzone');
  const dropzonePrompt = document.getElementById('dropzonePrompt');
  const filePreview = document.getElementById('filePreview');
  const fileNameEl = document.getElementById('fileName');
  const fileSizeEl = document.getElementById('fileSize');
  const removeFileBtn = document.getElementById('removeFileBtn');

  const alertContainer = document.getElementById('alertContainer');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  const historyContainer = document.getElementById('historyContainer');
  const logoutBtn = document.getElementById('logoutBtn');

  const adminNavBtn = document.getElementById('adminNavBtn');

  // Set Logged-In User Information
  if (user) {
    if (userNameEl) userNameEl.textContent = user.username;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (colleagueNameInput) colleagueNameInput.value = `${user.username} (${user.email})`;
    
    // Show Admin Panel button ONLY if user is an admin
    if (user.role === 'admin' && adminNavBtn) {
      adminNavBtn.classList.remove('hidden');
    }
  }

  // Check URL parameters for unauthorized access attempt
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('unauthorized') === 'true') {
    showAlert('Access denied. Administrator privileges are required to view the Admin Panel.', 'error');
  }

  // Logout listener
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Default date to today (YYYY-MM-DD)
  if (paymentDateInput) {
    const today = new Date().toISOString().split('T')[0];
    paymentDateInput.value = today;
  }

  // Click dropzone to open file picker
  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#removeFileBtn')) {
      return;
    }
    receiptInput.click();
  });

  receiptInput.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  });

  receiptInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelectedFile();
  });

  function handleFileSelection(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Invalid file type. Please upload an Image (JPG, PNG, WEBP) or a PDF receipt.', 'error');
      clearSelectedFile();
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showAlert('File size exceeds 15MB limit. Please upload a smaller file.', 'error');
      clearSelectedFile();
      return;
    }

    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);

    // Update File Icon
    const fileIcon = document.getElementById('fileIcon');
    if (file.type === 'application/pdf') {
      fileIcon.className = 'fas fa-file-pdf text-3xl text-red-500 mr-3';
    } else {
      fileIcon.className = 'fas fa-file-image text-3xl text-indigo-500 mr-3';
    }

    dropzonePrompt.classList.add('hidden');
    filePreview.classList.remove('hidden');
  }

  function clearSelectedFile() {
    selectedFile = null;
    receiptInput.value = '';
    dropzonePrompt.classList.remove('hidden');
    filePreview.classList.add('hidden');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- Payment Submission ---
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const amount = document.getElementById('amount').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const description = document.getElementById('description').value.trim();

    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid payment amount.', 'error');
      return;
    }

    if (!paymentDate) {
      showAlert('Please select a payment date.', 'error');
      return;
    }

    if (!description) {
      showAlert('Please provide a description or purpose for the payment.', 'error');
      return;
    }

    if (!selectedFile) {
      showAlert('Please attach a receipt file (Image or PDF).', 'error');
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('paymentDate', paymentDate);
    formData.append('description', description);
    formData.append('receipt', selectedFile);

    setLoading(true);

    try {
      const response = await authFetch('/api/payments', {
        method: 'POST',
        body: formData // multipart/form-data
      });

      const data = await response.json();

      if (data.success) {
        if (data.emailSent) {
          showAlert('Payment record submitted and receipt emailed successfully!', 'success');
        } else {
          showAlert('Payment saved to database! Note: Receipt email dispatch experienced an issue (check SMTP settings).', 'warning');
        }
        
        // Reset form
        paymentForm.reset();
        clearSelectedFile();
        const today = new Date().toISOString().split('T')[0];
        paymentDateInput.value = today;

        // Refresh History
        loadPaymentHistory();
      } else {
        showAlert(data.message || 'Failed to submit payment record.', 'error');
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      showAlert(error.message || 'An error occurred while submitting payment.', 'error');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      btnText.textContent = 'Processing & Emailing Receipt...';
      btnSpinner.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      btnText.textContent = 'Submit Payment Record';
      btnSpinner.classList.add('hidden');
    }
  }

  function showAlert(message, type = 'error') {
    alertContainer.innerHTML = '';
    const styles = {
      error: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200'
    };

    const icons = {
      error: '<i class="fas fa-exclamation-circle text-red-500 mr-2.5 text-lg"></i>',
      success: '<i class="fas fa-check-circle text-emerald-500 mr-2.5 text-lg"></i>',
      warning: '<i class="fas fa-triangle-exclamation text-amber-500 mr-2.5 text-lg"></i>'
    };

    const alertDiv = document.createElement('div');
    alertDiv.className = `p-4 rounded-xl border ${styles[type]} flex items-center text-sm font-medium animate-fade-in shadow-sm`;
    alertDiv.innerHTML = `${icons[type]} <span class="flex-1">${message}</span>`;

    alertContainer.appendChild(alertDiv);
    alertContainer.classList.remove('hidden');
    
    // Scroll to alert smoothly
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    alertContainer.classList.add('hidden');
    alertContainer.innerHTML = '';
  }

  // --- Load Submission History ---
  async function loadPaymentHistory() {
    if (!historyContainer) return;

    try {
      const response = await authFetch('/api/payments/history');
      const data = await response.json();

      if (data.success && data.payments) {
        renderHistoryTable(data.payments);
      } else {
        historyContainer.innerHTML = `<div class="p-6 text-center text-slate-400">Unable to load submission history.</div>`;
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      historyContainer.innerHTML = `<div class="p-6 text-center text-slate-400">Failed to load history records.</div>`;
    }
  }

  function renderHistoryTable(payments) {
    if (payments.length === 0) {
      historyContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <i class="fas fa-receipt text-3xl mb-2 text-slate-300"></i>
          <p class="text-sm font-medium">No payment records logged yet.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
              <th class="px-6 py-3.5">Date</th>
              <th class="px-6 py-3.5">Amount</th>
              <th class="px-6 py-3.5">Purpose / Description</th>
              <th class="px-6 py-3.5">Receipt Reference</th>
              <th class="px-6 py-3.5 text-right">Email Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
    `;

    payments.forEach(p => {
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
          <td class="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">${dateFormatted}</td>
          <td class="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">${amountFormatted}</td>
          <td class="px-6 py-4 max-w-xs truncate text-slate-600">${escapeHtml(p.description)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-slate-500">
            <span class="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <i class="fas fa-paperclip text-slate-400"></i> ${escapeHtml(p.receiptOriginalName || 'Attachment')}
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

    historyContainer.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Load history on initial page render
  loadPaymentHistory();
});
