/*	Narcissa

Aluno 1: 63739 António Festas <-- mandatory to fill
Aluno 2: 64922 Manuel Gouveia <-- mandatory to fill

Comentario:

O ficheiro "Narcissa.js" tem de incluir, logo nas primeiras linhas,
um comentário inicial contendo: o nome e número dos dois alunos que
realizaram o projeto; indicação de quais as partes do trabalho que
foram feitas e das que não foram feitas (para facilitar uma correção
sem enganos); ainda possivelmente alertando para alguns aspetos da
implementação que possam ser menos óbvios para o avaliador.

0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
*/


// GLOBAL CONSTANTS

const ANIMATION_EVENTS_PER_SECOND = 4;

const IMAGE_NAME_EMPTY = "empty";
const IMAGE_NAME_INVALID = "invalid";
const IMAGE_NAME_SHRUB = "shrub";
const IMAGE_NAME_BERRY_BLUE = "berryBlue";
const IMAGE_NAME_SNAKE_HEAD = "snakeHead";
const IMAGE_NAME_SNAKE_BODY = "snakeBody";

const AI_DOUBLE_BERRY_INFLUENCE = -10;
const AI_VALID_BERRY_INFLUENCE = -10;
const AI_REPEATED_BERRY_INFLUENCE = 100000000;

// GLOBAL VARIABLES

let control;	// Try not no define more global variables
let ai_ui = true;

// UTILS

/**
 * 
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
const random = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Circular array
 * @param {*} arr 
 * @param {*} newItem 
 * @returns 
 */
const addToFrontAndRemoveLast = (arr, newItem, len = 3) => {
	arr.unshift(newItem); // Add the new item to the front of the array
	if (arr.length > len) {
		arr.pop(); // Remove the last item if the array has more than 3 elements
	}
	return arr;
}

const circularX = (x) => {
	if (x < 0)
		return (WORLD_WIDTH - 1)
	else if (x > WORLD_WIDTH - 1)
		return (0)
	return (x)
}
const circularY = (y) => {
	if (y < 0)
		return (WORLD_HEIGHT - 1)
	else if (y > WORLD_HEIGHT - 1)
		return (0)
	return (y)
}

// AI 
class AI {
	/**
	 * Find the best path for the snake
	 * @param {*} origin Array as [x, y]
	 * @param {*} grid The map grid
	 * @param {Snake} snake The snake 
	 * @returns 
	 */
	static findBestPath(origin, grid, snake) {
		const analyzed_paths = [];
		const berries = AI.findBerries();

		// Get the path to each berry
		for (const berry of berries) {
			const path = AI.findShortestPath(origin, [berry.x, berry.y], grid)
			if (path.length > 0) {
				analyzed_paths.push({ berry, path, weight: 0 })
			}
		}

		// Choose a path
		for (let i = 0; i < analyzed_paths.length; i++) {
			if (analyzed_paths[i].berry.cell.life_timestamp > analyzed_paths[i].path.length) {
				if (analyzed_paths[i].path.length - analyzed_paths[i].berry.cell.life_timestamp <= 15) {
					analyzed_paths[i].weight += AI_DOUBLE_BERRY_INFLUENCE;
				}
				analyzed_paths[i].weight += AI_VALID_BERRY_INFLUENCE;
				analyzed_paths[i].weight += analyzed_paths[i].path.length;
				if (snake.stomach.includes(analyzed_paths[i].berry.cell.color)) {
					analyzed_paths[i].weight += AI_REPEATED_BERRY_INFLUENCE;
				}
			}
		}

		// Find the path with the lowest weight
		return analyzed_paths.reduce((min, current) => {
			return current.weight < min.weight ? current : min;
		}, analyzed_paths[0]);
	}

