let transactions = [];
let isEditing = false;
let currentEditId = null;

const form = document.getElementById('transaction-form');
const list = document.getElementById('history-list');
const balanceEl = document.getElementById('current-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expenses');
const msgEl = document.getElementById('feedback-message');
const filterTypeEl = document.getElementById('filter-type');
const filterCategoryEl = document.getElementById('filter-category');
const filterMonthEl = document.getElementById('filter-month');
const submitBtn = document.querySelector('.btn-submit');

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

function addTransaction(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const category = document.getElementById('category').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value || '-';

    // Validasi
    if (!category || !paymentMethod || !amount || !date || amount <= 0) {
        showFeedback('Semua field wajib diisi dan Nominal harus positif.', false);
        return;
    }

   
    if (isEditing) {
        updateTransaction(currentEditId, { type, category, paymentMethod, amount: +amount, date, description });
    } else {
        const newTransaction = {
            id: generateID(),
            type,
            category,
            paymentMethod,
            amount: +amount, 
            date,
            description
        };
        transactions.push(newTransaction);
        showFeedback('Transaksi berhasil ditambahkan!', true);
    }
    
    resetForm();
    renderTransactions();
}

function generateID() {
    return Math.floor(Math.random() * 100000000);
}

function createTransactionCard(trans) {
    const isExpense = trans.type === 'expense';
    const sign = isExpense ? '-' : '+';
    const amountClass = isExpense ? 'amount-expense' : 'amount-income';
    const borderClass = isExpense ? 'expense-border' : 'income-border';

    const dateDisplay = new Date(trans.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});

    const card = document.createElement('div');
    card.classList.add('transaction-card', borderClass);
    card.setAttribute('data-id', trans.id);

    card.innerHTML = `
        <div class="details">
            <h4>${trans.category}</h4>
            <p>${trans.description}</p>
            <small>${dateDisplay}</small>
        </div>
        <div class="amount-action-group">
            <span class="transaction-amount ${amountClass}">
                ${sign} ${formatRupiah(trans.amount)}
            </span>
            <button class="action-btn delete-btn" onclick="deleteTransaction(${trans.id})">🗑️</button>
            <button class="action-btn edit-btn" onclick="prepareEdit(${trans.id})">✏️</button>
        </div>
    `;

    return card;
}

function updateSummary(filteredData) {
    const income = filteredData
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = filteredData
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;

    balanceEl.innerText = formatRupiah(balance);
    incomeEl.innerText = `+${formatRupiah(income)}`;
    expenseEl.innerText = `-${formatRupiah(expense)}`;
}

//Filter Data 
function renderTransactions() {
    list.innerHTML = ''; 
    
    const typeFilter = filterTypeEl.value;
    const categoryFilter = filterCategoryEl.value;
    const monthFilter = filterMonthEl.value;
    const currentYear = new Date().getFullYear(); 

    const filteredTransactions = transactions.filter(t => {
        
        const typeMatch = typeFilter === 'all' || t.type === typeFilter;
        
        const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;

        const transDate = new Date(t.date);
        const transMonth = transDate.getMonth();
        const monthMatch = monthFilter === 'all' || (transMonth == monthFilter && transDate.getFullYear() == currentYear);
        
        return typeMatch && categoryMatch && monthMatch;
    });

    filteredTransactions.forEach(t => list.appendChild(createTransactionCard(t)));

    updateSummary(filteredTransactions);
}

// Delete
function deleteTransaction(id) {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        transactions = transactions.filter(t => t.id !== id);
        showFeedback('Transaksi berhasil dihapus!', true);
        renderTransactions();
    }
}

// Update data
function prepareEdit(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
    document.getElementById('category').value = transaction.category;
    document.getElementById('payment-method').value = transaction.paymentMethod;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('date').value = transaction.date;
    document.getElementById('description').value = transaction.description;

    isEditing = true;
    currentEditId = id;
    submitBtn.innerText = 'Update Transaction';
    document.querySelector('.add-transaction-section h3').innerText = 'Edit Transaction';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateTransaction(id, updatedData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return;

    transactions[index] = { ...transactions[index], ...updatedData };
    showFeedback('Transaksi berhasil diupdate!', true);
}

function resetForm() {
    form.reset();
    isEditing = false;
    currentEditId = null;
    submitBtn.innerText = 'Submit';
    document.querySelector('.add-transaction-section h3').innerText = 'Add Transaction';
    document.getElementById('date').valueAsDate = new Date(); // Set tanggal hari ini
}

function showFeedback(message, isSuccess) {
    msgEl.innerText = message;
    msgEl.className = isSuccess ? 'msg-success' : 'msg-error';
    msgEl.classList.remove('hidden');
    setTimeout(() => msgEl.classList.add('hidden'), 3000);
}

function scrollToHistory() {
    document.getElementById('transaction-history').scrollIntoView({ behavior: 'smooth' });
}

form.addEventListener('submit', addTransaction);
document.addEventListener('DOMContentLoaded', () => {
 
    document.getElementById('date').valueAsDate = new Date();
    filterMonthEl.value = new Date().getMonth();
    renderTransactions();
});