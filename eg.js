(function(root) {
	var base = "../../",
		runTests = getURLParameter("test") == "true",
		specUrl = base + getURLParameter("example");

	root.ngExampleApp = angular.module('ngExampleApp', ["ngMockE2E"]),

	angular.bootstrap(document, ['ngExampleApp']);

	console.log(runTests ? "test:" : "example:", specUrl);

	root.testInjections = {
		before: [],
		after: [] // not used at this point
	};

// we need to defer the execution of $httpBackend.expectGET
// if we add it to a beforeEach right now we can't properly
// inject the $httpBackend in a way that will work with the test (tried and tried)
// instead the functions on testInjections.before and testInjections.after
// can be invoked via beforeEach(inject(yourFn)) and afterEach(inject(yourFn))
// ngTest takes care of this invocation step for you
	testInjections.before.push(function($httpBackend) {
		_.each(testInjections.templates, function(html, url) {
			$httpBackend.expectGET(url).respond(html);
		}) ;
	});

	testInjections.templates = {};



// http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
	function $hashCode(str) {
		var hash = 0, char;
		if (str.length == 0) return hash;
		for (i = 0; i < str.length; i++) {
			char = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}

	function loadCss(url, cb) {
		var id = $hashCode(url);
		$.get(url, function(response) {
			if (!$('#'+id).length) {
				var ret = $('head').append('<style id="'+id+'" rel="stylesheet" type="text/css"></style>');
				console.log(ret);
				$('#'+id).text(response);
			}
			cb && cb(url);
		});
	}

	function loadStyl(url, cb) {
		var id = $hashCode(url),
			url_parts = url.split('/'),
			file = url_parts[url_parts.length - 1],
			path;

		url_parts.pop(),
			path = url_parts.join('/') + "/";

		var fl = new styl.FileLoader(file, path);
		fl.startLoading().done(function(full_contents) {
			// Get css from stylus code.
			var rend = stylus(full_contents);
			rend.imports = []; // XXX

			rend.render(function(err, css) {
				if (err) {
					alert(err);
					return;
				}

				// Create style element.
				if (!$('#'+id).length) {
					var $style = $('<style id="'+id+'" type="text/css"></style>');
					$style.html(css.trim()).appendTo('head');
				}
				cb && cb(url);
			});
		});
	}

	function loadJs(url, cb) {
		$.getScript(url, function() {
			cb && cb(url);
		});
	}

	function loadSpec(url, cb) {
		$.get(url, function(response) {
			$('#ngExample').html(response);
			cb && cb(url, response);
		});
	}

	function getURLParameter(name) {
		return decodeURI((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]);
	}

	function loadTpl(url, cb) {
		var urlParts = url.split("/"),
			len = urlParts.length,
			name = urlParts[len-2] + "/" + urlParts[len-1];

		$.get(url, function(response) {
			ngExampleApp.run(function($templateCache) {
				// add our template to the $templateCache
				$templateCache.put(name, response);
				// there is still a get that happens (why i don't know) so...
				// we need to setup our expectGETs for this url but those need
				// to run during the test in a deferred way (i know not why)  so...
				// we save them off on the global testInjections namespace
				// that can then be used in the context of the test later
				testInjections.templates[name] = response;
			});

			cb && cb(url);
		});
	}

	function load(items, cb) {
		if (_.isString(items)) {
			items = [items];
		}

		async.eachSeries(items,  function(url, _next) {
			var parts = url.split("."),
				type = parts.pop(),
				next = function(url) {
//						console.log("loaded", type, url);
					_next();
				}

			type = (parts.pop() == "eg") ? "eg."+type : type;

			switch (type) {
				case "js": 			loadJs(url, next); break;
				case "eg.js": 		loadJs(url, next); break;
				case "css": 		loadCss(url, next); break;
				case "styl": 		loadStyl(url, next); break;
				case "html": 		loadTpl(url, next); break;
				case "eg.html": 	loadSpec(url, next); break;
			}
		}, cb);
	}


	function ngExample(spec) {
		$(function() {

			if (!runTests) {
				console.log("append", spec.html);
				$("#ngExample").append(spec.html || "");
			}

			var resolvedFiles = _.map(spec.files, function(url) {
				return base + spec.root + url;
			});

			load(resolvedFiles, function() {

				if (runTests) {
					$("#ngExample").hide();

					var htmlReporter = new jasmine.HtmlReporter();
					var jasmineEnv = jasmine.getEnv();
					jasmineEnv.updateInterval = 1000;
					jasmineEnv.addReporter(htmlReporter);
					jasmineEnv.specFilter = function(spec) {
						return htmlReporter.specFilter(spec);
					};
					jasmineEnv.execute();
					$("#HTMLReporter").show();

				} else {
					spec.init(ngExampleApp);
					angular.resumeBootstrap(spec.modules);
				}

			});
		});
	}

	root.ngExample = ngExample;


	load(specUrl);
}(this));
