const AudioContext = window.AudioContext || window.webkitAudioContext;
const audio = new AudioContext();
let unlocked = false;

// This can be toggled to square
let waveType = "sine";

// Frequencies for the different keys
const freq = {
  "C4":261.63,"C#4":277.18,"D4":293.66,"D#4":311.13,"E4":329.63,
  "F4":349.23,"F#4":369.99,"G4":392.00,"G#4":415.30,"A4":440.00,
  "A#4":466.16,"B4":493.88
};

// Mapping makey makey to the frequencies
const keyboard = {
  "=": "C4",
  ";": "C#4",
  "[": "D4",
  "]": "D#4",
  "`": "E4",
  "\\": "F4",
  "arrowup": "F#4",
  "arrowdown": "G4",
  "arrowright": "G#4",
  "arrowleft": "A4",
  // mouse keys
  0: "A#4",
  2: "B4"
}

// for game activity
let active = {};
// Set of all the keys being pressed
const down = new Set();
let comboTimer = null;
let comboStartTime = null;
let toneTimer = null;

let gameState = {
  active: false,
  phase: 'listen',
  melody: [],
  playerInput: [],
  currentNote: 0
};

// This checks to see if the user wants to play the game. Has to press for 3 seconds.
function checkGamemodeCombo() {
  if (down.has("arrowleft") && down.has(2)) {
    if (!comboTimer){
      comboStartTime = Date.now();
      comboTimer = setTimeout(() => {
        openGamemode();
        comboTimer = null;
      }, 3000);
    }
  } else {
    if (comboTimer){
      clearTimeout(comboTimer);
      comboTimer = null;
      comboStartTime = null;
    }
  }
}

// This checks to see if the user wants to change tone. Has to press for 3 seconds.
function checkToneCombo() {
  const hasC = !!active["C4"];
  const hasD = !!active["D4"];

  if (hasC && hasD){
    if (!toneTimer){
      toneTimer = setTimeout(() => {
        waveType = (waveType === "sine") ? "square" : "sine";
        toneTimer = null;
      }, 3000);
    }
  } else {
    if (toneTimer) {
      clearTimeout(toneTimer);
      toneTimer = null;
    }
  }
}

function openGamemode() {
  document.getElementById("gamemodeModal").classList.add("show");
}

function closeGamemode() {
  document.getElementById("gamemodeModal").classList.remove("show");
}

function startListenAndPlay() {
  closeGamemode();
  
  const melodyLength = 5;
  const notes = Object.keys(freq);
  gameState.melody = [];
  
  for (let i = 0; i < melodyLength; i++) {
    gameState.melody.push(notes[Math.floor(Math.random() * notes.length)]);
  }
  
  gameState.active = true;
  gameState.phase = 'listen';
  gameState.playerInput = [];
  gameState.currentNote = 0;
  
  showGameOverlay('Listen carefully to the melody...', '#ffe8a0');
  
  setTimeout(() => {
    playMelody();
  }, 1500);
}

function playMelody() {
  // Checks if it's done playing
  if (gameState.currentNote >= gameState.melody.length) {
    gameState.phase = 'play';
    gameState.currentNote = 0;
    showGameOverlay('Now play it back!', '#70f470');
    setTimeout(() => {
      hideGameOverlay();
    }, 2000);
    return;
  }
  
  const note = gameState.melody[gameState.currentNote];
  
  highlight(note); // We can turn this off if we want, but I think perfect pitch may be too hard to do without at least some help
  play(note);
  
  setTimeout(() => {
    stop(note);
    unhighlight(note);
    gameState.currentNote++;
    
    setTimeout(() => {
      playMelody();
    }, 200);
  }, 500);
}

function handleGameInput(note) {
  if(!gameState.active || gameState.phase !== 'play'){
    return;
  }
  
  gameState.playerInput.push(note);
  
  if (gameState.playerInput.length >= gameState.melody.length){
    endGame();
  }
}

