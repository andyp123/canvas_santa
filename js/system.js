/* SYSTEM CLASSES **************************************************************
Screen, mouse, keyboard etc. go here.

Note that mouse actions, keyup, keydown and window.onblur and onfocus are all 
assigned in this file. They can be rebound, but the functionality of these
classes may no longer work as intended.

TODO:
+better data preloading
 -loading bar
 -default textures, sounds etc.
 -retrieve data by name?
+button hold event?
 -how long was button held on release? should only reset duration on press?
+disable certain browser behaviour that causes problems for game
+timer, pause game support
*/

//objects in global namespace
var g_KEYSTATES = new KeyStates();
var g_MOUSE = new Mouse();
var g_SCREEN = new Screen();
var g_RENDERLIST = new RenderList();

//global variables
var g_FRAMERATE = 60;
var g_FRAMETIME_MS = Math.ceil(1000.0 / g_FRAMERATE);
var g_FRAMETIME_S = 1.0 / g_FRAMERATE;
var g_GAMETIME = 0;
var g_GAMETIME_FRAMES = 0;

var g_INIT_SUB = null; //user init func
var g_MAIN_SUB = null;

var sys_UPDATE_INTERVAL_ID = -1;



/* DATA PRELOADING *
This code is used to prevent execution of the main code before data
has finished loading. Failure to do so will most likely result in improper
execution of code.

Somewhere in the code (start of main js file is fine) add:
sys_TEXTUREPATHS = [ //the textures I want to preload
	"bear.png",
	"moose.png",
	"elephant.png",
];
sys_loadTextures();

At the very end of the main js file add:
sys_preloadDataThenInit(initFunc()); //initFunc is the name of your initialisation function

Note that any code in the global scope following the above call will get immediately
executed, so make sure that sys_preloadDataThenInit is called on the last line.
*/
//var sys_TEXTUREPATHS = {};
var sys_TEXTURES = [];
var sys_TEXTURES_LOADED = 0;
var sys_LOAD_INTERVAL_ID = -1;

function sys_textureLoadSuccess() {
	sys_TEXTURES_LOADED++;
}

function sys_textureLoadFail() {
	var str = new String("ERROR: failed to load file: ");
	str += this.src;
	alert(str);
}

function sys_loadTextures() {
	var img, i;
	for (i = 0; i < sys_TEXTUREPATHS.length; i++) {
		img = new Image();
		img.src = sys_TEXTUREPATHS[i];
		img.onload = sys_textureLoadSuccess;
		img.onabort = sys_textureLoadFail; 
		img.onerror = sys_textureLoadFail;
		sys_TEXTURES.push(img);
	}
}

function sys_loadData() {
	sys_loadTextures();
	//sys_loadSounds();
}

function sys_checkDataLoaded() {
	if (sys_TEXTURES_LOADED == sys_TEXTUREPATHS.length) {
		clearInterval(sys_LOAD_INTERVAL_ID);
		//alert("all data loaded");
		sys_init();
	}
}

function sys_preloadDataThenInit() {
	sys_LOAD_INTERVAL_ID = setInterval(function () { sys_checkDataLoaded(); }, 50);
}

/* SYS_STARTUP *****************************************************************
Takes a user init and main function along with the desired framerate
(update interval) and starts the game running, temporarily passing
control to user code during both and init before taking it back.
This allows the system to update various system variables without the
user having to do any extra work.
<body onload='sys_startup(myInit, myMain, 60'><!--STUFF--></body>
*/
function sys_startup(initFunc, mainFunc, framerate) {
	//set framerate
	g_FRAMERATE = framerate;
	g_FRAMETIME_MS = Math.ceil(1000 / g_FRAMERATE);
	g_FRAMETIME_S = 1.0 / g_FRAMERATE;
	
	g_INIT_SUB = initFunc;
	g_MAIN_SUB = mainFunc;
	
	sys_loadData();
	sys_preloadDataThenInit();
}

function sys_init() {
	//call users init func
	g_INIT_SUB();
	
	//start main function running (uses anonymous function to avoid immediate execution)
	sys_UPDATE_INTERVAL_ID = setInterval(function() { sys_main(); }, g_FRAMETIME_MS);
}

