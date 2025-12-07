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

const toggleBtn = document.getElementById('toggle-form-btn');
const formContainer = document.getElementById('form-container'); 
const categorySelect = document.getElementById('category');
const typeRadios = document.querySelectorAll('input[name="type"]');

const CATEGORIES = {
    income: [
        { value: 'Salary', text: 'Salary' },
        { value: 'Investment', text: 'Investment' },
        { value: 'Bonus', text: 'Bonus' },
        { value: 'Other Income', text: 'Other Income' }
    ],
    expense: [
        { value: 'Food', text: 'Food' },
        { value: 'Transport', text: 'Transport' },
        { value: 'Shopping', text: 'Shopping' },
        { value: 'Bill', text: 'Bill/Tagihan' },
        { value: 'Rent', text: 'Rent/Sewa' },
        { value: 'Other Expense', text: 'Other Expense' }
    ]
};

function saveTransactionsToLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

function toggleForm() {
    formContainer.classList.toggle('hidden-form');
    const isHidden = formContainer.classList.contains('hidden-form');
    
    toggleBtn.innerText = isHidden ? '+ Add New Transaction' : '- Close Form';
    
    toggleBtn.classList.toggle('btn-toggle-form--close');
    
    if (!isHidden) {
        window.scrollTo({ top: toggleBtn.offsetTop, behavior: 'smooth' });
    }
}

function updateCategoryOptions(initialLoad = false, currentCategory = null) {
    let selectedType = 'income';
    if (!initialLoad) {
        selectedType = document.querySelector('input[name="type"]:checked').value;
    }
    
    const optionsArray = CATEGORIES[selectedType];
    
    categorySelect.innerHTML = '<option value="">Choose Categories</option>';
    
    optionsArray.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.innerText = cat.text;
        categorySelect.appendChild(option);
    });

    if (currentCategory) {
        categorySelect.value = currentCategory;
    }
}

function updateFilterCategoryOptions() {
    const selectedFilterType = filterTypeEl.value; 
    
    filterCategoryEl.innerHTML = '<option value="all">All Categories</option>';
    
    let categoriesToDisplay = [];

    if (selectedFilterType === 'income') {
        categoriesToDisplay = CATEGORIES.income;
    } else if (selectedFilterType === 'expense') {
        categoriesToDisplay = CATEGORIES.expense;
    } else {
        
        const allCategoriesMap = new Map();
        
        CATEGORIES.income.forEach(cat => allCategoriesMap.set(cat.value, cat));
        CATEGORIES.expense.forEach(cat => allCategoriesMap.set(cat.value, cat));
        
        categoriesToDisplay = Array.from(allCategoriesMap.values());
    }
    
    categoriesToDisplay.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.innerText = cat.text;
        filterCategoryEl.appendChild(option);
    });

    renderTransactions(); 
}

function addTransaction(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const category = document.getElementById('category').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value || '-';

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
        transactions.unshift(newTransaction); 
        
        showFeedback('Transaksi berhasil ditambahkan!', true);
        saveTransactionsToLocalStorage();
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

    const dateDisplay = new Date(trans.date).toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'});

    const card = document.createElement('div');
    card.classList.add('transaction-card', borderClass);
    card.setAttribute('data-id', trans.id);

    card.innerHTML = `
        <div class="details">
            <h4>${trans.category} - ${trans.paymentMethod} </h4>
            <p>${trans.description}</p>
            <small style="color:#4071A8;">${dateDisplay}</small>
        </div>
        <div class="amount-action-group">
            <span class="transaction-amount ${amountClass}">
                ${sign} ${formatRupiah(trans.amount)}
            </span>
            <button class="action-btn delete-btn" onclick="deleteTransaction(${trans.id})"><i class="fa-solid fa-trash-can"></i></button>
            <button class="action-btn edit-btn" onclick="prepareEdit(${trans.id})"><i class="fa-solid fa-pen-to-square"></i></button>
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

function renderTransactions() {
    list.innerHTML = ''; 
    
    const typeFilter = filterTypeEl.value;
    const categoryFilter = filterCategoryEl.value;
    const monthFilter = filterMonthEl.value;
    const currentYear = new Date().getFullYear(); 

    const filteredTransactions = transactions.filter(t => {
        
        const typeMatch = typeFilter === 'all' || t.type === typeFilter;
        
        const transDate = new Date(t.date);
        const transMonth = transDate.getMonth();
        const monthMatch = monthFilter === 'all' || (Number(monthFilter) === transMonth && transDate.getFullYear() === currentYear);
        
        let categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;

        if (typeFilter === 'all' && categoryFilter !== 'all') {

        }

        return typeMatch && categoryMatch && monthMatch;
    });

    filteredTransactions.forEach(t => list.appendChild(createTransactionCard(t)));

    updateSummary(filteredTransactions);
}

function deleteTransaction(id) {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        transactions = transactions.filter(t => t.id !== id);
        showFeedback('Transaksi berhasil dihapus!', true);
        
        saveTransactionsToLocalStorage(); 
        
        renderTransactions();
    }
}

function prepareEdit(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    if (formContainer.classList.contains('hidden-form')) {
        toggleForm();
    }

    document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
    
    updateCategoryOptions(false, transaction.category); 

    document.getElementById('payment-method').value = transaction.paymentMethod;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('date').value = transaction.date;
    document.getElementById('description').value = transaction.description;

    isEditing = true;
    currentEditId = id;
    submitBtn.innerText = 'Update Transaction';

   formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateTransaction(id, updatedData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return;

    transactions[index] = { ...transactions[index], ...updatedData };
    showFeedback('Transaksi berhasil diupdate!', true);
    
    saveTransactionsToLocalStorage(); 
}

function resetForm() {
    form.reset();
    isEditing = false;
    currentEditId = null;
    submitBtn.innerText = 'Submit';
    
    updateCategoryOptions(true); 
    
    if (!formContainer.classList.contains('hidden-form')) {
        toggleForm(); 
    }
    
    document.getElementById('date').valueAsDate = new Date(); 
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
toggleBtn.addEventListener('click', toggleForm); 

typeRadios.forEach(radio => {
    radio.addEventListener('change', () => updateCategoryOptions(false));
});

filterTypeEl.addEventListener('change', updateFilterCategoryOptions); 

filterCategoryEl.addEventListener('change', renderTransactions); 
filterMonthEl.addEventListener('change', renderTransactions); 

document.addEventListener('DOMContentLoaded', () => {
    const savedTransactions = localStorage.getItem('transactions');
    
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }
    
    document.getElementById('date').valueAsDate = new Date();
    filterMonthEl.value = new Date().getMonth();

    updateFilterCategoryOptions(); 

    updateCategoryOptions(true); 

    renderTransactions();
});