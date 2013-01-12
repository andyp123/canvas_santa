function Vector2(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vector2.prototype.equals = function(v) {
	this.x = v.x;
	this.y = v.y;
}

Vector2.prototype.toString = function() {
	return "(" + this.x + "," + this.y + ")";
}

//non-static, non-const functions
Vector2.prototype.set = function(x, y) {
	this.x = x || 0;
	this.y = y || 0;
	return this;
}

Vector2.prototype.add = function(v) {
	this.x += v.x;
	this.y += v.y;
}

Vector2.prototype.sub = function(v) {
	this.x -= v.x;
	this.y -= v.y;
}

Vector2.prototype.mul = function(s) {
	this.x *= s;
	this.y *= s;
}

Vector2.prototype.div = function(s) {
	s = 1.0 / s;
	this.x *= s;
	this.y *= s;
}

Vector2.prototype.normalise = function() {
	var s = this.x * this.x + this.y * this.y;
	if (s) s = 1.0 / Math.sqrt(s); //avoid divide by zero
	this.x *= s;
	this.y *= s;
}

Vector2.prototype.neg = function() {
	this.x = -this.x;
	this.y = -this.y;
}

//x,y input
Vector2.prototype.addXY = function(x, y) {
	this.x += x;
	this.y += y;
}

Vector2.prototype.subXY = function(x, y) {
	this.x -= x;
	this.y -= y;
}

//angle functions assume 1,0 is 0 degrees
Vector2.prototype.setAngle = function(a)
{
	this.x = Math.cos(a);
	this.y = Math.sin(-a);
}

//const
Vector2.prototype.len = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vector2.prototype.lenSq = function() {
	return (this.x * this.x + this.y * this.y);
}

Vector2.prototype.dist = function(v) {
	return Math.sqrt((v.x - this.x) * (v.x - this.x) + (v.y - this.y) * (v.y - this.y));
}

Vector2.prototype.distSq = function(v) {
	return (v.x - this.x) * (v.x - this.x) + (v.y - this.y) * (v.y - this.y);
}

//kind of lame, but works
Vector2.prototype.getAngle = function()
{
	if (this.y > 0) return 2 * Math.PI - Math.acos(this.x);
	return Math.acos(this.x);
}

//static functions
Vector2.s_add = function(a, b, r) {
	r.x = a.x + b.x;
	r.y = a.y + b.y;
	return r;
}

Vector2.s_sub = function(a, b, r) {
	r.x = a.x - b.x;
	r.y = a.y - b.y;
	return r;
}

Vector2.s_mul = function(v, s, r) {
	r.x = a.x * s;
	r.y = a.y * s;
	return r;
}

Vector2.s_div = function(v, s, r) {
	s = 1.0 / s;
	r.x = a.x * s;
	r.y = a.y * s;
	return r;
}

Vector2.s_unitVector = function(v, r) {
	var s = 1.0 / Math.sqrt(this.x * this.x + this.y * this.y);
	r.x = v.x * s;
	r.y = v.y * s;
	return r;
}

Vector2.s_angleVector = function(a, r)
{
	r.x = Math.sin(a);
	r.y = Math.cos(a);
	return r;
}