function endGame() {
  gameState.active = false;

  let correct = 0;
  let results = [];
  
  //compute the score/results here
  for (let i = 0; i < gameState.melody.length; i++) {
    const expected = gameState.melody[i];
    const played = gameState.playerInput[i] || 'missed';
    const isCorrect = expected === played;
    
    if (isCorrect){ 
      correct++;
    }
    
    results.push({
      position: i + 1,
      expected: expected,
      played: played,
      correct: isCorrect
    });
  }
  
  showResults(results, correct, gameState.melody.length);
}

function showResults(results, correct, total) {
  const modal = document.getElementById('resultsModal');
  const resultsDiv = document.getElementById('resultsContent');
  
  let html = `<h3>Score: ${correct}/${total} (${Math.round(correct/total*100)}%)</h3>`;
  html += '<div style="text-align: left; margin-top: 20px;">';
  
  results.forEach(r => {
    const icon = r.correct ? 'Correct' : 'Wrong';
    const color = r.correct ? '#70f470' : '#ff5555';
    html += `
      <div style="padding: 10px; margin: 5px 0; background: #333; border-radius: 6px; border-left: 4px solid ${color};">
        <span style="color: ${color}; font-weight: bold;">${icon}</span>
        Note ${r.position}: Expected <strong>${r.expected}</strong>, 
        You played <strong style="color: ${color};">${r.played}</strong>
      </div>
    `;
  });
  
  html += '</div>';
  
  resultsDiv.innerHTML = html;
  modal.classList.add('show');
}

function closeResults() {
  document.getElementById('resultsModal').classList.remove('show');
}

function playAgain() {
  closeResults();
  startListenAndPlay();
}

function showGameOverlay(message, color) {
  const overlay = document.getElementById('gameOverlay');
  const text = document.getElementById('overlayText');
  text.textContent = message;
  text.style.color = color;
  overlay.classList.add('show');
}

function hideGameOverlay() {
  document.getElementById('gameOverlay').classList.remove('show');
}

// the mouse ones are weird so these need to be added manually
window.addEventListener("mousedown", e => {
    const note = keyboard[e.button];
    if (!keyboard[e.button]) return;
    if (down.has(e.button)) return;

    down.add(e.button);

    play(note);
    highlight(note);

    // source of bug preventing mouse clicks from being registered in game mode
    handleGameInput(note);
});

window.addEventListener("mouseup", e => {
    const note = keyboard[e.button];
    if (!keyboard[e.button]) return;

    down.delete(e.button);

    stop(note);
    unhighlight(note);
});


function play(note) {
  if (!unlocked) { audio.resume(); unlocked = true; }
  if (active[note]) return;

  let osc = audio.createOscillator();
  let gain = audio.createGain();

  osc.frequency.value = freq[note];
  osc.type = waveType;

  gain.gain.setValueAtTime(0, audio.currentTime);
  gain.gain.linearRampToValueAtTime(0.8, audio.currentTime + 0.01);

  osc.connect(gain).connect(audio.destination);
  osc.start();

  active[note] = {osc, gain};

  checkToneCombo();
}

function stop(note) {
  if (!active[note]) return;

  let { osc, gain } = active[note];
  gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.05);
  osc.stop(audio.currentTime + 0.06);
  delete active[note];
  checkToneCombo();
}

function highlight(n) {
  const el = document.querySelector(`[data-note="${n}"]`);
  if (el){
    el.classList.add("active");
  }
}

function unhighlight(n) {
  const el = document.querySelector(`[data-note="${n}"]`);
  if (el){
    el.classList.remove("active");
  }
}

window.onkeydown = e => {
  const key = e.key.toLowerCase();
  if (!keyboard[key]) return;
  if (down.has(key)) return;

  down.add(key);
  
  if (!gameState.active) {
    checkGamemodeCombo();
  }

  const note = keyboard[key];
  play(note);
  highlight(note);
  
  handleGameInput(note);
};

window.onkeyup = e => {
  const key = e.key.toLowerCase();
  if (!keyboard[key]) return;
  down.delete(key);
  const note = keyboard[key];
  stop(note);
  unhighlight(note);
};
