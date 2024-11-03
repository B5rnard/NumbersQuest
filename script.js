// Game state
let gameState = {
    numbers: [],
    target: 0,
    currentAnchor: null,
    selectedOperation: null,
    usedOperations: new Set(),
    history: []
};

// Store initial numbers for reset functionality
let initialNumbers = [];

// Track solution path
let currentSolutionPath = null;

// DOM Elements
let targetNumberEl;
let movesLeftEl;
let numberGridEl;
let operationButtons;
let resetButton;
let historyEl;

// Helper function to check if a number is valid (positive integer)
function isValidNumber(num) {
    return num > 0 && Number.isInteger(num) && num <= 100;
}

// Helper function to apply operation
function applyOperation(a, b, op) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '×': return a * b;
        case '÷': return a / b;
        default: return null;
    }
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Generate a solution
function generateSolution() {
    while (true) {
        try {
            // 1. Generate 8 random numbers between 1-9
            let numbers = Array.from({ length: 8 }, () => Math.floor(Math.random() * 9) + 1);
            
            // 2. Shuffle operations but prioritize multiplication early
            let operations = shuffleArray(['×', '×', '+', '÷']);
            
            // 3. Try to build a valid solution
            let steps = [];
            let result = numbers[0];
            
            // 4. Apply each operation sequentially
            for (let i = 0; i < 4; i++) {
                const nextNum = numbers[i + 1];
                const operation = operations[i];
                
                // Check operation constraints
                if (operation === '-' && result <= nextNum) {
                    throw new Error('Invalid subtraction');
                }
                if (operation === '÷' && (nextNum === 0 || result % nextNum !== 0)) {
                    throw new Error('Invalid division');
                }
                
                // Calculate new result
                const newResult = applyOperation(result, nextNum, operation);
                
                // Verify result is valid
                if (!isValidNumber(newResult)) {
                    throw new Error('Invalid intermediate result');
                }
                
                // Store the step
                steps.push({
                    num1: result,
                    num2: nextNum,
                    operation: operation,
                    result: newResult
                });
                
                result = newResult;
            }
            
            // If the final target is too small, try again
            if (result < 15) {
                throw new Error('Target too small');
            }
            
            // If we get here, we have a valid solution!
            return {
                numbers: numbers,
                target: result,
                steps: steps
            };
        } catch (e) {
            // If anything went wrong, try again
            continue;
        }
    }
}

// Initialize game
function initGame() {
    const puzzle = generateSolution();
    
    // Store initial numbers for reset functionality
    initialNumbers = [...puzzle.numbers, puzzle.numbers[0]];
    
    gameState = {
        numbers: [...initialNumbers], // Use spread operator to create a new array
        target: puzzle.target,
        currentAnchor: null,
        selectedOperation: null,
        usedOperations: new Set(),
        history: []
    };

    // Store solution path
    currentSolutionPath = puzzle.steps;

    // Update UI
    targetNumberEl.textContent = gameState.target;
    movesLeftEl.textContent = 4 - gameState.usedOperations.size;
    renderGrid();
    renderHistory();
    
    // Reset operation buttons
    operationButtons.forEach(button => {
        button.classList.remove('disabled', 'selected');
        button.disabled = false;
    });
}

// Reset current puzzle
function resetPuzzle() {
    gameState = {
        numbers: [...initialNumbers], // Reset to initial numbers
        target: gameState.target, // Keep same target
        currentAnchor: null,
        selectedOperation: null,
        usedOperations: new Set(),
        history: []
    };

    // Reset UI
    movesLeftEl.textContent = 4;
    renderGrid();
    renderHistory();
    
    // Reset operation buttons
    operationButtons.forEach(button => {
        button.classList.remove('disabled', 'selected');
        button.disabled = false;
    });
}

// Render the grid
function renderGrid() {
    numberGridEl.innerHTML = '';
    gameState.numbers.forEach((num, index) => {
        if (num !== null) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (gameState.currentAnchor?.index === index) {
                cell.classList.add('selected');
            }
            cell.textContent = num;
            cell.addEventListener('click', () => handleNumberSelect(index));
            numberGridEl.appendChild(cell);
        } else {
            const cell = document.createElement('div');
            cell.className = 'grid-cell disabled';
            cell.textContent = '';
            numberGridEl.appendChild(cell);
        }
    });
}

