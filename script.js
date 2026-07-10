"use strict";

/*
    Pocket Clash - Commit 3

    This commit adds:
    - Battle Manager
    - Battle state tracking
    - Clickable move selection
    - Opponent move selection
    - PP availability checks
    - Temporary turn confirmation messages

    Damage calculation, Speed-based turn order, fainting,
    switching, and victory conditions will be added later.
*/

/* --------------------------------------------------
   Data Models
-------------------------------------------------- */

class Move {
    constructor(name, type, power, maxPP) {
        this.name = name;
        this.type = type;
        this.power = power;
        this.maxPP = maxPP;
        this.currentPP = maxPP;
    }

    hasPP() {
        return this.currentPP > 0;
    }

    usePP() {
        if (!this.hasPP()) {
            return false;
        }

        this.currentPP -= 1;
        return true;
    }

    resetPP() {
        this.currentPP = this.maxPP;
    }
}

class Pokemon {
    constructor(
        name,
        type,
        maxHP,
        attack,
        defense,
        speed,
        level,
        spriteClass,
        moves
    ) {
        this.name = name;
        this.type = type;
        this.maxHP = maxHP;
        this.currentHP = maxHP;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;
        this.level = level;
        this.spriteClass = spriteClass;
        this.moves = moves;
        this.isFainted = false;
    }

    getHPPercentage() {
        return Math.max(
            0,
            Math.min(
                100,
                (this.currentHP / this.maxHP) * 100
            )
        );
    }

    getAvailableMoves() {
        return this.moves.filter((move) => move.hasPP());
    }

    reset() {
        this.currentHP = this.maxHP;
        this.isFainted = false;

        this.moves.forEach((move) => {
            move.resetPP();
        });
    }
}

/* --------------------------------------------------
   Type Effectiveness
-------------------------------------------------- */

const TYPE_CHART = {
    fire: {
        grass: 2,
        water: 0.5
    },

    grass: {
        water: 2,
        fire: 0.5
    },

    water: {
        fire: 2,
        grass: 0.5,
        electric: 0.5
    },

    electric: {
        water: 2,
        ground: 0.5
    },

    ground: {
        electric: 2
    },

    ice: {
        flying: 2
    },

    flying: {
        ice: 0.5
    },

    dark: {},

    normal: {}
};

function getTypeEffectiveness(moveType, targetType) {
    const moveTypeData = TYPE_CHART[moveType];

    if (!moveTypeData) {
        return 1;
    }

    return moveTypeData[targetType] ?? 1;
}

/* --------------------------------------------------
   Move Factory
-------------------------------------------------- */

function createMove(name, type, power, maxPP) {
    return new Move(name, type, power, maxPP);
}

/* --------------------------------------------------
   Pokemon Database
-------------------------------------------------- */

const POKEMON_DATABASE = {
    emberon: new Pokemon(
        "Emberon",
        "fire",
        110,
        78,
        58,
        72,
        12,
        "emberon-sprite",
        [
            createMove("Flame Burst", "fire", 42, 10),
            createMove("Quick Strike", "normal", 28, 20),
            createMove("Ash Kick", "ground", 34, 15),
            createMove("Heat Charge", "fire", 55, 5)
        ]
    ),

    aquava: new Pokemon(
        "Aquava",
        "water",
        120,
        66,
        70,
        62,
        12,
        "aquava-sprite",
        [
            createMove("Water Pulse", "water", 42, 10),
            createMove("Fin Slap", "normal", 30, 20),
            createMove("Frost Spray", "ice", 36, 12),
            createMove("Tidal Crash", "water", 54, 5)
        ]
    ),

    leafling: new Pokemon(
        "Leafling",
        "grass",
        125,
        62,
        78,
        55,
        12,
        "leafling-sprite",
        [
            createMove("Leaf Slice", "grass", 40, 12),
            createMove("Tackle", "normal", 30, 20),
            createMove("Root Slam", "ground", 36, 10),
            createMove("Vine Crush", "grass", 52, 5)
        ]
    ),

    voltix: new Pokemon(
        "Voltix",
        "electric",
        95,
        72,
        52,
        92,
        12,
        "voltix-sprite",
        [
            createMove("Spark Shot", "electric", 40, 12),
            createMove("Quick Strike", "normal", 28, 20),
            createMove("Static Rush", "electric", 48, 8),
            createMove("Air Dash", "flying", 34, 12)
        ]
    ),

    frostbite: new Pokemon(
        "Frostbite",
        "ice",
        105,
        82,
        60,
        64,
        12,
        "frostbite-sprite",
        [
            createMove("Ice Shard", "ice", 38, 15),
            createMove("Chill Bite", "ice", 46, 8),
            createMove("Heavy Swipe", "normal", 34, 15),
            createMove("Frozen Gust", "flying", 32, 12)
        ]
    ),

    terranox: new Pokemon(
        "Terranox",
        "ground",
        140,
        74,
        88,
        38,
        12,
        "terranox-sprite",
        [
            createMove("Rock Pound", "ground", 44, 10),
            createMove("Body Slam", "normal", 38, 12),
            createMove("Mud Burst", "ground", 36, 15),
            createMove("Stone Charge", "ground", 58, 5)
        ]
    ),

    galehawk: new Pokemon(
        "Galehawk",
        "flying",
        100,
        70,
        54,
        88,
        12,
        "galehawk-sprite",
        [
            createMove("Wing Slash", "flying", 40, 12),
            createMove("Quick Strike", "normal", 28, 20),
            createMove("Frost Gust", "ice", 34, 10),
            createMove("Sky Dive", "flying", 55, 5)
        ]
    ),

    shadowpaw: new Pokemon(
        "Shadowpaw",
        "dark",
        108,
        76,
        64,
        76,
        12,
        "shadowpaw-sprite",
        [
            createMove("Night Claw", "dark", 42, 12),
            createMove("Quick Strike", "normal", 28, 20),
            createMove("Shadow Rush", "dark", 48, 8),
            createMove("Dust Kick", "ground", 34, 12)
        ]
    )
};

