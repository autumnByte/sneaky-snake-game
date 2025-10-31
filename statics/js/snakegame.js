let snake = [{ x: 10, y: 10 }];
let direction = 'right';
let food = { x: 0, y: 0 };
let score = 0;
let level = 1;
let snakeColor = "red";
let isPaused = false;
let foodColor = "green";
let isAutoPilotActive = false;
let autoPilotTimer = null;
let countdownInterval = null;
let gameStarted = false; // Add this flag to track if game has started
const autoPilotSpeed = 30;
const autoPilotDuration = 3000; 
const scoreMilestones = [50, 150, 300, 400, 500, 750, 1000, 1750, 2500, 3750, 5000]; // Milestones

const gridSize = 10;
const foodSize = 10;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

if (!ctx) {
    console.error("Canvas not supported. Please use a different browser.");
} else {
    document.getElementById('game-container').appendChild(canvas);
}
// Might change this later to user specified size modifications in the webpage
canvas.width = 400;
canvas.height = 350;

function initializeGame() {
    spawnFood();
}

function moveSnake() {
    if (!isPaused && gameStarted) { // Add gameStarted check
        const head = { ...snake[0] };

        switch (direction) {
            case 'up':
                head.y = (head.y - gridSize + canvas.height) % canvas.height;
                break;
            case 'down':
                head.y = (head.y + gridSize) % canvas.height;
                break;
            case 'left':
                head.x = (head.x - gridSize + canvas.width) % canvas.width;
                break;
            case 'right':
                head.x = (head.x + gridSize) % canvas.width;
                break;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            spawnFood();
        } else {
            snake.pop();
        }

        checkCollision();
    }
}

function drawSnake() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Show start message if game hasn't started
    if (!gameStarted) {
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap Play Button to Start', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
        return;
    }
    
    ctx.fillStyle = snakeColor;

    snake.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
    });

    drawSpawnFood();
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('level').textContent = `Level: ${level}`;
}

function spawnFood() {
    const maxX = (canvas.width / gridSize) - 1;
    const maxY = (canvas.height / gridSize) - 1;
    do {
        food = {
            x: Math.floor(Math.random() * maxX) * gridSize,
            y: Math.floor(Math.random() * maxY) * gridSize
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

function drawSpawnFood() {
    ctx.fillStyle = foodColor;
    ctx.fillRect(food.x, food.y, foodSize, foodSize);
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
}

function updateScore() {
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
        level = newLevel;
        if (!isDemoRunning) {
            showMessage("Level up! Keep Going!");
        }
    }
}

function showMessage(message) {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        const newMessageContainer = document.createElement('div');
        newMessageContainer.id = 'message-container';
        newMessageContainer.style.position = 'absolute';
        newMessageContainer.style.top = '10px';
        newMessageContainer.style.left = '50%';
        newMessageContainer.style.transform = 'translateX(-50%)';
        newMessageContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        newMessageContainer.style.color = 'white';
        newMessageContainer.style.padding = '10px 20px';
        newMessageContainer.style.borderRadius = '5px';
        newMessageContainer.style.fontSize = '16px';
        newMessageContainer.style.zIndex = '1000';
        document.body.appendChild(newMessageContainer);
        newMessageContainer.textContent = message;
        setTimeout(() => {
            newMessageContainer.remove();
        }, 3000);
    } else {
        messageContainer.textContent = message;
        setTimeout(() => {
            messageContainer.remove();
        }, 3000);
    }
}

function handleKeyPress(event) {
    if (!gameStarted) return; // Ignore key presses if game hasn't started
    
    switch (event.key) {
        case 'ArrowUp':
            if (direction !== 'down') direction = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') direction = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') direction = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') direction = 'right';
            break;
    }
}

function changeFoodColor() {
    const allowedColors = ["green", "blue", "yellow", "purple", "red"];
    const currentColorIndex = allowedColors.indexOf(foodColor);
    foodColor = allowedColors[(currentColorIndex + 1) % allowedColors.length];
}

function checkAutoPilotTrigger() {
    if (isAutoPilotActive || isPaused || isDemoRunning || !gameStarted) return; // Add gameStarted check

    // Use a dynamic milestone check to avoid duplicated triggers
    const nextMilestone = scoreMilestones.find(milestone => milestone > score - 10 && milestone <= score);
    if (nextMilestone) {
        activateAutoPilot();
    }
}

