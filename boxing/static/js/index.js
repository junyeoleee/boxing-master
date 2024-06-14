const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);
const keyMap = {}; // State of keyboard.
const state = {
  fightStarted: false,
  one: {
    health: 50,
    action: '',
    inputDelayed: false,
    toInvokeIfCleared: [], // Timeouts we want to fire immediately if cleared.
    timeouts: [],
  },
  two: {
    health: 50,
    action: '',
    inputDelayed: false,
    toInvokeIfCleared: [],
    timeouts: [],
  }
};

// Sets up a timeout that can be fired prematurely if needed.
const fire = (callback, delay) => {
  const timeout = setTimeout(callback, delay);

  return {
    invoke() {
      clearTimeout(timeout);
      callback();
    }
  };
};

// Reload page w/o POST.
const reset = () => {
  window.location = window.location;
};

const animation = (player, selector, className, duration) => {
  const transitionDuration = 150; // Duration of CSS transitions in MS.
  const elements = $$(selector);
  elements.forEach(el => el.classList.add(className))

  state[player].toInvokeIfCleared.push(fire(() => {
    elements.forEach(el => el.classList.remove(className));
  }, duration - transitionDuration));
};


const takeDamage = (player, amount) => {
  playPunchSound(); 

  state[player].health -= Math.min(amount, state[player].health);
  $(`#${player} .healthbar`).style.width = state[player].health + 'vh';
  if (state[player].health === 0) {
    const opponent = player === 'one' ? 'two' : 'one';

    $$(`.${player}`).forEach(el => el.classList.add('knockout'));
    $$(`.${opponent} .body`).forEach(el => el.classList.add('celebrateBody'));
    $$(`.${opponent} .arm`).forEach(el => el.classList.add('celebrateArm'));

    
    if (!state.winner) {
      if (player === 'one') {
        playLoseSound();
        state.winner = true; 
      } else if (player === 'two') {
        playWinSound();
        state.winner = true; 
      }
    }

    const resultText = document.getElementById('resultText');

    
    resultText.classList.remove('winText', 'loseText');

    resultText.textContent = player === 'one' ? 'LOSE' : 'WIN';
    resultText.classList.add(player === 'one' ? 'loseText' : 'winText');
    resultText.style.display = 'block';
  }
};


const punchSound = document.getElementById('punchSound');

const playPunchSound = () => {
  if (!punchSound.paused) {
    punchSound.pause();
    punchSound.currentTime = 0;
  }
  punchSound.play();
};


function playWinSound() {
  var winSound = document.getElementById('winSound');
  if (winSound.paused) {
    winSound.play();
  }
}

function playLoseSound() {
  var loseSound = document.getElementById('loseSound');
  if (loseSound.paused) {
    loseSound.play();
  }
}



const setAction = (player, action, duration) => {
  state[player].timeouts.forEach(t => clearTimeout(t));
  state[player].toInvokeIfCleared.forEach(t => t.invoke());

  state[player].timeouts.length = 0;
  state[player].toInvokeIfCleared.length = 0;

  state[player].inputDelayed = false;
  state[player].action = action;

  state[player].timeouts.push(setTimeout(() => {
    state[player].action = '';
  }, duration));
};

const duck = player => {
  const duration = 500;
  setAction(player, 'duck', duration);
  animation(player, `.${player} div`, 'duck', duration);
};

const stayStill = player => {
  const duration = 0; 
  setAction(player, 'stay', duration); 
};


const dodgeLeft = player => {
  const duration = 350;
  setAction(player, 'dodgeLeft', duration);
  animation(player, `.${player} div`, 'dodgeLeft', duration);
};

const dodgeRight = player => {
  const duration = 350;
  setAction(player, 'dodgeRight', duration);
  animation(player, `.${player} div`, 'dodgeRight', duration);
};

const stun = (player, duration) => {
  setAction(player, 'stun', duration);
  animation(player, `.${player} div`, 'shake', duration);
};


const executeAfterComboKeysWindowPasses = (player, action) => {
  if (state[player].inputDelayed) {
    // We already received this command.
    return;
  }
  state[player].inputDelayed = true;
  const execute = () => {
    state[player].inputDelayed = false;
    action();
  };

  
  state[player].timeouts.push(setTimeout(execute, 35));
};

const defend = player => executeAfterComboKeysWindowPasses(player, () => {
  const duration = 500;
  setAction(player, 'defend', duration);
  animation(player, `.${player} .left.arm`, 'defendLeft', duration);
  animation(player, `.${player} .right.arm`, 'defendRight', duration);
});

const hitDelay = 150; // Time in ms a player has to block/dodge an incoming attack.
const jabDuration = 500;
const uppercutDuration = 750;