/* --------------------------------------------------
   Starting Teams
-------------------------------------------------- */

const playerTeam = [
    POKEMON_DATABASE.emberon,
    POKEMON_DATABASE.aquava
];

const opponentTeam = [
    POKEMON_DATABASE.leafling,
    POKEMON_DATABASE.voltix
];

let activePlayerPokemon = playerTeam[0];
let activeOpponentPokemon = opponentTeam[0];

/* --------------------------------------------------
   Battle States
-------------------------------------------------- */

const BATTLE_STATES = {
    WAITING_FOR_PLAYER: "waiting-for-player",
    SELECTING_OPPONENT_MOVE: "selecting-opponent-move",
    RESOLVING_TURN: "resolving-turn",
    BATTLE_OVER: "battle-over"
};

/* --------------------------------------------------
   Battle Manager
-------------------------------------------------- */

class BattleManager {
    constructor() {
        this.state = BATTLE_STATES.WAITING_FOR_PLAYER;
        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;
    }

    reset() {
        this.state = BATTLE_STATES.WAITING_FOR_PLAYER;
        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;
    }

    canPlayerSelectMove() {
        return (
            this.state === BATTLE_STATES.WAITING_FOR_PLAYER &&
            !activePlayerPokemon.isFainted
        );
    }

    selectPlayerMove(moveIndex) {
        if (!this.canPlayerSelectMove()) {
            return;
        }

        const selectedMove =
            activePlayerPokemon.moves[moveIndex];

        if (!selectedMove) {
            console.error(
                `No player move exists at index ${moveIndex}.`
            );
            return;
        }

        if (!selectedMove.hasPP()) {
            showBattleMessage(
                `${selectedMove.name} has no PP remaining!`
            );
            return;
        }

        this.playerMove = selectedMove;
        this.state =
            BATTLE_STATES.SELECTING_OPPONENT_MOVE;

        disableMoveButtons();

        showBattleMessage(
            `${activePlayerPokemon.name} selected ` +
            `${selectedMove.name}.`
        );

        window.setTimeout(() => {
            this.selectOpponentMove();
        }, 700);
    }

    selectOpponentMove() {
        if (
            this.state !==
            BATTLE_STATES.SELECTING_OPPONENT_MOVE
        ) {
            return;
        }

        const availableMoves =
            activeOpponentPokemon.getAvailableMoves();

        if (availableMoves.length === 0) {
            console.warn(
                `${activeOpponentPokemon.name} has no available moves.`
            );

            this.opponentMove = null;
        } else {
            const randomIndex = Math.floor(
                Math.random() * availableMoves.length
            );

            this.opponentMove =
                availableMoves[randomIndex];
        }

        this.state = BATTLE_STATES.RESOLVING_TURN;

        window.setTimeout(() => {
            this.confirmTurnSelections();
        }, 700);
    }