// Handle number selection
function handleNumberSelect(index) {
    const number = gameState.numbers[index];
    if (number === null) return;

    if (gameState.currentAnchor === null) {
        // First number selection
        gameState.currentAnchor = { value: number, index };
        renderGrid();
    } else if (gameState.selectedOperation && gameState.currentAnchor.index !== index) {
        // Second number selection with operation
        const result = calculateResult(
            gameState.currentAnchor.value,
            number,
            gameState.selectedOperation
        );

        if (result === null) {
            alert("Invalid operation! Try different numbers or operation.");
            return;
        }

        // Update game state
        const newNumbers = [...gameState.numbers];
        newNumbers[gameState.currentAnchor.index] = result;
        newNumbers[index] = null;

        // Add to history
        gameState.history.push({
            num1: gameState.currentAnchor.value,
            num2: number,
            operation: gameState.selectedOperation,
            result
        });

        // Update used operations
        gameState.usedOperations.add(gameState.selectedOperation);

        // Update game state
        gameState.numbers = newNumbers;
        gameState.currentAnchor = { value: result, index: gameState.currentAnchor.index };
        gameState.selectedOperation = null;

        // Update UI
        renderGrid();
        renderHistory();
        updateOperationButtons();
        movesLeftEl.textContent = 4 - gameState.usedOperations.size;

        // Check win condition
        if (gameState.usedOperations.size === 4) {
            checkWinCondition(result);
        }
    }
}

// Calculate result of operation
function calculateResult(num1, num2, operation) {
    switch (operation) {
        case '+': return num1 + num2;
        case '-': return num1 > num2 ? num1 - num2 : null;
        case '×': return num1 * num2;
        case '÷': 
            return num2 !== 0 && Number.isInteger(num1 / num2) ? num1 / num2 : null;
        default: return null;
    }
}

// Handle operation selection
function handleOperationSelect(operation) {
    if (gameState.currentAnchor === null || gameState.usedOperations.has(operation)) return;

    gameState.selectedOperation = operation;
    updateOperationButtons();
}

// Update operation buttons state
function updateOperationButtons() {
    operationButtons.forEach(button => {
        const operation = button.dataset.operation;
        button.classList.remove('selected');
        if (gameState.usedOperations.has(operation)) {
            button.classList.add('disabled');
            button.disabled = true;
        } else if (operation === gameState.selectedOperation) {
            button.classList.add('selected');
        }
    });
}

// Render history
function renderHistory() {
    historyEl.innerHTML = '';
    gameState.history.forEach(step => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = `${step.num1} ${step.operation} ${step.num2} = ${step.result}`;
        historyEl.appendChild(historyItem);
    });
}

// Check win condition
function checkWinCondition(result) {
    setTimeout(() => {
        if (result === gameState.target) {
            showMessage('Congratulations! You reached the target! 🎉');
        } else {
            showMessage(`Game Over! The target was ${gameState.target}. Try again! 😔`);
        }
    }, 100);
}

// Show message to player
function showMessage(message) {
    alert(message);
}

// Show solution
function showSolution() {
    if (!currentSolutionPath) return;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.innerHTML = `
        <h3>Solution Path to reach ${gameState.target}:</h3>
        ${currentSolutionPath.map((step, index) => `
            <div class="modal-step">
                Step ${index + 1}: ${step.num1} ${step.operation} ${step.num2} = ${step.result}
            </div>
        `).join('')}
    `;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.textContent = 'Close';
    closeButton.onclick = () => {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        }, 200);
    };
    
    modal.appendChild(content);
    modal.appendChild(closeButton);
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
        overlay.classList.add('show');
        modal.classList.add('show');
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    targetNumberEl = document.getElementById('targetNumber');
    movesLeftEl = document.getElementById('movesLeft');
    numberGridEl = document.getElementById('numberGrid');
    operationButtons = document.querySelectorAll('.operation-button');
    resetButton = document.getElementById('resetButton');
    historyEl = document.getElementById('history');

    // Add event listeners
    document.getElementById('showSolutionButton').addEventListener('click', showSolution);
    document.getElementById('resetButton').addEventListener('click', initGame);
    document.getElementById('resetPuzzleButton').addEventListener('click', resetPuzzle);
    operationButtons.forEach(button => {
        button.addEventListener('click', () => handleOperationSelect(button.dataset.operation));
    });

    // Start game
    initGame();
});