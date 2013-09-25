/*
 * ngTest.js 0.1.3 08-29-2013
 * copyright (c) 2013 Andrew Luetgers
 * you are free to distribute ngTest.js under the MIT license
 * https://github.com/andrewluetgers/ngTest
 */

var ngTest = (function(root) {

	function ngTest(obj, depth, debug) {

		var code = "";
		function list() {
			return Array.prototype.slice.call(arguments, 0);
		}

		var log = ("dump" in root) ? dump : function() {console.log.apply(console, list(arguments));}
		debug = debug || depth === true;
		depth = _.isNumber(depth) ? ++depth : 0;

		// parse the describe/test blocks
		_.each(obj, function(spec, des) {
			var type = isDescribe(des) ? "describe" : "it",
				describeMode = type == "describe";

			code +=						type + "('"+des+"', ";

			if (_.isFunction(spec)) {
				// we have a traditional describe or it function
				code += 				spec + ");";

			} else if (describeMode && _.isArray(spec)) {
				code += 				"function() {";

				// we have an array of possible actions depending on type
				// so lets compile lists of each then code-gen
				var vars = [],
					deps = [],
					mods = [],
					before = [],
					funcs = [],
					after = [],
					tests = [],
					compile = false;

				// compile phase --------------
				_.each(spec, function(val) {
					if (_.isString(val)) {
						// string = a module to load or dependencies to inject
						// lets compile them into lists and in either case we need a before each function
						// supports modules that have the same name as a dependency
						// e.g. titleService, we demarcate modules with a ':' suffix
						// we can indicate the module and the dependency via the prefix "+" or ":+"
						var name = val.replace(/\+$/, "");
						name = name.replace(/:$/, "");

						if (isModuleAndDep(val)) {
							deps.push(name);
							mods.push(name);
						} else if (isVariable(val)) {
							vars.push(val.replace(/=$/, ""));
						} else {
							isModule(val) ? mods.push(name) : deps.push(name);
						}

					} else if (_.isFunction(val)) {
						// function = beforeEach, afterEach or some inline function

						// are we needing the compileDirective util?
						compile = (!compile && (val+"").match("compileWithScope")) ? true : compile;

						if (isNamed(val)) {
							if (isBefore(val)) {
								before.push(val);
							} else if (isAfter(val)) {
								after.push(val);
							} else {
								// named functions not prefixed
								// with before or after get in-lined
								funcs.push(val);
							}
						} else if (!before.length) {
							before.push(val);
						} else if (!after.length) {
							after.push(val);
						}

					} else if (_.isPlainObject(val)) {
						// objects = recur with depth
						tests.push(ngTest(val, depth, debug));
					}
				});

				debug && log(mods, deps, before, after, tests);

				// code gen phase --------------------------------------------------------------------

				// in-line our named functions that are not prefixed with before or after
				funcs.length && (code += "\n\n" + funcs.join("\n\n"));

				// load modules ------------------
				// will generating for something like this
				//	beforeEach(function() {
				//		module('foo');
				//		module('bar');
				//		module('filters');
				//	});

				// if ngExampleApp is loading the test include the ngExampleApp module
				if ("ngExampleApp" in root) {
					mods.unshift("ngExampleApp");
				}

				var modCode = "";
				if (mods.length) {
					modCode = 			"beforeEach(function() {";
					_.each(mods, function(mod) {
						// if running under the ngExampleApp loader skip things that look like templates
						if("ngExampleApp" in root && isTemplate(mod)) {
							modCode += 		" /*\"module('"+mod+"');\" eliminated for compatibility with ngExampleApp loader */";
						} else {
							modCode += 		"module('"+mod+"');";
						}
					});
					code += 			modCode + "});";
				}


				// add in the compileWithScope util deps if needed ------------------

				// we use compile in the nested code?
				compile = compile || _.any(tests, function(code) {
					return !!(code).match("compileWithScope");
				});

				if (compile) {
					// if we need the compileWithScope util lets load up a couple deps for it
					deps.push("$compile", "$rootScope");
					deps = _.uniq(deps);
				}

				// compileWithScope util function added after deps


				// add in our vars ------------------
				if (vars.length) {
					code += 			"var "+ vars +";";
				}


				// inject deps via closure ref ------------------
				// will generate something like this
				// 		var momentAgoFilter;
				//		beforeEach(inject(function(_momentAgoFilter_) {
				//			momentAgoFilter = _momentAgoFilter_;
				//		}));

				var depCode = "";
				if (deps.length) {
					code += 			"var "+ deps +";";
					var injectArgs = _.map(deps, function(d) {
						var dAlt = 		"_"+d+"_";
						depCode += 		d + " = " + dAlt + ";";
						return dAlt;
					});

					code += 			"beforeEach(inject(function("+injectArgs+") {";
					code += 			depCode + "}));";  // end inject code
				}

				// add in the compileWithScope util if needed ------------------
				function compileWithScope(spec) {

					var ret = {};

					// create a scope
					ret.scope = $rootScope.$new();

					// copy provided scope vals to our new scope
					if (spec.scope) {
						angular.extend(ret.scope, spec.scope);
					}

					// get the jqLite or jQuery element
					ret.el = angular.element(spec.html);

					// compile the element into a function to
					// process the view.
					ret.compiled = $compile(ret.el);

					// run the compiled view.
					ret.compiled(ret.scope);

					// call digest on the scope!
					ret.scope.$digest();

					return ret;
				}

				code += compile ? " " +compileWithScope : "/* compileWithScope util not required */";

				// add our deferred injection support
				function beforeInjections_() {
					_.each(testInjections.before, function(fn) {
						if (_.isFunction(fn)) {
							inject(fn);
						}
					});
				}

				function afterInjections_() {
					_.each(testInjections.after, function(fn) {
						if (_.isFunction(fn)) {
							inject(fn);
						}
					});
				}

				if ("testInjections" in root) {
					if (_.isArray(testInjections.before) && testInjections.before.length) {
						before.unshift(beforeInjections_);
					}
					if (_.isArray(testInjections.after) && testInjections.after.length) {
						after.unshift(afterInjections_);
					}
				}

				// add our befores and afters ------------------
				_.each(before, function(fn) {
					code += 			"beforeEach(" + fn + ");";
				});

				_.each(after, function(fn) {
					code += 			"afterEach(" + fn + ");";
				});


				// add all the tests and nested describes ------------------
				_.each(tests, function(testCode) {
					code += 			testCode;
				});

				// all done bitches ------------------
				code += 				"});"; // end describe fn

			} else {
				log("Bad spec!", spec);
				throw new TypeError("expected array or function but saw " + typeof spec);
			}

		});

		if (depth === 0) {
			debug && log("final code", code, depth);
			var fn = new Function(code);
			fn.call(root);
		} else {
			debug && log("returning code", code, depth);
			return code;
		}
	}

	function isTest(str) {
		return stringStartsWith(str.toLowerCase(), "should");
	}

	function isDescribe(str) {
		return !isTest(str);
	}

	function isModule(str) {
		return stringEndsWith(str, ":");
	}

	function isModuleAndDep(str) {
		return stringEndsWith(str, "+");
	}

	function isVariable(str) {
		return stringEndsWith(str, "=");
	}

	function isTemplate(str) {
		return str.match(/template|\.tpl\.html/i);
	}

	function isBefore(fn) {
		return stringStartsWith(fn + "", "function before");
	}

	function isAfter(fn) {
		return stringStartsWith(fn + "", "function after");
	}

	function isNamed(fn) {
		return stringStartsWith(fn + "", "function ");
	}

	function stringStartsWith(haystack, needle) {
		return haystack.substr(0, needle.length) == needle;
	}

	function stringEndsWith(haystack, needle) {
		return haystack.substr(-needle.length) == needle;
	}

	return ngTest;

}(this));