/* ==========================================
   Cricket Player Auction Game - Game Logic
   ========================================== */

// --- Game State Variables ---
let captains = [
  {
    name: "",
    bounty: 1000,
    team: [] // Contains objects like { name: "Virat Kohli", price: 150 }
  },
  {
    name: "",
    bounty: 1000,
    team: []
  }
];

let currentPlayer = null;
let currentBid = 0;
let currentTurn = 0; // Index of the captain whose turn it is (0 or 1)
let highestBidder = null; // Index of the highest bidder (null, 0, or 1)
let auctionQueue = [];
let totalPlayersCount = 0;
let auctionLogs = [];
let maxPlayerLimit = 0;

// --- DOM Elements ---
// Screens
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Setup Screen Controls
const cap1Input = document.getElementById('cap1-name');
const cap2Input = document.getElementById('cap2-name');
const playersInput = document.getElementById('players-input');
const btnStart = document.getElementById('btn-start');

// Header Elements
const remainingCountEl = document.getElementById('remaining-count');
const btnHeaderRestart = document.getElementById('btn-header-restart');

// Captain Panel Elements (Captain 1)
const cap0Card = document.getElementById('captain-0-card');
const cap0NameDisplay = document.getElementById('cap0-display-name');
const cap0BountyDisplay = document.getElementById('cap0-bounty');
const cap0BountyBar = document.getElementById('cap0-bounty-bar');
const cap0TeamSizeDisplay = document.getElementById('cap0-team-size');
const cap0TeamList = document.getElementById('cap0-team-list');

// Captain Panel Elements (Captain 2)
const cap1Card = document.getElementById('captain-1-card');
const cap1NameDisplay = document.getElementById('cap1-display-name');
const cap1BountyDisplay = document.getElementById('cap1-bounty');
const cap1BountyBar = document.getElementById('cap1-bounty-bar');
const cap1TeamSizeDisplay = document.getElementById('cap1-team-size');
const cap1TeamList = document.getElementById('cap1-team-list');

// Bidding Arena Elements
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayerNameEl = document.getElementById('current-player-name');
const currentBidDisplay = document.getElementById('current-bid-display');
const highestBidderDisplay = document.getElementById('highest-bidder-display');
const bountyWarning = document.getElementById('bounty-warning');
const bidButtons = document.querySelectorAll('.btn-bid');
const btnRelease = document.getElementById('btn-release');

// Footer Panels
const upcomingQueueEl = document.getElementById('upcoming-queue');
const logsContainer = document.getElementById('logs-container');

// Game Over Modal Elements
const winnerAnnouncement = document.getElementById('auction-winner-announcement');
const goCap0Name = document.getElementById('go-cap0-name');
const goCap0Count = document.getElementById('go-cap0-count');
const goCap0Bounty = document.getElementById('go-cap0-bounty');
const goCap0List = document.getElementById('go-cap0-list');

const goCap1Name = document.getElementById('go-cap1-name');
const goCap1Count = document.getElementById('go-cap1-count');
const goCap1Bounty = document.getElementById('go-cap1-bounty');
const goCap1List = document.getElementById('go-cap1-list');

const btnRestartGame = document.getElementById('btn-restart-game');


// --- Event Listeners Setup ---
btnStart.addEventListener('click', initAuction);
btnHeaderRestart.addEventListener('click', restartGame);
btnRestartGame.addEventListener('click', restartGame);
btnRelease.addEventListener('click', releasePlayer);

// Setup bidding button event listeners
bidButtons.forEach(button => {
  button.addEventListener('click', () => {
    const increment = parseInt(button.getAttribute('data-bid'), 10);
    makeBid(increment);
  });
});


// --- Helper Functions ---

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Appends a log entry to the log array and updates the display.
 * @param {string} text - Message content
 * @param {string} type - Entry class (info, bid-c0, bid-c1, win-c0, win-c1)
 */
function addLog(text, type = 'info') {
  auctionLogs.push({ text, type });
  updateLogsUI();
}


