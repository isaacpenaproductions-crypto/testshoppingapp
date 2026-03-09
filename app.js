import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// We must use the anon key for browser-based clients!
const SUPABASE_URL = 'https://qzmvikytwjqmxfommtxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXZpa3l0d2pxbXhmb21tdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzA3OTIsImV4cCI6MjA4ODQ0Njc5Mn0.3mBMf6dO1oe-D38DJuYFB3w0rHB7xhdINOGAp8GyDQ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI Elements
const itemInput = document.getElementById('item-input');
const addItemForm = document.getElementById('add-item-form');
const shoppingListEl = document.getElementById('shopping-list');
const clearAllBtn = document.getElementById('clear-all-btn');
const statusMessage = document.getElementById('status-message');
const spinner = document.getElementById('loading-spinner');

// Utility to show errors
function showError(msg) {
    statusMessage.textContent = msg;
    statusMessage.className = 'error';
    setTimeout(() => {
        statusMessage.className = 'hidden';
    }, 5000);
}

function showLoading(isLoading) {
    if (isLoading) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
}

// Fetch and display active list
async function fetchList() {
    showLoading(true);
    shoppingListEl.innerHTML = ''; // Clear current
    
    const { data, error } = await supabase
        .table('shopping_list')
        .select('*')
        .order('id', { ascending: false }); // Show newest first
        
    showLoading(false);
    
    if (error) {
        showError("Failed to fetch list: " + error.message + " (Check RLS!)");
        return;
    }
    
    if (data.length === 0) {
        shoppingListEl.innerHTML = '<li style="justify-content: center; color: #a1a1aa">List is empty</li>';
        return;
    }
    
    data.forEach(item => {
        const li = document.createElement('li');
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Remove item';
        deleteBtn.onclick = () => deleteItem(item.id);
        
        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        
        shoppingListEl.appendChild(li);
    });
}

// Add a single item
async function addItem(e) {
    e.preventDefault();
    const name = itemInput.value.trim();
    if (!name) return;
    
    const { data, error } = await supabase
        .table('shopping_list')
        .insert([{ name }])
        .select();
        
    if (error) {
        showError("Error adding item: " + error.message);
        return;
    }
    
    if (!data || data.length === 0) {
        showError("Blocked by Row Level Security! Make sure RLS is off or Anon policies exist for inserting.");
        return;
    }
    
    itemInput.value = '';
    fetchList(); // Refresh list to show new item
}

// Delete single item
async function deleteItem(id) {
    const { data, error } = await supabase
        .table('shopping_list')
        .delete()
        .eq('id', id)
        .select();
        
    if (error) {
        showError("Error deleting item: " + error.message);
        return;
    }
    
    if (!data || data.length === 0) {
        showError("Blocked by Row Level Security! Policies might not allow deletes.");
        return;
    }
    
    fetchList();
}

// Clear Entire List
async function clearAll() {
    // A trick to delete all rows: filter by something that is always true
    const { error } = await supabase
        .table('shopping_list')
        .delete()
        .neq('id', -999999);
        
    if (error) {
        showError("Error clearing list: " + error.message);
        return;
    }
    
    fetchList();
}

// Bind Event Listeners
addItemForm.addEventListener('submit', addItem);
clearAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the entire list?")) {
        clearAll();
    }
});

// Initial Load
fetchList();
