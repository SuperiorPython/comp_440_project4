"use strict";

/*
    Pocket Clash - Commit 8

    This commit adds:
    - Dedicated victory screen
    - Dedicated defeat screen
    - Result team details
    - Play Again with the same selected team
    - Return to team selection
    - Battle input disabled after completion
*/

/* --------------------------------------------------
   Constants
-------------------------------------------------- */

const TEAM_SIZE = 2;

const BATTLE_STATES = {
    TEAM_SELECTION: "team-selection",
    WAITING_FOR_PLAYER: "waiting-for-player",
    SELECTING_OPPONENT_MOVE: "selecting-opponent-move",
    RESOLVING_TURN: "resolving-turn",
    SWITCHING: "switching",
    BATTLE_OVER: "battle-over"
};

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

    clone() {
        return new Move(
            this.name,
            this.type,
            this.power,
            this.maxPP
        );
    }
}

class Pokemon {
    constructor(
        id,
        name,
        type,
        maxHP,
        attack,
        defense,
        speed,
        level,
        spritePath,
        moves
    ) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.maxHP = maxHP;
        this.currentHP = maxHP;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;
        this.level = level;
        this.spritePath = spritePath;
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
        return this.moves.filter((move) => {
            return move.hasPP();
        });
    }

    receiveDamage(damageAmount) {
        const safeDamage = Math.max(
            1,
            Math.floor(damageAmount)
        );

        this.currentHP = Math.max(
            0,
            this.currentHP - safeDamage
        );

        if (this.currentHP === 0) {
            this.isFainted = true;
        }

        return safeDamage;
    }

    reset() {
        this.currentHP = this.maxHP;
        this.isFainted = false;

        this.moves.forEach((move) => {
            move.resetPP();
        });
    }

    clone() {
        return new Pokemon(
            this.id,
            this.name,
            this.type,
            this.maxHP,
            this.attack,
            this.defense,
            this.speed,
            this.level,
            this.spritePath,
            this.moves.map((move) => {
                return move.clone();
            })
        );
    }
}

/* --------------------------------------------------
   Factories
-------------------------------------------------- */

function createMove(name, type, power, maxPP) {
    return new Move(
        name,
        type,
        power,
        maxPP
    );
}

function createPokemon(
    id,
    name,
    type,
    maxHP,
    attack,
    defense,
    speed,
    level,
    spritePath,
    moves
) {
    return new Pokemon(
        id,
        name,
        type,
        maxHP,
        attack,
        defense,
        speed,
        level,
        spritePath,
        moves
    );
}

/* --------------------------------------------------
   Type Effectiveness
-------------------------------------------------- */

const TYPE_CHART = {
    fire: {
        grass: 2
    },

    grass: {
        fire: 0.5,
        water: 2
    },

    water: {
        grass: 0.5,
        fire: 2,
        electric: 0.5
    },

    electric: {
        water: 2
    }
};

function getTypeEffectiveness(moveType, targetType) {
    const moveTypeData = TYPE_CHART[moveType];

    if (!moveTypeData) {
        return 1;
    }

    return moveTypeData[targetType] ?? 1;
}

function getEffectivenessMessage(multiplier) {
    if (multiplier > 1) {
        return "It was super effective!";
    }

    if (multiplier < 1) {
        return "It was not very effective.";
    }

    return "";
}

/* --------------------------------------------------
   Damage Calculation
-------------------------------------------------- */

function calculateDamage(
    attacker,
    defender,
    move
) {
    const levelModifier =
        (attacker.level + 10) / 40;

    const attackDefenseRatio =
        attacker.attack /
        Math.max(1, defender.defense);

    const baseDamage =
        move.power *
        attackDefenseRatio *
        levelModifier;

    const typeMultiplier =
        getTypeEffectiveness(
            move.type,
            defender.type
        );

    const finalDamage = Math.max(
        1,
        Math.round(
            baseDamage * typeMultiplier
        )
    );

    return {
        damage: finalDamage,
        typeMultiplier
    };
}

/* --------------------------------------------------
   Creature Templates
-------------------------------------------------- */