function sys_main() {
	//do system stuff
	g_GAMETIME += g_FRAMETIME_MS;
	g_GAMETIME_FRAMES++;
	g_MOUSE.dx = g_MOUSE.dx - g_MOUSE.x;
	g_MOUSE.dy = g_MOUSE.dy - g_MOUSE.y
	
	//call users main function
	g_MAIN_SUB();
	
	//more system stuff
	g_MOUSE.dx = g_MOUSE.x;
	g_MOUSE.dy = g_MOUSE.y;
	g_KEYSTATES.anyKeyJustPressed = false;
	g_KEYSTATES.anyKeyJustReleased = false;
}

/* SCREEN **********************************************************************
A simple container for basic screen related functions
*/
function Screen() {
	this.canvas = null;
	this.context = null;
	this.width = 0;
	this.height = 0;
	this.posX = 0; //used, but this is a hack!
	this.posY = 0;
	this.clearColor = "rgb(64,64,64)";
	this.clearAlpha = 1.0; //unused
	this.useTouch = false;
}

Screen.prototype.init = function(id, width, height, useTouch) {
	this.canvas = document.getElementById(id);
	if (this.canvas != null) {
		this.context = this.canvas.getContext('2d');
		this.setSize(width, height);
		this.posX = this.canvas.offsetLeft;
		this.posY = this.canvas.offsetTop;
		
		this.useTouch = useTouch || false;
		if (this.useTouch) this.addTouchEventListeners();

		return true;
	}
	alert("canvas with id \'" + id + "\' could not be found");
	return false;
}

//hacked in single touch support to emulate mouse
Screen.prototype.addTouchEventListeners = function() {
	var mouse = g_MOUSE;
	mouse.touchID = -1;

	this.canvas.addEventListener('touchstart', function(event) {
		event.preventDefault();

		var mouse = g_MOUSE;
		var touches = event.targetTouches;
		if (touches.length > 0 && mouse.touchID == -1) {
			mouse.x = touches[0].pageX - g_SCREEN.posX;
			mouse.y = touches[0].pageY - g_SCREEN.posY;
			mouse.left.press();
			mouse.touchID = touches[0].identifier;
		}
	}, false);

	this.canvas.addEventListener('touchend', function(event) {
		event.preventDefault();

		var mouse = g_MOUSE;
		var touches = event.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			if (touches[i].identifier == mouse.touchID) {
				mouse.left.release();
				mouse.touchID = -1;
				return;
			}
		}
	}, false);

	this.canvas.addEventListener('touchmove', function(event) {
		event.preventDefault();

		var mouse = g_MOUSE;
		var touches = event.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			if (touches[i].identifier == mouse.touchID) {
				mouse.x = touches[i].pageX - g_SCREEN.posX;
				mouse.y = touches[i].pageY - g_SCREEN.posY;
				return;
			}
		}
	}, false);

	// disable accidental right click menu activation (hopefully)
	this.canvas.addEventListener('onContextMenu', function(event) {
		event.preventDefault();
	}, false);

	this.canvas.addEventListener('onblur', function(event) {
		var mouse = g_MOUSE;
		mouse.touchID = -1;
	});	
}

Screen.prototype.clear = function() {
	if (this.context != null) {
		//this.context.clearRect(0, 0, this.width, this.height);
		this.context.fillStyle = this.clearColor;
		this.context.fillRect(0, 0, this.width, this.height);
	}
}

Screen.prototype.setSize = function(width, height) {
		if(width) {
			this.canvas.width = width;
			this.width = width;
		}
		if (height) {
			this.canvas.height = height;
			this.height = height;
		}
}


/* KEYBOARD STATES *************************************************************
a place to store the state of all keys and the time they were pressed or released

javascript character codes
13 - ENTER
27 - ESCAPE
32 - SPACE
37-40 - LEFT,UP,RIGHT,DOWN
48-57 - 0-9 (ascii)
65-90 - A-Z (ascii)
*/
function ButtonState() {
	this.state = false;
	this.time = 0;	
}

ButtonState.prototype.press = function() {
	if (this.state == false) { //only set state if it has changed
		this.state = true;
		this.time = g_GAMETIME;
	}
}

ButtonState.prototype.release = function() {
	if (this.state == true) {
		this.state = false;
		this.time = g_GAMETIME;
	}
}

ButtonState.prototype.isPressed = function() {
	return this.state;
}

ButtonState.prototype.justPressed = function() {
	return (this.state && g_GAMETIME - this.time == g_FRAMETIME_MS);
}

ButtonState.prototype.justReleased = function() {
	return (!this.state && g_GAMETIME - this.time == g_FRAMETIME_MS);
}

ButtonState.prototype.duration = function() {
	return g_GAMETIME - this.time;
}