// --- Game Core Flow Functions ---

/**
 * Initializes the auction game from Setup screen inputs.
 */
function initAuction() {
  const cap1Name = cap1Input.value.trim();
  const cap2Name = cap2Input.value.trim();
  const playersRaw = playersInput.value;

  if (!cap1Name || !cap2Name) {
    alert("Please enter names for both Captains.");
    return;
  }

  // Parse and clean players list
  const players = playersRaw
    .split('\n')
    .map(p => p.trim())
    .filter(p => p !== "");

  if (players.length === 0) {
    alert("Please enter at least one player in the list.");
    return;
  }

  // Setup Captain info
  captains[0] = {
    name: cap1Name,
    bounty: 1000,
    team: []
  };
  captains[1] = {
    name: cap2Name,
    bounty: 1000,
    team: []
  };

  // Populate and shuffle queue
  auctionQueue = shuffleArray([...players]);
  totalPlayersCount = auctionQueue.length;
  auctionLogs = []; // Reset logs

  // Calculate Max Player Limit: Even -> N/2, Odd -> Math.floor(N/2) + 1
  if (totalPlayersCount % 2 === 0) {
    maxPlayerLimit = totalPlayersCount / 2;
  } else {
    maxPlayerLimit = Math.floor(totalPlayersCount / 2) + 1;
  }

  addLog(`Auction started by ${captains[0].name} and ${captains[1].name}!`, 'info');
  addLog(`${totalPlayersCount} players loaded and shuffled randomly.`, 'info');

  // Transition Screens
  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  // Start Bidding with the first player
  startNextPlayer();
}

/**
 * Loads the next player from the queue and resets the bid arena.
 */
function startNextPlayer() {
  if (auctionQueue.length === 0) {
    endGame();
    return;
  }

  // Draw player
  currentPlayer = auctionQueue.shift();
  currentBid = 0;
  highestBidder = null;
  
  // Set current turn back to Captain 1 (Index 0) to start the bid
  currentTurn = 0;

  addLog(`🏏 ${currentPlayer} is up for auction!`, 'info');
  
  updateUI();
}

/**
 * Registers a bid increment for the active Captain.
 * @param {number} increment - Amount to add to current bid
 */
function makeBid(increment) {
  const activeCap = captains[currentTurn];
  const newBid = currentBid + increment;

  // Validation: Captain cannot bid more than available bounty
  if (newBid > activeCap.bounty) {
    addLog(`⚠️ ${activeCap.name} tried to bid ${newBid} but has insufficient bounty!`, 'info');
    return;
  }

  // Record Bid
  currentBid = newBid;
  highestBidder = currentTurn;
  
  // Log the bid
  const logStyleClass = currentTurn === 0 ? 'bid-c0' : 'bid-c1';
  addLog(`💰 ${activeCap.name} bids ${currentBid} points (+${increment})`, logStyleClass);

  // Switch turn to the other Captain
  currentTurn = 1 - currentTurn;

  updateUI();
}

/**
 * Handles the "Release" action where the current active captain passes on the player.
 * The other captain wins the player at the current bid value.
 */
function releasePlayer() {
  const releasingCap = captains[currentTurn];
  const winningCapIndex = 1 - currentTurn;
  const winningCap = captains[winningCapIndex];
  
  // Log the release
  addLog(`🛑 ${releasingCap.name} released!`, 'info');

  // Edge case: No bids placed at all yet. The player goes to the other captain for 0.
  const finalPrice = currentBid;

  // Allocate player
  winningCap.bounty -= finalPrice;
  winningCap.team.push({
    name: currentPlayer,
    price: finalPrice
  });

  // Log the winning outcome
  const winStyleClass = winningCapIndex === 0 ? 'win-c0' : 'win-c1';
  addLog(`🎉 ${winningCap.name} won ${currentPlayer} for ${finalPrice} points!`, winStyleClass);

  // Load next player
  startNextPlayer();
}

/**
 * Ends the auction and displays final stats overlay.
 */