const POKEMON_DATABASE = {
    cindervex: createPokemon(
        "cindervex",
        "Cindervex",
        "fire",
        110,
        80,
        58,
        72,
        12,
        "assets/fire_sprite.png",
        [
            createMove(
                "Ember Fang",
                "fire",
                42,
                12
            ),
            createMove(
                "Scorch Dash",
                "fire",
                34,
                16
            ),
            createMove(
                "Blazing Roar",
                "fire",
                50,
                8
            ),
            createMove(
                "Inferno Rush",
                "fire",
                60,
                5
            )
        ]
    ),

    tidelume: createPokemon(
        "tidelume",
        "Tidelume",
        "water",
        122,
        68,
        72,
        62,
        12,
        "assets/water_sprite.png",
        [
            createMove(
                "Ripple Shot",
                "water",
                38,
                15
            ),
            createMove(
                "Tidal Swipe",
                "water",
                44,
                10
            ),
            createMove(
                "Foam Burst",
                "water",
                32,
                18
            ),
            createMove(
                "Ocean Crash",
                "water",
                58,
                5
            )
        ]
    ),

    bramblehorn: createPokemon(
        "bramblehorn",
        "Bramblehorn",
        "grass",
        132,
        64,
        84,
        52,
        12,
        "assets/grass_sprite.png",
        [
            createMove(
                "Thorn Jab",
                "grass",
                40,
                14
            ),
            createMove(
                "Vine Slam",
                "grass",
                46,
                10
            ),
            createMove(
                "Briar Charge",
                "grass",
                34,
                16
            ),
            createMove(
                "Forest Crush",
                "grass",
                56,
                5
            )
        ]
    ),

    voltari: createPokemon(
        "voltari",
        "Voltari",
        "electric",
        98,
        74,
        54,
        94,
        12,
        "assets/electric_sprite.png",
        [
            createMove(
                "Spark Claw",
                "electric",
                38,
                15
            ),
            createMove(
                "Static Dash",
                "electric",
                42,
                12
            ),
            createMove(
                "Voltage Burst",
                "electric",
                48,
                8
            ),
            createMove(
                "Thunder Dive",
                "electric",
                58,
                5
            )
        ]
    )
};

const POKEMON_ROSTER =
    Object.values(POKEMON_DATABASE);

/* --------------------------------------------------
   Game State
-------------------------------------------------- */

let selectedPokemonIds = [];

let playerTeam = [];
let opponentTeam = [];

let activePlayerPokemon = null;
let activeOpponentPokemon = null;

/* --------------------------------------------------
   HTML References
-------------------------------------------------- */

const teamSelectionScreen =
    document.getElementById(
        "team-selection-screen"
    );

const battleInterface =
    document.getElementById(
        "battle-interface"
    );

const battleResultScreen =
    document.getElementById(
        "battle-result-screen"
    );

const creatureSelectionGrid =
    document.getElementById(
        "creature-selection-grid"
    );

const selectionCount =
    document.getElementById(
        "selection-count"
    );

const selectedTeamPreview =
    document.getElementById(
        "selected-team-preview"
    );

const selectionMessage =
    document.getElementById(
        "selection-message"
    );

const startBattleButton =
    document.getElementById(
        "start-battle-button"
    );

const battleMessage =
    document.getElementById(
        "battle-message"
    );

const restartButton =
    document.getElementById(
        "restart-button"
    );

const playerName =
    document.getElementById(
        "player-name"
    );

const playerLevel =
    document.getElementById(
        "player-level"
    );

const playerType =
    document.getElementById(
        "player-type"
    );

const playerHPTrack =
    document.getElementById(
        "player-hp-track"
    );

const playerHPBar =
    document.getElementById(
        "player-hp-bar"
    );

const playerHPText =
    document.getElementById(
        "player-hp-text"
    );

const playerSprite =
    document.getElementById(
        "player-sprite"
    );

const opponentName =
    document.getElementById(
        "opponent-name"
    );

const opponentLevel =
    document.getElementById(
        "opponent-level"
    );

const opponentType =
    document.getElementById(
        "opponent-type"
    );

const opponentHPTrack =
    document.getElementById(
        "opponent-hp-track"
    );

const opponentHPBar =
    document.getElementById(
        "opponent-hp-bar"
    );

const opponentHPText =
    document.getElementById(
        "opponent-hp-text"
    );

const opponentSprite =
    document.getElementById(
        "opponent-sprite"
    );

const moveGrid =
    document.getElementById(
        "move-grid"
    );

const playerTeamSlots =
    document.getElementById(
        "player-team-slots"
    );