	/**
	 * Looks for berries in the level
	 * @return An array of berries
	 */
	static findBerries() {
		const berries = []
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				const cell = control.world[x][y];
				if (cell instanceof Berry) {
					berries.push({ cell, x, y })
				}
			}
		}
		return berries;
	}

	static findShortestPath(origin, destination, world) {
		const rows = world.length;
		const cols = world[0].length;

		// Create a visited array to track visited cells
		const visited = [];
		for (let i = 0; i < rows; i++) {
			visited.push(new Array(cols).fill(false));
		}

		// Create a queue for BFS traversal
		const queue = [];

		// Define possible moves: up, down, left, right
		const dx = [-1, 1, 0, 0];
		const dy = [0, 0, -1, 1];

		// Mark the origin as visited and enqueue it
		const [originX, originY] = origin;
		visited[originX][originY] = true;
		queue.push({ x: originX, y: originY, distance: 0, path: [] });

		while (queue.length > 0) {
			// Dequeue a cell from the queue
			const { x, y, distance, path } = queue.shift();

			// Check if the destination is reached
			if (x === destination[0] && y === destination[1]) {
				// Exclude the origin from the path
				return path;
			}

			// Explore all possible moves from the current cell
			for (let i = 0; i < 4; i++) {
				const newX = circularX(x + dx[i]);
				const newY = circularY(y + dy[i]);

				// Check if the new coordinates are within the world bounds and not visited
				if (
					newX >= 0 &&
					newX < rows &&
					newY >= 0 &&
					newY < cols &&
					!visited[newX][newY] &&
					!(world[newX][newY] instanceof Snake) && // Avoid snake
					!(world[newX][newY] instanceof Shrub) // Avoid shrubs
				) {
					// Mark the new cell as visited
					visited[newX][newY] = true;

					// Enqueue the new cell with updated distance and path
					queue.push({
						x: newX,
						y: newY,
						distance: distance + 1,
						path: [...path, [newX, newY]],
					});
				}
			}
		}

		// If no path is found, return an empty array
		return [];
	}
}

// ACTORS

class Actor {
	constructor(x, y, imageName) {
		this.x = x;
		this.y = y;
		this.atime = 0;	// This has a very technical role in the control of the animations
		this.imageName = imageName;
		this.show();
	}

	draw(x, y, image) {
		control.ctx.drawImage(image, x * ACTOR_PIXELS_X, y * ACTOR_PIXELS_Y);
	}

	show() {
		this.checkPosition();
		control.world[this.x][this.y] = this;
		this.draw(this.x, this.y, GameImages[this.imageName]);
	}

	hide() {
		control.world[this.x][this.y] = control.getEmpty();
		this.draw(this.x, this.y, GameImages[IMAGE_NAME_EMPTY]);
	}

	move(dx, dy) {
		this.hide();
		this.x += dx;
		this.y += dy;
		this.show();
	}

	animation(x, y) {

	}

	checkPosition() {
		if (control.world[this.x] === undefined
			|| control.world[this.x][this.y] === undefined)
			fatalError("Invalid position");
	}
}


class Shrub extends Actor {
	constructor(x, y, color) {
		super(x, y, IMAGE_NAME_SHRUB);
		this.body = [];
		this.grow_timestamp = random(20 * ANIMATION_EVENTS_PER_SECOND, 100 * ANIMATION_EVENTS_PER_SECOND);
	}

	animation(x, y) {
		if (this.grow_timestamp === 0) {
			this.grow(this.x, this.y)
			this.grow_timestamp = random(20 * ANIMATION_EVENTS_PER_SECOND, 100 * ANIMATION_EVENTS_PER_SECOND);
		}
		this.grow_timestamp--;
	}

	grow(x, y) {
		const coords = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

		let p = random(0, coords.length - 1)
		let newX = circularX(x + coords[p][0]);
		let newY = circularY(y + coords[p][1]);

		while (!control.world[newX][newY] instanceof Empty
			&& !control.world[newX][newY] instanceof Shrub) {
			p = random(0, coords.length - 1)
			newX = circularX(x + coords[p][0]);
			newY = circularY(y + coords[p][1]);
		}

		if (control.world[newX][newY] instanceof Empty) {
			control.world[newX][newY] = this;
			this.draw(newX, newY, GameImages[IMAGE_NAME_SHRUB])
			console.log("New Shrub Grown (%d, %d)", newX, newY)
		} else if (control.world[newX][newY] === this) {
			this.grow(newX, newY)
		}
	}
}

