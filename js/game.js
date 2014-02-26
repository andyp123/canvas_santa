/* Santa's Christmas Delivery (lame working title)
Simple javascript game based on the helicopter in a tunnel game but
with santa delivering presents and avoiding collisions with houses and
trees instead of the tunnel.

The player must control the sleigh to fly close to the tops of houses
in order to deliver presents, but not so close as to crash!

Elves frequently top up Santa's sleigh with more presents, which add
weight to the sleigh. If not enough presents are delivered, the sleigh
gets too heavy and will become more difficult to control and eventually
become certain to crash.

Starring: Santa Claus, Rudolf the Red Nosed Reindeer, Elves, Mrs Claus
Use the cartoon style I tested at work to do the graphics. There are
thousands of atmospheric Christmas paintings that can be used for further
inspiration.

If I make it quickly enough, it might be possible to get something ready
for Christmas and try and get people to donate money to charity?

OMFG! Awesome idea but maybe not enough time! Make the game's title screen
look like an interactive Christmas card, the webpage border should enhance
this effect and encourage people to send the "card" with a link to friends
(maybe could customise the card by adding a name and message etc. (which
would obviously be overlaid using regular html features somehow)

TODO:
+Controls
 -basically just one button to move up
 -must feel more or less sluggish based on weight of presents in sleigh
+Collision system
 -must be very simple - AABB only
+Procedurally generated level
 -based on pseudo-random seed, which player's can modify (could be card message?)
 -must start easy and get progressively more difficult
 -must never become impossible, just very difficult
 -should be infinite, based on time, structural length, or on something else?
+Must work perfectly on my smallest laptop at 60fps
 -careful of memory allocation and garbage collection stalls (pre-allocate!)
 -might need to make low-res version for older computers
  ipad: 1024x768 (1.333333) iphone 3gs: 480x320 (1.5) (1024x680 ~= 480x320, 960x640 safer)
+Concept image
 -simple card design as main game concept. Could also use as personal e-card if project fails :)
+Graphics
 +sir_awesome renderlist system!
 +double buffer / look at performance improvements
 +backgrounds
  -hills and sky
  -houses
  -trees
  -foreground details
 +characters
  -santa + sleigh
  -rudolf
  -elves
+Particles
 -snow effect
 -sleigh magic trail
 -present delivery effect
+Sound...
 -erm, would be nice at least
*/

/*
load images
load sounds
create object caches (do not require many objects aside from particles)
*/


/* GLOBAL VARIABLES ************************************************************
*/

var g_GAMEAREA = null; //aabb that can be used to check if objects go off screen
var g_DEBUG = false;
var g_RAND = null; //random number table

var g_GAMESTATE = {};
var g_ANIM_TABLE = {};
var g_SPRITE_CACHE = {}; //for a few special cases...

/*
this should be an OBJECT ( e.g. img_player : "img/player.png", )
find out how to do this at some point...
instead of images, store sprites?
sys_TEXTURES
tex1 : ["img/tex1.png"], //sys_TEXTURES.tex1[1] after texture added
tex2 : {src:"img/tex2.png"}, //sys_TEXTURES.tex2.img after texture added
tex3 : "img/tex3.png", //path overwritten by image, so sys_TEXTURE.tex3
sys_addTexture("img_santa","img/santa.png"); //whatever you like I guess
*/
var sys_TEXTUREPATHS = [
	"img/santa.png",		//0
	"img/item_present.png",	//1
	"img/sky.png",			//2
	"img/hills.png",		//3
	"img/hills_back.png",
	"img/moon.png",
	"img/tree_mid_01.png",	//6
	"img/tree_mid_02.png",
	"img/tree_mid_03.png",
	"img/tree_back_01.png",	//9
	"img/tree_back_02.png",
	"img/tree_back_03.png",
	"img/bghouse_01.png",	//12
	"img/bghouse_02.png",
	"img/fx_star.png",		//14
	"img/ob_house_01.png",	//15
	"img/ob_shack_01.png",
	"img/ob_church.png",
	"img/ob_ufo.png",
	"img/item_star.png",	//19
	"img/fx_trail.png",		//20
	"img/fx_getPresent.png",
	"img/fx_trail_ufo.png",
	"img/fx_explosion.png",	//23
	"img/ob_terrace.png",
	"img/ob_pub.png",
	"img/ob_shack_02.png",
];

var g_CAMERA = null;
var g_PLAYER = null;
var g_BACKGROUND = null;
var g_STARFIELD = null;
var g_ITEM_MANAGER = null;
var g_OBSTACLE_MANAGER = null;
var g_GAME_DIRECTOR = null;
var g_PARTICLE_MANAGER = null;


/* CAMERA **********************************************************************
simple camera class with a few basic features for this game
*/
function Camera() {
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(0, 0);
	this.ofs = new Vector2(0, 0);
	this.constrain = false;
	this.min = new Vector2(0, 0);
	this.max = new Vector2(0, 0);
	this.trackTarget = null; //must have pos.x, pos.y
	
	this.moveSpeed = 500;
	this.moveTime = 0.25;
	this.moveDist = 1;
	
	this.shakeStart = 0; //time when camera shake began
	this.shakeDuration = 0 //duration of shake
	this.shakeForce = 5; //force of shake
}

Camera.prototype.getX = function() {
	return this.pos.x + this.ofs.x;
}

Camera.prototype.getY = function() {
	return this.pos.y + this.ofs.y;
}

Camera.prototype.update = function() {
	if (this.trackTarget) {
		this.vel.x = (this.trackTarget.pos.x - g_SCREEN.width * 0.5) - this.pos.x;
		this.vel.y = (this.trackTarget.pos.y - g_SCREEN.height * 0.5 + 40) - this.pos.y;
		this.moveDist = this.vel.len();
		this.vel.div(this.moveDist); //normalise velocity vector
		this.moveSpeed = this.moveDist / this.moveTime;
		this.vel.mul(this.moveSpeed * g_FRAMETIME_S);
		this.pos.add(this.vel);
		//this.pos.x = this.trackTarget.pos.x - g_SCREEN.width * 0.5;
		//this.pos.y = this.trackTarget.pos.y - g_SCREEN.height * 0.5 + 40;
	}
	if (this.constrain) {
		if (this.pos.x < this.min.x) {
			this.pos.x = this.min.x;
		} else if (this.pos.x > this.max.x) {
			this.pos.x = this.max.x;
		}
		if (this.pos.y < this.min.y) {
			this.pos.y = this.min.y;
		} else if (this.pos.y > this.max.y) {
			this.pos.y = this.max.y;
		}
	}
	//add shake
	if (g_GAMETIME < this.shakeStart + this.shakeDuration) {
		var t = (g_GAMETIME - this.shakeStart) / this.shakeDuration;
		var x = 1 - (2 * t - 1) * (2 * t - 1); //blend function 1-(2x-1)^2
		this.ofs.x = (2 * g_RAND.get() - 1) * x * this.shakeForce;
		this.ofs.y = (2 * g_RAND.get() - 1) * x * this.shakeForce;
	} else {
		this.ofs.set(0, 0);
	}
}

Camera.prototype.addShake = function(shakeDuration, shakeForce) {
	if (g_GAMETIME > this.shakeStart + this.shakeDuration) {
		this.shakeStart = g_GAMETIME;
	}
	this.shakeDuration = shakeDuration;
	this.shakeForce = shakeForce;
}	


/* COLLISION *******************************************************************
type definitions:
AABB - Axially Aligned Bounding Box
 -centre point px,py
 -half width, half height hw, hh
*/

function AABB(px, py, width, height) {
	this.pos = new Vector2(px, py);
	this.hw = width / 2.0;
	this.hh = height / 2.0;
}

AABB.prototype.equals = function(aabb) {
	this.pos.equals(aabb.pos);
	this.hw = aabb.hw;
	this.hh = aabb.hh;
}

AABB.prototype.draw = function(ctx, xofs, yofs) {
	ctx.strokeRect(Math.floor(this.pos.x - this.hw + xofs) + 0.5,
					 Math.floor(this.pos.y - this.hh + yofs) + 0.5,
					 Math.floor(this.hw * 2),
					 Math.floor(this.hh * 2));
}

AABB.prototype.test_AABB = function(b) {
	if (Math.abs(this.pos.x - b.pos.x) > this.hw + b.hw) return false; //separated by y axis
	if (Math.abs(this.pos.y - b.pos.y) > this.hh + b.hh) return false; //separated by x axis
	return true;
}

AABB.prototype.test_XY = function(x, y) {
	if (Math.abs(this.pos.x - x) > this.hw) return false;
	if (Math.abs(this.pos.y - y) > this.hh) return false;
	return true;
}

AABB.prototype.toString = function() {
	var rv = new String("AABB pos: ");
	rv += this.pos + ", hw: " + this.hw + ", hh: " + this.hh;
	return rv;
}

/* PARTICLE SYSTEM *************************************************************
*/
function Particle() {
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(0, 0);
	this.startTime = 0;
	this.frame = 0;
	this.frameWait = 3;
	this.active = false
}

function ParticleSystem(MAX_PARTICLES, spawnFunc, updateFunc, drawFunc, sprite) {
	this.particles = [];
	this.numParticles = MAX_PARTICLES;
	this.numActiveParticles = 0;
	this.spawnFunc = spawnFunc || null;
	this.updateFunc = updateFunc || null;
	this.drawFunc = drawFunc || null;
	this.sprite = sprite || null;
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(1, 0);
	this.gravity = new Vector2(0, 0);
	this.startTime = 0;
	this.systemDuration = 1000;
	this.particleDuration = 1000;
	
	//spawn control parameters
	this.spawnDuration = 1; //spawn particles unless this is 0. < 0 means spawn forever
	this.spawnCount = 1; //number of particles to spawn when spawning
	this.spawnDelay = 1; //frames to delay before next spawning
	this.nextSpawn = 0; //time (in frames) to next spawn at
	this.spawnForce = 100; //force/speed applied to spawned particles
	this.spawnRadius = 64; //for radius based spawn functions such as the trails

	this.layer = 0;
	this.priority = 0;
	this.active = false;
	
	var i = MAX_PARTICLES;
	while (i--) {
		this.particles[i] = new Particle();
	}
}

ParticleSystem.prototype.getMaxParticles = function() {
	return this.particles.length;
}

ParticleSystem.prototype.setNumParticles = function(numParticles) {
	if (numParticles < 0) {
		this.numParticles = 0;
	} else if (numParticles > this.particles.length) {
		this.numParticles = this.particles.length;
	} else {
		this.numParticles = numParticles;
	}	
}

//resets states and activates
ParticleSystem.prototype.activate = function() {
	var i = this.particles.length;
	while (i--) {
		this.particles[i].active = false;
	}
	this.numActiveParticles = 0;
	this.nextSpawn = 0;
	this.startTime = g_GAMETIME;
	this.active = true;
}

ParticleSystem.prototype.spawn = function() {
	if (this.spawnFunc) {
		if (this.spawnDuration != 0 && g_GAMETIME_FRAMES >= this.nextSpawn) {
			this.spawnFunc.call(this);
		}
	}
}

ParticleSystem.prototype.update = function() {
	var i;
	if (this.active) {
		if (this.spawnDuration < 0 || g_GAMETIME < this.startTime + this.spawnDuration) {
			this.spawn();
		}
		if (this.systemDuration < 0 || g_GAMETIME < this.startTime + this.systemDuration) {
			if (this.updateFunc) {
				this.updateFunc.call(this);
			}
		} else {
			i = this.numParticles;
			while (i--) {
				this.particles[i].active = false;
			}
			this.numActiveParticles = 0;
			this.active = false;
		}
	}
}