const opponentTeamSlots =
    document.getElementById(
        "opponent-team-slots"
    );

const battleResultPanel =
    document.getElementById(
        "battle-result-panel"
    );

const battleResultLabel =
    document.getElementById(
        "battle-result-label"
    );

const battleResultTitle =
    document.getElementById(
        "battle-result-title"
    );

const battleResultMessage =
    document.getElementById(
        "battle-result-message"
    );

const battleResultTeam =
    document.getElementById(
        "battle-result-team"
    );

const playAgainButton =
    document.getElementById(
        "play-again-button"
    );

const returnSelectionButton =
    document.getElementById(
        "return-selection-button"
    );

/* --------------------------------------------------
   General Helpers
-------------------------------------------------- */

function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(
            resolve,
            milliseconds
        );
    });
}

function formatTypeName(type) {
    return (
        type.charAt(0).toUpperCase() +
        type.slice(1)
    );
}

function showBattleMessage(message) {
    battleMessage.textContent =
        message;
}

function showSelectionMessage(message) {
    selectionMessage.textContent =
        message;
}

function removeTypeClasses(element) {
    const typeClasses = [
        "type-fire",
        "type-water",
        "type-grass",
        "type-electric"
    ];

    element.classList.remove(
        ...typeClasses
    );
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

function getFirstAvailablePokemon(team) {
    return team.find((pokemon) => {
        return !pokemon.isFainted;
    }) ?? null;
}

function isTeamDefeated(team) {
    return team.every((pokemon) => {
        return pokemon.isFainted;
    });
}

function shuffleArray(array) {
    const shuffled = [...array];

    for (
        let index = shuffled.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        [
            shuffled[index],
            shuffled[randomIndex]
        ] = [
            shuffled[randomIndex],
            shuffled[index]
        ];
    }

    return shuffled;
}

function clonePokemonById(pokemonId) {
    const template =
        POKEMON_DATABASE[pokemonId];

    if (!template) {
        throw new Error(
            `Unknown creature ID: ${pokemonId}`
        );
    }

    return template.clone();
}

/* --------------------------------------------------
   Screen Management
-------------------------------------------------- */

function hideAllScreens() {
    teamSelectionScreen.classList.add(
        "hidden"
    );

    battleInterface.classList.add(
        "hidden"
    );

    battleResultScreen.classList.add(
        "hidden"
    );
}

function showTeamSelectionScreen() {
    hideAllScreens();

    teamSelectionScreen.classList.remove(
        "hidden"
    );
}

function showBattleInterface() {
    hideAllScreens();

    battleInterface.classList.remove(
        "hidden"
    );
}

function showBattleResultScreen() {
    hideAllScreens();

    battleResultScreen.classList.remove(
        "hidden"
    );
}

/* --------------------------------------------------
   Team Selection
-------------------------------------------------- */

function createCreatureSelectionCard(pokemon) {
    const card =
        document.createElement("button");

    card.type = "button";

    card.className =
        `creature-card type-border-${pokemon.type}`;

    card.dataset.pokemonId =
        pokemon.id;

    card.setAttribute(
        "aria-pressed",
        "false"
    );

    const sprite =
        document.createElement("div");

    sprite.className =
        "selection-sprite";

    sprite.style.backgroundImage =
        `url("${pokemon.spritePath}")`;

    sprite.setAttribute(
        "role",
        "img"
    );

    sprite.setAttribute(
        "aria-label",
        pokemon.name
    );

    const information =
        document.createElement("div");

    information.className =
        "creature-card-information";

    const name =
        document.createElement("h3");

    name.textContent =
        pokemon.name;

    const type =
        document.createElement("span");

    type.className =
        `type-badge type-${pokemon.type}`;

    type.textContent =
        formatTypeName(pokemon.type);

    const stats =
        document.createElement("p");

    stats.className =
        "creature-card-stats";

    stats.textContent =
        `HP ${pokemon.maxHP} | ` +
        `ATK ${pokemon.attack} | ` +
        `DEF ${pokemon.defense} | ` +
        `SPD ${pokemon.speed}`;

    information.append(
        name,
        type,
        stats
    );

    card.append(
        sprite,
        information
    );

    card.addEventListener(
        "click",
        handleCreatureCardClick
    );

    return card;
}

function renderCreatureSelectionGrid() {
    creatureSelectionGrid.innerHTML = "";

    POKEMON_ROSTER.forEach((pokemon) => {
        const card =
            createCreatureSelectionCard(
                pokemon
            );

        creatureSelectionGrid.appendChild(
            card
        );
    });
}

function handleCreatureCardClick(event) {
    const card =
        event.currentTarget;

    const pokemonId =
        card.dataset.pokemonId;

    if (!pokemonId) {
        return;
    }

    if (
        selectedPokemonIds.includes(
            pokemonId
        )
    ) {
        selectedPokemonIds =
            selectedPokemonIds.filter(
                (selectedId) => {
                    return selectedId !== pokemonId;
                }
            );
    } else {
        if (
            selectedPokemonIds.length >=
            TEAM_SIZE
        ) {
            showSelectionMessage(
                "Your team already has two creatures. Deselect one before choosing another."
            );

            return;
        }

        selectedPokemonIds.push(
            pokemonId
        );
    }

    renderSelectionState();
}

function renderSelectionState() {
    const cards =
        creatureSelectionGrid.querySelectorAll(
            ".creature-card"
        );

    cards.forEach((card) => {
        const pokemonId =
            card.dataset.pokemonId;

        const isSelected =
            selectedPokemonIds.includes(
                pokemonId
            );

        card.classList.toggle(
            "selected-creature-card",
            isSelected
        );

        card.setAttribute(
            "aria-pressed",
            String(isSelected)
        );
    });

    selectionCount.textContent =
        `${selectedPokemonIds.length} / ${TEAM_SIZE}`;

    renderSelectedTeamPreview();

    const hasFullTeam =
        selectedPokemonIds.length ===
        TEAM_SIZE;

    startBattleButton.disabled =
        !hasFullTeam;

    if (
        selectedPokemonIds.length === 0
    ) {
        showSelectionMessage(
            "Choose your first creature."
        );
    } else if (
        selectedPokemonIds.length === 1
    ) {
        showSelectionMessage(
            "Choose one more creature."
        );
    } else {
        showSelectionMessage(
            "Your team is ready."
        );
    }
}

function renderSelectedTeamPreview() {
    selectedTeamPreview.innerHTML = "";

    for (
        let index = 0;
        index < TEAM_SIZE;
        index += 1
    ) {
        const pokemonId =
            selectedPokemonIds[index];

        const slot =
            document.createElement("span");

        slot.className =
            "preview-slot";

        if (pokemonId) {
            const pokemon =
                POKEMON_DATABASE[pokemonId];

            slot.classList.add(
                `type-${pokemon.type}`
            );

            slot.textContent =
                pokemon.name;
        } else {
            slot.textContent =
                "Empty";
        }

        selectedTeamPreview.appendChild(
            slot
        );
    }
}

function createPlayerTeam() {
    return selectedPokemonIds.map(
        (pokemonId) => {
            return clonePokemonById(
                pokemonId
            );
        }
    );
}

function createOpponentTeam() {
    const randomizedRoster =
        shuffleArray(POKEMON_ROSTER);

    return randomizedRoster
        .slice(0, TEAM_SIZE)
        .map((pokemon) => {
            return pokemon.clone();
        });
}

function prepareBattleTeams() {
    playerTeam =
        createPlayerTeam();

    opponentTeam =
        createOpponentTeam();

    activePlayerPokemon =
        playerTeam[0];

    activeOpponentPokemon =
        opponentTeam[0];
}

function startBattleFromSelection() {
    if (
        selectedPokemonIds.length !==
        TEAM_SIZE
    ) {
        showSelectionMessage(
            "Select exactly two creatures before starting."
        );

        return;
    }

    prepareBattleTeams();
    showBattleInterface();
    battleManager.startBattle();

    console.log(
        "Player team:",
        playerTeam.map((pokemon) => {
            return pokemon.name;
        })
    );

    console.log(
        "Opponent team:",
        opponentTeam.map((pokemon) => {
            return pokemon.name;
        })
    );
}

/* --------------------------------------------------
   Battle Animations
-------------------------------------------------- */

function animateAttacker(attacker) {
    const spriteElement =
        attacker === activePlayerPokemon
            ? playerSprite
            : opponentSprite;

    spriteElement.classList.remove(
        "attack-animation"
    );

    void spriteElement.offsetWidth;

    spriteElement.classList.add(
        "attack-animation"
    );
}

function animateDamage(side) {
    const spriteElement =
        side === "player"
            ? playerSprite
            : opponentSprite;

    spriteElement.classList.remove(
        "damage-animation"
    );

    void spriteElement.offsetWidth;

    spriteElement.classList.add(
        "damage-animation"
    );
}

function animateFaint(side) {
    const spriteElement =
        side === "player"
            ? playerSprite
            : opponentSprite;

    spriteElement.classList.remove(
        "faint-animation"
    );

    void spriteElement.offsetWidth;

    spriteElement.classList.add(
        "faint-animation"
    );
}

/* --------------------------------------------------
   Pixel Sprite Rendering
-------------------------------------------------- */

function renderPixelSprite(
    spriteElement,
    pokemon,
    side
) {
    spriteElement.innerHTML = "";

    spriteElement.className =
        `monster-sprite pixel-sprite ` +
        `${side}-sprite`;

    spriteElement.style.backgroundImage =
        `url("${pokemon.spritePath}")`;

    spriteElement.setAttribute(
        "role",
        "img"
    );

    spriteElement.setAttribute(
        "aria-label",
        `${pokemon.name}, the ${side} creature`
    );
}

/* --------------------------------------------------
   Creature Status Rendering
-------------------------------------------------- */

function renderPokemonStatus(
    pokemon,
    side
) {
    const isPlayer =
        side === "player";

    const nameElement =
        isPlayer
            ? playerName
            : opponentName;

    const levelElement =
        isPlayer
            ? playerLevel
            : opponentLevel;

    const typeElement =
        isPlayer
            ? playerType
            : opponentType;

    const hpTrackElement =
        isPlayer
            ? playerHPTrack
            : opponentHPTrack;

    const hpBarElement =
        isPlayer
            ? playerHPBar
            : opponentHPBar;

    const hpTextElement =
        isPlayer
            ? playerHPText
            : opponentHPText;

    const spriteElement =
        isPlayer
            ? playerSprite
            : opponentSprite;

    const hpPercentage =
        pokemon.getHPPercentage();

    nameElement.textContent =
        pokemon.name;

    levelElement.textContent =
        `Lv. ${pokemon.level}`;

    typeElement.textContent =
        formatTypeName(
            pokemon.type
        );

    removeTypeClasses(
        typeElement
    );

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
        getHPColorClass(
            hpPercentage
        )
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
        `${pokemon.currentHP} / ` +
        `${pokemon.maxHP}`;

    renderPixelSprite(
        spriteElement,
        pokemon,
        side
    );
}

/* --------------------------------------------------
   Move Button Rendering
-------------------------------------------------- */

function createMoveButton(
    move,
    index
) {
    const button =
        document.createElement("button");

    button.className =
        `move-button type-${move.type}`;

    button.type = "button";

    button.dataset.moveIndex =
        index;

    button.disabled =
        !move.hasPP() ||
        !battleManager.canPlayerSelectMove();

    const moveName =
        document.createElement("span");

    moveName.className =
        "move-name";

    moveName.textContent =
        move.name;

    const moveDetails =
        document.createElement("span");

    moveDetails.className =
        "move-details";

    moveDetails.textContent =
        `${formatTypeName(move.type)} | ` +
        `Power ${move.power} | ` +
        `PP ${move.currentPP} / ` +
        `${move.maxPP}`;

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

    pokemon.moves.forEach(
        (move, index) => {
            const moveButton =
                createMoveButton(
                    move,
                    index
                );

            moveGrid.appendChild(
                moveButton
            );
        }
    );
}

function disableMoveButtons() {
    const moveButtons =
        moveGrid.querySelectorAll(
            ".move-button"
        );

    moveButtons.forEach((button) => {
        button.disabled = true;
    });
}

/* --------------------------------------------------
   Team Slot Rendering
-------------------------------------------------- */

function createTeamSlot(
    pokemon,
    activePokemon,
    side
) {
    const slot =
        document.createElement("span");

    slot.className =
        `team-slot ${side}-team-slot`;

    slot.title =
        pokemon.isFainted
            ? "Fainted creature"
            : "Available creature";

    if (pokemon === activePokemon) {
        slot.classList.add(
            "active-slot"
        );
    }

    if (pokemon.isFainted) {
        slot.classList.add(
            "fainted-slot"
        );
    }

    return slot;
}

function renderTeamSlots(
    team,
    activePokemon,
    containerElement,
    side
) {
    containerElement.innerHTML = "";

    team.forEach((pokemon) => {
        const slot =
            createTeamSlot(
                pokemon,
                activePokemon,
                side
            );

        containerElement.appendChild(
            slot
        );
    });
}

/* --------------------------------------------------
   Main Battle Rendering
-------------------------------------------------- */

function renderBattleScreen() {
    if (
        !activePlayerPokemon ||
        !activeOpponentPokemon
    ) {
        return;
    }

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
        playerTeamSlots,
        "player"
    );

    renderTeamSlots(
        opponentTeam,
        activeOpponentPokemon,
        opponentTeamSlots,
        "opponent"
    );
}