function endGame() {
  addLog("🏁 Auction completed! All players have been drafted.", 'info');

  // Populate Captain names and rosters on GameOver Modal
  goCap0Name.textContent = captains[0].name;
  goCap0Count.textContent = captains[0].team.length;
  goCap0Bounty.textContent = captains[0].bounty;
  
  goCap0List.innerHTML = "";
  if (captains[0].team.length === 0) {
    goCap0List.innerHTML = '<li class="empty-roster-msg">No players bought</li>';
  } else {
    captains[0].team.forEach(player => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${player.name}</span> <span class="price">${player.price} pts</span>`;
      goCap0List.appendChild(li);
    });
  }

  goCap1Name.textContent = captains[1].name;
  goCap1Count.textContent = captains[1].team.length;
  goCap1Bounty.textContent = captains[1].bounty;

  goCap1List.innerHTML = "";
  if (captains[1].team.length === 0) {
    goCap1List.innerHTML = '<li class="empty-roster-msg">No players bought</li>';
  } else {
    captains[1].team.forEach(player => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${player.name}</span> <span class="price">${player.price} pts</span>`;
      goCap1List.appendChild(li);
    });
  }

  // Determine Winner logic
  // Primary condition: Total players bought
  // Secondary condition (tie breaker): Remaining Bounty points
  let winnerText = "";
  if (captains[0].team.length > captains[1].team.length) {
    winnerText = `🏆 ${captains[0].name} Wins the Auction!`;
  } else if (captains[1].team.length > captains[0].team.length) {
    winnerText = `🏆 ${captains[1].name} Wins the Auction!`;
  } else {
    // Tie breaker on player count -> check remaining bounty
    if (captains[0].bounty > captains[1].bounty) {
      winnerText = `🏆 ${captains[0].name} Wins on Tie Breaker (More Bounty)!`;
    } else if (captains[1].bounty > captains[0].bounty) {
      winnerText = `🏆 ${captains[1].name} Wins on Tie Breaker (More Bounty)!`;
    } else {
      winnerText = "🤝 It's a Dead Heat Tie!";
    }
  }

  winnerAnnouncement.textContent = winnerText;
  gameOverScreen.classList.remove('hidden');
}

/**
 * Resets the entire game state and returns to Setup Screen.
 */
function restartGame() {
  // Reset Captains
  captains = [
    { name: "", bounty: 1000, team: [] },
    { name: "", bounty: 1000, team: [] }
  ];
  currentPlayer = null;
  currentBid = 0;
  currentTurn = 0;
  highestBidder = null;
  auctionQueue = [];
  totalPlayersCount = 0;
  auctionLogs = [];
  maxPlayerLimit = 0;

  // Hide Game and GameOver Overlays, Show Setup Screen
  gameScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  setupScreen.classList.remove('hidden');

  // Focus setup name input
  cap1Input.focus();
}


// --- UI Syncing Functions ---

/**
 * Main UI updater function. Syncs variables with DOM elements.
 */
