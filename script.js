"use strict";

/*
    Pocket Clash - Commit 6

    This commit adds:
    - Speed-based turn order
    - Complete turn resolution
    - PP consumption
    - Damage calculation
    - Type effectiveness
    - Fainting
    - Automatic switching
    - Victory and defeat states
    - Restart support
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
        spritePath,
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
}

/* --------------------------------------------------
   Type Effectiveness
-------------------------------------------------- */

/*
    Six required non-neutral relationships:

    Fire -> Grass = 2
    Grass -> Fire = 0.5

    Grass -> Water = 2
    Water -> Grass = 0.5

    Water -> Fire = 2
    Electric -> Water = 2

    All unspecified matchups are neutral.
*/

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

/* --------------------------------------------------
   Creature Database
-------------------------------------------------- */

const POKEMON_DATABASE = {
    cindervex: new Pokemon(
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

    tidelume: new Pokemon(
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

    bramblehorn: new Pokemon(
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

    voltari: new Pokemon(
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

/* --------------------------------------------------
   Starting Teams
-------------------------------------------------- */

const playerTeam = [
    POKEMON_DATABASE.cindervex,
    POKEMON_DATABASE.tidelume
];

const opponentTeam = [
    POKEMON_DATABASE.bramblehorn,
    POKEMON_DATABASE.voltari
];

let activePlayerPokemon =
    playerTeam[0];

let activeOpponentPokemon =
    opponentTeam[0];

/* --------------------------------------------------
   Battle States
-------------------------------------------------- */

const BATTLE_STATES = {
    WAITING_FOR_PLAYER:
        "waiting-for-player",

    SELECTING_OPPONENT_MOVE:
        "selecting-opponent-move",

    RESOLVING_TURN:
        "resolving-turn",

    SWITCHING:
        "switching",

    BATTLE_OVER:
        "battle-over"
};

/* --------------------------------------------------
   HTML References
-------------------------------------------------- */

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
        document.createElement(
            "button"
        );

    button.className =
        `move-button type-${move.type}`;

    button.type =
        "button";

    button.dataset.moveIndex =
        index;

    button.disabled =
        !move.hasPP() ||
        !battleManager.canPlayerSelectMove();

    const moveName =
        document.createElement(
            "span"
        );

    moveName.className =
        "move-name";

    moveName.textContent =
        move.name;

    const moveDetails =
        document.createElement(
            "span"
        );

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
    activePokemon
) {
    const slot =
        document.createElement(
            "span"
        );

    slot.className =
        `team-slot type-${pokemon.type}`;

    slot.title =
        `${pokemon.name} ` +
        `(${formatTypeName(
            pokemon.type
        )})`;

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
    containerElement
) {
    containerElement.innerHTML =
        "";

    team.forEach((pokemon) => {
        const slot =
            createTeamSlot(
                pokemon,
                activePokemon
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
   Battle Manager
-------------------------------------------------- */

class BattleManager {
    constructor() {
        this.state =
            BATTLE_STATES.WAITING_FOR_PLAYER;

        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;
    }

    reset() {
        this.state =
            BATTLE_STATES.WAITING_FOR_PLAYER;

        this.turnNumber = 1;
        this.playerMove = null;
        this.opponentMove = null;
    }

    canPlayerSelectMove() {
        return (
            this.state ===
                BATTLE_STATES.WAITING_FOR_PLAYER &&
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
            defenderSide: "opponent",
            side: "player"
        };

        const opponentAction = {
            attacker: activeOpponentPokemon,
            defender: activePlayerPokemon,
            move: this.opponentMove,
            defenderSide: "player",
            side: "opponent"
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
                    The second action is skipped if its
                    original attacker fainted before it
                    could move.
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

        /*
            Equal Speed uses a random tie-breaker.
        */

        const playerGoesFirst =
            Math.random() < 0.5;

        if (playerGoesFirst) {
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
            movePower: move.power,
            typeMultiplier:
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
                : opponentTeamSlots
        );

        await wait(1400);

        if (side === "player") {
            if (isTeamDefeated(playerTeam)) {
                this.endBattle("defeat");
                return true;
            }

            const replacement =
                getFirstAvailablePokemon(
                    playerTeam
                );

            if (replacement) {
                this.state =
                    BATTLE_STATES.SWITCHING;

                activePlayerPokemon =
                    replacement;

                showBattleMessage(
                    `Go, ${activePlayerPokemon.name}!`
                );

                renderBattleScreen();

                await wait(1200);
            }
        } else {
            if (isTeamDefeated(opponentTeam)) {
                this.endBattle("victory");
                return true;
            }

            const replacement =
                getFirstAvailablePokemon(
                    opponentTeam
                );

            if (replacement) {
                this.state =
                    BATTLE_STATES.SWITCHING;

                activeOpponentPokemon =
                    replacement;

                showBattleMessage(
                    `The opponent sent out ` +
                    `${activeOpponentPokemon.name}!`
                );

                renderBattleScreen();

                await wait(1200);
            }
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

    endBattle(result) {
        this.state =
            BATTLE_STATES.BATTLE_OVER;

        this.playerMove = null;
        this.opponentMove = null;

        disableMoveButtons();

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

        if (result === "victory") {
            showBattleMessage(
                "Victory! The opposing team has been defeated."
            );
        } else {
            showBattleMessage(
                "Defeat! Your team has no creatures left."
            );
        }

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

    activePlayerPokemon =
        playerTeam[0];

    activeOpponentPokemon =
        opponentTeam[0];

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
        "Pocket Clash full battle loop initialized."
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