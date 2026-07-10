'use strict';

/*
    Pocket Clash - Commit 1

    This commit only initializes the page and confirms that
    the HTML, CSS, and JavaScript files are connected.

    Battle data and gameplay logic will be added in later commits.
*/

const battleMessage = document.getElementById('battle-message');
const restartButton = document.getElementById('restart-button');

function initializeGame() {
    battleMessage.textContent = 'What will Emberon do?';
    console.log('Pocket Clash interface initialized.');
}

function handleRestart() {
    initializeGame();
}

restartButton.addEventListener('click', handleRestart);

initializeGame();