/* --------------------------------------------------
   Result Screen Rendering
-------------------------------------------------- */

function createResultCreatureCard(pokemon) {
    const card =
        document.createElement("article");

    card.className =
        `result-creature-card type-border-${pokemon.type}`;

    if (pokemon.isFainted) {
        card.classList.add(
            "result-creature-fainted"
        );
    }

    const sprite =
        document.createElement("div");

    sprite.className =
        "result-creature-sprite";

    sprite.style.backgroundImage =
        `url("${pokemon.spritePath}")`;

    sprite.setAttribute(
        "role",
        "img"
    );

    sprite.setAttribute(
        "aria-label",
        pokemon.name
    );

    const information =
        document.createElement("div");

    information.className =
        "result-creature-information";

    const name =
        document.createElement("h3");

    name.textContent =
        pokemon.name;

    const type =
        document.createElement("span");

    type.className =
        `type-badge type-${pokemon.type}`;

    type.textContent =
        formatTypeName(pokemon.type);

    const health =
        document.createElement("p");

    health.className =
        "result-creature-health";

    health.textContent =
        pokemon.isFainted
            ? "Fainted"
            : `HP ${pokemon.currentHP} / ${pokemon.maxHP}`;

    information.append(
        name,
        type,
        health
    );

    card.append(
        sprite,
        information
    );

    return card;
}