class Empty extends Actor {
	constructor() {
		super(-1, -1, IMAGE_NAME_EMPTY);
		this.atime = Number.MAX_SAFE_INTEGER;	// This has a very technical role
	}
	show() { }
	hide() { }
}

class Invalid extends Actor {
	constructor(x, y) { super(x, y, IMAGE_NAME_INVALID); }
}


class Berry extends Actor {
	constructor(x, y, color) {
		super(x, y, color);
		this.color = color;
		this.double = false;
		this.life_timestamp = random(20 * ANIMATION_EVENTS_PER_SECOND, 100 * ANIMATION_EVENTS_PER_SECOND);
	}

	animation(x, y) {
		if (this.life_timestamp <= 10 * ANIMATION_EVENTS_PER_SECOND) {
			this.double = true;
			this.drawExpireationMark(x, y)
		}

		if (this.life_timestamp === 0) this.hide();
		else this.life_timestamp--;
	}

	drawExpireationMark(x, y) {
		control.ctx.beginPath();
		control.ctx.arc(x * ACTOR_PIXELS_X + ACTOR_PIXELS_X / 2,
			y * ACTOR_PIXELS_X + ACTOR_PIXELS_Y / 2, 4, 0, 2 * Math.PI, true);

		control.ctx.fillStyle = "#000"
		control.ctx.fill();
	}
}

class Snake extends Actor {
	constructor(x, y) {
		super(x, y, IMAGE_NAME_SNAKE_HEAD);
		this.stomach = [IMAGE_NAME_EMPTY, IMAGE_NAME_EMPTY, IMAGE_NAME_EMPTY];
		this.tailLength = 1;
		this.body = new Array(5);
		this.length = 5;
		this.lastDir = [1, 0];
		this.plannedPath = null;


		// Draw initial snake
		for (let i = 0; i < this.body.length; i++) {
			this.body[i] = [this.x - i, this.y, [0, 0]];
		}

		console.log("Snake Body =>", this.body.length, ...this.body)

		for (let i = 0; i < this.body.length; i++) {
			const [px, py, _] = this.body[i];
			console.log("[%d] Pos (%d, %d)", i, px, py);
			control.world[px][py] = this;

			if (i === 0) { // Head
				this.draw(px, py, GameImages[IMAGE_NAME_SNAKE_HEAD])
			}
			else if (i === 1) { this.draw(px, py, GameImages[this.stomach[0]]) }
			else if (i === 2) { this.draw(px, py, GameImages[this.stomach[1]]) }
			else if (i === 3) { this.draw(px, py, GameImages[this.stomach[2]]) }
			else {
				this.draw(px, py, GameImages[IMAGE_NAME_SNAKE_BODY])
			}
		}
	}

	handleKey() {
		let k = control.getKey();
		if (!k) return this.lastDir;	// ignore
		this.lastDir = k;
		return k; // Return movement direction
	}

	move(dx, dy) {
		// Hide Snake
		for (let i = 0; i < this.body.length; i++) {
			const [px, py, _] = this.body[i];
			control.world[px][py] = control.getEmpty();
			this.draw(px, py, GameImages[IMAGE_NAME_EMPTY]);
		}

		// Move Snake Body
		for (let i = this.body.length - 1; i > 0; i--) {
			this.body[i] = this.body[i - 1];
		}

		// Move snake head
		this.x = circularX(this.x + dx)
		this.y = circularY(this.y + dy)
		this.body[0] = [this.x, this.y, [dx, dy]];

		// Snake after move
		// console.log("Snake Body =>", this.body.length,  ...this.body);
		// console.log("Snake Stomach =>", this.stomach.length, ...this.stomach);

		// Redraw Snake
		for (let i = 0; i < this.body.length; i++) {
			const [px, py, _] = this.body[i];
			control.world[px][py] = this;

			if (i === 0) { // Head
				this.draw(px, py, GameImages[IMAGE_NAME_SNAKE_HEAD])
			}
			else if (i === 1) { this.draw(px, py, GameImages[this.stomach[0]]) }
			else if (i === 2) { this.draw(px, py, GameImages[this.stomach[1]]) }
			else if (i === 3) { this.draw(px, py, GameImages[this.stomach[2]]) }
			else {
				this.draw(px, py, GameImages[IMAGE_NAME_SNAKE_BODY])
			}
		}
	}