ParticleSystem.prototype.draw = function(ctx, xofs, yofs) {
	if (this.active) {
		if (this.drawFunc) {
			this.drawFunc.call(this, ctx, xofs, yofs);
		} else {
			this.drawDebug(ctx, xofs, yofs);
		}
	}
}

ParticleSystem.prototype.drawDebug = function(ctx, xofs, yofs) {
	var x, y;
	var i = this.numParticles;
	while (i--) {
		x = Math.floor(this.particles[i].pos.x + xofs) - 1; //-1 to draw from centre
		y = Math.floor(this.particles[i].pos.y + yofs) - 1;
		ctx.fillRect(x, y, 2, 2);
	}
}

ParticleSystem.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

ParticleSystem.prototype.toString = function() {
	return "ParticleSystem";
}

ParticleSystem.prototype.toString_verbose = function() {
	var rv = new String("");
	rv += (this.active) ? "[1] ap: " : "[0] ap: "; 
	rv += this.numActiveParticles + " src: ";
	if (this.sprite) rv += this.sprite.img.src;
	return rv;
}

/* PARTICLE SYSTEM FUNCTIONS *
SF - Spawn Function
UF - Update Function
DF - Draw Function
*/
//DEFAULT FUNCTIONS
//spawns all particles in 1 frame in circular pattern
ParticleSystem.SF_default = function() {
	var i = this.numParticles;
	var angle = 2 * Math.PI / i;
	while (i--) {
		this.particles[i].vel.setAngle(angle * i);
		this.particles[i].vel.mul(this.spawnForce * g_FRAMETIME_S);
		this.particles[i].pos.equals(this.pos);
		this.particles[i].startTime = g_GAMETIME;
		this.particles[i].active = true;
		this.particles[i].frame = 0;
	}
	this.numActiveParticles = this.numParticles; //all spawned at once
}

//moves particles linearly by summing pos and vel
ParticleSystem.UF_default = function() {
	var i = this.numParticles;
	while (i--) {
		if (this.particles[i].active) {
			if (g_GAMETIME > this.particles[i].startTime + this.particleDuration) {
				this.particles[i].active = false;
				this.numActiveParticles--;
			} else {
				this.particles[i].pos.add(this.particles[i].vel);
			}
		}
	}
}

//draw particles as white dots
ParticleSystem.DF_default = function(ctx, xofs, yofs) {
	var x, y;
	var i = this.numParticles;
	ctx.fillStyle = "rgb(255,255,255)";
	while (i--) {
		if (this.particles[i].active) {
			x = Math.floor(this.particles[i].pos.x + xofs) - 2; //-1 to draw from centre
			y = Math.floor(this.particles[i].pos.y + yofs) - 2;
			ctx.fillRect(x, y, 4, 4);
		}
	}
}

//draw particles as sprites
ParticleSystem.DF_genericSprite = function(ctx, xofs, yofs) {
	if (this.sprite) {
		var i = this.numParticles;
		while (i--) {
			if (this.particles[i].active) {
				this.sprite.draw(ctx, this.particles[i].pos.x + xofs,
									  this.particles[i].pos.y + yofs,
									  this.particles[i].frame);
			}
		}
	}
}

//PLAYER TRAIL
ParticleSystem.SF_playerTrail = function() {
	var i = this.numParticles;
	var remaining = this.spawnCount;
	while (i--) {
		if (!this.particles[i].active) {
			this.particles[i].pos.equals(this.pos);
			this.particles[i].pos.y += this.vel.x * (g_RAND.get() * this.spawnRadius - this.spawnRadius * 0.5); //random offset on perpendicular
			this.particles[i].pos.x += this.vel.y * (g_RAND.get() * this.spawnRadius - this.spawnRadius * 0.5);
			this.particles[i].vel.equals(this.vel);
			this.particles[i].vel.mul(this.spawnForce * g_FRAMETIME_S);
			this.particles[i].active = true;
			this.particles[i].frame = 0;
			this.particles[i].startTime = g_GAMETIME + Math.floor(g_RAND.get() * 500);
			this.numActiveParticles++; //DON'T FORGET THIS!
			if (--remaining == 0) break;
		}
	}
	this.nextSpawn = g_GAMETIME_FRAMES + this.spawnDelay;
}

ParticleSystem.UF_playerTrail = function() {
	var i = this.numParticles;
	while (i--) {
		if (this.particles[i].active) {
			if (g_GAMETIME > this.particles[i].startTime + this.particleDuration) {
				this.particles[i].active = false;
				this.numActiveParticles--;
			} else {
				this.particles[i].pos.add(this.particles[i].vel);
				this.particles[i].vel.add(this.gravity);
				if (--this.particles[i].frameWait < 1) {
					if (++this.particles[i].frame > 3) this.particles[i].frame = 0;
					this.particles[i].frameWait = 3;
				}
			}
		}
	}
}

ParticleSystem.init_playerTrail = function(ps, sprite) {
	if (sprite) ps.sprite = sprite;
	ps.spawnFunc = ParticleSystem.SF_playerTrail;
	ps.updateFunc = ParticleSystem.UF_playerTrail;
	ps.drawFunc = ParticleSystem.DF_genericSprite;
	ps.numParticles = 12;
	ps.systemDuration = -1; //always on
	ps.spawnDuration = -1; //always spawning
	ps.particleDuration = 500;
	ps.spawnDelay = 6; //new particle every 6 frames
	ps.spawnForce = 150;
	ps.spawnRadius = 64;
	ps.gravity.equals(g_GAMESTATE.gravity);
	ps.gravity.mul(g_FRAMETIME_S * 0.125);
	ps.activate();
}

//GET PRESENT
ParticleSystem.SF_getPresent = function() {
	var i = this.numParticles;
	var angle = 2 * Math.PI / i;
	while (i--) {
		this.particles[i].vel.setAngle(angle * i);
		this.particles[i].vel.mul(this.spawnForce * g_FRAMETIME_S);
		this.particles[i].pos.equals(this.pos);
		this.particles[i].startTime = g_GAMETIME;
		this.particles[i].active = true;
		this.particles[i].frame = 0;
	}
	this.numActiveParticles = this.numParticles; //all spawned at once
}

ParticleSystem.UF_getPresent = function() {
	var t = (g_GAMETIME - this.startTime) / this.particleDuration;
	var frame = 3 - Math.floor((this.particleDuration - (g_GAMETIME - this.startTime)) / (g_FRAMETIME_MS * 3)); // change anim frame every 3 frames
	if (frame < 0) frame = 0;
	var i = this.numParticles;
	while (i--) {
		if (this.particles[i].active) {
			if (g_GAMETIME > this.particles[i].startTime + this.particleDuration) {
				this.particles[i].active = false;
				this.numActiveParticles--;
			} else {
				this.particles[i].pos.x += this.particles[i].vel.x * (1 - t);
				this.particles[i].pos.y += this.particles[i].vel.y * (1 - t);
				this.particles[i].pos.x += g_GAMESTATE.scrollDX; //scroll with stage
				this.particles[i].frame = frame;
			}
		}
	}
}

ParticleSystem.init_getPresent = function(ps, sprite) {
	if (sprite) ps.sprite = sprite;
	ps.spawnFunc = ParticleSystem.SF_getPresent;
	ps.updateFunc = ParticleSystem.UF_getPresent;
	ps.drawFunc = ParticleSystem.DF_genericSprite;
	ps.numParticles = 6 + Math.floor(10 * g_GAMESTATE.intensityClamped);
	ps.systemDuration = 1000;
	ps.particleDuration = 750;
	ps.spawnDuration = 1;
	ps.spawnForce = 300;
	ps.activate();
}

//UFO ENGINE
ParticleSystem.SF_ufoTrail = function() {
	var i = this.numParticles;
	var remaining = this.spawnCount;
	while (i--) {
		if (!this.particles[i].active) {
			this.particles[i].pos.equals(this.pos);
			this.particles[i].vel.equals(this.vel);
			this.particles[i].vel.mul(this.spawnForce * g_FRAMETIME_S);
			//this.particles[i].vel.x = -g_GAMESTATE.scrollDX * g_FRAMETIME_S;
			this.particles[i].active = true;
			this.particles[i].frame = 0;
			this.particles[i].startTime = g_GAMETIME;;
			this.numActiveParticles++; //DON'T FORGET THIS!
			if (--remaining == 0) break;
		}
	}
	this.nextSpawn = g_GAMETIME_FRAMES + this.spawnDelay;
}

ParticleSystem.UF_ufoTrail = function() {
	var i = this.numParticles;
	while (i--) {
		if (this.particles[i].active) {
			if (g_GAMETIME > this.particles[i].startTime + this.particleDuration) {
				this.particles[i].active = false;
				this.numActiveParticles--;
			} else {
				this.particles[i].pos.add(this.particles[i].vel);
				this.particles[i].frame = 4 - Math.floor((this.particleDuration - (g_GAMETIME - this.particles[i].startTime)) / (g_FRAMETIME_MS * 2)); // change anim frame every 3 frames
				if (this.particles[i].frame < 0) this.particles[i].frame = 0;
			}
		}
	}
}

ParticleSystem.init_ufoTrail = function(ps, sprite) {
	if (sprite) ps.sprite = sprite;
	ps.spawnFunc = ParticleSystem.SF_ufoTrail;
	ps.updateFunc = ParticleSystem.UF_ufoTrail;
	ps.drawFunc = ParticleSystem.DF_genericSprite;
	ps.numParticles = 16;
	ps.systemDuration = -1;
	ps.spawnDuration = -1;
	ps.spawnDelay = 8;
	ps.spawnForce = 120;
	ps.spawnRadius = 0;
	ps.vel.set(0, 1); //fire down
	ps.particleDuration = 1000;
	ps.activate();
}

//STAR TRAIL
ParticleSystem.init_starTrail = function(ps, sprite) {
	if (sprite) ps.sprite = sprite;
	ps.spawnFunc = ParticleSystem.SF_playerTrail;
	ps.updateFunc = ParticleSystem.UF_playerTrail;
	ps.drawFunc = ParticleSystem.DF_genericSprite;
	ps.numParticles = 8;
	ps.systemDuration = -1; //always on
	ps.spawnDuration = -1; //always spawning
	ps.particleDuration = 500;
	ps.spawnDelay = 6; //new particle every 6 frames
	ps.spawnForce = 50;
	ps.spawnRadius = 16;
	ps.gravity.equals(g_GAMESTATE.gravity);
	ps.gravity.mul(g_FRAMETIME_S * 0.125);
	ps.priority = -g_SCREEN.width; //should sort behind all buildings etc.
	ps.activate();
}


/* PARTICLE SYSTEM MANAGER *
Manages a list of particle systems and handles updates if required so that simple
effects such as explosions can be fire and forget from external code. However, if
required a system can be reserved and managed externally. This will stop the
manager allowing a reference to the system being passed to any other object.
When not reserved, a particle system can only be used when not already active.
*/
function ParticleSystemManager(MAX_SYSTEMS, MAX_PARTICLES) {
	this.systems = [];
	
	var i = MAX_SYSTEMS;
	while (i--) {
		this.systems[i] = new ParticleSystem(MAX_PARTICLES);
		this.systems[i].MANAGER_RESERVED = false; //specifies whether or not external code manages this system
	}
}

ParticleSystemManager.prototype.reserve = function() {
	var i = this.systems.length;
	while (i--) {
		if (!this.systems[i].MANAGER_RESERVED && !this.systems[i].active) {
			this.systems[i].MANAGER_RESERVED = true;
			return this.systems[i];
		}
	}
	return null;
}