function renderResultTeam(team) {
    battleResultTeam.innerHTML = "";

    team.forEach((pokemon) => {
        battleResultTeam.appendChild(
            createResultCreatureCard(
                pokemon
            )
        );
    });
}

function displayBattleResult(result) {
    const playerWon =
        result === "victory";

    battleResultPanel.classList.remove(
        "victory-result",
        "defeat-result"
    );

    battleResultPanel.classList.add(
        playerWon
            ? "victory-result"
            : "defeat-result"
    );

    battleResultLabel.textContent =
        "Battle Complete";

    battleResultTitle.textContent =
        playerWon
            ? "Victory"
            : "Defeat";

    battleResultMessage.textContent =
        playerWon
            ? "Your team defeated every opposing creature."
            : "Your team was defeated. Adjust your lineup and try again.";

    /*
        Victory displays the player's team.
        Defeat displays the opponent's winning team.
    */

    renderResultTeam(
        playerWon
            ? playerTeam
            : opponentTeam
    );

    showBattleResultScreen();
}

/* --------------------------------------------------
   Battle Manager
-------------------------------------------------- */

class BattleManager {
    constructor() {
        this.state =
            BATTLE_STATES.TEAM_SELECTION;

        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;
    }

    resetToSelection() {
        this.state =
            BATTLE_STATES.TEAM_SELECTION;

        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;
    }