    confirmTurnSelections() {
        if (
            this.state !== BATTLE_STATES.RESOLVING_TURN
        ) {
            return;
        }

        const playerMoveName =
            this.playerMove?.name ?? "No Move";

        const opponentMoveName =
            this.opponentMove?.name ?? "No Move";

        showBattleMessage(
            `${activePlayerPokemon.name} will use ` +
            `${playerMoveName}. ` +
            `${activeOpponentPokemon.name} will use ` +
            `${opponentMoveName}.`
        );

        console.log(`Turn ${this.turnNumber}`, {
            playerPokemon: activePlayerPokemon.name,
            playerMove: this.playerMove,
            opponentPokemon: activeOpponentPokemon.name,
            opponentMove: this.opponentMove
        });

        /*
            Commit 4 will replace this temporary pause
            with damage calculation and move execution.
        */

        window.setTimeout(() => {
            this.completeTemporaryTurn();
        }, 1600);
    }

    completeTemporaryTurn() {
        /*
            PP is not deducted yet because moves are not
            actually executed in this commit.
        */

        this.turnNumber += 1;
        this.playerMove = null;
        this.opponentMove = null;
        this.state = BATTLE_STATES.WAITING_FOR_PLAYER;

        renderBattleScreen();

        showBattleMessage(
            `Turn ${this.turnNumber}: What will ` +
            `${activePlayerPokemon.name} do?`
        );
    }
}

const battleManager = new BattleManager();

/* --------------------------------------------------
   HTML References
-------------------------------------------------- */

const battleMessage =
    document.getElementById("battle-message");

const restartButton =
    document.getElementById("restart-button");

const playerName =
    document.getElementById("player-name");

const playerLevel =
    document.getElementById("player-level");

const playerType =
    document.getElementById("player-type");

const playerHPTrack =
    document.getElementById("player-hp-track");

const playerHPBar =
    document.getElementById("player-hp-bar");

const playerHPText =
    document.getElementById("player-hp-text");

const playerSprite =
    document.getElementById("player-sprite");

const opponentName =
    document.getElementById("opponent-name");

const opponentLevel =
    document.getElementById("opponent-level");

const opponentType =
    document.getElementById("opponent-type");

const opponentHPTrack =
    document.getElementById("opponent-hp-track");

const opponentHPBar =
    document.getElementById("opponent-hp-bar");

const opponentHPText =
    document.getElementById("opponent-hp-text");

const opponentSprite =
    document.getElementById("opponent-sprite");

const moveGrid =
    document.getElementById("move-grid");

const playerTeamSlots =
    document.getElementById("player-team-slots");

const opponentTeamSlots =
    document.getElementById("opponent-team-slots");

/* --------------------------------------------------
   Interface Helpers
-------------------------------------------------- */

function formatTypeName(type) {
    return (
        type.charAt(0).toUpperCase() +
        type.slice(1)
    );
}

function showBattleMessage(message) {
    battleMessage.textContent = message;
}

function removeTypeClasses(element) {
    const typeClasses = [
        "type-fire",
        "type-water",
        "type-grass",
        "type-electric",
        "type-ground",
        "type-ice",
        "type-flying",
        "type-dark",
        "type-normal"
    ];

    element.classList.remove(...typeClasses);
}

function getHPColorClass(hpPercentage) {
    if (hpPercentage <= 25) {
        return "hp-low";
    }

    if (hpPercentage <= 50) {
        return "hp-medium";
    }

    return "hp-high";
}

/* --------------------------------------------------
   Pokemon Status Rendering
-------------------------------------------------- */

function renderPokemonStatus(pokemon, side) {
    const isPlayer = side === "player";

    const nameElement =
        isPlayer ? playerName : opponentName;

    const levelElement =
        isPlayer ? playerLevel : opponentLevel;

    const typeElement =
        isPlayer ? playerType : opponentType;

    const hpTrackElement =
        isPlayer ? playerHPTrack : opponentHPTrack;

    const hpBarElement =
        isPlayer ? playerHPBar : opponentHPBar;

    const hpTextElement =
        isPlayer ? playerHPText : opponentHPText;

    const spriteElement =
        isPlayer ? playerSprite : opponentSprite;

    const hpPercentage =
        pokemon.getHPPercentage();

    nameElement.textContent = pokemon.name;

    levelElement.textContent =
        `Lv. ${pokemon.level}`;

    typeElement.textContent =
        formatTypeName(pokemon.type);

    removeTypeClasses(typeElement);

    typeElement.classList.add(
        `type-${pokemon.type}`
    );

    hpBarElement.style.width =
        `${hpPercentage}%`;

    hpBarElement.classList.remove(
        "hp-high",
        "hp-medium",
        "hp-low"
    );

    hpBarElement.classList.add(
        getHPColorClass(hpPercentage)
    );

    hpTrackElement.setAttribute(
        "aria-valuemax",
        pokemon.maxHP
    );

    hpTrackElement.setAttribute(
        "aria-valuenow",
        pokemon.currentHP
    );

    hpTextElement.textContent =
        `${pokemon.currentHP} / ${pokemon.maxHP}`;

    spriteElement.className =
        `monster-sprite ${pokemon.spriteClass}`;

    spriteElement.setAttribute(
        "aria-label",
        `${pokemon.name}, the ${
            isPlayer ? "player" : "opponent"
        } monster`
    );
}

