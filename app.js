// Note: Supabase is loaded via script tag in index.html and is available as window.supabase
const { createClient } = window.supabase;

console.log("app.js script started - Version 1.1");

// We must use the anon key for browser-based clients!
const SUPABASE_URL = 'https://qzmvikytwjqmxfommtxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXZpa3l0d2pxbXhmb21tdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzA3OTIsImV4cCI6MjA4ODQ0Njc5Mn0.3mBMf6dO1oe-D38DJuYFB3w0rHB7xhdINOGAp8GyDQ0';

let supabase;
try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized successfully");
} catch (e) {
    console.error("Failed to initialize Supabase client:", e);
}

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
    console.log("showLoading:", isLoading);
    if (isLoading) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
}

// Fetch and display active list
async function fetchList() {
    console.log("fetchList started");
    showLoading(true);
    shoppingListEl.innerHTML = ''; // Clear current
    
    try {
        console.log("Requesting data from Supabase table 'shopping_list'...");
        const { data, error } = await supabase
            .from('shopping_list')
            .select('*')
            .order('id', { ascending: false }); // Show newest first
            
        console.log("Supabase response received:", { data, error });
        showLoading(false);
        
        if (error) {
            console.error("Supabase query error:", error);
            showError("Failed to fetch list: " + error.message);
            return;
        }
        
        if (!data || data.length === 0) {
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
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Remove item';
            deleteBtn.onclick = () => deleteItem(item.id);
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            
            shoppingListEl.appendChild(li);
        });
    } catch (err) {
        console.error("Unexpected error in fetchList:", err);
        showLoading(false);
        showError("An unexpected error occurred: " + err.message);
    }
}

// Add a single item
async function addItem(e) {
    e.preventDefault();
    const name = itemInput.value.trim();
    if (!name) return;
    
    console.log("Adding item:", name);
    try {
        const { data, error } = await supabase
            .from('shopping_list')
            .insert([{ name }])
            .select();
            
        if (error) {
            console.error("Insert error:", error);
            showError("Error adding item: " + error.message);
            return;
        }
        
        console.log("Item added successfully:", data);
        itemInput.value = '';
        fetchList(); // Refresh list to show new item
    } catch (err) {
        console.error("Unexpected error in addItem:", err);
        showError("An unexpected error occurred: " + err.message);
    }
}

// Delete single item
async function deleteItem(id) {
    console.log("Deleting item:", id);
    try {
        const { data, error } = await supabase
            .from('shopping_list')
            .delete()
            .eq('id', id)
            .select();
            
        if (error) {
            console.error("Delete error:", error);
            showError("Error deleting item: " + error.message);
            return;
        }
        
        console.log("Item deleted successfully:", data);
        fetchList();
    } catch (err) {
        console.error("Unexpected error in deleteItem:", err);
        showError("An unexpected error occurred: " + err.message);
    }
}

// Clear Entire List
async function clearAll() {
    console.log("Clearing all items");
    try {
        const { error } = await supabase
            .from('shopping_list')
            .delete()
            .neq('id', -999999);
            
        if (error) {
            console.error("Clear error:", error);
            showError("Error clearing list: " + error.message);
            return;
        }
        
        console.log("All items cleared");
        fetchList();
    } catch (err) {
        console.error("Unexpected error in clearAll:", err);
        showError("An unexpected error occurred: " + err.message);
    }
}

// Bind Event Listeners
addItemForm.addEventListener('submit', addItem);
clearAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the entire list?")) {
        clearAll();
    }
});

// Initial Load
console.log("Triggering initial fetchList");
fetchList();