function KeyStates() {
	this.states = new Array(256);
	this.anyKeyJustPressed = false;
	this.anyKeyJustReleased = false;
	var i;
	for (i = 0; i < 256; i++) {
		this.states[i] = new ButtonState();
	}
}

//to make sure keys are not held down when the canvas element loses focus
KeyStates.prototype.releaseAll = function() {
	for (var i = 0; i < 256; i++) {
		this.states[i].release();
	}
}

KeyStates.prototype.getState = function(keyCode) {
	if (keyCode < 0 || keyCode > 255) {
		return this.keyStates[0];
	} else {
		return this.states[keyCode];
	}
}

KeyStates.prototype.isPressed = function(keyCode) {
	return this.states[keyCode].state;
}

KeyStates.prototype.justPressed = function(keyCode) {
	return (this.states[keyCode].state == true && g_GAMETIME - this.states[keyCode].time == g_FRAMETIME_MS);
}

KeyStates.prototype.justReleased = function(keyCode) {
	return (this.states[keyCode].state == false && g_GAMETIME - this.states[keyCode].time == g_FRAMETIME_MS);
}

KeyStates.prototype.duration = function(keyCode) {
	return g_GAMETIME - this.state[keyCode].time;
}

KeyStates.prototype.toString = function() {
	var rv = "<b>Key States</b><br>";
	var i;
	for (i = 0; i < 256; i++) {
		if (this.states[i].state == true) {
			rv += i + " : " + (g_GAMETIME - this.states[i].time) + "<br>";
		}
	}
	return rv;
}

var KEYS = {
	BACKSPACE : 8,
	TAB : 9,
	ENTER : 13,
	SHIFT : 16,
	CTRL : 17,
	ALT : 18,
	PAUSE : 19,
	CAPSLOCK : 20,
	ESCAPE : 27,
	SPACE : 32,
	PAGEUP : 33,
	PAGEDOWN : 34,
	END : 35,
	HOME : 36,
	LEFT : 37,
	UP : 38,
	RIGHT : 39,
	DOWN : 40,
	INSERT : 45,
	DELETE : 46,
	_0 : 48,
	_1 : 49,
	_2 : 50,
	_3 : 51,
	_4 : 52,
	_5 : 53,
	_6 : 54,
	_7 : 55,
	_8 : 56,
	_9 : 57,
	A : 65,
	B : 66,
	C : 67,
	D : 68,
	E : 69,
	F : 70,
	G : 71,
	H : 72,
	I : 73,
	J : 74,
	K : 75,
	L : 76,
	M : 77,
	N : 78,
	O : 79,
	P : 80,
	Q : 81,
	R : 82,
	S : 83,
	T : 84,
	U : 85,
	V : 86,
	W : 87,
	X : 88,
	Y : 89,
	Z : 90,
	LEFTOS : 91,
	RIGHTOS : 92,
	SELECT : 93,
	NP_0 : 96,
	NP_1 : 97,
	NP_2 : 98,
	NP_3 : 99,
	NP_4 : 100,
	NP_5 : 101,
	NP_6 : 102,
	NP_7 : 103,
	NP_8 : 104,
	NP_9 : 105,
	MULTIPLY : 106,
	ADD : 107,
	SUBTRACT : 109,
	DECIMALPOINT : 110,
	DIVIDE : 111,
	F1 : 112,
	F2 : 113,
	F3 : 114,
	F4 : 115,
	F5 : 116,
	F6 : 117,
	F7 : 118,
	F8 : 119,
	F9 : 120,
	F10 : 121,
	F11 : 122,
	F12 : 123,
	NUMLOCK : 144,
	SCROLLLOCK : 145,
	SEMICOLON : 186,
	EQUALS : 187,
	COMMA : 188,
	DASH : 189,
	PERIOD : 190,
	FORWARDSLASH : 191,
	GRAVEACCENT : 192,
	OPENBRACKET : 219,
	BACKSLASH : 220,
	CLOSEBRACKET : 221,
	SINGLEQUOTE : 222
};


/* MOUSE ***********************************************************************
simple container for mouse input
*/
function Mouse() {
	this.x = 0;
	this.y = 0;
	this.dx = 0;
	this.dy = 0;
	this.left = new ButtonState();
	this.right = new ButtonState();
	this.outsideScreen = true;
	this.ignoreOutsideClicks = true;
}