const hit = (player, isUppercut = false) => {
  animation(player, `.${player} .body`, 'nudgeDown', 250);

  const action = state[player].action;
  if (action === 'defend') {
    takeDamage(player, isUppercut ? 3 : 2);
  } else {
    takeDamage(player, isUppercut ? 12 : 8);
    stun(player, isUppercut ? uppercutDuration - hitDelay : jabDuration - hitDelay);
  }
};

const jabLeft = player => executeAfterComboKeysWindowPasses(player, () => {
  setAction(player, 'attack', jabDuration);
  animation(player, `.${player} .left`, 'jabLeft', jabDuration);
  animation(player, `.${player}`, 'attack', jabDuration);

  const opponent = player === 'one' ? 'two' : 'one';
  state[player].timeouts.push(setTimeout(() => {
    if (state[opponent].action !== 'dodgeLeft') {
      hit(opponent);
    }
  }, hitDelay));
});

const jabRight = player => executeAfterComboKeysWindowPasses(player, () => {
  setAction(player, 'attack', jabDuration);
  animation(player, `.${player} .right`, 'jabRight', jabDuration);
  animation(player, `.${player}`, 'attack', jabDuration);

  const opponent = player === 'one' ? 'two' : 'one';
  state[player].timeouts.push(setTimeout(() => {
    if (state[opponent].action !== 'dodgeRight') {
      hit(opponent);
    }
  }, hitDelay));
});

const uppercutLeft = player => {
  setAction(player, 'attack', uppercutDuration);
  animation(player, `.${player} .body, .${player} .right.arm`, 'jump', uppercutDuration);
  animation(player, `.${player} .left.arm`, 'uppercutLeft', uppercutDuration);
  animation(player, `.${player}`, 'attack', uppercutDuration);

  const opponent = player === 'one' ? 'two' : 'one';
  state[player].timeouts.push(setTimeout(() => {
    if (state[opponent].action !== 'dodgeLeft' && state[opponent].action !== 'duck') {
      const isUppercut = true;
      hit(opponent, isUppercut);
    }
  }, hitDelay));
};

const uppercutRight = player => {
  setAction(player, 'attack', uppercutDuration);
  animation(player, `.${player} .body, .${player} .left.arm`, 'jump', uppercutDuration);
  animation(player, `.${player} .right.arm`, 'uppercutRight', uppercutDuration);
  animation(player, `.${player}`, 'attack', uppercutDuration);

  const opponent = player === 'one' ? 'two' : 'one';
  state[player].timeouts.push(setTimeout(() => {
    if (state[opponent].action !== 'dodgeRight' && state[opponent].action !== 'duck') {
      const isUppercut = true;
      hit(opponent, isUppercut);
    }
  }, hitDelay));
};

// Keyboard controls.
const applyKeys = () => {
  keyMap.Enter ? reset() : null;

  // Controls for player one.
  if (state.one.action === '') {
    keyMap.ArrowUp && keyMap.f ? uppercutLeft('one')
    : keyMap.ArrowUp && keyMap.g ? uppercutRight('one')
    : keyMap.ArrowUp ? defend('one')
    : keyMap.ArrowLeft ? dodgeLeft('one')
    : keyMap.ArrowDown ? duck('one')
    : keyMap.ArrowRight ? dodgeRight('one')
    : keyMap.f ? jabLeft('one')
    : keyMap.g ? jabRight('one')
    : null;
  }

  // Controls for player two.
  if (state.two.action === '') {
    keyMap[`;`] && keyMap.i ? uppercutLeft('two')
    : keyMap[`'`] && keyMap.i ? uppercutRight('two')
    : keyMap.i ? defend('two')
    : keyMap.j ? dodgeLeft('two')
    : keyMap.k ? duck('two')
    : keyMap.l ? dodgeRight('two')
    : keyMap[`;`] ? jabLeft('two')
    : keyMap[`'`] ? jabRight('two')
    : null;
  }
};

const keyOn = e => {
  keyMap[e.key] = true;
  applyKeys();
};

const keyOff = e => {
  keyMap[e.key] = false;
};

window.addEventListener('keydown', keyOn, false);
window.addEventListener('keyup', keyOff, false);


const gamepad = new Gamepad();
const buttons = {
  button_1: 'punchLeft',
  button_2: 'punchRight',
  button_3: 'punchLeft',
  button_4: 'punchRight',
  shoulder_bottom_left: 'punchLeft',
  shoulder_bottom_right: 'punchRight',
  shoulder_top_left: 'dodgeLeft',
  shoulder_top_right: 'dodgeRight',
  select: '',
  start: '',
  stick_button_left: '',
  stick_button_right: '',
  d_pad_up: 'defend',
  d_pad_down: 'duck',
  d_pad_left: 'dodgeLeft',
  d_pad_right: 'dodgeRight',
  vendor: '',
};

