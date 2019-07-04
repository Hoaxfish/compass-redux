var canvas, ctx, canvasData, canvasWidth, canvasHeight;
var canvasData;
var cellImgs = new Array(16); //cell tiles array

// basic pre-loader
for (var i = 0; i < 16; i++) {
	cellImgs[i] = new Image(); // Create new img element
	cellImgs[i].src = 'images/tri-' + (i < 10 ? '0' : '') + i + '.png'; // Set source path
}

/*
const backgroundColor = "#000280";
const startColor = "#000280";
const endColor = "#ff0280";
/* */
const backgroundColor = "#000080";
const startColor = "#000080";
const endColor = "#ff0000";


var bgArray = color2Array(backgroundColor);
var scArray = color2Array(startColor);
var ecArray = color2Array(endColor);

function color2Array(color) {
	return [
		parseInt(color.substring(1,3),16),
		parseInt(color.substring(3,5),16),
		parseInt(color.substring(5),16),
	];
}

var meshWidth, meshHeight, meshArray; // used to lay out the tiles

//HTML enters here 
function startScript() {
	//set page Title to the file-folder
	var locationName = window.location.pathname.split("/");
	document.title = locationName[locationName.length-2];

	//uses Promises to guarantee image files are loaded
	//loadPromises().then(drawPhase); //once everything is loaded, draw out the images

	//just assume images are (pre-)loaded... faster
	ctxIniPromise();
	drawPhase();
}

function loadPromises(){
	var arr = []; // temp array of promises
	for (var i = 0; i < cellImgs.length; i++) { arr[i] = imgPromise(i);	}
	arr[i++] = ctxIniPromise();
	return Promise.all(arr);
}

function imgPromise(i) { //generate a Promise for loading each tile-image
	return new Promise( // return a new Promise
		function (resolve) { //resolve
			cellImgs[i] = new Image();
			cellImgs[i].src = 'images/tri-' + (i < 10 ? '0' : '') + i + '.png'; 
			cellImgs[i].onload = function () {
				resolve(cellImgs[i]); //OnLoad fires resolve(img)
			};
		}
	);	
}

async function ctxIniPromise(){ //initialise the canvas and ctx variables, async makes it into a Promise
	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");

	canvasWidth = canvas.width; canvasHeight = canvas.height;
}

function drawPhase(){
	drawTiles();
	drawOver();
}

function drawTiles(){
	meshWidth = Math.round(canvasWidth / 16); // 16 pixel width for cell images
	meshHeight = Math.round(canvasHeight / 16); // 16 pixel height for cell images

	var openPaths = 0; //calculated final value of NSEW, for current cell
	meshArray = new Array(meshHeight); // first part of 2D array to store compass values
	for (var y = 0; y < meshHeight; y++) {
		meshArray[y] = new Array(meshWidth); //second dimension of array to store compass values
		for (var x = 0; x < meshWidth; x++) {
			openPaths = 0;
			
			//south path - random chance
			if (y < meshHeight - 1) { // if not last row
				if (randomInt(10) > 4) { openPaths += compass.s; }
			}
			//east path - random chance
			if (x < meshWidth - 1) { // if not last column
				if (randomInt(10) > 5) { openPaths += compass.e; }
			}
			//north path - check south
			if (y > 0) { // if not first row
				if (CheckBitState(meshArray[y-1][x], compass.s)) { openPaths += compass.n; }
			}
			//west path - check east
			if (x > 0) { // if not first column
				if (CheckBitState(meshArray[y][x-1], compass.e)) { openPaths += compass.w; }
			}
			meshArray[y][x] = openPaths;
			ctx.drawImage(cellImgs[openPaths], x * 16, y * 16);
		}
	}
}

function randomInt(max) { return Math.floor(Math.random() * Math.floor(max)); }

/* 2D grid layout based on binary joins to adjacent cells
 * |06|14|12|
 * |07|15|13|
 * |03|11|09|
 */
const compass = {
	none: 0,	//0000 00 - none

				// two directions
	n: 1,		//0001 - 01 - N
	e: 2,		//0010 - 02 - E
	s: 4,		//0100 - 04 - S
	w: 8,		//1000 - 08 - W

	ne: 3,		//0011 - 03 - N+E
	ns: 5,		//0101 - 05 - N+S
	nw: 9,		//1001 - 09 - N+W
	es: 6,		//0110 - 06 - E+S
	ew:10,		//1010 - 10 - E+W
	sw:12,		//1100 - 12 - S+W

				// Three directions
	nes: 7,		//0111 - 07 - N+E+S
	nwe:11,		//1011 - 11 - N+E+W  - variable as "nwe" to avoid "new" keyword
	nsw:13,		//1101 - 13 - N+S+W
	esw:14, 	//1110 - 14 - E+S+W

	all:15		//1111 - 15 - N+E+S+W
}

function CheckBitState(vValue, bSet) { return (vValue & bSet) != 0;}

// canvasData x4 : data read directly from the canvas, including drawn tile: read alpha channel to determine gaps (0:false) or fill (255:true)
// pixelMask  x1 : single channel version of the canvasData alpha-channel. 0: false, 255: true, 254: visited?
// pixelData  x1 : fill with per-pixel algo. use pixelMask to determine edges without altering original or canvasData - store value from 0 to 255
// canvasData x4 : paint over old canvasData with new values based on pixelData, test vs pixelMask for breaks