//releases the buttons (doesn't touch x or y)
Mouse.prototype.releaseAll = function() {
	this.left.release();
	this.right.release();
	this.left.lastHoldDuration = 0;
	this.right.lastHoldDuration = 0;
}

Mouse.prototype.toString = function() {
	var rv = new String("<b>Mouse State</b><br> ");
	rv += this.x + ", " + this.y + " (";
	rv += this.dx + ", " + this.dy + ")";
	if (this.outsideScreen) rv += " [OUT]";
	else rv += "[IN]";
	if (this.left.state) rv += ", LMB = " + this.left.duration();
	if (this.right.state) rv += ", RMB = " + this.right.duration();
	if (this.touchID !== undefined) rv += ", touchID = " + this.touchID;
	else rv += ", [TOUCH DISABLED]";
	return rv;
}


/* RENDER LIST *****************************************************************
A list to which objects are added each frame and then drawn.
The benefit of this system is that it supports sorting of objects
so that they can be assigned to layers and have priority within
that layer and thus be drawn in the correct order automatically.

functions that are expected:
draw(ctx, xofs, yofs)
drawDebug(ctx, xofs, yofs)
addDrawCall() - not accessed from RenderList, but a function is
	required to add the object to the render list
	
typical usage:
*add each object to the renderlist
*in the main draw function, call in this order
RENDERLIST.sort(); 
RENDERLIST.draw(ctx, cam);
RENDERLIST.drawDebug(ctx, cam, 0); //optional
RENDERLIST.clear();

TODO:
+layer modifiers
 -function that affects the position of the objects in a layer based on the layer
 -can be as simple as parallax or screenshake, but it is possible to bind any function
*/
function RenderListNode() {
	this.object = null;
	this.layer = 0;
	this.priority = 0;
	this.screenRelative = false; //if screenRelative, do not offset using cam position or parallax
}

RenderListNode.prototype.set = function(object, layer, priority, screenRelative) {
	this.object = object;
	this.layer = layer || 0;
	this.priority = priority || 0;
	this.screenRelative = screenRelative || false;
}

RenderListNode.prototype.toString = function() {
	var rv;
	if (this.object) rv = this.object.toString();
	else rv = new String("NULL");
	rv += " | " + this.layer;
	rv += " | " + this.priority;
	return rv;
}

//sort objects a and b
RenderListNode.sort = function(a, b) {
	if (a.object != null && b.object != null) {
		if (a.layer != b.layer) return (a.layer - b.layer);
		else return (a.priority - b.priority);
	} else if (a.object == null && b.object == null) {
		return 0;
	}
	if (a.object == null) return 1; //sort null to back of array!
	else return -1;
}

function RenderList() {
	RenderList.MAX_OBJECTS = 64; //should be set to whatever is required. 32 is VERY conservative

	this.objects = new Array(RenderList.MAX_OBJECTS);
	this.numObjects = 0;
	
	for (var i = 0; i < RenderList.MAX_OBJECTS; i++) {
		this.objects[i] = new RenderListNode();
	}
}

//add an object to be rendered
RenderList.prototype.addObject = function(object, layer, priority, screenRelative) {
	if (this.numObjects < RenderList.MAX_OBJECTS) {
		this.objects[this.numObjects].set(object, layer, priority, screenRelative);
		this.numObjects++;
	} else {
		var msg = new String("RenderList.addObject: MAX_OBJECTS (");
		msg += this.numObjects + "/" + RenderList.MAX_OBJECTS + ") reached. Object not added";
		alert(msg);
	}
}

//sort all objects
RenderList.prototype.sort = function() {
	this.objects.sort(RenderListNode.sort);
}

//draw all objects (assumes list is sorted)
RenderList.prototype.draw = function(ctx, cameraX, cameraY) {
	var xofs, yofs;
	for (var i = 0; i < this.numObjects; i++) {
		if (this.objects[i].screenRelative) {
			xofs = 0;
			yofs = 0;
		} else {
			xofs = (this.objects[i].layer * 0.05 * cameraX) - cameraX;
			yofs = (this.objects[i].layer * 0.05 * cameraY) - cameraY;
		}
		this.objects[i].object.draw(ctx, xofs, yofs);
	}
}