    startBattle() {
        this.state =
            BATTLE_STATES.WAITING_FOR_PLAYER;

        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;

        renderBattleScreen();

        showBattleMessage(
            `Turn 1: What will ` +
            `${activePlayerPokemon.name} do?`
        );
    }

    canPlayerSelectMove() {
        return (
            this.state ===
                BATTLE_STATES.WAITING_FOR_PLAYER &&
            activePlayerPokemon &&
            !activePlayerPokemon.isFainted
        );
    }

    selectPlayerMove(moveIndex) {
        if (!this.canPlayerSelectMove()) {
            return;
        }

        const selectedMove =
            activePlayerPokemon.moves[
                moveIndex
            ];

        if (!selectedMove) {
            console.error(
                `No move exists at index ${moveIndex}.`
            );

            return;
        }

        if (!selectedMove.hasPP()) {
            showBattleMessage(
                `${selectedMove.name} has no PP remaining!`
            );

            return;
        }

        this.playerMove =
            selectedMove;

        this.state =
            BATTLE_STATES.SELECTING_OPPONENT_MOVE;

        disableMoveButtons();

        showBattleMessage(
            `${activePlayerPokemon.name} selected ` +
            `${selectedMove.name}.`
        );

        window.setTimeout(() => {
            this.selectOpponentMove();
        }, 600);
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
            this.opponentMove = null;
        } else {
            const randomIndex =
                Math.floor(
                    Math.random() *
                    availableMoves.length
                );

            this.opponentMove =
                availableMoves[randomIndex];
        }

