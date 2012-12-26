(function() {

var svgEditEmbed,
	svgEditFrame,
	testResults;

var testFiles = [
	'https://upload.wikimedia.org/wikipedia/commons/f/ff/Derivative_Works_Decision_Tree_%28fr%29.svg'
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
			ctx,
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
			// Compare the saved output against the original
			// string comparison hack
			/*
			if (origSource === savedSource) {
				log("match");
			} else {
				console.log(origSource.substring(0, 80));
				console.log(savedSource.substring(0, 80));
				log("didn't match");
			}
			*/
			var dataPrefix = 'data:image/svg+xml;charset=utf-8,';
			origImage = new Image();
			origImage.width = 300;
			origImage.src = dataPrefix + encodeURIComponent(origSource);
			savedImage = new Image();
			savedImage.width = 300;
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
			canvas = document.createElement('canvas');
			canvas.width = 300;
			canvas.height = origImage.height;
			testli.appendChild(canvas);

			ctx = canvas.getContext('2d');
			ctx.drawImage(origImage, 0, 0, origImage.width, origImage.height);
			ctx.globalCompositeOperation = 'xor';
			ctx.drawImage(savedImage, 0, 0, origImage.width, origImage.height);
			nextTest();
		}
		
		function nextTest() {
			testIndex++;
			runTest();
		}
		
		fetchSvg();
	}
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