ParticleSystemManager.prototype.release = function(particleSystem, fade) {
	particleSystem.MANAGER_RESERVED = false;
	if (fade) {
		particleSystem.spawnDuration = 0; //stop spawning new particles
		particleSystem.systemDuration = g_GAMETIME - particleSystem.startTime + 1000; //default to fade over 1000ms
	} else {
		particleSystem.active = false;
	}
}

ParticleSystemManager.prototype.update = function() {
	var i = this.systems.length;
	while (i--) {
		if (!this.systems[i].MANAGER_RESERVED && this.systems[i].active) {
			this.systems[i].update();
		}
	}
}

ParticleSystemManager.prototype.addDrawCall = function() {
	var i = this.systems.length;
	while (i--) {
		if (this.systems[i].active) {
			this.systems[i].addDrawCall();
		}
	}
}

ParticleSystemManager.prototype.spawnEffect = function(initFunc, sprite, x, y, layer, priority) {
	var i = this.systems.length;
	while (i--) {
		if (!this.systems[i].MANAGER_RESERVED && !this.systems[i].active) {
			initFunc.call(this, this.systems[i], sprite);
			this.systems[i].pos.set(x, y);
			this.systems[i].layer = layer || 0;
			this.systems[i].priority = priority || 0;
			break;
		}
	}
}

ParticleSystemManager.prototype.toString = function() {
	var rv = new String("<b>ParticleSystemManager</b><br>");
	var i = this.systems.length;
	var used = 0;
	while (i--) {
		if (this.systems[i].active || this.systems[i].MANAGER_RESERVED) {
			rv += i + ": " + this.systems[i];
			if (this.systems[i].MANAGER_RESERVED) rv += "[RES]<br>";
			else rv += "<br>";
			used++;
		}
	}
	rv += "<b>used: " + used + "/" + this.systems.length + "</b><br>";
	return rv;
}


/* BACKGROUND ******************************************************************
BackgroundComponent - simple container for sprites etc. allowing animation
	positioning etc. that works with RenderList
BackgroundScrollLayer - scrolling layer that uses a single image to tile across
	the screen and scrolls by a set amount each frame
BackgroundComponentLayer - layer that generates random object instances to
	scroll across the screen from preset templates	
BackgroundComponentTemplate - simple object used as template
Background - container class of the above
*/
//BackgroundComponent
function BackgroundComponent() {
	this.sprite = null;
	this.anim = null;
	this.pos = new Vector2(0, 0);
	this.layer = 0;
	this.priority = 0;
}

BackgroundComponent.prototype.set = function(sprite, anim, px, py, layer, priority) {
	this.sprite = sprite;
	this.sprite.center = false; //align to top left
	this.anim = anim || null;
	this.pos = new Vector2(px, py);
	this.layer = layer;
	this.priority = priority;
}

BackgroundComponent.prototype.update = function() {
	if (this.anim) {
		this.anim.update();
	}
}

BackgroundComponent.prototype.draw = function(ctx, xofs, yofs) {
	if (this.anim) {
		this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + yofs, this.anim.currentFrame);
	} else {
		this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + yofs, 0);
	}
}

BackgroundComponent.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

BackgroundComponent.prototype.toString = function() {
	return "BackgroundComponent";
}

//BackgroundScrollLayer
function BackgroundScrollLayer(img, scrollScale, y, layer, priority) {
	this.img = img;
	this.scrollOffset = 0.0;
	this.scrollScale = scrollScale || 0.0;
	this.y = y | 0;
	this.layer = layer || 0;
	this.priority = priority || 0;
}

BackgroundScrollLayer.prototype.update = function() {
	this.scrollOffset += this.scrollScale * g_GAMESTATE.scrollDX;
	
	while (this.scrollOffset < -this.img.width) {
		this.scrollOffset += this.img.width;
	}
	while (this.scrollOffset > 0) {
		this.scrollOffset -= this.img.width;
	}
}

BackgroundScrollLayer.prototype.draw = function(ctx, xofs, yofs) {
	var x = Math.floor(this.scrollOffset);
	for (x; x < g_SCREEN.width; x += this.img.width) {
		ctx.drawImage(this.img, Math.floor(x + xofs), Math.floor(this.y + yofs));
	}
}

BackgroundScrollLayer.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

BackgroundScrollLayer.prototype.toString = function() {
	return "BackgroundScrollLayer";
}

//BackgroundObjectTemplate
function BackgroundComponentTemplate() {
	this.sprite = null;
	this.minY = 0;
	this.maxY = 0;
	this.chance = 1.0;
}

BackgroundComponentTemplate.prototype.set = function(sprite, minY, maxY, chance) {
	this.sprite = sprite;
	this.minY = minY || 0;
	this.maxY = maxY || 0;
	this.chance = chance || 1.0;
}

//BackgroundComponentLayer
function BackgroundComponentLayer(MAX_INSTANCES, scrollScale, layer, priority, minSpawnDelay, maxSpawnDelay, randFunc) {
	this.templates = []; //BackgroundComponentTemplate array
	this.instances = []; //BackgroundComponent array
	this.activeInstances = 0;
	this.scrollScale = scrollScale || 0.0;
	this.density = 1.0; //density 1 tries to enforce approx object size gaps
	this.randFunc = randFunc || Math.random; //function to use for random number generation
	this.layer = layer || 0;
	this.priority = priority || 0;
	this.minSpawnDelay = minSpawnDelay || 250;
	this.maxSpawnDelay = maxSpawnDelay || 1000;
	this.lastSpawnTime = 0;
	this.nextSpawnTime = 0;
	this.spawning = true;
	
	for (var i = 0; i < MAX_INSTANCES; i++) {
		this.instances[i] = new BackgroundComponent();
		this.instances[i].active = false; //add active attribute
	}
}

BackgroundComponentLayer.prototype.addTemplate = function(sprite, minY, maxY, chance) {
	this.templates[this.templates.length] = new BackgroundComponentTemplate();
	this.templates[this.templates.length - 1].set(sprite, minY, maxY, chance);
}

//this will probably invoke garbage collection at some point
BackgroundComponentLayer.prototype.clear = function() {
	this.templates = [];
	for (var i = 0; i < this.instances.length; i++) {
		this.instances[i].active = false;
		this.instances[i].sprite = null;
		this.instances[i].anim = null;
	}
	this.activeInstances = 0;
	this.lastSpawnTime = 0;
	this.nextSpawnTime = 0;
}

BackgroundComponentLayer.prototype.spawnInstance = function() {
	if (!this.spawning || this.templates.length < 1) return;
	//select template to spawn
	var t = Math.round(this.randFunc() * (this.templates.length - 1));
	var yofs = this.templates[t].minY + this.randFunc() * (this.templates[t].maxY - this.templates[t].minY)
	//attempt to spawn it
	for (var i = 0; i < this.instances.length; i++) {
		if (!this.instances[i].active) {
			this.instances[i].set(this.templates[t].sprite, null, g_SCREEN.width, yofs, this.layer, this.priority);
			this.instances[i].active = true;
			this.activeInstances++;
			this.lastSpawnTime = g_GAMETIME;
			break;
		}
	}
}

//spawn new instances and update existing ones
BackgroundComponentLayer.prototype.update = function() {
	if (this.templates.length > 0) {
		//update existing instances
		for (var i = 0; i < this.instances.length; i++) {
			if (this.instances[i].active) {
				if (this.instances[i].pos.x + this.instances[i].sprite.frameWidth < 0) {
					this.instances[i].active = 0;
					this.activeInstances--;
				} else {
					this.instances[i].pos.x += this.scrollScale * g_GAMESTATE.scrollDX;
					this.instances[i].priority = Math.floor(g_SCREEN.width - this.instances[i].pos.x);
				}
			}
		}
		//spawn new instances?
		if (this.spawning && this.activeInstances < this.instances.length) {
			//spawn condition... could modifiy to space objects out based on size of sprite etc.
			if (g_GAMETIME > this.nextSpawnTime) {
				this.spawnInstance();
				this.nextSpawnTime = g_GAMETIME + this.minSpawnDelay + this.randFunc() * (this.maxSpawnDelay - this.minSpawnDelay);
			}
		}
	}
}

BackgroundComponentLayer.prototype.addDrawCall = function() {
	if (this.activeInstances > 0) {
		for (var i = 0; i < this.instances.length; i++) {
			if (this.instances[i].active) {
				this.instances[i].addDrawCall();
			}
		}
	}
}

//Background
function Background() {
	this.components = [];
	this.scrollLayers = [];
	this.componentLayers = [];
	this.spawning = false;
}

Background.prototype.setSpawning = function(spawning) {
	this.spawning = spawning;
	var i = this.componentLayers.length;
	while (i--) {
		this.componentLayers[i].spawning = this.spawning;
		if (spawning) { //don't want to spawn object over the top of an old one
			this.componentLayers[i].nextSpawnTime = g_GAMETIME + this.componentLayers[i].minSpawnDelay;
		}
	}
}

Background.prototype.addComponent = function(component) {
	this.components[this.components.length] = component;
}

Background.prototype.addScrollLayer = function(scrollLayer) {
	this.scrollLayers[this.scrollLayers.length] = scrollLayer;
}

Background.prototype.addComponentLayer = function(componentLayer) {
	this.componentLayers[this.componentLayers.length] = componentLayer;
}

Background.prototype.update = function() {
	var i = this.components.length;
	while (i--) {
		this.components[i].update();
	}
	i = this.scrollLayers.length;
	while (i--) {
		this.scrollLayers[i].update();
	}
	i = this.componentLayers.length;
	while (i--) {
		this.componentLayers[i].update();
	}
}

Background.prototype.addDrawCall = function() {
	var i = this.components.length;
	while (i--) {
		this.components[i].addDrawCall();
	}
	i = this.scrollLayers.length;
	while (i--) {
		this.scrollLayers[i].addDrawCall();
	}
	i = this.componentLayers.length;
	while (i--) {
		this.componentLayers[i].addDrawCall();
	}
}

/* STAR FIELD ******************************************************************
creates twinkling stars in the background
frame 0-3 normal
frame 4/2, 5/1, 6/0
frame 7 reset
*/
function StarfieldStar() {
	this.x = 0;
	this.y = 0;
	this.frame = 7;
	this.frameWait = 3;
}

function Starfield(MAX_STARS, sprite, minX, minY, maxX, maxY, layer, priority) {
	this.stars = [];
	this.sprite = sprite;
	this.minX = minX || 0;
	this.minY = minY || 0;
	this.maxX = maxX || g_SCREEN.width;
	this.maxY = maxY || g_SCREEN.height;
	this.layer = layer || 0;
	this.priority = priority || 0;
	this.frameWait = 3;
	
	for (var i = 0; i < MAX_STARS; i++) {
		this.stars[i] = new StarfieldStar();
		this.stars[i].frameWait = this.frameWait;
	}
}

Starfield.prototype.update = function() {
	for (var i = 0; i < this.stars.length; i++) {
		this.stars[i].frameWait--;
		if (this.stars[i].frameWait < 1) {
			if (this.stars[i].frame > 6) { //change position
				this.stars[i].frame = 0;
				this.stars[i].x = this.minX + g_RAND.get() * (this.maxX - this.minX);
				this.stars[i].y = this.minY + g_RAND.get() * (this.maxY - this.minY);
			}
			this.stars[i].frame++;
			this.stars[i].frameWait = this.frameWait;
			if (this.stars[i].frame > 6) {
				this.stars[i].frameWait = Math.floor(g_RAND.get() * 120); //add up to 60 frame delay before reappearing :)
			}
		}
	}
}

Starfield.prototype.draw = function(ctx, xofs, yofs) {
	for (var i = 0; i < this.stars.length; i++) {
		if (this.stars[i].frame < 7) {
			this.sprite.draw(ctx, this.stars[i].x + xofs, this.stars[i].y + yofs, this.stars[i].frame);
		}
	}
}

