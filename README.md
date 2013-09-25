ngExample
=========

Load an isolated bit of angular code for development, debugging and testing.

## Theory
Within a larger project Angular.js code should be broken down into smaller module folders containing js, templates, styles, spec tests, and examples. It is within this structure that ngExample helps make these isolated bits of code easier to develop by providing a simple loader and generic app context to test and develop these assets in isolation from the larger project.

ngExample basically mimics the build process. It currently compiles stylus files on the fly in the browser *(less could be added easily)*, loads individual assets, vendor files, css, angular modules and templates from source rather than as built assets. This allows individual parts of your code-base to be loaded and tested in isolation from other code in your project without having a complicated or separate build process for each module folder.

## Usage / Example Project
This project is best used as part of a larger Angular.js project structure.
An example project based on [ngBoilerplate](http://joshdmiller.github.io/ng-boilerplate/)
that also uses ngExample is available at https://github.com/andrewluetgers/ngExampleProject

### use it
once you have your example definition file set up (see below) and the ngExample folder properly located in yourproject/dev/ngExample
then you can load the ngExample.html file and start loading examples. There is no fancy ui, just a single url parameter 'example' which
is the path from your project root to your example definition file like so:</br></br>
http://localhost:1337/yourProject/dev/ngExample/ngExample.html?example=src/common/simplePicker/simplePicker.eg.html</br></br>
this also works with file:/// urls, as opposed to hosting the project files, so long as your browser security settings are configured properly.
Safari should work fine with no changes, [chrome requires a command line flag "--allow-file-access-from-files"](http://stackoverflow.com/questions/5224017/origin-null-is-not-allowed-by-access-control-allow-origin-in-chrome-why).

## ngTest
This project also makes use of [ngTest](https://github.com/andrewluetgers/ngTest) to help with the test bootstrapping process and reduce some of the Jasmine boilerplate for Angular.js code. This allows for a test code-generation phase that we can tap into to allow the tests to load compiled assests like templates during the build and load individual templates in isolation using the ngExample loader without having two different spec tests. **As such, spec tests need to be written in the ngTest format.** A converter and or support for vanilla spec tests should be simple but remains an outstanding todo item.

## The example definition file

The key to making all this work is a single file you add to each module folder that defines how to load the assets, what html should be in the example and what custom code is required for the specific example.

### Example file type and naming
This file can either be html or javascript either file should be prefixed with eg to denote that this is an "example given". This naming convention allows us to add exclusionary rules to the grunt build so that our examples are not compiled up with the rest of our source code.

Here are some examples.

### myModule.eg.js
```
ngExample({
	root: "src/common/simplePicker/",
	files: [
		"../layout/layout.styl",
		"../filters/filters.js",
		"../simpleUtils/simpleUtils.js",
		"simplePicker.styl",
		"simplePicker.js",
		"simplePicker.tpl.html",
		"simplePicker.spec.js"
	],
	modules: [
		'simpleUtils',
		'simplePicker'
	],
	html: '<simple-picker id="clientPicker" state="clients" selected-id="selectedId"></simple-picker>',
	init: function(app) {
		app.controller("ngExampleCtrl", [
			"$scope",
			function ($scope) {
				$scope.clients = {
					selectedId: 2,
					items: [
						{id: 1, name: "test1"},
						{id: 2, name: "test2"},
						{id: 3, name: "test3"}
					]
				};
			}
		]);
	}
});
```

### myModule.eg.html
```
<simple-picker id="clientPicker" state="clients" selected-id="selectedId"></simple-picker>

<script>
	ngExample({
		root: "src/common/simplePicker/",
		files: [
			"../layout/layout.styl",
			"../filters/filters.js",
			"../simpleUtils/simpleUtils.js",
			"simplePicker.styl",
			"simplePicker.js",
			"simplePicker.tpl.html",
			"simplePicker.spec.js"
		],
		modules: [
			'simpleUtils',
			'simplePicker'
		],
		init: function(app) {
			app.controller("ngExampleCtrl", [
				"$scope",
				function ($scope) {
					$scope.clients = {
						selectedId: 2,
						items: [
							{id: 1, name: "test1"},
							{id: 2, name: "test2"},
							{id: 3, name: "test3"}
						]
					};
				}
			])
		}
	});
</script>
```

### The ngExample function

this function takes a javascript object that defines the example an ddoes all the asset loading, stylus compilation and orchestrates the angular bootrapping as well as kicking off the jasmine tests in the browser. It requires the following properties.

#### root
This defines how to get to the current folder from the project root. The project root is assumed to be two folders above the location of the ngExample.html file. This is to accomodate the folder structure seen in the [ngExampleProject](https://github.com/andrewluetgers/ngExampleProject). All assets will be loaded realative to this module's current folder.

#### files
An array of file paths relative to this module's current folder. Supports preloading of js, loading of templates into the templateCache, css, compilation of stylus into css. All assets are loaded in the order defined. Angular is bootstrapped once everything is loaded.

#### modules
The modules that need to be loaded by angular for your example to work. Obviously thier assets need to be loaded first as defined above.

#### init
This function is called once the app is bootstrapped. It is provided a new, blan, angular app that has loaded the modules you defined.

#### ngExampleCtrl
This is the controller assigned to the parent container that your html will be injected into. So if you want your code eo execute automatically just create this controller in your init function.