//draw debug for a particular layer (assumes list is sorted)
RenderList.prototype.drawDebug = function(ctx, cameraX, cameraY, layer) {
	var xofs, yofs;
	var i = 0;
	while (this.objects[i].layer != layer && i < this.numObjects) i++;
	while (this.objects[i].layer == layer && i < this.numObjects) {
		if (this.objects[i].screenRelative) {
			xofs = 0;
			yofs = 0;
		} else {
			xofs = (this.objects[i].layer * 0.05 * cameraX) - cameraX;
			yofs = (this.objects[i].layer * 0.05 * cameraY) - cameraY;
		}
		this.objects[i].object.drawDebug(ctx, xofs, yofs);
		i++;
	}
}

//clear objects array for next frame
RenderList.prototype.clear = function() {
	while (this.numObjects > 0) {
		this.objects[--this.numObjects].set(null);
	}
}

RenderList.prototype.toString = function() {
	var rv = new String("<b>RenderList.objects (");
	rv += this.numObjects + "/" + RenderList.MAX_OBJECTS + ")</b><br><i>object type</i> | <i>layer</i> | <i>priority</i><br>";
	for (var i = 0; i < this.numObjects; i++) {
		rv += this.objects[i].toString() + "<br>";
	}
	return rv;
}


/* RANDOM NUMBER TABLE *********************************************************
Allows use of Math.random() to be easily limited to a set number of calls per frame.
Stores numbers generated in a frame and allows either a specific index to be retrieved
(for sequence critical calculations, which can't be truely random) or the last index
used + 1 (for cases where sequence doesn't matter, such as particle effects)

seedrandom.js comments note that Math.random() takes around 0.002 ms per call, so a
large table of 128 of these costs around 0.256 ms per frame. A table of around 64
should be fine, however.
*/
function RandomNumberTable(tableSize) {
	if (tableSize < RandomNumberTable.MIN_SIZE) tableSize = RandomNumberTable.MIN_SIZE;
	else if (tableSize > RandomNumberTable.MAX_SIZE) tableSize = RandomNumberTable.MAX_SIZE;
	
	this.table = new Array(tableSize);
	this.index = 0;
	this.generateNumbers();
}

RandomNumberTable.MIN_SIZE = 1;
RandomNumberTable.MAX_SIZE = 128;	
	
//generate new random numbers for the entire table
RandomNumberTable.prototype.generateNumbers = function() {
	for (var i = 0; i < this.table.length; i++) {
		this.table[i] = Math.random();
	}
}

//gets a random number and increments the index
RandomNumberTable.prototype.get = function() {
	if (this.index > this.table.length - 1) this.index = 0;
	return this.table[this.index++];
}

//gets the random number at a specific index (ensures sequence-critical numbers are ok)
RandomNumberTable.prototype.getAt = function(pos) {
	if (pos < 0) pos = 0;
	else if (pos > this.table.length - 1) pos = this.table.length - 1;
	
	return this.table[pos];
}


/* EVENT BINDINGS **************************************************************
Change these only if neccessary
*/
document.onkeydown = function(e) {
	g_KEYSTATES.anyKeyJustPressed = true;
    g_KEYSTATES.states[e.keyCode].press();
}

document.onkeyup = function(e) {
	g_KEYSTATES.anyKeyJustReleased = true;
	g_KEYSTATES.states[e.keyCode].release();
}

document.onmousedown = function(e) {
	if (!(g_MOUSE.ignoreOutsideClicks && g_MOUSE.outsideScreen)) {
		if (e.button == 0) g_MOUSE.left.press();
		else if (e.button == 2) g_MOUSE.right.press();
	}
}

document.onmouseup = function(e) {
	if (e.button == 0) g_MOUSE.left.release();
	else if (e.button == 2) g_MOUSE.right.release();
}

document.onmousemove = function(e) {
	e = e || window.event;

	if (e.pageX || e.pageY) {
		g_MOUSE.x = e.pageX;
		g_MOUSE.y = e.pageY;
	}
	else {
		g_MOUSE.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		g_MOUSE.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	
	g_MOUSE.x -= g_SCREEN.posX;
	g_MOUSE.y -= g_SCREEN.posY;
	
	if (g_MOUSE.x < 0 || g_MOUSE.x > g_SCREEN.width || g_MOUSE.y < 0 || g_MOUSE.y > g_SCREEN.height) {
		g_MOUSE.outsideScreen = true;
	} else {
		g_MOUSE.outsideScreen = false;
	}
}

window.onblur = function() {
	g_KEYSTATES.releaseAll();
	g_MOUSE.releaseAll();
}

window.onfocus = function() {
	g_KEYSTATES.releaseAll();
	g_MOUSE.releaseAll();
}

//prevent text being selected and breaking shit
document.onselectstart = function()
{
    return false;
};