function drawOver(){
	canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight); //at this point, alpha-channel is either 0 (gap) or 255 (fill). x4 per pixel

	var pixelMask = canvasData.data.filter((position, index) => index%4 == 3); //isolate alpha-data. x1 per pixel
	var pixelData = new Uint8ClampedArray(new ArrayBuffer(pixelMask.length)); //make an empty array, 256 value per pixel. x1 per pixel

	let inOut = []; //inOut is a Queue, push items to end, shift them from the front
	let value;// = 0;
	let dv = 1;
	let i;
	for (var y = 0; y < canvasHeight; y++) {
		for (var x = 0; x < canvasWidth; x++) {
			i = xy2i(x, y);

			if (pixelMask[i] != 255) { continue; } //jump this iteration if pixel is a gap, or visited?
			value = 0; 			//start new section at base value: 0;
			pixelData[i] = value; 	//immediately set pixel colour
			pixelMask[i] = 254;		//mark pixel as visited

			inOut = [new coords(x,y)]; //start the stack with the first pixel

			//loopCount = 0 //safety cap to prevent infinite loop during dev
			//while (inOut.length > 0 && loopCount < 1024) { //test if inOut stack exhausted
			while (inOut.length > 0) { //test if inOut stack exhausted
				//loopCount++; //safety cap: +1 looped.

				let cx = inOut[0].x; //retrieve X and Y co-ords for adjcency tests from first element, from the start of the stack
				let cy = inOut[0].y;
				let ci = xy2i(cx, cy);

				value = pixelData[ci]; // get cell value
				if ((value + dv > 255) || (value + dv < 0)) { dv *= -1;}
				
				setCellValue(cx, cy, value);
			
				//test "can I go here next?"
				if (canMoveTo (cx - 1, cy)){ //test west
					inOut.push(new coords(cx - 1, cy)); //push cell
					setCellValue(cx - 1, cy, value + dv); //set cell cx - 1: value, set "seen": temp
				}
				if (canMoveTo (cx + 1, cy)){ //test east
					inOut.push(new coords(cx + 1, cy)); //push cell
					setCellValue(cx + 1, cy, value + dv); //set cell cx + 1: value, set "seen": temp
				}
				if (canMoveTo (cx, cy - 1)){ //test north
					inOut.push(new coords(cx, cy - 1)); //push cell
					setCellValue(cx, cy - 1, value + dv); //set cell cy - 1: value, set "seen": temp
				}
				if (canMoveTo (cx, cy + 1)){ //test south
					inOut.push(new coords(cx, cy + 1)); //push cell
					setCellValue(cx, cy + 1, value + dv); //set cell cy + 1: value, set "seen": temp
				}

				inOut.shift(); //remove front of the stack
			}

		}
	}

	function canMoveTo (x, y){
		if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) { return false; } //test co-ordinates vs edge of world
		return (pixelMask[xy2i(x, y)] == 255); // true only if not visited & not avoid
	}

	function setCellValue (x, y, value){
		ciaj = xy2i(x, y);
		pixelMask[ciaj] = 254;
		pixelData[ciaj] = value + dv;
	}


	//draw it all back to the canvasData
	for (let i = 0; i < pixelMask.length; i++) {
		var i4 = i * 4;
		if (pixelMask[i]) { //draw pixelData + lerp for custom colours
			drawPixel(canvasData, i4, pixelData[i], pixelData[i], pixelData[i]);
		} else { //draw background colour
			drawPixelBack(canvasData, i4);
		}
	}
	/* */

	//draw values back to canvasData, then canvasData back to the ctx
	ctx.putImageData(canvasData, 0, 0);
}

//not used?
//get either r, g, b, or a value of pixel
function getPixelCol(canvasData, x, y, c) {
	var index = xy2i(x, y) * 4;
	return canvasData.data[index + c];
}

function drawPixel (canvasData, index, r, g, b) {
    //var index = xy2i(x, y) * 4;
    canvasData.data[index + 0] = clerp(0, r);//r;
    canvasData.data[index + 1] = clerp(1, g);//g;
    canvasData.data[index + 2] = clerp(2, b);//b;
    canvasData.data[index + 3] = 255;
}

function drawPixelBack (canvasData, index){
	canvasData.data[index + 0] = bgArray[0];
	canvasData.data[index + 1] = bgArray[1];
	canvasData.data[index + 2] = bgArray[2];
    canvasData.data[index + 3] = 255;
}


function i2x (index) {return Math.floor(index / 4)%canvasWidth; } // convert index in 1D array to X coords
function i2y (index) {return Math.floor(index / (4 * canvasWidth)); } // convert index in 1D array to Y coords
function xy2i (x, y) {return (x + y * canvasWidth); } //convert 2D x and y co-ords to single 1D i co-ord

function clerp(c, value) { //work from lowest value
	return value * (ecArray[c] - scArray[c]) / 255 + scArray[c];
}

// storing x, y coordinates
class coords {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}