;(function($, scope) {

	var reImport = /^@import (.*)$/;

	var $head = $('head');

	// ----------------------------------------------------------------------------------------------------------------- //

	/**
	 * Async file loader.
	 * @param url Relative file url.
	 * @param path Base part of the url.
	 */
	var FileLoader = function(url, path) {
		this.url = path + url;
		this.path = path;
	};

	FileLoader.prototype.startLoading = function() {
		var that = this;
		var promise = this.promise = new $.Deferred();

		$.ajax({
			url: this.url,
			type: 'GET',
			dataType: 'text',
			success: function(file_contents) {
				var l = new Loader(file_contents, that.path);
				var loader_promise = l.load();
				loader_promise.done(function(full_contents) {
					promise.resolve(full_contents);
				});
			}
		});

		return promise;
	};

	// ----------------------------------------------------------------------------------------------------------------- //

	// One level loader.
	// It will create more loaders for inner imports.
	var Loader = function(raw_stylus_code, path) {
		this.raw = raw_stylus_code;
		this.path = path;

		this.parts = []; // ready strings and more loaders where import was found
		this.done_promise = new $.Deferred();
		this.wait_count = 0;
	};

	Loader.prototype.load = function() {
		var that = this;
		var wait = [];
		var p;

		this.splitByImport();
		var parts = this.parts;

		for (var i = 0; i < parts.length; i++) {
			p = parts[i];
			if (typeof p === 'string') {

			} else { // @import is here

				this.wait_count++;

				// Replace file loader with loaded file content.
				(function(part_index, loaded_promise) {
					loaded_promise.done(function(file_contents) {
						that.parts[part_index] = file_contents;
						that.wait_count--;

						if (that.wait_count === 0) {
							that.onDone();
						}
					});
				} (i, p.promise));

				// Add file loader promise to wait list.
				wait.push(p.promise);
			}
		}

		if (this.wait_count === 0) {
			this.onDone();
		}

		return this.done_promise; // Return master promise.
	};

	Loader.prototype.onDone = function() {
		this.done_promise.resolve(this.parts.join('\n'));
	};

	Loader.prototype.splitByImport = function() {
		var rows = this.raw.split('\n');
		var buf = [];
		var r, joined, m, fl;

		for (var i = 0; i < rows.length; i++) {
			r = rows[i];
			m = r.match(reImport);
			if (!!m) {
				joined = buf.join('\n');
				buf = [];
				if (joined.length > 0) {
					this.parts.push(joined);
				}

				// Create another loader for import.
				fl = new FileLoader(m[1], this.path);
				fl.startLoading();

				this.parts.push(fl);
			} else {
				buf.push(r);
			}
		}

		if (buf.length > 0) {
			this.parts.push(buf.join('\n'));
		}
	};

	// ----------------------------------------------------------------------------------------------------------------- //

	function loadStyles(urls) {
		$('link[rel="stylesheet/stylus"]').each(function(index, link) {
			var href = link.href;
			var url_parts = href.split('/');
			var file = url_parts[url_parts.length - 1];
			url_parts.pop();
			var path = url_parts.join('/') + "/";

			var fl = new FileLoader(file, path);
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
					var $style = $('<style type="text/css"></style>');
					$style.html(css.trim()).appendTo($head);
				});

			});

		});

		scope.styl = {
			loadStyles: loadStyles,
			FileLoader: FileLoader
		};
	};

	// Load styles on dom ready.
	$(loadStyles);

}(jQuery, this));