Starfield.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

Starfield.prototype.toString = function() {
	return "Starfield";
}

/* ITEMS ***********************************************************************
Present
	starts off as a marker, and when delivered turns into a real present that
	moves up, then rapidly down (as if being slammed into the chimney below)
Star
	collect 5 to increase score multiplier.
Big Present
	same as present but worth 5 times the points
Bad Present
	for those who have been naughty. Do not deliver here or your multiplier will
	be reset.
Mince Pie
	delivering presents gets easier
Brandy
	controls get worse for a while, but a 2x multiplier is applied to any
	score gotten whilst under the influence
*/
function Item() {
	this.sprite = null;
	this.sprite2 = null;
	this.particleSystem = null;
	this.anim = new SpriteAnimState(g_ANIM_TABLE.INIT, 0);
	this.frame = 0;
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(0, 0);
	this.collision = new AABB(0, 0, 32, 32);
	this.collisionTime = 0;
	this.updateFunc = null;
	this.drawFunc = null;
	this.layer = 0;
	this.priority = 0;
	this.active = false;
}

Item.prototype.init = function(sprite, anim) {
	this.sprite = sprite;
	if (anim) this.anim.equals(anim);
}

Item.prototype.equals = function(i) {
	this.sprite = i.sprite;
	this.sprite2 = i.sprite2;
	this.particleSystem = null;
	this.anim.equals(i.anim);
	this.frame = i.frame;
	this.pos.equals(i.pos);
	this.vel.equals(i.vel);
	this.collision.equals(i.collision);
	this.collisionTime = i.collisionTime;
	this.updateFunc = i.updateFunc;
	this.drawFunc = i.drawFunc;
	this.layer = i.layer;
	this.priority = i.priority;
	this.active = i.active;	
}

Item.prototype.offsetXY = function(x, y) {
	this.pos.x += x;
	this.pos.y += y;
	this.collision.pos.x += x;
	this.collision.pos.y += y;
}

Item.prototype.update = function() {
	if (this.updateFunc) {
		this.updateFunc();
	} else {
		this.offsetXY(g_GAMESTATE.scrollDX, 0);
	}
	if (this.pos.x + this.sprite.frameWidth < 0) {
		this.active = false;
		if (this.particleSystem) g_PARTICLE_MANAGER.release(this.particleSystem, true);
	}
	this.priority = Math.floor(-this.pos.x);
}

Item.prototype.draw = function(ctx, xofs, yofs) {
	if (this.drawFunc) {
		this.drawFunc.call(this, ctx, xofs, yofs);
	} else {
		var ybob;
		ybob = (this.collisionTime == 0) ? Math.sin(g_GAMETIME * 0.005) * 7.5 : 0;
		this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + ybob + yofs, this.anim.currentFrame);
	}
}

Item.prototype.drawDebug = function(ctx, xofs, yofs) {
	this.collision.draw(ctx, xofs, yofs);
}

Item.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

Item.prototype.toString = function() {
	return "Item";
}

Item.prototype.toString_verbose = function() {
	var rv = new String("<b>Item</b><br>");
	rv += this.sprite.img.src + "<br>";
	rv += "pos: " + this.pos;
	return rv;	
}

/* ITEM TEMPLATES **************************************************************
PRESENT - usually floating above a chimney. adds score if picked up.
*/
Item.instance_PRESENT = function(i, px, py) {
	if (Item.PRESENT === undefined) { //create template if it doesn't exist
		var n = new Item();
		n.init(new Sprite(sys_TEXTURES[1], 4, 2), new SpriteAnimState(g_ANIM_TABLE.PRESENT_WOBBLE, -1));
		n.collision.hw = n.collision.hh = 24;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime) {
				if (this.collision.test_AABB(g_PLAYER.collision)) {
					this.collisionTime = g_GAMETIME;
					this.frame = 4 + Math.round(g_RAND.getAt(0) * 3);
					g_GAMESTATE.makeDelivery(1); //this handles multiplier etc.
					g_PARTICLE_MANAGER.spawnEffect(ParticleSystem.init_getPresent, g_SPRITE_CACHE.fx_getPresent, this.pos.x, this.pos.y, this.layer, g_SCREEN.width * 1.5);
				} else if (this.anim.currentFrame != 3 && this.pos.x + this.collision.hw < g_PLAYER.pos.x - g_PLAYER.collision.hw) {
					g_GAMESTATE.missDelivery();
					this.anim.playbackState = 0;
					this.anim.currentFrame = 3; //fail icon
				}
			}
			this.anim.update();
		}
		
		n.drawFunc = function(ctx, xofs, yofs) {
			var t, ybob;
			if (!this.collisionTime) { //draw anim.currentFrame
				ybob = (this.collisionTime == 0) ? Math.sin(g_GAMETIME * 0.005) * 7.5 : 0;
				this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + ybob + yofs, this.anim.currentFrame);
			} else { //draw frame
				t = (g_GAMETIME - this.collisionTime) / 500;
				ybob = 2 * t - 1; //1-(2x-1)^2
				ybob = (1 - ybob * ybob) * 32;
				if (this.pos.y - ybob - this.sprite.frameHeight > g_SCREEN.height) {
					this.active = false;
					return;
				}
				this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y - ybob + yofs, this.frame);
			}
		}
		
		Item.PRESENT = n;
	}
	i.equals(Item.PRESENT);
	i.offsetXY(px, py);
	i.active = true;
}

Item.instance_STAR = function(i, px, py) {
	if (Item.STAR === undefined) {
		var n = new Item();
		n.init(new Sprite(sys_TEXTURES[19], 1, 1), null);
		n.sprite2 = g_SPRITE_CACHE.fx_playerTrail;
		n.collision.hw = n.collision.hh = 16;
		
		n.updateFunc = function() {
			if (!this.collisionTime && this.collision.test_AABB(g_PLAYER.collision)) {
				this.collisionTime = g_GAMETIME;
				g_GAMESTATE.incrementStars();
				this.active = false;
				if (this.particleSystem) g_PARTICLE_MANAGER.release(this.particleSystem);
				g_PARTICLE_MANAGER.spawnEffect(ParticleSystem.init_getPresent, g_SPRITE_CACHE.fx_getPresent, this.pos.x, this.pos.y, this.layer, g_SCREEN.width * 1.5);
			}
			this.offsetXY(this.vel.x + g_GAMESTATE.scrollDX, this.vel.y);
			if (this.pos.y > g_SCREEN.height + this.sprite.frameHeight) {
				this.active = false;
				if (this.particleSystem) g_PARTICLE_MANAGER.release(this.particleSystem, true);
			}
			if (this.particleSystem) {
				this.particleSystem.pos.equals(this.pos);
				this.particleSystem.update();
			}
		}
		
		n.drawFunc = function(ctx, xofs, yofs) {
			ctx.save();
			ctx.translate(this.pos.x + xofs, this.pos.y + yofs);
			ctx.rotate(g_GAMETIME_FRAMES % 360 * Math.PI / 45);
			this.sprite.draw(ctx, 0, 0, 0);
			ctx.restore();
		}
		
		Item.STAR = n;
	}
	i.equals(Item.STAR);
	i.offsetXY(px, py);
	var angle = (270 - g_RAND.getAt(4) * 77.5) * Math.PI / 180;
	i.vel.setAngle(angle);
	i.vel.mul(2.5);
	i.active = true;
	
	//set up particle system
	i.particleSystem = g_PARTICLE_MANAGER.reserve();
	if (i.particleSystem) {
		ParticleSystem.init_starTrail(i.particleSystem, i.sprite2);
		i.particleSystem.vel.equals(i.vel);
		i.particleSystem.vel.neg(); //reverse direction
	}
}

/* OBSTACLE ********************************************************************
essentially any object that poses a threat to the player such as buildings and
UFOS. Obstacle is the base type with a fixed amount of data which can be used by
several different types that are instanced using the functions below which create
and copy template that are stored statically in Obstacle.
Example:
template data: Obstacle.HOUSE01
function to copy to an instance: Obstacle.instance_HOUSE01(obstacle, x, y);
*/
function Obstacle() {
	this.sprite = null;
	this.sprite2 = null; //for special use such as particle systems
	this.particleSystem = null;
	this.anim = new SpriteAnimState(g_ANIM_TABLE.INIT, 0);
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(0, 0);
	this.collision = []; //need two bounding boxes for many objects
	this.collision[0] = new AABB(0, 0, 0, 0);
	this.collision[1] = new AABB(0, 0, 0, 0);
	this.updateFunc = null;
	this.drawFunc = null;
	this.layer = 0;
	this.priority = 0;
	this.active = false;
}

Obstacle.prototype.init = function(sprite, anim) {
	this.sprite = sprite;
	if (anim) this.anim.equals(anim);
}

Obstacle.prototype.equals = function(o) {
	this.sprite = o.sprite;
	this.sprite2 = o.sprite2;
	this.particleSystem = null; //not equal... must request separately
	this.anim.equals(o.anim);
	this.pos.equals(o.pos)
	this.vel.equals(o.vel);
	this.collision[0].equals(o.collision[0]);
	this.collision[1].equals(o.collision[1]);
	this.collisionTime = 0;
	this.updateFunc = o.updateFunc;
	this.drawFunc = o.drawFunc;
	this.layer = o.layer;
	this.priority = o.priority;
	this.active = o.active;
}

//convenience function
Obstacle.prototype.offsetXY = function(x, y) {
	this.pos.x += x;
	this.pos.y += y;
	this.collision[0].pos.x += x;
	this.collision[0].pos.y += y;
	this.collision[1].pos.x += x;
	this.collision[1].pos.y += y;
}

Obstacle.prototype.update = function() {
	if (this.updateFunc) {
		this.updateFunc();
	} else { //default move with scroll speed and remove
		this.vel.x = g_GAMESTATE.scrollDX;
		this.offsetXY(this.vel.x, this.vel.y);
	}
	if (this.pos.x + this.sprite.frameWidth * 0.5 < 0) {
		this.active = false;
		if (this.particleSystem) g_PARTICLE_MANAGER.release(this.particleSystem);
	}
	this.priority = Math.floor(g_SCREEN.width - this.pos.x);
}

Obstacle.prototype.draw = function(ctx, xofs, yofs) {
	if (this.drawFunc) {
		this.drawFunc.call(this, ctx, xofs, yofs);
	} else {
		this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + yofs, this.anim.currentFrame);
	}
}

Obstacle.prototype.drawDebug = function(ctx, xofs, yofs) {
	if (this.collision[0].hw) this.collision[0].draw(ctx, xofs, yofs);
	if (this.collision[1].hw) this.collision[1].draw(ctx, xofs, yofs);
	ctx.strokeRect(this.pos.x + xofs - this.sprite.frameWidth * 0.5, this.pos.y + yofs - this.sprite.frameHeight * 0.5, this.sprite.frameWidth, this.sprite.frameHeight);
}

Obstacle.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

Obstacle.prototype.toString = function() {
	return "Obstacle";
}

Obstacle.prototype.toString_verbose = function() {
	var rv = new String("<b>Obstacle</b><br>.src: ");
	rv += this.sprite.img.src + "<br>";
	rv += "pos: " + this.pos + " , vel: " + this.vel + "<br>c0: ";
	rv += this.collision[0] + "<br>c1: " 
	rv += this.collision[1] + "<br>";
	return rv;
}

/* OBSTACLE TEMPLATES **********************************************************
HOUSE01 - basic house with chimney that spawns a present
*/

