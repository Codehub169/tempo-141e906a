document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('#main-nav a');
    const sections = document.querySelectorAll('.section');

    // Dashboard Elements
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const netBalanceEl = document.getElementById('net-balance');
    const spendingChartCanvas = document.getElementById('spending-chart');
    const dashboardMessageEl = document.getElementById('dashboard-message');

    // Transactions Elements
    const addTransactionForm = document.getElementById('add-transaction-form');
    const transactionTableBody = document.querySelector('#transaction-table tbody');
    const transactionMessageEl = document.getElementById('transaction-message');

    // Savings Goals Elements
    const addGoalForm = document.getElementById('add-goal-form');
    const goalsListContainer = document.getElementById('goals-list-container');
    const goalMessageEl = document.getElementById('goal-message');

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editModalTitle = document.getElementById('edit-modal-title');
    const editModalFields = document.getElementById('edit-modal-fields');
    const editForm = document.getElementById('edit-form'); // Assumes a form inside modal-fields
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const closeButton = editModal.querySelector('.close-button');

    let spendingChart = null;
    let currentEditData = null; // To store data for item being edited

    const API_BASE_URL = '/api';

    // --- Navigation --- 
    function setActiveNav(targetId) {
        navLinks.forEach(link => {
            link.classList.remove('active-nav');
            if (link.getAttribute('href') === `#${targetId}`) {
                link.classList.add('active-nav');
            }
        });
    }

    function showView(viewId) {
        sections.forEach(section => section.classList.remove('active'));
        const activeSection = document.getElementById(viewId);
        if (activeSection) {
            activeSection.classList.add('active');
            setActiveNav(viewId);
            // Load data for the new view
            switch (viewId) {
                case 'dashboard-section':
                    loadDashboardData();
                    break;
                case 'transactions-section':
                    loadTransactions();
                    break;
                case 'goals-section':
                    loadGoals();
                    break;
            }
        } else {
            console.error(`View with ID ${viewId} not found.`);
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = e.target.closest('a').getAttribute('href').substring(1);
            showView(targetView);
        });
    });

    // --- API Helper --- 
    async function fetchData(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            displayMessageGeneric(`Error: ${error.message}`, 'error', getCurrentViewMessageContainer());
            throw error;
        }
    }

    // --- Utility Functions ---
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
         // Adjust for timezone offset to display date as entered
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    
    function clearForm(formElement) {
        if (formElement) formElement.reset();
    }

    function displayMessage(element, message, type = 'info') {
        if(element){
            element.innerHTML = `<div class="message ${type}">${message}</div>`;
            element.style.display = 'block';
        } else {
            console.warn('Message element not found for:', message);
        }
    }

    function displayMessageGeneric(message, type = 'info', containerId) {
        const container = document.getElementById(containerId);
        if(container) {
             displayMessage(container, message, type);
        } else {
            // Fallback if specific container not found or not relevant
            const activeSection = document.querySelector('.section.active');
            const messageContainer = activeSection ? activeSection.querySelector('.message-container') : null; // Assumes .message-container in sections
            if(messageContainer) displayMessage(messageContainer, message, type);
            else alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    function getCurrentViewMessageContainer() {
        const activeSection = document.querySelector('.section.active');
        if (!activeSection) return null;
        if (activeSection.id === 'dashboard-section') return dashboardMessageEl;
        if (activeSection.id === 'transactions-section') return transactionMessageEl;
        if (activeSection.id === 'goals-section') return goalMessageEl;
        return null;
    }

    // --- Dashboard --- 
    async function loadDashboardData() {
        try {
            const summary = await fetchData('/insights/summary');
            totalIncomeEl.textContent = formatCurrency(summary.totalIncome || 0);
            totalExpensesEl.textContent = formatCurrency(summary.totalExpenses || 0);
            netBalanceEl.textContent = formatCurrency(summary.netBalance || 0);
            if (dashboardMessageEl) dashboardMessageEl.style.display = 'none';

            const spendingData = await fetchData('/insights/spending-by-category');
            renderSpendingChart(spendingData);
        } catch (error) {
            displayMessage(dashboardMessageEl, `Failed to load dashboard data: ${error.message}`, 'error');
        }
    }

    function renderSpendingChart(data) {
        if (!spendingChartCanvas) return;
        const ctx = spendingChartCanvas.getContext('2d');

        if (!data || data.length === 0) {
            displayMessage(dashboardMessageEl, 'No spending data available to display chart.', 'info');
            if(spendingChart) spendingChart.destroy();
            spendingChart = null;
            spendingChartCanvas.style.display = 'none';
            return;
        }
        spendingChartCanvas.style.display = 'block';
        if (dashboardMessageEl && dashboardMessageEl.innerHTML.includes('No spending data')) dashboardMessageEl.style.display = 'none';

        const labels = data.map(item => item.category);
        const amounts = data.map(item => item.totalAmount);

        if (spendingChart) {
            spendingChart.destroy();
        }

        spendingChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Spending by Category',
                    data: amounts,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#FFCD56', '#C9CBCF', '#3C4043', '#F5A623'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Spending by Category'
                    }
                }
            }
        });
    }

    // --- Transactions --- 
    async function loadTransactions() {
        try {
            const transactions = await fetchData('/transactions');
            renderTransactions(transactions);
        } catch (error) {
            displayMessage(transactionMessageEl, `Failed to load transactions: ${error.message}`, 'error');
        }
    }

    function renderTransactions(transactions) {
        transactionTableBody.innerHTML = ''; // Clear existing rows
        if (!transactions || transactions.length === 0) {
            displayMessage(transactionMessageEl, 'No transactions yet. Add one using the form above!', 'info');
            return;
        }
        if (transactionMessageEl) transactionMessageEl.style.display = 'none';

        transactions.forEach(t => {
            const row = transactionTableBody.insertRow();
            row.innerHTML = `
                <td data-label="Date">${formatDate(t.date)}</td>
                <td data-label="Type" class="${t.type === 'income' ? 'text-income' : 'text-expense'}">${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
                <td data-label="Category">${t.category}</td>
                <td data-label="Amount" class="${t.type === 'income' ? 'text-income' : 'text-expense'}">${formatCurrency(t.amount)}</td>
                <td data-label="Description">${t.description || '-'}</td>
                <td data-label="Actions" class="action-buttons">
                    <button class="btn btn-accent btn-sm edit-transaction" data-id="${t.id}"><span class="material-icons">edit</span> Edit</button>
                    <button class="btn btn-danger btn-sm delete-transaction" data-id="${t.id}"><span class="material-icons">delete</span> Delete</button>
                </td>
            `;
        });
        // Add event listeners for new edit/delete buttons
        document.querySelectorAll('.edit-transaction').forEach(btn => btn.addEventListener('click', handleEditTransaction));
        document.querySelectorAll('.delete-transaction').forEach(btn => btn.addEventListener('click', handleDeleteTransaction));
    }

    addTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addTransactionForm);
        const data = {
            type: formData.get('transaction-type'),
            category: formData.get('transaction-category'),
            amount: parseFloat(formData.get('transaction-amount')),
            date: formData.get('transaction-date'),
            description: formData.get('transaction-description')
        };

        try {
            await fetchData('/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            displayMessage(transactionMessageEl, 'Transaction added successfully!', 'success');
            clearForm(addTransactionForm);
            loadTransactions(); // Refresh list
            loadDashboardData(); // Refresh dashboard too
        } catch (error) {
            displayMessage(transactionMessageEl, `Error adding transaction: ${error.message}`, 'error');
        }
    });

    async function handleEditTransaction(event) {
        const id = event.target.closest('button').dataset.id;
        try {
            const transaction = await fetchData(`/transactions/${id}`);
            currentEditData = { type: 'transaction', id, data: transaction };
            openEditModal('Edit Transaction', transaction, 'transaction');
        } catch (error) {
            displayMessage(transactionMessageEl, `Failed to fetch transaction for editing: ${error.message}`, 'error');
        }
    }

    async function handleDeleteTransaction(event) {
        const id = event.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                await fetchData(`/transactions/${id}`, { method: 'DELETE' });
                displayMessage(transactionMessageEl, 'Transaction deleted successfully!', 'success');
                loadTransactions();
                loadDashboardData();
            } catch (error) {
                displayMessage(transactionMessageEl, `Error deleting transaction: ${error.message}`, 'error');
            }
        }
    }

    // --- Savings Goals --- 
    async function loadGoals() {
        try {
            const goals = await fetchData('/goals');
            renderGoals(goals);
        } catch (error) {
            displayMessage(goalMessageEl, `Failed to load goals: ${error.message}`, 'error');
        }
    }

    function renderGoals(goals) {
        goalsListContainer.innerHTML = ''; // Clear existing goals
        if (!goals || goals.length === 0) {
            displayMessage(goalMessageEl, 'No savings goals yet. Add one using the form above!', 'info');
            return;
        }
        if (goalMessageEl) goalMessageEl.style.display = 'none';

        goals.forEach(goal => {
            const progressPercent = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            const goalCard = document.createElement('div');
            goalCard.className = 'goal-card';
            goalCard.innerHTML = `
                <h3><span class="material-icons">savings</span> ${goal.name}</h3>
                <p><strong>Target:</strong> ${formatCurrency(goal.target_amount)}</p>
                <p><strong>Saved:</strong> ${formatCurrency(goal.current_amount)}</p>
                <p><strong>Deadline:</strong> ${formatDate(goal.deadline)}</p>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${Math.min(progressPercent, 100)}%;">${Math.round(progressPercent)}%</div>
                </div>
                <div class="actions">
                    <button class="btn btn-accent btn-sm edit-goal" data-id="${goal.id}"><span class="material-icons">edit</span> Edit</button>
                    <button class="btn btn-danger btn-sm delete-goal" data-id="${goal.id}"><span class="material-icons">delete</span> Delete</button>
                </div>
            `;
            goalsListContainer.appendChild(goalCard);
        });
        // Add event listeners for new edit/delete buttons
        document.querySelectorAll('.edit-goal').forEach(btn => btn.addEventListener('click', handleEditGoal));
        document.querySelectorAll('.delete-goal').forEach(btn => btn.addEventListener('click', handleDeleteGoal));
    }

    addGoalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addGoalForm);
        const data = {
            name: formData.get('goal-name'),
            target_amount: parseFloat(formData.get('goal-target-amount')),
            current_amount: parseFloat(formData.get('goal-current-amount') || 0),
            deadline: formData.get('goal-deadline')
        };

        try {
            await fetchData('/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            displayMessage(goalMessageEl, 'Goal added successfully!', 'success');
            clearForm(addGoalForm);
            loadGoals(); // Refresh list
        } catch (error) {
            displayMessage(goalMessageEl, `Error adding goal: ${error.message}`, 'error');
        }
    });

    async function handleEditGoal(event) {
        const id = event.target.closest('button').dataset.id;
        try {
            const goal = await fetchData(`/goals/${id}`);
            currentEditData = { type: 'goal', id, data: goal };
            openEditModal('Edit Savings Goal', goal, 'goal');
        } catch (error) {
            displayMessage(goalMessageEl, `Failed to fetch goal for editing: ${error.message}`, 'error');
        }
    }

    async function handleDeleteGoal(event) {
        const id = event.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this savings goal?')) {
            try {
                await fetchData(`/goals/${id}`, { method: 'DELETE' });
                displayMessage(goalMessageEl, 'Goal deleted successfully!', 'success');
                loadGoals();
            } catch (error) {
                displayMessage(goalMessageEl, `Error deleting goal: ${error.message}`, 'error');
            }
        }
    }

    // --- Modal Handling --- 
    function openEditModal(title, data, type) {
        editModalTitle.textContent = title;
        editModalFields.innerHTML = ''; // Clear previous fields

        if (type === 'transaction') {
            editModalFields.innerHTML = `
                <div class="form-group">
                    <label for="edit-transaction-type">Type</label>
                    <select id="edit-transaction-type" name="transaction-type" required>
                        <option value="income" ${data.type === 'income' ? 'selected' : ''}>Income</option>
                        <option value="expense" ${data.type === 'expense' ? 'selected' : ''}>Expense</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-transaction-category">Category</label>
                    <input type="text" id="edit-transaction-category" name="transaction-category" value="${data.category}" required>
                </div>
                <div class="form-group">
                    <label for="edit-transaction-amount">Amount</label>
                    <input type="number" id="edit-transaction-amount" name="transaction-amount" value="${data.amount}" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="edit-transaction-date">Date</label>
                    <input type="date" id="edit-transaction-date" name="transaction-date" value="${formatDate(data.date)}" required>
                </div>
                <div class="form-group">
                    <label for="edit-transaction-description">Description</label>
                    <textarea id="edit-transaction-description" name="transaction-description">${data.description || ''}</textarea>
                </div>
            `;
        } else if (type === 'goal') {
            editModalFields.innerHTML = `
                <div class="form-group">
                    <label for="edit-goal-name">Goal Name</label>
                    <input type="text" id="edit-goal-name" name="goal-name" value="${data.name}" required>
                </div>
                <div class="form-group">
                    <label for="edit-goal-target-amount">Target Amount</label>
                    <input type="number" id="edit-goal-target-amount" name="goal-target-amount" value="${data.target_amount}" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="edit-goal-current-amount">Current Amount</label>
                    <input type="number" id="edit-goal-current-amount" name="goal-current-amount" value="${data.current_amount}" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="edit-goal-deadline">Deadline</label>
                    <input type="date" id="edit-goal-deadline" name="goal-deadline" value="${formatDate(data.deadline)}">
                </div>
            `;
        }
        editModal.style.display = 'block';
    }

    function closeModal() {
        editModal.style.display = 'none';
        currentEditData = null;
    }

    if(closeButton) closeButton.addEventListener('click', closeModal);
    if(cancelEditButton) cancelEditButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            closeModal();
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditData) return;

        const formData = new FormData(editForm);
        let updatedData = {};
        let endpoint = '';
        let successMessage = '';
        let loadFunction = null;

        if (currentEditData.type === 'transaction') {
            updatedData = {
                type: formData.get('transaction-type'),
                category: formData.get('transaction-category'),
                amount: parseFloat(formData.get('transaction-amount')),
                date: formData.get('transaction-date'),
                description: formData.get('transaction-description')
            };
            endpoint = `/transactions/${currentEditData.id}`;
            successMessage = 'Transaction updated successfully!';
            loadFunction = () => { loadTransactions(); loadDashboardData(); };
        } else if (currentEditData.type === 'goal') {
            updatedData = {
                name: formData.get('goal-name'),
                target_amount: parseFloat(formData.get('goal-target-amount')),
                current_amount: parseFloat(formData.get('goal-current-amount')),
                deadline: formData.get('goal-deadline')
            };
            endpoint = `/goals/${currentEditData.id}`;
            successMessage = 'Goal updated successfully!';
            loadFunction = loadGoals;
        }

        try {
            await fetchData(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            displayMessageGeneric(successMessage, 'success', getCurrentViewMessageContainer());
            closeModal();
            if(loadFunction) loadFunction();
        } catch (error) {
            // Display error inside modal or fallback
            const modalMessageContainer = editModal.querySelector('.message-container'); // Add a .message-container in modal HTML if desired
            if (modalMessageContainer) displayMessage(modalMessageContainer, `Error updating: ${error.message}`, 'error');
            else displayMessageGeneric(`Error updating: ${error.message}`, 'error', getCurrentViewMessageContainer());
        }
    });

    // --- Initial Load --- 
    showView('dashboard-section'); // Show dashboard by default
});