	animation(x, y) {

		// WIN CONDITION
		if (this.length >= 300) return control.stopLoop("WIN")
		let direction; // The direction to take on the next movement

		if (control.ai) {
			const newPath = AI.findBestPath([this.x, this.y], control.world, this);
			if (!this.plannedPath || this.plannedPath.path.length <= 0) {
				this.plannedPath = newPath;
			} else if (this.plannedPath.weight - 20 > newPath.weight) {
				this.plannedPath = newPath;
			}

			if (this.plannedPath) {
				const [posX, posY] = /* this.plannedPath.path[0] */ this.plannedPath.path.shift()
				const dirX = posX - this.x;
				const dirY = posY - this.y;

				console.log("Current Pos (%d, %d)", this.x, this.y);
				console.log("Move Direction (%d, %d)", dirX, dirY);
				console.log("Berry", newPath.berry)
				console.log("Path", newPath.path)
				console.log("Weight", newPath.weight)
				// control.pause = true;

				direction = [dirX, dirY];
			} else {
				direction = this.lastDir;
			}
		} else {
			direction = this.handleKey(); // Keyboard direction
		}

		// Movement
		if (direction) {
			let [dx, dy] = direction;

			// Prevent snake from reverting
			const [hx, hy, _] = this.body[0];
			const [nx, ny, __] = this.body[1];
			if (circularX(hx + dx) === nx && circularY(hy + dy) === ny) return;

			// Collisions
			const square = control.world[circularX(hx + dx)][circularY(hy + dy)];
			if (square && square instanceof Berry) {
				this.eat(x, y, square)
			} else if (square && square instanceof Shrub) {
				return this.shrubCollide(x, y, square)
			} else if (square && square instanceof Snake) {
				return this.selfCollide(x, y, square)
			}

			this.move(dx, dy)
		}

		const s = document.querySelector("#snake-len")
		s.innerHTML = this.body.length;
	}

	/**
	 * 
	 * @param {*} x 
	 * @param {*} y 
	 * @param {Berry} berry 
	 */
	eat(x, y, berry) {
		if (this.stomach.includes(berry.color)) {
			const tailSize = this.body.length - 4;
			const loose = Math.floor(tailSize / 2);
			console.log("Ate a berry [%s] (%d - %d)", berry.color, tailSize, loose);
			if (tailSize > 1) this.looseTail(loose);
		} else {
			if (berry.double) { this.growTail() };
			this.growTail();
		}

		addToFrontAndRemoveLast(this.stomach, berry.color)
	}

	looseTail(loose) {
		for (let l = 0; l < loose; l++) {
			const [px, py, _] = this.body.pop();
			console.log("[%d] Removing Tail (%d, %d)", l, px, py);
			control.world[px][py] = control.getEmpty();
			this.draw(px, py, GameImages[IMAGE_NAME_EMPTY]);
		}
	}

	growTail() {
		const [lx, ly, [dx, dy]] = this.body[this.body.length - 1];
		this.body.push([circularX(lx - dx), circularY(ly - dy), [dx, dy]])
	}

	shrubCollide(x, y, shrub) {
		control.stopLoop("LOSE")
	}

	selfCollide(x, y, snake) {
		console.log("Self Collision")
		control.stopLoop("LOSE")
	}
}

// GAME CONTROL

class GameControl {
	constructor() {
		let c = document.getElementById('canvas1');
		control = this;	// setup global var
		this.key = 0;
		this.pause = false;
		this.time = 0;
		this.ctx = document.getElementById("canvas1").getContext("2d");
		this.empty = new Empty();	// only one empty actor needed, global var
		this.world = this.createWorld();
		this.shrubs = [];
		this.spawnBerry = random(1 * ANIMATION_EVENTS_PER_SECOND, 11 * ANIMATION_EVENTS_PER_SECOND);
		this.ai = false;
		this.loadLevel(1);
		this.setupEvents();
	}

