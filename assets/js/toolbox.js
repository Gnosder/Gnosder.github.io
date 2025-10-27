const CURRENT_LIST_STORAGE_KEY = 'currentStudentListState';
const ALL_LISTS_STORAGE_KEY = 'allClassLists';

let currentListName = '[Unsaved List]'; // Tracks the name of the currently loaded list

// --- Local Storage Management ---

// Stores the student data for the list currently in use (with checked status)
function saveCurrentListState(list) {
    localStorage.setItem(CURRENT_LIST_STORAGE_KEY, JSON.stringify(list));
}

function loadCurrentListState() {
    const data = localStorage.getItem(CURRENT_LIST_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Stores the mapping of list names to their full student lists
function saveAllLists(allLists) {
    localStorage.setItem(ALL_LISTS_STORAGE_KEY, JSON.stringify(allLists));
}

function loadAllLists() {
    const data = localStorage.getItem(ALL_LISTS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

function updateListSelector() {
    const selector = document.getElementById('listSelector');
    const allLists = loadAllLists();
    
    // Clear existing options (except the default placeholder)
    selector.innerHTML = '<option value="">-- Load a Saved List --</option>';

    // Add options for each saved list
    Object.keys(allLists).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
    });
}

// --- CORE LOGIC: Fisher-Yates Shuffle (Unchanged) ---
function shuffleList(listArray) {
    let array = [...listArray];
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// --- List Handling Functions ---

function renderList(list) {
    const listContainer = document.getElementById('listContainer');
    listContainer.innerHTML = '';
    
    // Update the displayed list name
    document.getElementById('currentListName').textContent = currentListName;

    if (list.length === 0) {
        listContainer.innerHTML = '<p>The list is empty. Enter names and click "Shuffle & Display".</p>';
        document.getElementById('nameInput').value = '';
        return;
    }

    list.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const shortName = student.name.substring(0, 12).padEnd(12, ' ');
        
        item.innerHTML = `
            <input type="checkbox" id="student-${index}" ${student.isChecked ? 'checked' : ''} 
                   onchange="updateCheckedStatus(${index}, this.checked)">
            <span>${shortName}</span>
        `;
        listContainer.appendChild(item);
    });
    
    // Update the textarea with the raw names for editing/saving
    document.getElementById('nameInput').value = list.map(s => s.name).join('\n');

    // Save the list state every time it's rendered/updated
    saveCurrentListState(list);
}

function updateCheckedStatus(index, isChecked) {
    let list = loadCurrentListState();
    if (list[index]) {
        list[index].isChecked = isChecked;
        saveCurrentListState(list);
    }
}

// --- New List Management Functions ---

window.saveCurrentList = function() {
    const nameInput = document.getElementById('listNameInput');
    const listName = nameInput.value.trim();
    const currentList = loadCurrentListState();

    if (!listName) {
        alert("Please enter a name for the class list.");
        return;
    }
    if (currentList.length === 0) {
        alert("The list is empty. Please enter names and shuffle first.");
        return;
    }

    let allLists = loadAllLists();
    // Save only the base names (no checked status) for storage
    allLists[listName] = currentList.map(s => s.name);
    saveAllLists(allLists);

    currentListName = listName;
    nameInput.value = ''; // Clear input after saving
    updateListSelector();
    alert(`List "${listName}" saved!`);
}

window.loadSelectedList = function() {
    const selector = document.getElementById('listSelector');
    const listName = selector.value;
    
    if (!listName) return;

    const allLists = loadAllLists();
    const rawNames = allLists[listName];
    
    // Create a new, fresh list state (all unchecked) from the saved raw names
    const newListState = rawNames.map(name => ({
        name: name,
        isChecked: false
    }));

    currentListName = listName;
    
    // Render the newly loaded list (it will automatically save its state)
    renderList(newListState);
    alert(`List "${listName}" loaded successfully!`);
}

window.deleteSelectedList = function() {
    const selector = document.getElementById('listSelector');
    const listName = selector.value;
    
    if (!listName) {
        alert("Please select a list to delete.");
        return;
    }

    if (!confirm(`Are you sure you want to delete the list: "${listName}"?`)) {
        return;
    }

    let allLists = loadAllLists();
    delete allLists[listName];
    saveAllLists(allLists);

    updateListSelector();
    alert(`List "${listName}" deleted.`);
    
    // If the deleted list was the current one, reset the display
    if (currentListName === listName) {
        currentListName = '[Unsaved List]';
        renderList([]);
    }
}

// --- User Action Functions (Modified to use list state) ---

window.initialShuffle = function() {
    const inputNames = document.getElementById('nameInput').value
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (inputNames.length === 0) return;

    const initialList = inputNames.map(name => ({
        name: name,
        isChecked: false
    }));

    const shuffledNames = shuffleList(initialList);
    currentListName = '[Unsaved List]';
    renderList(shuffledNames);
}

window.regenerateList = function() {
    const currentList = loadCurrentListState();
    if (currentList.length === 0) return;

    let uncheckedNames = [];
    let checkedNames = [];

    currentList.forEach(student => {
        if (student.isChecked) {
            checkedNames.push(student.name);
        } else {
            uncheckedNames.push(student.name);
        }
    });
    
    const shuffledCheckedNames = shuffleList(checkedNames);
    const combinedNames = uncheckedNames.concat(shuffledCheckedNames);

    const newListObjects = combinedNames.map(name => ({
        name: name,
        isChecked: false
    }));
    
    renderList(newListObjects);
    alert(`List Regenerated! Students who didn't answer (${uncheckedNames.length}) are now at the top.`);
}

// --- Printing Functions (Unchanged, work on the current list state) ---

window.printSegment = function(segmentNumber) {
    const listContainer = document.getElementById('listContainer');
    if (listContainer.children.length === 0) {
        alert("Please load or generate a list first.");
        return;
    }

    listContainer.classList.add(`segment-${segmentNumber}`);
    
    (function() {
        window.print(); 
    })();

    setTimeout(() => {
        listContainer.classList.remove(`segment-${segmentNumber}`);
    }, 500);
}

window.lazyPrintAll = function() {
    // 1. Get the current list of student NAMES (we don't care about checked status for this print)
    const currentListState = loadCurrentListState();
    if (currentListState.length === 0) {
        alert("Please load or generate a list first.");
        return;
    }
    
    // Extract only the names from the current state
    const studentNames = currentListState.map(s => s.name);

    // 2. Create a print-only container
    const printContent = document.createElement('div');
    printContent.className = 'print-page';

    // 3. Generate 4 UNIQUE randomized lists
    for (let i = 1; i <= 4; i++) {
        // Shuffle the list of names *freshly* for each segment
        const shuffledNames = shuffleList(studentNames);
        
        const segmentDiv = document.createElement('div');
        segmentDiv.className = `list-container segment-${i}`;
        
        let listHTML = '';
        shuffledNames.forEach(name => {
            // Ensure name is truncated to 12 characters and styled for print
            const shortName = name.substring(0, 12).padEnd(12, ' ');
            listHTML += `<div class="list-item"><span>${shortName}</span></div>`;
        });
        
        segmentDiv.innerHTML = listHTML;
        printContent.appendChild(segmentDiv);
    }

    // 4. Temporarily append to the body, print, and then remove
    document.body.appendChild(printContent);
    window.print();
    document.body.removeChild(printContent);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize the list selector dropdown
    updateListSelector();

    // 2. Load the previous session's working list
    const savedList = loadCurrentListState();
    if (savedList.length > 0) {
        // Try to figure out the name if this list matches a saved list (optional, but helpful)
        const allLists = loadAllLists();
        const currentNames = savedList.map(s => s.name).sort().join('|');
        
        for (const name in allLists) {
            if (allLists[name].map(s => s.name).sort().join('|') === currentNames) {
                currentListName = name;
                break;
            }
        }
    }
    
    renderList(savedList);
});