//HOUSE01
Obstacle.instance_HOUSE01 = function(o, px, py) {
	if (Obstacle.HOUSE01 === undefined) { //create it if it doesn't exist
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[15], 1, 1), null); //init with sprite and anim
		n.collision[0].hw = 128; //house body
		n.collision[0].hh = 102;
		n.collision[0].pos.x = 40 - n.sprite.frameWidth * 0.5 + n.collision[0].hw;
		n.collision[0].pos.y = 50 - n.sprite.frameHeight * 0.5 + n.collision[0].hh;
		n.collision[1].hw = 20; //chimney
		n.collision[1].hh = 120;
		n.collision[1].pos.x = 26 - n.sprite.frameWidth * 0.5 + n.collision[1].hw;
		n.collision[1].pos.y = 17 - n.sprite.frameHeight * 0.5 + n.collision[1].hh;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime && (this.collision[0].test_AABB(g_PLAYER.collision)
			 || this.collision[1].test_AABB(g_PLAYER.collision))) {
				g_PLAYER.collisionTime = this.collisionTime = g_GAMETIME;
				g_CAMERA.addShake(200, 5);
				g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
			 }
		}
		
		Obstacle.HOUSE01 = n;
	}
	o.equals(Obstacle.HOUSE01); //copy the template
	o.offsetXY(px + o.sprite.frameWidth * 0.5, py - o.sprite.frameHeight * 0.5);
	o.active = true;
	
	//attempt to spawn a present above the chimney!
	var present = g_ITEM_MANAGER.getFreeInstance();
	if (present) Item.instance_PRESENT(present, o.collision[1].pos.x, o.collision[1].pos.y - o.collision[1].hh - 48);
}

//PUB
Obstacle.instance_PUB = function(o, px, py) {
	if (Obstacle.PUB === undefined) { //create it if it doesn't exist
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[25], 1, 1), null); //init with sprite and anim
		n.collision[0].hw = 155; //house body
		n.collision[0].hh = 122;
		n.collision[0].pos.x = 90 - n.sprite.frameWidth * 0.5 + n.collision[0].hw;
		n.collision[0].pos.y = 44 - n.sprite.frameHeight * 0.5 + n.collision[0].hh;
		n.collision[1].hw = 24; //chimney
		n.collision[1].hh = 15;
		n.collision[1].pos.x = 218 - n.sprite.frameWidth * 0.5 + n.collision[1].hw;
		n.collision[1].pos.y = 14 - n.sprite.frameHeight * 0.5 + n.collision[1].hh;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime && (this.collision[0].test_AABB(g_PLAYER.collision)
			 || this.collision[1].test_AABB(g_PLAYER.collision))) {
				g_PLAYER.collisionTime = this.collisionTime = g_GAMETIME;
				g_CAMERA.addShake(200, 5);
				g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
			 }
		}
		
		Obstacle.PUB = n;
	}
	o.equals(Obstacle.PUB); //copy the template
	o.offsetXY(px + o.sprite.frameWidth * 0.5, py - o.sprite.frameHeight * 0.5);
	o.active = true;
	
	//attempt to spawn a present above the chimney!
	var present = g_ITEM_MANAGER.getFreeInstance();
	if (present) Item.instance_PRESENT(present, o.collision[1].pos.x, o.collision[1].pos.y - o.collision[1].hh - 48);
}

//TERRACE
Obstacle.instance_TERRACE = function(o, px, py) {
	if (Obstacle.TERRACE === undefined) { //create it if it doesn't exist
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[24], 3, 1), null); //init with sprite and anim
		n.collision[0].hw = 82; //house body
		n.collision[0].hh = 143;
		n.collision[0].pos.x = 48 - n.sprite.frameWidth * 0.5 + n.collision[0].hw;
		n.collision[0].pos.y = 34 - n.sprite.frameHeight * 0.5 + n.collision[0].hh;
		n.collision[1].hw = 25; //chimney
		n.collision[1].hh = 25;
		n.collision[1].pos.x = 156 - n.sprite.frameWidth * 0.5 + n.collision[1].hw;
		n.collision[1].pos.y = 12 - n.sprite.frameHeight * 0.5 + n.collision[1].hh;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime && (this.collision[0].test_AABB(g_PLAYER.collision)
			 || this.collision[1].test_AABB(g_PLAYER.collision))) {
				g_PLAYER.collisionTime = this.collisionTime = g_GAMETIME;
				g_CAMERA.addShake(200, 5);
				g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
			 }
		}
		
		Obstacle.TERRACE = n;
	}
	o.equals(Obstacle.TERRACE); //copy the template
	o.offsetXY(px + o.sprite.frameWidth * 0.5, py - o.sprite.frameHeight * 0.5);
	o.anim.currentFrame = Math.round(g_RAND.getAt(2) * 2); //pick a random frame between 0 and 2
	o.active = true;
	
	//attempt to spawn a present above the chimney!
	var present = g_ITEM_MANAGER.getFreeInstance();
	if (present) Item.instance_PRESENT(present, o.collision[1].pos.x, o.collision[1].pos.y - o.collision[1].hh - 48);
	
	if (g_RAND.getAt(2) > 0.4) {
		g_GAME_DIRECTOR.spawnLastType(155); //spawn again 155 pixels from the current one
	}
}

//SHACK01
Obstacle.instance_SHACK01 = function(o, px, py) {
	if (Obstacle.SHACK01 === undefined) { //create it if it doesn't exist
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[16], 1, 1), null);
		n.collision[0].hw = 85;
		n.collision[0].hh = 54;
		n.collision[0].pos.x = 32 - n.sprite.frameWidth * 0.5 + n.collision[0].hw;
		n.collision[0].pos.y = 52 - n.sprite.frameHeight * 0.5 + n.collision[0].hh;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime && this.collision[0].test_AABB(g_PLAYER.collision)) {
				g_PLAYER.collisionTime = this.collisionTime = g_GAMETIME;
				g_CAMERA.addShake(150, 5);
				g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
			 }
		}
		
		Obstacle.SHACK01 = n;
	}
	o.equals(Obstacle.SHACK01); //copy the template
	o.offsetXY(px + o.sprite.frameWidth * 0.5, py - o.sprite.frameHeight * 0.5);
	o.active = true;
	
	//attempt to spawn a present above the chimney!
	var present = g_ITEM_MANAGER.getFreeInstance();
	if (present) Item.instance_PRESENT(present, o.collision[0].pos.x + o.collision[0].hw, o.collision[0].pos.y - o.collision[0].hh - 48);
}

//SHACK02
Obstacle.instance_SHACK02 = function(o, px, py) {
	if (Obstacle.SHACK02 === undefined) { //create it if it doesn't exist
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[26], 1, 1), null); //init with sprite and anim
		n.collision[0].hw = 103; //house body
		n.collision[0].hh = 94;
		n.collision[0].pos.x = 32 - n.sprite.frameWidth * 0.5 + n.collision[0].hw;
		n.collision[0].pos.y = 68 - n.sprite.frameHeight * 0.5 + n.collision[0].hh;
		n.collision[1].hw = 20; //chimney
		n.collision[1].hh = 104;
		n.collision[1].pos.x = 18 - n.sprite.frameWidth * 0.5 + n.collision[1].hw;
		n.collision[1].pos.y = 50 - n.sprite.frameHeight * 0.5 + n.collision[1].hh;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime && (this.collision[0].test_AABB(g_PLAYER.collision)
			 || this.collision[1].test_AABB(g_PLAYER.collision))) {
				g_PLAYER.collisionTime = this.collisionTime = g_GAMETIME;
				g_CAMERA.addShake(200, 5);
				g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
			 }
		}
		
		Obstacle.SHACK02 = n;
	}
	o.equals(Obstacle.SHACK02); //copy the template
	o.offsetXY(px + o.sprite.frameWidth * 0.5, py - o.sprite.frameHeight * 0.5);
	o.active = true;
	
	//attempt to spawn a present above the chimney!
	var present = g_ITEM_MANAGER.getFreeInstance();
	if (present) Item.instance_PRESENT(present, o.collision[1].pos.x, o.collision[1].pos.y - o.collision[1].hh - 48);
}

Obstacle.instance_CHURCH = function(o, px, py) {
	if (Obstacle.CHURCH === undefined) { //create it if it doesn't exist
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[17], 1, 1), null);
		n.collision[0].hw = 142;
		n.collision[0].hh = 110;
		n.collision[0].pos.x = 138 - n.sprite.frameWidth * 0.5 + n.collision[0].hw;
		n.collision[0].pos.y = 200 - n.sprite.frameHeight * 0.5 + n.collision[0].hh;
		n.collision[1].hw = 80; //tower
		n.collision[1].hh = 192;
		n.collision[1].pos.x = 16 - n.sprite.frameWidth * 0.5 + n.collision[1].hw;
		n.collision[1].pos.y = 36 - n.sprite.frameHeight * 0.5 + n.collision[1].hh;
		
		n.updateFunc = function() {
			this.offsetXY(g_GAMESTATE.scrollDX, 0);
			if (!this.collisionTime && (this.collision[0].test_AABB(g_PLAYER.collision)
			 || this.collision[1].test_AABB(g_PLAYER.collision))) {
				g_PLAYER.collisionTime = this.collisionTime = g_GAMETIME;
				g_CAMERA.addShake(330, 5);
				g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
			 }
		}
		
		Obstacle.CHURCH = n;
	}
	o.equals(Obstacle.CHURCH); //copy the template
	o.offsetXY(px + o.sprite.frameWidth * 0.5, py - o.sprite.frameHeight * 0.5);
	o.active = true;
}

Obstacle.instance_UFO = function(o, px, py) {
	if (Obstacle.UFO === undefined) {
		var n = new Obstacle();
		n.init(new Sprite(sys_TEXTURES[18], 4, 1), new SpriteAnimState(g_ANIM_TABLE.UFO, -1));
		n.sprite2 = g_SPRITE_CACHE.fx_ufoTrail; //sprite for particle system
		//collision
		n.collision[0].pos.y = 20;
		n.collision[0].hw = 40;
		n.collision[0].hh = 20;
		
		n.updateFunc = function() {
			if (!this.collisionTime && g_GAMESTATE.state == GameState.STATE_GAMEPLAY) {
				//sin wave movement slower than scroll speed
				this.vel.x = 0.5 * g_GAMESTATE.scrollDX;
				this.vel.y = Math.sin(g_GAMETIME_FRAMES * 0.05) * 64 * g_FRAMETIME_S;
				this.offsetXY(this.vel.x, this.vel.y);
				//knock player down if collision
				if (!this.collisionTime && this.collision[0].test_AABB(g_PLAYER.collision)) {
					g_CAMERA.addShake(150, 5);
					g_PLAYER.fallFrames = Math.floor(20 * 1.0 / g_GAMESTATE.intensity);
					if (g_PLAYER.vel.y < 100) g_PLAYER.vel.y = 100;
					this.collisionTime = g_GAMETIME;
					g_CAMERA.addShake(50, 5);
				}
				//spawn stars and throw approx toward player!
				var ti
				if (g_GAMETIME_FRAMES % 90 == 0 && this.pos.x > 128 && this.pos.x < g_SCREEN.width - 128) {
					ti = g_ITEM_MANAGER.getFreeInstance();
					if (ti) { 
						Item.instance_STAR(ti, this.pos.x, this.pos.y);
					}
				}
			} else { //fly away
				var t = (g_GAMETIME - this.collisionTime) / 300;
				if (t > 1.0) t = 1.0;
				this.vel.x = 1 - t; 
				this.vel.y = t * t * -400 * g_FRAMETIME_S;
				this.offsetXY(this.vel.x, this.vel.y);
				if (this.pos.y < -400) {
					this.active = false;
					if (this.particleSystem) g_PARTICLE_MANAGER.release(this.particleSystem, true);
				}
			}
			this.anim.update();
			if (this.particleSystem) {
				this.particleSystem.priority = this.priority - 1; //required?
				this.particleSystem.pos.set(this.pos.x + 1, this.pos.y + 16);
				this.particleSystem.update();
			}
		}
		
		Obstacle.UFO = n;
	}
	o.equals(Obstacle.UFO);
	o.offsetXY(px + o.sprite.frameWidth * 0.5, -270);
	o.active = true;
	//set up particle system
	o.particleSystem = g_PARTICLE_MANAGER.reserve();
	if (o.particleSystem) {
		ParticleSystem.init_ufoTrail(o.particleSystem, o.sprite2);
		o.particleSystem.vel.x = 0.25 * g_GAMESTATE.scrollDX;
	}
}