/* --------------------------------------------------
   Move Button Rendering
-------------------------------------------------- */

function createMoveButton(move, index) {
    const button =
        document.createElement("button");

    button.className =
        `move-button type-${move.type}`;

    button.type = "button";

    button.dataset.moveIndex = index;

    button.disabled =
        !move.hasPP() ||
        !battleManager.canPlayerSelectMove();

    const moveName =
        document.createElement("span");

    moveName.className = "move-name";
    moveName.textContent = move.name;

    const moveDetails =
        document.createElement("span");

    moveDetails.className = "move-details";

    moveDetails.textContent =
        `${formatTypeName(move.type)} | ` +
        `Power ${move.power} | ` +
        `PP ${move.currentPP} / ${move.maxPP}`;

    button.append(
        moveName,
        moveDetails
    );

    button.addEventListener(
        "click",
        handleMoveButtonClick
    );

    return button;
}

function renderMoveButtons(pokemon) {
    moveGrid.innerHTML = "";

    pokemon.moves.forEach((move, index) => {
        const moveButton =
            createMoveButton(move, index);

        moveGrid.appendChild(moveButton);
    });
}

function disableMoveButtons() {
    const moveButtons =
        moveGrid.querySelectorAll(".move-button");

    moveButtons.forEach((button) => {
        button.disabled = true;
    });
}

/* --------------------------------------------------
   Team Slot Rendering
-------------------------------------------------- */

function createTeamSlot(
    pokemon,
    activePokemon
) {
    const slot =
        document.createElement("span");

    slot.className = "team-slot";
    slot.title = pokemon.name;

    if (pokemon === activePokemon) {
        slot.classList.add("active-slot");
    }

    if (pokemon.isFainted) {
        slot.classList.add("fainted-slot");
    }

    return slot;
}

function renderTeamSlots(
    team,
    activePokemon,
    containerElement
) {
    containerElement.innerHTML = "";

    team.forEach((pokemon) => {
        const slot = createTeamSlot(
            pokemon,
            activePokemon
        );

        containerElement.appendChild(slot);
    });
}

/* --------------------------------------------------
   Main Battle Rendering
-------------------------------------------------- */

function renderBattleScreen() {
    renderPokemonStatus(
        activePlayerPokemon,
        "player"
    );

    renderPokemonStatus(
        activeOpponentPokemon,
        "opponent"
    );

    renderMoveButtons(
        activePlayerPokemon
    );

    renderTeamSlots(
        playerTeam,
        activePlayerPokemon,
        playerTeamSlots
    );

    renderTeamSlots(
        opponentTeam,
        activeOpponentPokemon,
        opponentTeamSlots
    );
}

/* --------------------------------------------------
   Input Handling
-------------------------------------------------- */

function handleMoveButtonClick(event) {
    const selectedButton =
        event.currentTarget;

    const moveIndex = Number(
        selectedButton.dataset.moveIndex
    );

    if (!Number.isInteger(moveIndex)) {
        console.error(
            "Move button did not contain a valid move index."
        );
        return;
    }

    battleManager.selectPlayerMove(moveIndex);
}

/* --------------------------------------------------
   Reset and Initialization
-------------------------------------------------- */

function resetTeam(team) {
    team.forEach((pokemon) => {
        pokemon.reset();
    });
}

function resetBattle() {
    resetTeam(playerTeam);
    resetTeam(opponentTeam);

    activePlayerPokemon = playerTeam[0];
    activeOpponentPokemon = opponentTeam[0];

    battleManager.reset();

    renderBattleScreen();

    showBattleMessage(
        `Turn 1: What will ` +
        `${activePlayerPokemon.name} do?`
    );

    console.log(
        "Pocket Clash battle reset."
    );
}

function initializeGame() {
    battleManager.reset();

    renderBattleScreen();

    showBattleMessage(
        `Turn 1: What will ` +
        `${activePlayerPokemon.name} do?`
    );

    console.log(
        "Pocket Clash Battle Manager initialized."
    );

    console.log(
        "Available Pokemon:",
        POKEMON_DATABASE
    );

    console.log(
        "Fire against Grass:",
        getTypeEffectiveness(
            "fire",
            "grass"
        )
    );
}

/* --------------------------------------------------
   Event Listeners
-------------------------------------------------- */

restartButton.addEventListener(
    "click",
    resetBattle
);

/* --------------------------------------------------
   Start Game
-------------------------------------------------- */

initializeGame();