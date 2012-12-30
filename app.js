(function() {

var svgEditEmbed,
	svgEditFrame,
	testResults;

var testIndex = 0,
	maxTests = 10;

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
	if (testIndex >= maxTests) {
		testsComplete();
	} else {
		var imageTitle,
			url,
			origSource,
			savedSource,
			testli,
			origImage,
			savedImage,
			canvas,
			imagesLoaded;

		function getRandomSvg() {
			// http://commons.wikimedia.org/w/api.php?action=query&list=random&rnnamespace=6&rnlimit=10&format=json
			commonsApi({
				action: 'query',
				list: 'random',
				rnnamespace: 6, // NS_FILE
				rnlimit: 10
			}, function(data) {
				var random = data.query.random;
				for (var i = 0; i < random.length; i++) {
					var page = random[i];
					if (page.title.match(/\.svg$/i)) {
						// Found an SVG!
						imageTitle = page.title;
						log('got random SVG ' + imageTitle);
						break;
					}
				}
				if (imageTitle === undefined) {
					// no SVGs in this set, try again
					getRandomSvg();
				} else {
					getSvgUrl();
				}
			});
		}

		function getSvgUrl() {
			// http://commons.wikimedia.org/w/api.php?action=query&titles=File:Albert%20Einstein%20Head.jpg&prop=imageinfo&iiprop=url&format=json
			commonsApi({
				action: 'query',
				titles: imageTitle,
				prop: 'imageinfo',
				iiprop: 'url'
			}, function(data) {
				var pages = data.query.pages,
					pages;
				for (var pageId in pages) {
					page = pages[pageId];
					break;
				}
				if (page === undefined) {
					throw new Error("kaboom, no imageinfo");
				}
				url = page.imageinfo[0].url;
				fetchSvg();
			});
		}
		
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
			origImage.height = 320;
			origImage.src = dataPrefix + encodeURIComponent(origSource);
			savedImage = new Image();
			savedImage.width = 320;
			savedImage.height = 320;
			savedImage.src = dataPrefix + encodeURIComponent(savedSource);

			testli = document.createElement('li');
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
			try {
				var canvasA = flatten(origImage);
				testli.appendChild(canvasA);
			} catch (e) {
				log("Can't render original image");
			}

			try {
				var canvasB = flatten(savedImage);
				testli.appendChild(canvasB);
			} catch (e) {
				log("Can't render saved image");
			}

			if (canvasA && canvasB) {
				var data = diffCanvases(canvasA, canvasB);
				log('difference score: ' + data.diff);
				testli.appendChild(data.canvas);
			}
			nextTest();
		}
		
		function nextTest() {
			testIndex++;
			runTest();
		}
		
		getRandomSvg();
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
 * @param HTMLCanvasElement canvasA
 * @param HTMLCanvasElement canvasB
 * @return {diff: number, canvas: HTMLCanvasElement}
 */
function diffCanvases(canvasA, canvasB) {
	var width = canvasA.width,
		height = canvasA.height,
		diff = 0;

	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	var ctx = canvas.getContext('2d'),
		ctxA = canvasA.getContext('2d'),
		ctxB = canvasB.getContext('2d');
	
	var imageData = ctx.createImageData(width, height);
	try {
		var imageDataA = ctxA.getImageData(0, 0, width, height);
	} catch (e) {
		log("Can't getImageData from A: " + e.toString());
	}
	try {
		var imageDataB = ctxB.getImageData(0, 0, width, height);
	} catch (e) {
		log("Can't getImageData from B: " + e.toString());
	}

	if (imageData && imageDataA && imageDataB) {
		var data = imageData.data,
			dataA = imageDataA.data,
			dataB = imageDataB.data,
			i = 0,
			delta = 0,
			abs = Math.abs;
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				delta = abs(dataA[i] - dataB[i]);
				diff += delta;
				data[i] = delta;
				i++;
				delta = abs(dataA[i] - dataB[i]);
				diff += delta;
				data[i] = delta;
				i++;
				delta = abs(dataA[i] - dataB[i]);
				diff += delta;
				data[i] = delta;
				i++;
				data[i] = 255; // opaque
				i++;
			}
		}
	}
	
	ctx.putImageData(imageData, 0, 0);

	return {
		diff: diff,
		canvas: canvas
	};
}

/**
 * Call MediaWiki API on Wikimedia Commons with given parameters.
 * Returns JSON results.
 *
 * @param object params
 * @param function callback
 */
function commonsApi(params, callback) {
	var url = 'https://commons.wikimedia.org/w/api.php?format=json';
	for (var i in params) {
		url = url + '&' + i + '=' + encodeURIComponent(params[i]);
	}
	callJsonP(url, callback);
}

/**
 * JSONP call wrapper, as Commons API isn't CORS-ed out yet
 */
function callJsonP(url, callback) {
	var script = document.createElement('script'),
		tempName = 'jsonp_' + ('' + Math.random()).replace('0.', '');

	window[tempName] = function(data) {
		window[tempName] = undefined;
		script.parentNode.removeChild(script);
		callback(data);
	};

	script.src = url + '&callback=' + tempName;
	document.getElementsByTagName('head')[0].appendChild(script);
}

function testsComplete() {
	log('finished.');
	svgEditFrame.parentNode.removeChild(svgEditFrame);
}


testResults = document.getElementById('test-results');
svgEditFrame = document.getElementById('svg-edit-frame');
svgEditFrame.addEventListener('load', function() {
	init();
});

})();