/* MANAGERS ********************************************************************
Simple managers to spawn and manage items and obstacles.
Note that it probably isn't much of a leap to go from this to having everything
be an instance of GameObject or something, but I've come this far so I'll leave
that as an exercise for next time.

getFreeInstance is used to retrieve any object stored in the objects array that
is inactive and can be used. For example:
var present = g_ITEMMANAGER.getFreeInstance();
if (present) Item.instance_PRESENT(present, x, y);
*/
function ObjectManager() {
	this.objects = [];
}

ObjectManager.prototype.init_ItemManager = function(MAX_ITEMS) {
	if (!this.objects.length) {
		for (var i = 0; i < MAX_ITEMS; i++) {
			this.objects[i] = new Item();
		}
	}
}

ObjectManager.prototype.init_ObstacleManager = function(MAX_OBSTACLES) {
	if (!this.objects.length) {
		for (var i = 0; i < MAX_OBSTACLES; i++) {
			this.objects[i] = new Obstacle();
		}
	}
}

ObjectManager.prototype.update = function() {
	for (var i = 0; i < this.objects.length; i++) {
		if (this.objects[i].active) {
			this.objects[i].update();
		}
	}
}

ObjectManager.prototype.addDrawCall = function() {
	for (var i = 0; i < this.objects.length; i++) {
		if (this.objects[i].active) {
			this.objects[i].addDrawCall();
		}
	}
}

ObjectManager.prototype.getFreeInstance = function() {
	for (var i = 0; i < this.objects.length; i++) {
		if (!this.objects[i].active) {
			return this.objects[i];
		}
	}
	return null;
}

/* GAME DIRECTOR ***************************************************************
the game director decides when and what to spawn into the stage.
minSpawnDelay inside the GameDirectorType object is used to strictly force the
director not to spawn that object for x milliseconds after one has already been
spawned. disableSpawningUntil is a variable that is set when an pbject is spawned
(or by just modifying the value directly) to disable spawning of that object
until g_GAMETIME exceeds that time.

minSpawnDelayType - disable spawning of this obstacle by the director until g_GAMETIME + this value
minSpawnDelayAll  - disable spawning of any obstacles by the director until g_GAMETIME + this value
disableSpawningUntil - store of g_GAMETIME + minSpawnDelayType at the last time this was spawned
*/
function GameDirectorType(instanceFunc, chance, minSpawnGapType, minSpawnGapAll) {
	this.instanceFunc = instanceFunc || null;
	this.chance = chance || 0;
	this.range = 0.0;
	this.minSpawnGapType = minSpawnGapType || 0;
	this.minSpawnGapAll = minSpawnGapAll || 0;
	this.disableSpawningUntil = 0;
}

GameDirectorType.prototype.toString = function() {
	var rv = new String("chance: ");
	rv += this.chance + "<br>range: " + this.range
		+ "<br>minSpawnGapType: " + this.minSpawnGapType
		+ "<br>minSpawnGapAll: " + this.minSpawnGapAll
		+ "<br>disableSpawningUntil: " + this.disableSpawningUntil + "<br>";
	return rv;
}

//sort objects a and b in order of range
GameDirectorType.sort = function(a, b) {
	return (b.range - a.range);
}

function GameDirector() {
	this.lastSpawnAt = 0;
	this.nextSpawnAt = 0;
	this.minSpawnGap = 375;
	this.maxSpawnGap = 600;
	this.preSpawnGap = 200; //spawn this many pixels before object reaches edge of screen
	
	this.nextSpawnUsesLastType = false; //spawn last type again (set externally)
	this.lastSpawnTypeIndex = -1; //index into obstacleTypes
	this.dontSetSpawnGap = false; //used by spawnLastType
	this.spawning = false;
	this.disableSpawningUntilTime = 0; //time based
	this.disableSpawningUntilDistance = 0;
	
	this.obstacleTypes = [];
}

//enable/disable spawning
GameDirector.prototype.setSpawning = function(spawning) {
	if (spawning) {
		this.spawning = true;
		this.disableSpawningUntilTime = 0;
		this.disableSpawningUntilDistance = 0;
		this.nextSpawnAt = g_GAMESTATE.scrollDistance;
		this.nextSpawnUsesLastType = false;
		this.dontSetSpawnGap = false;
	} else {
		this.spawning = false;
		this.disableSpawningUntilTime = 0;
		this.disableSpawningUntilDistance = 0;	
	}
}

//spawn the previously spawned type at the specified distance
GameDirector.prototype.spawnLastType = function(spawnGap) {
	this.nextSpawnUsesLastType = true;
	if (spawnGap) {
		this.nextSpawnAt += spawnGap;
		this.dontSetSpawnGap = true;
	}
}

GameDirector.prototype.addObstacleType = function(instanceFunc, chance, minSpawnDelayType, minSpawnDelayAll) {
	this.obstacleTypes[this.obstacleTypes.length] = new GameDirectorType(instanceFunc, chance, minSpawnDelayType, minSpawnDelayAll);
	
	//recalculate chances and sort array by inverse range
	var i, chanceTotal = 0;
	i = this.obstacleTypes.length;
	while (i--) {
		chanceTotal += this.obstacleTypes[i].chance;
	}
	i = this.obstacleTypes.length;
	while (i--) {
		this.obstacleTypes[i].range = this.obstacleTypes[i].chance / chanceTotal;
	}
	this.obstacleTypes.sort(GameDirectorType.sort);
}

GameDirector.prototype.spawnObstacle = function(type, instance) {
	//spawn the object (g_SCREEN.width + this.nextSpawnAt - g_GAMESTATE.scrollDistance SHOULD be correct...)
	type.instanceFunc.call(this, instance, (g_SCREEN.width + this.nextSpawnAt - g_GAMESTATE.scrollDistance + this.preSpawnGap), g_SCREEN.height);
	this.lastSpawnAt = this.nextSpawnAt - g_GAMESTATE.scrollDistance + g_SCREEN.width;
	//set up spawning restrictions
	if (type.minSpawnGapType) {
		type.disableSpawningUntil = this.nextSpawnAt + type.minSpawnGapType;
	}
	if (!this.dontSetSpawnGap) {
		if (type.minSpawnGapAll > 0) {
			this.nextSpawnAt = g_GAMESTATE.scrollDistance + type.minSpawnGapAll;
		} else {
			this.nextSpawnAt = g_GAMESTATE.scrollDistance + this.minSpawnGap + Math.floor(g_RAND.getAt(0) * (this.maxSpawnGap - this.minSpawnGap));
		}
	} else {
		this.dontSetSpawnGap = false;
	}
}

GameDirector.prototype.update = function() {
	//check if spawning is disabled
	if (this.disableSpawningUntilTime > 0 && this.disableSpawningUntilTime < g_GAMETIME) {
		this.spawning = true;
		this.nextSpawnAt = g_GAMESTATE.scrollDistance;
		this.disableSpawningUntilTime = 0;
	}
	//check if we can spawn
	if (this.spawning && g_GAMESTATE.scrollDistance > this.nextSpawnAt) {
		var ti = g_OBSTACLE_MANAGER.getFreeInstance();
		if (ti) {
			if (this.nextSpawnUsesLastType && this.lastSpawnTypeIndex >= 0) {
				//spawn the type last used
				this.nextSpawnUsesLastType = false; //important to clear this before spawning as it could be set again
				this.spawnObstacle(this.obstacleTypes[this.lastSpawnTypeIndex], ti);
			} else {
				var random = g_RAND.getAt(5);
				var i = this.obstacleTypes.length;
				while (i--) {
					if (random < this.obstacleTypes[i].range && this.obstacleTypes[i].disableSpawningUntil < g_GAMESTATE.scrollDistance) {
						this.spawnObstacle(this.obstacleTypes[i], ti);
						this.lastSpawnTypeIndex = i;
						break;
					}
				}
			}
		}
	}
}

/* GAME STATE ******************************************************************
contains all game variables and a few functions to act upon those variables in
a convenient manner
absolute horrible mess of shitty code here.
*/
function GameState() {
	//constants
	GameState.MIN_INTENSITY = 1;
	GameState.MAX_INTENSITY = 4;
	GameState.DEFAULT_SCROLLSPEED = -200;
	
	GameState.STATE_ATTRACT = 1; //no obstacles spawn, the player moves automatically
	GameState.STATE_GAMESTART = 2; //spawning is turned on, gameplay intro plays, the player moves automatically
	GameState.STATE_GAMEPLAY = 3; //normal gameplay
	GameState.STATE_GAMEOVER = 4; //the player crashed, scrolling and spawning are stopped
	GameState.STATE_TIMEOVER = 5; //the player ran out of time... the player automatically flies quickly up and off the side of the screen. spawning is stopped
	GameState.STATE_SHOWSCORES = 6; //shows player score and stats
	
	//variables
	this.state = 0;
	this.stateStartTime = 0;
	this.stateStartDistance = 0;
	this.stateTime = 0;
	
	this.scrollSpeed = GameState.DEFAULT_SCROLLSPEED;
	this.scrollDX = this.scrollSpeed * g_FRAMETIME_S;
	this.scrollDistance = 0;
	this.intensity = 1.0;
	this.intensityClamped = 0.0; //value in range 0-1 set using (this.intensity - GameState.MIN_INTENSITY) / (GameState.MAX_INTENSITY - GameState.MIN_INTENSITY);
	this.gravity = new Vector2(0, 7.5);

	this.score = 0;
	this.multiplier = 0;
	this.combo = 0;
	this.comboMax = 0;
	this.comboLast = 0;
	this.comboMiss = 0;
	this.stars = 0;
	this.distance = 0; //distance travelled this game as opposed to scrollDistance
	this.deliveries = 0;
	this.deliveriesMissed = 0;
	this.timeLeft = 60000; //1 min starting time
	
	document.getElementById('ui_score').innerHTML = "<b>Score</b>: 0"
	document.getElementById('ui_time').innerHTML = "<b>Time</b>: 0";
}

