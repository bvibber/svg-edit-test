(function() {

var svgEditEmbed,
	svgEditFrame,
	testResults;

var testFiles = [
	'https://upload.wikimedia.org/wikipedia/commons/e/e5/Mpemba-simple.svg',
	'https://upload.wikimedia.org/wikipedia/commons/3/31/Wheel_factorization-n%3D30.svg',
	'https://upload.wikimedia.org/wikipedia/commons/8/89/1976_chromaticity_diagram.svg',
	'https://upload.wikimedia.org/wikipedia/commons/1/18/Com2enwiki.svg',
	'https://upload.wikimedia.org/wikipedia/commons/f/ff/Derivative_Works_Decision_Tree_%28fr%29.svg',
	'https://upload.wikimedia.org/wikipedia/commons/8/81/Procamelus_evolution_es.svg'
];
var testIndex = 0;

function log(data) {
	console.log(data);
	var li = document.createElement('li'),
		text = document.createTextNode(data);
	li.appendChild(text);
	testResults.appendChild(li);
}

function init() {
	log('initializing...');
	svgEditEmbed = new embedded_svg_edit(svgEditFrame);
	testIndex = 0;
	runTest();
}

function runTest() {
	if (testIndex >= testFiles.length) {
		testsComplete();
	} else {
		var url = testFiles[testIndex],
			origSource,
			savedSource,
			testli,
			origImage,
			savedImage,
			canvas,
			imagesLoaded;

		function fetchSvg() {
			log('fetching ' + url);
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						log('successfully loaded...');
						origSource = xhr.responseText;
						openSvg();
					} else {
						log('failed to load...');
					}
				}
			}
			xhr.open('GET', url);
			xhr.send();
		}

		function openSvg() {
			// Open the SVG in the editor...
			log('opening in editor...');
			svgEditEmbed.setSvgString(origSource)(function() {
				saveSvg();
			});
		}

		function saveSvg() {
			// Save the XML output from the editor...
			log('saving from editor...');
			svgEditEmbed.getSvgString()(function(xml) {
				savedSource = xml;
				renderSvg();
			});
		}

		function renderSvg() {
			log('rendering output...');
			var dataPrefix = 'data:image/svg+xml;charset=utf-8,';
			origImage = new Image();
			origImage.width = 320;
			origImage.src = dataPrefix + encodeURIComponent(origSource);
			savedImage = new Image();
			savedImage.width = 320;
			savedImage.src = dataPrefix + encodeURIComponent(savedSource);

			testli = document.createElement('li');
			testli.appendChild(origImage);
			testli.appendChild(savedImage);
			testResults.appendChild(testli);

			imagesLoaded = 0;
			origImage.addEventListener('load', checkAndCompareImages);
			savedImage.addEventListener('load', checkAndCompareImages);
		}
		
		function checkAndCompareImages() {
			imagesLoaded++;
			if (imagesLoaded >= 2) {
				compareImages();
			}
		}

		function compareImages() {
			log('comparing output...');
			canvas = diffImages(origImage, savedImage, canvas);
			testli.appendChild(canvas);
			nextTest();
		}
		
		function nextTest() {
			testIndex++;
			runTest();
		}
		
		fetchSvg();
	}
}

/**
 * @param HTMLImageElement image
 * @return HTMLCanvasElement
 */
function flatten(image) {
	var canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;

	var ctx = canvas.getContext('2d');
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
}

/**
 * @param HTMLImageElement a
 * @param HTMLImageElement b
 * @return HTMLCanvasElement
 */
function diffImages(a, b) {
	var canvasA = flatten(a),
		canvasB = flatten(b),
		width = a.width,
		height = a.height;

	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	var ctx = canvas.getContext('2d'),
		ctxA = canvasA.getContext('2d'),
		ctxB = canvasB.getContext('2d');
	
	var imageData = ctx.createImageData(width, height),
		imageDataA = ctxA.getImageData(0, 0, width, height),
		imageDataB = ctxB.getImageData(0, 0, width, height),
		data = imageData.data,
		dataA = imageDataA.data,
		dataB = imageDataB.data;

	var i = 0;
	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			data[i] = (dataA[i] - dataB[i]) & 0xff;
			i++;
			data[i] = (dataA[i] - dataB[i]) & 0xff;
			i++;
			data[i] = (dataA[i] - dataB[i]) & 0xff;
			i++;
			data[i] = 255; // opaque
			i++;
		}
	}
	
	ctx.putImageData(imageData, 0, 0);

	return canvas;
}

function testsComplete() {
	log('finished.');
}


testResults = document.getElementById('test-results');
svgEditFrame = document.getElementById('svg-edit-frame');
svgEditFrame.addEventListener('load', function() {
	init();
});

})();