const commandToKey = {
  one: {
    defend: 'ArrowUp',
    dodgeLeft: 'ArrowLeft',
    duck: 'ArrowDown',
    dodgeRight: 'ArrowRight',
    punchLeft: 'f', // f와 g는 그대로 유지되므로 변경하지 않음
    punchRight: 'g',
  },
  two: {
    defend: `i`,
    dodgeLeft: `j`,
    duck: `k`,
    dodgeRight: `l`,
    punchLeft: `;`,
    punchRight: `'`,
  },
};

// Set whether button is pressed or not.
const updateButton = (e, pressed) => {
  /**
   * Even gamepads will control player 1, odds player 2.
   * I figure this way if there are multiple controllers plugged in,
   * players can use whichever ones they want.
   */
  const player = e.player % 2 === 0 ? 'one' : 'two';
  const key = commandToKey[player][buttons[e.button]];
  if (!key) {
    return;
  }
  keyMap[key] = pressed;
  applyKeys();
};

gamepad.on('press', Object.keys(buttons), e => {
  updateButton(e, true);
});

gamepad.on('release', Object.keys(buttons), e => {
  updateButton(e, false);
});

// Allow moving with analog sticks.
const threshold = 0.25;
gamepad.on('press', ['stick_axis_left', 'stick_axis_right'], e => {
  let button;
  if (Math.abs(e.value[0]) > threshold) {
    button = e.value[0] < 0 ? 'd_pad_left' : 'd_pad_right';
  } else if (Math.abs(e.value[1]) > threshold) {
    button = e.value[1] < 0 ? 'd_pad_up' : 'd_pad_down';
  }
  updateButton(Object.assign(e, {button}), true);
});

gamepad.on('release', ['stick_axis_left', 'stick_axis_right'], e => {
  updateButton(Object.assign(e, {button: 'd_pad_left'}), false);
  updateButton(Object.assign(e, {button: 'd_pad_right'}), false);
  updateButton(Object.assign(e, {button: 'd_pad_up'}), false);
  updateButton(Object.assign(e, {button: 'd_pad_down'}), false);
});

// Allow resetting the game.
gamepad.on('release', ['select', 'start', 'vendor'], e => {
  reset();
});


const actionsPlayerTwo = [defend, dodgeLeft, dodgeRight, jabLeft, jabRight];

const randomActionPlayerTwo = () => {
  const randomIndex = Math.floor(Math.random() * actionsPlayerTwo.length);
  const action = actionsPlayerTwo[randomIndex];
  action('two');
};



const automatePlayerTwo = () => {
  if (state.two.health > 0 && state.two.action === '') {
    randomActionPlayerTwo();
  } else if (state.two.health <= 0) {
    state.two.alive = false;
    stopAutomation(); // 플레이어 2가 죽었을 때 자동 동작을 중지
  }
};

let playerTwoAutomationInterval = null; 
const startAutomation = () => {
  console.log('startAutomation called');
    if (playerTwoAutomationInterval === null) { 
      state.fightStarted = true; // 전투 시작
      playerTwoAutomationInterval = setInterval(automatePlayerTwo, 1000);
    }
};


const stopAutomation = () => {
  if (playerTwoAutomationInterval !== null) { 
    clearInterval(playerTwoAutomationInterval);
    playerTwoAutomationInterval = null; 
  }
};

async function predict() {
  // Prediction #1: run input through posenet
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  // Prediction #2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;

    // 가만히있음 (여기서는 class 1)
    if (i === 0 && prediction[i].probability > 0.92) {
      stayStill('one');
    }
    // 'jabLeft'를 감지했을 때 (class 2)
    if (i === 1 && prediction[i].probability > 0.8) {
      jabLeft('one');
    }
    // 'jabRight'를 감지했을 때 (class 3)
    else if (i === 2 && prediction[i].probability > 0.8) {
      jabRight('one');
    }
    // 'dodgeLeft'를 감지했을 때 (class 4)
    else if (i === 3 && prediction[i].probability > 0.92) {
      dodgeLeft('one');
    }
    // 'dodgeRight'를 감지했을 때 (class 5)
    else if (i === 4 && prediction[i].probability > 0.92) {
      dodgeRight('one');
    }
    // 'defend'를 감지했을 때 (class 6)
    else if (i === 5 && prediction[i].probability > 0.92) {
      defend('one');
    }
  }
}