GameState.prototype.update = function() {
	this.scrollDX = g_GAMESTATE.scrollSpeed * g_GAMESTATE.intensity * g_FRAMETIME_S;
	this.scrollDistance -= g_GAMESTATE.scrollDX; //distance should be positive to make comparisons easier to read
	this.stateTime += g_FRAMETIME_MS;
	
	this.intensityClamped = (this.intensity - GameState.MIN_INTENSITY) / (GameState.MAX_INTENSITY - GameState.MIN_INTENSITY);
	if (this.intensityClamped > 1) {
		this.intensityClamped = 1;
	} else if (this.intensityClamped < 0) {
		this.intensityClamped = 0;
	}
	
	switch (this.state) {
		case GameState.STATE_ATTRACT: //no obstacle spawning, player moved by ai. switch state on keypress
			if (g_KEYSTATES.justPressed(KEYS.SPACE) || g_MOUSE.left.justPressed()) {
				this.setState(GameState.STATE_GAMESTART);
			}
			break;
		case GameState.STATE_GAMESTART: //countdown to gameplay
			if (this.stateTime > 2000) {
				this.setState(GameState.STATE_GAMEPLAY);
			}
			break;
		case GameState.STATE_GAMEPLAY:
			this.distance -= this.scrollDX;
			this.timeLeft -= g_FRAMETIME_MS;
			if (this.timeLeft <= 0) {
				this.timeLeft = 0;
				this.setState(GameState.STATE_TIMEOVER);
			}
			document.getElementById('ui_time').innerHTML = "<b>Time</b>: " + Math.ceil(this.timeLeft / 1000);
			if (this.stateTime > 1000 && this.stateTime <= 1000 + g_FRAMETIME_MS) { //so hacky and shit
				document.getElementById('ui_info').innerHTML = "";
			}
			break;
		case GameState.STATE_GAMEOVER:
			if (this.stateTime > 2000) {
				this.setState(GameState.STATE_SHOWSCORES);
			}
			break;
		case GameState.STATE_TIMEOVER:
			if (this.stateTime > 2000) {
				this.setState(GameState.STATE_SHOWSCORES);
			}
			break;
		case GameState.STATE_SHOWSCORES:
			if (this.stateTime > 6000) {
				this.setState(GameState.STATE_ATTRACT);
			}
			break;
		default:
			this.setState(GameState.STATE_GAMESTART);
	}
}

GameState.prototype.setState = function(state) {
	if (state != this.state) { //only set if the state is different
		this.state = state;
		this.stateTime = 0;
		this.stateStartTime = g_GAMETIME;
		this.stateStartDistance = this.scrollDistance;
		switch (this.state) {
			case GameState.STATE_ATTRACT:
				this.setState_attract();
				break;
			case GameState.STATE_GAMESTART:
				this.setState_gamestart();
				break;
			case GameState.STATE_GAMEPLAY:
				this.setState_gameplay();
				break;
			case GameState.STATE_GAMEOVER:
				this.setState_gameover();
				break;
			case GameState.STATE_TIMEOVER:
				this.setState_timeover();
				break;
			case GameState.STATE_SHOWSCORES:
				this.setState_showscores();
				break;
			default:
				this.state = GameState.STATE_ATTRACT;
				this.setState_attract();
		}
	}
}

//STATE FUNCTIONS
GameState.prototype.setState_attract = function() {
	this.scrollSpeed = GameState.DEFAULT_SCROLLSPEED;
	this.intensity = 1.0;
	g_PLAYER.reset(160, 80);
	g_PLAYER.aiControl = true;
	g_GAME_DIRECTOR.setSpawning(false);
	g_BACKGROUND.setSpawning(true);
	document.getElementById('ui_info').innerHTML = "";
	document.getElementById('ui_time').innerHTML = "";
	document.getElementById('ui_score').innerHTML = "";
}

GameState.prototype.setState_gamestart = function() {
	//reset game variables
	this.intensity = 1.0;
	this.scrollSpeed = GameState.DEFAULT_SCROLLSPEED;
	this.score = 0;
	this.multiplier = 0;
	this.combo = 0;
	this.comboMax = 0;
	this.comboLast = 0;
	this.comboMiss = 0;
	this.stars = 0;
	this.distance = 0;
	this.deliveries = 0;
	this.deliveriesMissed = 0;
	this.timeLeft = 60000; //1 min starting time
	g_GAME_DIRECTOR.setSpawning(false);
	g_BACKGROUND.setSpawning(true);
	g_PLAYER.aiControl = true;
	document.getElementById('ui_score').innerHTML = "<b>Score</b>: 0"
	document.getElementById('ui_time').innerHTML = "<b>Time</b>: " + Math.ceil(this.timeLeft / 1000);
	document.getElementById('ui_info').innerHTML = "<center><br><b>Get Ready!</b><br><br>(Hold <b>space</b> or <b>left mouse</b> to <b>fly</b>)</center>";
}

GameState.prototype.setState_gameplay = function() {
	g_PLAYER.aiControl = false;
	g_PLAYER.boostFrames = 5; //short boost on take control
	g_GAME_DIRECTOR.setSpawning(true);
	document.getElementById('ui_info').innerHTML = "<center><br><br><b>GO!</b>";
}

GameState.prototype.setState_gameover = function() {
	if (g_PLAYER.aiControl) { 
		this.state = GameState.STATE_ATTRACT; //bit of a hack, but there are plenty of those already in this code so who cares?..
	} else {
		this.intensity = GameState.MIN_INTENSITY;
		this.scrollSpeed = GameState.DEFAULT_SCROLLSPEED;
		g_BACKGROUND.setSpawning(false);
		g_GAME_DIRECTOR.setSpawning(false);
		document.getElementById('ui_time').innerHTML = "";
		document.getElementById('ui_score').innerHTML = "";
	}
}

GameState.prototype.setState_timeover = function() {
	document.getElementById('ui_info').innerHTML = "<center><br><br><b>Time Over!</b>";
	g_PLAYER.aiControl = true;
	g_GAME_DIRECTOR.setSpawning(false);
	document.getElementById('ui_time').innerHTML = "";
	document.getElementById('ui_score').innerHTML = "";
}

GameState.prototype.setState_showscores = function() {
	var str = new String("<b>Score</b>: ");
	str += this.score;
	str += "<br><b>Deliveries</b>: " + this.deliveries + "/" + (this.deliveries + this.deliveriesMissed);
	if (this.deliveries == 0) {
		str += " (0%)";
	} else {
		str += " (" + (Math.round(this.deliveries / (this.deliveries + this.deliveriesMissed) * 100)) + "%)"
	}
	str += "<br><b>Max Combo</b>: " + this.comboMax;
	str += "<br><b>Stars Collected</b>: " + this.stars;
	str += "<br><b>Distance Travelled</b>: " + Math.floor(this.distance / 50) + "m"; //50px = 1m
	document.getElementById('ui_info').innerHTML = str;	
}

//HELPER FUNCTIONS
GameState.prototype.makeDelivery = function() {
	if (this.state == GameState.STATE_GAMEPLAY) {
		this.combo++;
		this.multiplier++;
		this.comboMiss = 0;
		this.score += this.multiplier;
		this.deliveries++;
		if (this.combo > this.comboMax) this.comboMax = this.combo;
		
		this.intensity += 0.05;
		if (this.intensity > GameState.MAX_INTENSITY) {
			this.intensity = GameState.MAX_INTENSITY;
		}
		document.getElementById('ui_score').innerHTML = "<b>Score</b>: " + this.score;
	}
}

GameState.prototype.missDelivery = function() {
	if (this.state == GameState.STATE_GAMEPLAY) {
		this.deliveriesMissed++;
		this.comboMiss++;
		this.comboLast = this.combo;
		this.combo = 0;
		this.multiplier = Math.floor(this.multiplier * 0.5);
	}
}

GameState.prototype.incrementStars = function() {
	if (this.state == GameState.STATE_GAMEPLAY) {
		this.stars++;
		this.timeLeft += 5000; //add bonus time!
		/*if (this.stars > 4) {
			this.multiplier++;
			this.stars = 0;
		}*/
	}
}

/* PLAYER **********************************************************************
should rise when player holds space or mouse1
should slowly fall due to gravity
rise should have less influence when heavily laden
*/
function Player(px, py) {
	this.sprite = new Sprite(sys_TEXTURES[0], 1, 1);
	this.pos = new Vector2(px, py);
	this.vel = new Vector2(0, 0);
	this.acc = new Vector2(0, -7.5);
	this.collision = new AABB(this.pos.x, this.pos.y, 80, 80);
	this.collisionTime = 0;
	this.boostFrames = 5; //boost for this number of frames
	this.fallFrames = 0; //disable boosting for this number of frames
	this.crashed = false;
	this.aiControl = false; //enable to disable player input and move using only the fancy ai routines that took 10 years of research to create
	
	this.trail = g_PARTICLE_MANAGER.reserve();
	if (this.trail) {
		ParticleSystem.init_playerTrail(this.trail, g_SPRITE_CACHE.fx_playerTrail);
		this.trail.priority = g_SCREEN.width * 2 + 1; //on top of player
	}
	
	Player.MAX_VELOCITY_Y = 450;
}

Player.prototype.reset = function(px, py) {
	this.aiControl = false;
	this.collisionTime = 0;
	this.crashed = false;
	this.fallFrames = 0;
	this.boostFrames = 0;
	this.trail.spawnDuration = -1;
	this.vel.set(0, 0);
	this.pos.set(px, py);
}

Player.prototype.update = function() {
	this.fallFrames = (this.fallFrames > 0) ? this.fallFrames - 1 : 0;
	this.boostFrames = (this.fallFrames > 0) ? 0 : this.boostFrames - 1;
	
	if (this.aiControl) { //use sophisticated AI routine
		if (this.pos.y > 128 || this.vel.y > 150) {
			this.boostFrames = 10;
		}
	} else if (!this.collisionTime && this.fallFrames < 1) {
		if (g_KEYSTATES.isPressed(KEYS.SPACE) || g_MOUSE.left.isPressed()) {
			this.boostFrames = 1;
		}
	}
	
	if (!this.crashed) {
		if (this.boostFrames > 0) this.vel.y += this.acc.y * g_GAMESTATE.intensity; //add(this.acc);
		else this.vel.y += g_GAMESTATE.gravity.y * g_GAMESTATE.intensity;
		if (this.vel.y > Player.MAX_VELOCITY_Y * g_GAMESTATE.intensity) {
			this.vel.y = Player.MAX_VELOCITY_Y * g_GAMESTATE.intensity;
		} else if (this.vel.y < -Player.MAX_VELOCITY_Y * g_GAMESTATE.intensity) {
			this.vel.y = -Player.MAX_VELOCITY_Y * g_GAMESTATE.intensity;
		}

		this.pos.addXY(this.vel.x * g_FRAMETIME_S, this.vel.y * g_FRAMETIME_S);
		if (g_GAMESTATE.state == GameState.STATE_GAMEOVER) {
			this.pos.x += g_GAMESTATE.scrollDX; //get scrolled away
		}

		if (this.pos.y < -320 ) {
			this.pos.y = -320;
			this.vel.set(0, 100);
			this.fallFrames = Math.floor(30 * 1.0 / g_GAMESTATE.intensity);
		} else if (this.pos.y > g_SCREEN.height + 64) {
			this.pos.y = g_SCREEN.height + 64;
			this.vel.set(0, 0);
			this.collisionTime = g_GAMETIME;
			this.crashed = true;
			g_CAMERA.addShake(750, 5);
			g_GAMESTATE.setState(GameState.STATE_GAMEOVER);
		}
		this.collision.pos.equals(this.pos);
		//update trail
		this.trail.setNumParticles(16 + Math.floor(g_GAMESTATE.intensityClamped * 48)); //max 64...
		this.trail.spawnDelay = 1 + Math.floor(5 * (1 - g_GAMESTATE.intensityClamped));
		this.trail.spawnRadius = 64 - g_GAMESTATE.intensityClamped * 32;
		this.trail.pos.set(this.pos.x, this.pos.y);
		this.trail.vel.setAngle(Math.PI + this.vel.y / Player.MAX_VELOCITY_Y * 0.5);
		this.trail.vel.mul(2);
	} else {
		this.trail.spawnDuration = 0;
	}
	this.trail.update();
}

Player.prototype.draw = function(ctx, xofs, yofs) {
	//uses canvas rotation for smooth (if slow) sprite rotation
	ctx.save();
	ctx.translate( this.pos.x + xofs, this.pos.y + yofs);
	ctx.rotate(this.vel.y * Math.PI / (180 * 22.5));
	this.sprite.draw(ctx, 0, 0, 0);
	ctx.restore();
}

