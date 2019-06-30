var canvas, ctx, canvasData, canvasWidth, canvasHeight;
var canvasData;
var cellImgs = new Array(16); //cell tiles array
const backgroundColor = "#00ff00";//"#000400";
const startColor = "#ff0000";
const endColor = "#0000ff";

var meshWidth, meshHeight, meshArray; // used to lay out the tiles

//HTML enters here 
function startScript() {
	let pM = 0;
	if ((!pM) || (pM == 254)) { console.log("pM: trueth");} else { console.log("pM: falseth");}
	//set page Title to the file-folder
	var locationName = window.location.pathname.split("/");
	document.title = locationName[locationName.length-2];

	loadPromises().then(drawPhase); //once everything is loaded, draw out the images
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

	var openPaths = 0;
	meshArray = new Array(meshHeight); // first part of 2D array to store compass values
	for (var y = 0; y < meshHeight; y++) {
		meshArray[y] = new Array(meshWidth); //second dimension of array to store compass values
		for (var x = 0; x < meshWidth; x++) {
			openPaths = 0;
			
			//south path - random chance
			if (y < meshHeight - 1) { // if not last row
				if (randomInt(10) > 5) { openPaths += compass.s; }
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

	//calculate values, between 0 and 255
	/*
	let value = 128;
	let dv = 1;
	for (let index = 0; index < pixelMask.length; index++) {
		if (pixelMask[index]){ // test if gap
			pixelData[index] = value; //set value of current pixel
			value += dv;
			if ((value > 255) || (value < 0)) { dv *= -1; value += 2 * dv;}
		}
	}
	*/

	let inOut = []; //inOut is a Queue, push items to end, shift them from the front
	let value;
	let dv = 1;
	let i;
	for (var y = 0; y < canvasHeight; y++) {
		for (var x = 0; x < canvasWidth; x++) {
			i = xy2i(x, y);

			if (pixelMask[i] != 255) { continue; } //jump this iteration if pixel is a gap, or visited?

			value = 128; //start new section at base value: 0;
			pixelData[i] = value; 	//immediately set pixel colour
			pixelMask[i] = 254;	//mark pixel as visited

			inOut = [new coords(x,y)]; //start the stack with the first pixel

			loopCount = 0
			while (inOut.length > 0 || loopCount > 150) { //need to test vs "coords.x/.y" not pixel x/y
				loopCount++;

				cx = inOut[0].x; //retrieve X and Y co-ords for adjcency tests, from the start of the stack
				cy = inOut[0].y;
				r = getPixelCol(cx, cy, 0); // get cell value
				if (r + dr > 255) { dr = -1; }
				if (r + dr < 0) { dr = 1; }
				
				drawPixel(cx, cy, r, 2, 128, 255); //set cell as "visited"  //using pixel value
			
				if (testCell (cx - 1, cy)){ //test west
					inOut.push(new coords(cx - 1, cy)); //push cell
					drawPixel (cx - 1, cy, r + dr, 1, 255, 255); //set value + 1, set "seen": temp
				}
				if (testCell (cx + 1, cy)){ //tes east
					inOut.push(new coords(cx + 1, cy)); //push cell
					drawPixel (cx + 1, cy, r + dr, 1, 255, 255); //set value + 1, set "seen": temp
				}
				if (testCell (cx, cy - 1)){ //test north
					inOut.push(new coords(cx, cy - 1)); //push cell
					drawPixel (cx, cy - 1, r + dr, 1, 255, 255);  //set value + 1, set "seen": temp
				}
				if (testCell (cx, cy + 1)){ //test south
					inOut.push(new coords(cx, cy + 1)); //push cell
					drawPixel (cx, cy + 1, r + dr, 1, 255, 255);  //set value + 1, set "seen": temp
				}

				inOut.shift(); //remove front of the stack
			}


			/*			
			pixelData[xy2i(x, y)] = value; //set value of current pixel
			value += dv;
			if ((value > 255) || (value < 0)) { dv *= -1; value += 2 * dv;}
			/* */

		}
	}

	/*
	function testCell (x, y){
		if (!(x < 0 || y < 0 || x > canvasWidth || y > canvasHeight)) { //test co-ordinates vs edge of world
			if (getPixelCol(x, y, 1) == 0) { //if "not touched"/ is black ... neither seen nor visited
				return true;
			}
		}
		return false;
	}
	/* */




	//draw it all back to the canvasData
	for (let i = 0; i < pixelMask.length; i++) {
		if (pixelMask[i]) { //draw pixelData + lerp for custom colours
			drawPixel(canvasData, i2x(i*4), i2y(i*4), pixelData[i], 0, pixelData[i], 255);
		} else { //draw background colour
			drawPixelBack(canvasData, i*4);
		}
	}

	//draw values back to canvasData, then canvasData back to the ctx
	ctx.putImageData(canvasData, 0, 0);
}

//get either r, g, b, or a value of pixel
function getPixelCol(canvasData, x, y, c) {
	var index = xy2i(x, y) * 4;
	return canvasData.data[index + c];
}

function drawPixel (canvasData, x, y, r, g, b, a) {
    var index = xy2i(x, y) * 4;
    canvasData.data[index + 0] = r;
    canvasData.data[index + 1] = g;
    canvasData.data[index + 2] = b;
    canvasData.data[index + 3] = a;
}

function drawPixelBack (canvasData, index){
	canvasData.data[index + 0] = parseInt(backgroundColor.substring(1,3),16);
	canvasData.data[index + 1] = parseInt(backgroundColor.substring(3,5),16);
	canvasData.data[index + 2] = parseInt(backgroundColor.substring(5),16);
    canvasData.data[index + 3] = 255;
}


function i2x (index) {return Math.floor(index / 4)%canvasWidth; } // convert index in 1D array to X coords
function i2y (index) {return Math.floor(index / (4 * canvasWidth)); } // convert index in 1D array to Y coords
function xy2i (x, y) {return (x + y * canvasWidth); } //convert 2D x and y co-ords to single 1D i co-ord

// storing x, y coordinates
class coords {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