	getEmpty() {
		return this.empty;
	}

	createWorld() { // matrix needs to be stored by columns
		let world = new Array(WORLD_WIDTH);
		for (let x = 0; x < WORLD_WIDTH; x++) {
			let a = new Array(WORLD_HEIGHT);
			for (let y = 0; y < WORLD_HEIGHT; y++)
				a[y] = this.empty;
			world[x] = a;
		}
		return world;
	}

	loadLevel(level) {
		if (level < 1 || level > MAPS.length)
			fatalError("Invalid level " + level)
		let map = MAPS[level - 1];	// -1 because levels start at 1
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map is stored by lines
				GameFactory.actorFromCode(map[y][x], x, y);
			}
		}

		// Save the shrubs
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				if (this.world[x][y] instanceof Shrub) {
					this.shrubs.push(this.world[x][y])
				}
			}
		}
	}

	getKey() {
		let k = this.key;
		// this.key = 0;
		switch (k) {
			case 37: case 79: case 74: return [-1, 0];	// LEFT, O, J
			case 38: case 81: case 73: return [0, -1];	// UP, Q, I
			case 39: case 80: case 76: return [1, 0];	// RIGHT, P, L
			case 40: case 65: case 75: return [0, 1];	// DOWN, A, K
			default: null;
			// http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
		};
	}

	setupEvents() {
		addEventListener("keydown", e => this.keyDownEvent(e), false);
		addEventListener("keyup", e => this.keyUpEvent(e), false);
		this.loop = setInterval(() => this.animationEvent(), 1000 / ANIMATION_EVENTS_PER_SECOND);
	}

	stopLoop(status = "LOSE") {
		clearInterval(this.loop)
		switch (status) {
			case "WIN": alert("You won!!")
			case "LOSE": alert("Game Over!!")
		}
	}

	animationEvent() {
		if (this.pause) return;

		if (this.spawnBerry === 0) {
			const n_berries = random(1, 5);
			for (let i = 0; i < n_berries; i++) {
				const color = random(0, 7);
				let randX = random(0, WORLD_WIDTH - 1)
				let randY = random(0, WORLD_HEIGHT - 1)

				while (!control.world[randX][randY] instanceof Empty) {
					randX = random(0, WORLD_WIDTH - 1)
					randY = random(0, WORLD_HEIGHT - 1)
				}

				control.world[randX][randY] = new Berry(randX, randY, this.pickRandomColor(color));
			}

			this.spawnBerry = random(1 * ANIMATION_EVENTS_PER_SECOND, 11 * ANIMATION_EVENTS_PER_SECOND);
		} else {
			this.spawnBerry--;
		}

		this.time++;
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let a = this.world[x][y];
				if (a.atime < this.time) {
					a.atime = this.time;
					a.animation(x, y);
				}
			}
		}
	}

	togglePause() {
		const p_btn = document.querySelector("#p-btn")
		this.pause = !this.pause;
		p_btn.value = this.pause === true ? "Resume" : "Pause"
	}

	toggleAI() {
		this.ai = !this.ai;
	}

	pickRandomColor(num) {
		const color = [
			"berryBlue",
			"berryBrown",
			"berryCyan",
			"berryDarkGreen",
			"berryGreen",
			"berryOrange",
			"berryPurple",
			"berryRed",
		]

		return color[num]
	}

	keyDownEvent(e) {
		this.key = e.keyCode;
	}

	keyUpEvent(e) {
	}
}


// Functions called from the HTML page

function onLoad() {
	// Asynchronously load the images an then run the game
	GameImages.loadAll(() => new GameControl());
}

function restart() { location.reload() }

function pause() {
	control.togglePause()
}

function toggle_ai() {
	console.log("Toggle AI");
	const aib = document.querySelector("#ai-btn");
	control.toggleAI()
	aib.value = control.ai === true ? "Disable AI" : "Enable AI"
}