Player.prototype.drawDebug = function(ctx, xofs, yofs) {
	this.collision.draw(ctx, xofs, yofs);
}

Player.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, 0, g_SCREEN.width * 2, false);
}

Player.prototype.toString = function() {
	return "Player";
}


/* MAIN FUNCTIONS **************************************************************
*/
function update() {
	g_GAMESTATE.update();
	g_GAME_DIRECTOR.update();

	g_PLAYER.update();
	g_BACKGROUND.update();
	g_STARFIELD.update();
	g_ITEM_MANAGER.update();
	g_OBSTACLE_MANAGER.update();
	g_PARTICLE_MANAGER.update();
	
	g_CAMERA.update();
	
	g_PLAYER.addDrawCall();
	g_BACKGROUND.addDrawCall();
	g_STARFIELD.addDrawCall();
	g_ITEM_MANAGER.addDrawCall();
	g_OBSTACLE_MANAGER.addDrawCall();
	g_PARTICLE_MANAGER.addDrawCall();
}

function draw() {
	g_SCREEN.clear(); //should be removed at some point
	
	g_RENDERLIST.sort();
	
	if (g_DEBUG && g_MOUSE.left.isPressed() && !g_MOUSE.left.justPressed()) {
		g_CAMERA.pos.x += g_MOUSE.dx;
		g_CAMERA.pos.y += g_MOUSE.dy;
	}
	
	g_RENDERLIST.draw(g_SCREEN.context, g_CAMERA.getX(), g_CAMERA.getY());
	if (g_DEBUG) {
		g_SCREEN.context.strokeStyle = "rgb(0,255,0)";
		g_SCREEN.context.fillStyle = "rgb(0,255,0)";
		g_RENDERLIST.drawDebug(g_SCREEN.context, g_CAMERA.getX(), g_CAMERA.getY(), 0);
		//g_GAMEAREA.draw(g_SCREEN.context, -g_CAMERA.pos.x, -g_CAMERA.pos.y);
		//document.getElementById('debug').innerHTML = g_RENDERLIST.toString();
	}
	
	g_RENDERLIST.clear();
}

function main() {
	if (g_KEYSTATES.justPressed(KEYS.D)) {
		g_DEBUG = !g_DEBUG;
		if (g_DEBUG) {
			document.getElementById('debug_panel').style.visibility = "visible";
		} else {
			document.getElementById('debug_panel').style.visibility = "hidden";
		}
	}	
	if (g_DEBUG) {
		if (g_KEYSTATES.justPressed(KEYS.T)) {
			g_CAMERA.trackTarget = (g_CAMERA.trackTarget) ? null : g_PLAYER;
		}
		if (g_KEYSTATES.justPressed(KEYS.C)) {
			g_CAMERA.constrain = !g_CAMERA.constrain;
		}
		if (g_KEYSTATES.justPressed(KEYS.A)) {
			g_PLAYER.collisionTime = 0;
			if (g_GAMESTATE.state == GameState.STATE_ATTRACT) {
				g_GAMESTATE.setState(GameState.STATE_GAMEPLAY);
			} else {
				g_GAMESTATE.setState(GameState.STATE_ATTRACT);
			}
		}
	}
	
	if (g_KEYSTATES.justPressed(KEYS.S)) {
		g_PARTICLE_MANAGER.spawnEffect(ParticleSystem.init_getPresent, g_SPRITE_CACHE.fx_getPresent, g_MOUSE.x + g_CAMERA.pos.x, g_MOUSE.y + g_CAMERA.pos.y, 0, 9999);		
	}
	if (g_KEYSTATES.justPressed(KEYS.LEFT)) {
		g_GAMESTATE.intensity -= 0.1;
	}
	if (g_KEYSTATES.justPressed(KEYS.RIGHT)) {
		g_GAMESTATE.intensity += 0.1;
	}
	if (g_KEYSTATES.justPressed(KEYS.F)) {
		// doesn't work. Seems that the function must be called from an event, such as a button click... :(
		goFullscreen();
	}
	
    update();
    draw();
	
	if (g_DEBUG) {
		document.getElementById('keystates').innerHTML = g_MOUSE.toString() + "<br>" + g_KEYSTATES.toString();
		document.getElementById('debug').innerHTML = "distance: " + Math.floor(g_GAMESTATE.scrollDistance)
		   + "<br>dx: " + g_GAMESTATE.scrollDX
		   + "<br>intensity: " + g_GAMESTATE.intensity
		   + "<br>combo (max): " + g_GAMESTATE.combo + " (" + g_GAMESTATE.comboMax + ")"
		   + "<br>multiplier: " + g_GAMESTATE.multiplier
		   + "<br>score: " + g_GAMESTATE.score
		   + "<br>delivered: " + g_GAMESTATE.deliveries + " missed: " + g_GAMESTATE.deliveriesMissed
		   + "<br>percent delivered: " + (Math.round(g_GAMESTATE.deliveries / (g_GAMESTATE.deliveries + g_GAMESTATE.deliveriesMissed) * 100)) + "%"
		   + "<br>time remaining: " + (Math.ceil(g_GAMESTATE.timeLeft / 1000))
		   + "<br>GameState.state: " + g_GAMESTATE.state;
	}
	
	//refresh random number table for next iteration
	g_RAND.generateNumbers();
}

function init() {
	var screen_width = 960; //original width 960
	var screen_height = 480; //original height 320

	if(g_SCREEN.init('screen', screen_width, screen_height, true)) {		
		//random numbers
		//http://davidbau.com/archives/2010/01/30/random_seeds_coded_hints_and_quintillions.html
		Math.seedrandom('Merry Christmas!');
		g_RAND = new RandomNumberTable(17);
	
		//set up g_ANIM_TABLE
		g_ANIM_TABLE.INIT = parseAnim("0");
		g_ANIM_TABLE.PRESENT_WOBBLE = parseAnim("0:60,1,0,2,0,1");
		g_ANIM_TABLE.PRESENT_MISS = parseAnim("3");
		g_ANIM_TABLE.UFO = parseAnim("0-2:12,0-2:12,0-2:12,0-2:12,0-1:12,3:12");
		
		//cache a few sprites (for effects)
		g_SPRITE_CACHE.fx_playerTrail = new Sprite(sys_TEXTURES[20], 4, 1);
		g_SPRITE_CACHE.fx_getPresent = new Sprite(sys_TEXTURES[21], 4, 1);
		g_SPRITE_CACHE.fx_ufoTrail = new Sprite(sys_TEXTURES[22], 4, 1);
	
		//set up g_GAMESTATE
		g_GAMESTATE = new GameState();
		
		//allocate object templates
		g_GAME_DIRECTOR = new GameDirector();
		g_GAME_DIRECTOR.disableSpawningUntilTime = 1000;
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_HOUSE01, 3);
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_PUB, 1, 1500, 700);
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_CHURCH, 1, 2000, 800);
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_SHACK01, 1.5);
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_SHACK02, 2);
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_TERRACE, 2, 1000);
		g_GAME_DIRECTOR.addObstacleType(Obstacle.instance_UFO, 1, 2500, 5); //other objects should be able to spawn immediately
		
		g_PARTICLE_MANAGER = new ParticleSystemManager(16, 64); //16 systems with up to 64 particles each (MAX = 1024 particles)
		g_PLAYER = new Player(160, 80);
		g_BACKGROUND = new Background();
		init_background();
		g_STARFIELD = new Starfield(16, new Sprite(sys_TEXTURES[14], 8, 1), 0, -500, g_SCREEN.width, -32, -10, 1);
		g_ITEM_MANAGER = new ObjectManager();
		g_ITEM_MANAGER.init_ItemManager(16);
		g_OBSTACLE_MANAGER = new ObjectManager();
		g_OBSTACLE_MANAGER.init_ObstacleManager(16);
	
		//g_GAMEAREA = new AABB(g_SCREEN.width * 0.5, g_SCREEN.height * 0.5 - 200, g_SCREEN.width, g_SCREEN.height + 400);
		g_GAMEAREA = new AABB(g_SCREEN.width * 0.5, -40, g_SCREEN.width, 720);
		g_CAMERA = new Camera();
		g_CAMERA.min.y = -350;
		g_CAMERA.max.y = 0;
		g_CAMERA.constrain = true;
		g_CAMERA.trackTarget = g_PLAYER;

		g_GAMESTATE.setState(GameState.STATE_ATTRACT);
	}
}

//initialise background layer
function init_background() {
	var temp;
	var yofs = g_SCREEN.height - 320;

	//sky
	g_BACKGROUND.addScrollLayer(new BackgroundScrollLayer(sys_TEXTURES[2], 0, -820 + yofs, -10, 0));
	
	//moon
	temp = new BackgroundComponent();
	temp.set(new Sprite(sys_TEXTURES[5],1, 1), null, g_SCREEN.width - 250, -128 + yofs, -10, 5);
	g_BACKGROUND.addComponent(temp);

	//far background hills
	g_BACKGROUND.addScrollLayer(new BackgroundScrollLayer(sys_TEXTURES[4], 0.1, 128 + yofs, -9, 0));
	
	//main background hills
	g_BACKGROUND.addScrollLayer(new BackgroundScrollLayer(sys_TEXTURES[3], 0.25, 48 + yofs, -7, 0));
	
	//trees
	temp = new BackgroundComponentLayer(8, 0.5, -6, 0, 1000, 2250);
	temp.addTemplate(new Sprite(sys_TEXTURES[9], 1, 1), 200 + yofs, 220 + yofs, 1);
	temp.addTemplate(new Sprite(sys_TEXTURES[10], 1, 1), 160 + yofs, 180 + yofs, 1);
	temp.addTemplate(new Sprite(sys_TEXTURES[11], 1, 1), 160 + yofs, 200 + yofs, 1);
	g_BACKGROUND.addComponentLayer(temp);
	
	//nearer trees
	temp = new BackgroundComponentLayer(8, 0.65, -5, 0, 300, 1800);
	temp.addTemplate(new Sprite(sys_TEXTURES[6], 1, 1), 128 + yofs, 160 + yofs, 1);
	temp.addTemplate(new Sprite(sys_TEXTURES[7], 1, 1), 128 + yofs, 140 + yofs, 1);
	temp.addTemplate(new Sprite(sys_TEXTURES[8], 1, 1), 128 + yofs, 180 + yofs, 1);
	temp.nextSpawnTime = g_GAMETIME + 2000;
	g_BACKGROUND.addComponentLayer(temp);
	
	//houses
	temp = new BackgroundComponentLayer(4, 0.8, -3, 0, 2000, 4000);
	temp.addTemplate(new Sprite(sys_TEXTURES[12], 1, 1), 160 + yofs, 190 + yofs, 1);
	temp.addTemplate(new Sprite(sys_TEXTURES[13], 1, 1), 160 + yofs, 190 + yofs, 1);
	temp.nextSpawnTime = g_GAMETIME + 6000;
	g_BACKGROUND.addComponentLayer(temp);
}

function goFullscreen() {
	var canvas = g_SCREEN.canvas;
	var scale = false;
	if (canvas["requestFullscreen"]) {
		console.log("fullscreen support: " + document.fullscreenEnabled);
		canvas.requestFullscreen();
		scale = true;
	}
	if (canvas["webkitRequestFullscreen"]) {
		console.log("fullscreen support: " + document.webkitFullscreenEnabled);
		canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		scale = true;
	}
	if (canvas["mozRequestFullScreen"]) {
		console.log("fullscreen support: " + document.mozFullscreenEnabled);
		canvas.mozRequestFullScreen();
		scale = true;
	}

	if (scale) {
		
	}
}