function autoPilotMoveSnake() {
    // Check if auto-pilot should be active
    if (!isAutoPilotActive) return;

    const head = { ...snake[0] };
    let currentDirection = direction; // Store current snake direction
    let preferredDirection = direction;

    // Determine preferred direction towards the food pos
    if (head.x < food.x && currentDirection !== 'left') {
        preferredDirection = 'right';
    } else if (head.x > food.x && currentDirection !== 'right') {
        preferredDirection = 'left';
    } else if (head.y < food.y && currentDirection !== 'up') {
        preferredDirection = 'down';
    } else if (head.y > food.y && currentDirection !== 'down') {
        preferredDirection = 'up';
    }

    // List potential directions, starting with preferred, then current, then other
    const potentialDirections = [preferredDirection];
    if (preferredDirection !== currentDirection) {
        potentialDirections.push(currentDirection);
    }
    ['up', 'down', 'left', 'right'].forEach(dir => {
        if (!potentialDirections.includes(dir) &&
            !(dir === 'up' && currentDirection === 'down') &&
            !(dir === 'down' && currentDirection === 'up') &&
            !(dir === 'left' && currentDirection === 'right') &&
            !(dir === 'right' && currentDirection === 'left')) {
            potentialDirections.push(dir);
        }
    });

    let safeDirectionFound = false;
    for (const testDir of potentialDirections) {
        const nextHead = { ...head };
        switch (testDir) {
            case 'up': nextHead.y = (nextHead.y - gridSize + canvas.height) % canvas.height; break;
            case 'down': nextHead.y = (nextHead.y + gridSize) % canvas.height; break;
            case 'left': nextHead.x = (nextHead.x - gridSize + canvas.width) % canvas.width; break;
            case 'right': nextHead.x = (nextHead.x + gridSize) % canvas.width; break;
        }

        // Check collision against snake body (excluding the tail tip if snakey doesn't grow)
        let collisionCheckSegments = snake;
        // Predict if the snake has grown
        const willGrow = (nextHead.x === food.x && nextHead.y === food.y);
        if (!willGrow && snake.length > 1) {
             // Exclude last segment which will be removed
            collisionCheckSegments = snake.slice(0, -1);
        }

        const wouldCollide = collisionCheckSegments.some(segment => segment.x === nextHead.x && segment.y === nextHead.y);

        if (!wouldCollide) {
            direction = testDir; // Set the chosen safe direction
            safeDirectionFound = true;
            break; // Exit loop once a safe direction is found
        }
    }

    // If no safe direction is found, the snake will continue in its current direction and likely collide.
    // This scenario is rare with wall wrapping but happens sometimes. Need to dev further

    // Perform the actual move using the determined direction
    moveSnake();

}

function activateAutoPilot() {
    if (isAutoPilotActive || !gameStarted) return; // Don't activate AP if already active or game not started

    // Set state first to prevent race conditions
    isAutoPilotActive = true;
    let timeRemaining = 3;

    // Clean up existing intervals/timeouts
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    if (autoPilotTimer) {
        clearTimeout(autoPilotTimer);
        autoPilotTimer = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Record the start time for more accurate timing
    const startTime = Date.now();
    
    showMessage("Auto-Pilot Engaged! Sit back for 3 seconds...");

    // Set up countdown display and also check for deactivation
    countdownInterval = setInterval(() => {
        // Calculate actual elapsed time
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((autoPilotDuration - elapsed) / 1000));
        
        if (remaining > 0) {
            showMessage(`Auto-Pilot: ${remaining} seconds remaining...`);
        } else {
            // Time's up - force deactivation
            if (isAutoPilotActive) {
                console.log("Countdown timer triggering deactivation");
                deactivateAutoPilot();
            }
        }
    }, 1000);

    // Start auto-pilot at a faster speed
    gameInterval = setInterval(() => {
        if (isAutoPilotActive) {
            // Check if snakey ap exceeded the duration
            if (Date.now() - startTime >= autoPilotDuration) {
                console.log("Game loop detecting auto-pilot timeout");
                deactivateAutoPilot();
                return;
            }
            
            autoPilotMoveSnake();
            drawSnake();
            updateScore();
        }
    }, autoPilotSpeed);

    // Set a backup timer that's slightly longer to ensure deactivation
    autoPilotTimer = setTimeout(() => {
        console.log("Backup timer triggered");
        if (isAutoPilotActive) {
            deactivateAutoPilot();
        }
    }, autoPilotDuration + 500); // Added small buffer
}