function updateUI() {
  if (!currentPlayer) return;

  // Header Player Count
  remainingCountEl.textContent = auctionQueue.length;

  // Sync Captains cards texts
  cap0NameDisplay.textContent = captains[0].name;
  cap0BountyDisplay.textContent = captains[0].bounty;
  cap0TeamSizeDisplay.textContent = `${captains[0].team.length} / ${maxPlayerLimit} Players`;

  cap1NameDisplay.textContent = captains[1].name;
  cap1BountyDisplay.textContent = captains[1].bounty;
  cap1TeamSizeDisplay.textContent = `${captains[1].team.length} / ${maxPlayerLimit} Players`;

  // Update Bounty Bars (out of 1000)
  const cap0Pct = Math.max(0, (captains[0].bounty / 1000) * 100);
  cap0BountyBar.style.width = `${cap0Pct}%`;

  const cap1Pct = Math.max(0, (captains[1].bounty / 1000) * 100);
  cap1BountyBar.style.width = `${cap1Pct}%`;

  // Render Captain Teams rosters
  renderRosterList(cap0TeamList, captains[0].team);
  renderRosterList(cap1TeamList, captains[1].team);

  // Bidding Arena updates
  currentPlayerNameEl.textContent = currentPlayer;
  currentBidDisplay.textContent = currentBid;

  if (highestBidder === null) {
    highestBidderDisplay.textContent = "None";
  } else {
    highestBidderDisplay.textContent = captains[highestBidder].name;
  }

  // Active turn tracking
  const activeCaptain = captains[currentTurn];
  turnIndicator.textContent = `${activeCaptain.name}'s Turn to Bid`;

  // Apply visual active-turn outlines on captain panels
  if (currentTurn === 0) {
    cap0Card.classList.add('active-turn');
    cap1Card.classList.remove('active-turn');
    
    // Apply theme classes to center arena wrapper for background glow effects
    document.querySelector('.game-container').classList.add('captain-one-turn');
    document.querySelector('.game-container').classList.remove('captain-two-turn');
  } else {
    cap1Card.classList.add('active-turn');
    cap0Card.classList.remove('active-turn');
    
    document.querySelector('.game-container').classList.add('captain-two-turn');
    document.querySelector('.game-container').classList.remove('captain-one-turn');
  }

  // Validate and update bid button controls
  const hasReachedLimit = activeCaptain.team.length >= maxPlayerLimit;
  let hasValidBid = false;
  bidButtons.forEach(button => {
    const increment = parseInt(button.getAttribute('data-bid'), 10);
    const cost = currentBid + increment;

    // Check if current active captain can afford it AND has not reached team limit
    if (cost > activeCaptain.bounty || hasReachedLimit) {
      button.disabled = true;
    } else {
      button.disabled = false;
      hasValidBid = true;
    }
  });

  // Display warnings (limit reached or insufficient bounty)
  if (hasReachedLimit) {
    bountyWarning.textContent = `⚠️ Maximum player limit reached (${maxPlayerLimit})! You must release.`;
    bountyWarning.classList.remove('hidden');
  } else if (!hasValidBid) {
    bountyWarning.textContent = `⚠️ Warning: Insufficient bounty for this bid!`;
    bountyWarning.classList.remove('hidden');
  } else {
    bountyWarning.classList.add('hidden');
  }

  // Upcoming Queue rendering
  renderQueueUI();
}

/**
 * Renders team roster elements dynamically.
 */
function renderRosterList(element, teamArray) {
  element.innerHTML = "";
  if (teamArray.length === 0) {
    element.innerHTML = '<li class="empty-roster-msg">No players drafted yet</li>';
    return;
  }
  
  teamArray.forEach(player => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${player.name}</span> <span class="price">${player.price} pts</span>`;
    element.appendChild(li);
  });
}

/**
 * Renders the upcoming queue of players (next 5 items).
 */
function renderQueueUI() {
  upcomingQueueEl.innerHTML = "";
  const nextPlayers = auctionQueue.slice(0, 5);

  if (nextPlayers.length === 0) {
    upcomingQueueEl.innerHTML = '<p class="queue-empty-msg">No upcoming players</p>';
    return;
  }

  nextPlayers.forEach(player => {
    const div = document.createElement('div');
    div.className = "queue-item glass-card";
    div.innerHTML = `
      <span class="queue-jersey">👕</span>
      <span class="queue-name" title="${player}">${player}</span>
    `;
    upcomingQueueEl.appendChild(div);
  });
}

/**
 * Re-renders logs content and auto-scrolls to the end.
 */
function updateLogsUI() {
  logsContainer.innerHTML = "";
  
  auctionLogs.forEach(log => {
    const div = document.createElement('div');
    div.className = `log-entry ${log.type}`;
    div.textContent = log.text;
    logsContainer.appendChild(div);
  });

  // Smooth scroll to bottom
  logsContainer.scrollTop = logsContainer.scrollHeight;
}