        this.state =
            BATTLE_STATES.RESOLVING_TURN;

        window.setTimeout(() => {
            this.resolveTurn();
        }, 600);
    }

    async resolveTurn() {
        if (
            this.state !==
            BATTLE_STATES.RESOLVING_TURN
        ) {
            return;
        }

        const playerAction = {
            attacker: activePlayerPokemon,
            defender: activeOpponentPokemon,
            move: this.playerMove,
            defenderSide: "opponent"
        };

        const opponentAction = {
            attacker: activeOpponentPokemon,
            defender: activePlayerPokemon,
            move: this.opponentMove,
            defenderSide: "player"
        };

        const turnActions =
            this.determineTurnOrder(
                playerAction,
                opponentAction
            );

        for (const action of turnActions) {
            if (
                this.state ===
                BATTLE_STATES.BATTLE_OVER
            ) {
                return;
            }

            if (
                action.attacker.isFainted ||
                action.defender.isFainted ||
                !action.move
            ) {
                continue;
            }

            await this.executeMove(action);

            if (action.defender.isFainted) {
                const battleEnded =
                    await this.handleFaint(
                        action.defender,
                        action.defenderSide
                    );

                if (battleEnded) {
                    return;
                }

                /*
                    If the first attacker causes a faint,
                    the original second action is skipped.
                */

                break;
            }
        }

        this.completeTurn();
    }

    determineTurnOrder(
        playerAction,
        opponentAction
    ) {
        const playerSpeed =
            playerAction.attacker.speed;

        const opponentSpeed =
            opponentAction.attacker.speed;

        if (playerSpeed > opponentSpeed) {
            return [
                playerAction,
                opponentAction
            ];
        }

        if (opponentSpeed > playerSpeed) {
            return [
                opponentAction,
                playerAction
            ];
        }

        if (Math.random() < 0.5) {
            return [
                playerAction,
                opponentAction
            ];
        }

        return [
            opponentAction,
            playerAction
        ];
    }

    async executeMove(action) {
        const {
            attacker,
            defender,
            move,
            defenderSide
        } = action;

        if (!move.usePP()) {
            showBattleMessage(
                `${attacker.name} tried to use ` +
                `${move.name}, but it had no PP!`
            );

            await wait(1100);
            return;
        }

        showBattleMessage(
            `${attacker.name} used ${move.name}!`
        );

        animateAttacker(attacker);

        await wait(700);

        const result =
            calculateDamage(
                attacker,
                defender,
                move
            );

        const actualDamage =
            defender.receiveDamage(
                result.damage
            );

        animateDamage(
            defenderSide
        );

        renderPokemonStatus(
            defender,
            defenderSide
        );

        renderMoveButtons(
            activePlayerPokemon
        );

        await wait(650);

        const effectivenessMessage =
            getEffectivenessMessage(
                result.typeMultiplier
            );

        let resultMessage =
            `${defender.name} took ` +
            `${actualDamage} damage.`;

        if (effectivenessMessage) {
            resultMessage +=
                ` ${effectivenessMessage}`;
        }

        showBattleMessage(
            resultMessage
        );

        console.log({
            turn: this.turnNumber,
            attacker: attacker.name,
            defender: defender.name,
            attackerSpeed: attacker.speed,
            move: move.name,
            power: move.power,
            multiplier:
                result.typeMultiplier,
            damage: actualDamage,
            defenderHP:
                defender.currentHP
        });

        await wait(1200);
    }

    async handleFaint(
        faintedPokemon,
        side
    ) {
        animateFaint(side);

        showBattleMessage(
            `${faintedPokemon.name} fainted!`
        );

        renderTeamSlots(
        side === "player"
            ? playerTeam
            : opponentTeam,

        side === "player"
            ? activePlayerPokemon
            : activeOpponentPokemon,

        side === "player"
            ? playerTeamSlots
            : opponentTeamSlots,

        side
        );

        await wait(1400);

        if (side === "player") {
            if (isTeamDefeated(playerTeam)) {
                await this.endBattle(
                    "defeat"
                );

                return true;
            }

            activePlayerPokemon =
                getFirstAvailablePokemon(
                    playerTeam
                );

            this.state =
                BATTLE_STATES.SWITCHING;

            renderBattleScreen();

            showBattleMessage(
                `Go, ${activePlayerPokemon.name}!`
            );

            await wait(1200);
        } else {
            if (isTeamDefeated(opponentTeam)) {
                await this.endBattle(
                    "victory"
                );

                return true;
            }

            activeOpponentPokemon =
                getFirstAvailablePokemon(
                    opponentTeam
                );

            this.state =
                BATTLE_STATES.SWITCHING;

            renderBattleScreen();

            showBattleMessage(
                `The opponent sent out ` +
                `${activeOpponentPokemon.name}!`
            );

            await wait(1200);
        }

        return false;
    }

    completeTurn() {
        if (
            this.state ===
            BATTLE_STATES.BATTLE_OVER
        ) {
            return;
        }

        this.turnNumber += 1;
        this.playerMove = null;
        this.opponentMove = null;

        this.state =
            BATTLE_STATES.WAITING_FOR_PLAYER;

        renderBattleScreen();

        showBattleMessage(
            `Turn ${this.turnNumber}: What will ` +
            `${activePlayerPokemon.name} do?`
        );
    }

    async endBattle(result) {
        this.state =
            BATTLE_STATES.BATTLE_OVER;

        this.playerMove = null;
        this.opponentMove = null;

        disableMoveButtons();

        if (result === "victory") {
            showBattleMessage(
                "Victory! The opposing team has been defeated."
            );
        } else {
            showBattleMessage(
                "Defeat! Your team has no creatures left."
            );
        }

        await wait(1300);

        displayBattleResult(result);

        console.log(
            `Battle ended with result: ${result}`
        );
    }
}