function deactivateAutoPilot() {
    // Only run deactivation logic if it's currently active
    if (!isAutoPilotActive) return;

    console.log("Deactivating auto-pilot at:", new Date().toISOString());
    
    // Set state first to prevent race conditions
    isAutoPilotActive = false;

    // Clean up all related intervals and timers
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null; // Explicitly set to null
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (autoPilotTimer) {
        clearTimeout(autoPilotTimer);
        autoPilotTimer = null;
    }

    // Force a redraw to ensure the game state is visible
    drawSnake();
    
    // Restart the normal game loop with normal speed
    // Use a small delay to ensure clean state transition
    setTimeout(() => {
        console.log("Restarting normal game loop");
        if (gameInterval === null && gameStarted) { // Only if game has started
            gameInterval = setInterval(gameLoop, 100);
            console.log("Game interval restored, player control should be active");
        }
    }, 50);

    showMessage("Manual Control Restored! Take over now!");
}

function gameLoop() {
    // Debug logging - remove after fixing
    if (!isAutoPilotActive && isPaused) {
        console.log("Game loop running with isPaused=true while not in auto-pilot");
    }

    // Check for auto-pilot trigger only if not already active
    if (!isAutoPilotActive) {
        checkAutoPilotTrigger();
    }

    // Only allow manual movement if auto-pilot is OFF and game is not paused
    if (!isAutoPilotActive && !isPaused && gameStarted) { // Add gameStarted check
        moveSnake();
    }

    // Always draw the game state
    drawSnake();
    // Always update score
    updateScore();
}

function gameOver() {
    const collisionMessages = [
        "Oh No! You had a collision!",
        "Oops! Snakey met its tail!",
        "Game Over! Snakey got bit!",
        "Yikes! Watch out for yourself next time!",
        "Snake says: 'Why did you let me eat myself?'"
    ];

    const randomMessage = collisionMessages[Math.floor(Math.random() * collisionMessages.length)];

    showMessage(randomMessage);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText('Game Over!', canvas.width / 2 - 70, canvas.height / 2 - 10);
    ctx.fillText(`Score: ${score}`, canvas.width / 2 - 40, canvas.height / 2 + 20);
    clearInterval(gameInterval);
    gameStarted = false; // Reset game started flag

    const finalScore = score; // Retrieve the player's final score
    updateHighScores(finalScore); // Update high scores
    alert(`Game Over! Your score: ${finalScore}`);
}

function toggleBackground() {
    document.body.classList.toggle('light-mode');
    document.getElementById('game-container').classList.toggle('light-mode');
}

function changeSnakeColor() {
    const allowedColors = ["green", "blue", "yellow", "purple", "red"];
    let currentColorIndex = allowedColors.indexOf(snakeColor);

    currentColorIndex = (currentColorIndex + 1) % allowedColors.length;
    snakeColor = allowedColors[currentColorIndex];
}

function restartGame() {
    snake = [{ x: 10, y: 10 }];
    direction = 'right';
    score = 0;
    level = 1;
    isPaused = false;
    gameStarted = false; // Reset game started flag
    initializeGame();
    drawSnake(); // Draw initial state with start message
}

function togglePause() {
    if (!gameStarted) return; // Don't allow pausing if game hasn't started
    isPaused = !isPaused;
    if (isPaused) {
        showMessage("Game Paused");
    }
}

function startDemo() {
    isPaused = true;
    document.getElementById('demo-popup').style.display = 'none';
    document.getElementById('demo-speed-container').style.display = 'block'; 
    runSnakeDemo(); 
}

function showDemoPopup() {
    const demoPopup = document.getElementById('demo-popup');
    demoPopup.style.display = 'flex';
}

function restartDemo() {
    const demoPopup = document.getElementById('demo-popup');
    demoPopup.style.display = 'none';
    runSnakeDemo();
}

function closeDemoPopup() {
    const demoPopup = document.getElementById('demo-popup');
    demoPopup.style.display = 'none';
    document.getElementById('demo-speed-container').style.display = 'none';
    restartGame(); 
}

// NEW FUNCTION: Start the game when play button is tapped
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        isPaused = false;
        showMessage("Game Started! Use arrow keys to control the snake.");
        
        // Start the game loop if it's not already running
        if (!gameInterval) {
            gameInterval = setInterval(gameLoop, 100);
        }
        
        // Draw initial game state
        drawSnake();
    }
}

// Add event listener for the play button
document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('play-button'); // Make sure your HTML has this ID
    if (playButton) {
        playButton.addEventListener('click', startGame);
    }
});

document.addEventListener('keydown', handleKeyPress);

initializeGame();

// Don't start the game loop immediately - wait for play button
let gameInterval = null;

// Draw initial state with start message
drawSnake();