const battleManager =
    new BattleManager();

/* --------------------------------------------------
   Input Handling
-------------------------------------------------- */

function handleMoveButtonClick(event) {
    const selectedButton =
        event.currentTarget;

    const moveIndex =
        Number(
            selectedButton.dataset
                .moveIndex
        );

    if (!Number.isInteger(moveIndex)) {
        console.error(
            "Move button did not contain a valid move index."
        );

        return;
    }

    battleManager.selectPlayerMove(
        moveIndex
    );
}

/* --------------------------------------------------
   Result Screen Actions
-------------------------------------------------- */

function playAgainWithSameTeam() {
    if (
        selectedPokemonIds.length !==
        TEAM_SIZE
    ) {
        returnToTeamSelection();
        return;
    }

    prepareBattleTeams();
    showBattleInterface();
    battleManager.startBattle();

    console.log(
        "Started another battle with the same player team."
    );
}

function returnToTeamSelection() {
    selectedPokemonIds = [];

    playerTeam = [];
    opponentTeam = [];

    activePlayerPokemon = null;
    activeOpponentPokemon = null;

    battleManager.resetToSelection();

    renderCreatureSelectionGrid();
    renderSelectionState();

    showTeamSelectionScreen();

    showSelectionMessage(
        "Choose your first creature."
    );

    console.log(
        "Returned to team selection."
    );
}

/* --------------------------------------------------
   Initialization
-------------------------------------------------- */

function initializeGame() {
    renderCreatureSelectionGrid();
    renderSelectionState();

    showTeamSelectionScreen();

    console.log(
        "Pocket Clash result screens initialized."
    );
}

/* --------------------------------------------------
   Event Listeners
-------------------------------------------------- */

startBattleButton.addEventListener(
    "click",
    startBattleFromSelection
);

restartButton.addEventListener(
    "click",
    returnToTeamSelection
);

playAgainButton.addEventListener(
    "click",
    playAgainWithSameTeam
);

returnSelectionButton.addEventListener(
    "click",
    returnToTeamSelection
);

/* --------------------------------------------------
   Start Game
-------------------------------------------------- */

initializeGame();
