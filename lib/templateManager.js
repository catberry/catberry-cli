/*
 * catberry-cli
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry-cli's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-cli that are not externally
 * maintained libraries.
 */

'use strict';

var path = require('path'),
	fs = require('fs'),
	os = require('os'),
	readline = require('readline'),
	split = require('split'),
	mkdirp = require('mkdirp'),
	ncp = require('ncp'),
	templatesRoot = path.join(__dirname, '..', 'templates'),
	modulePresetsRoot = path.join(__dirname, '..', 'module_presets');

var DEFAULTS = {
	DEFAULT_PATH: process.cwd(),
	STORES_ROOT: 'catberry_stores',
	COMPONENTS_ROOT: 'catberry_components'
};

var COMPONENT_PRESETS = {
	handlebars: 'component-handlebars',
	dust: 'component-dust'
};

module.exports = {
	/**
	 * Initializes project template in current or specified directory.
	 * @param {String} templateName Template name.
	 * @param {Object} options Command options.
	 */
	initTemplate: function (templateName, options) {
		var parameters = {};
		parameters.destination = options.dest || process.cwd();

		if (!checkDestination(parameters.destination)) {
			return;
		}

		var isNotEmpty = fs.readdirSync(parameters.destination)
			.some(function (name) {
				return name && name[0] !== '.';
			});

		if (isNotEmpty) {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Destination directory is not empty, continue? (y/n): ',
				function (answer) {
					answer = (answer || 'n').toLowerCase();
					if (answer[0] === 'y') {
						copyTemplateTo(templateName, parameters);
					}
					rl.close();
				});
		} else {
			copyTemplateTo(templateName, parameters);
		}
	},

	/**
	 * Adds store to current project.
	 * @param {String} name Store name.
	 * @param {Object} options Command options.
	 */
	addStore: function (name, options) {
		if (typeof(name) !== 'string') {
			return;
		}

		var parameters = {
			destination: options.dest || path.join(
				process.cwd(), DEFAULTS.STORES_ROOT
			),
			name: name,
			pascalName: toPascalCase(path.basename(name))
		};
		if (!checkDestination(parameters.destination)) {
			return;
		}

		parameters.path = path.join(
			parameters.destination, path.dirname(name)
		);
		parameters.filename = path.join(
			parameters.path,
			parameters.pascalName + '.js'
		);

		if (fs.existsSync(parameters.filename)) {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Store already exists, continue? (y/n): ',
				function (answer) {
					answer = (answer || 'n').toLowerCase();
					if (answer[0] === 'y') {
						createStore(parameters);
					}
					rl.close();
				});
		} else {
			createStore(parameters);
		}
	},

	/**
	 * Adds component to current project.
	 * @param {String} name Component name.
	 * @param {Object} options Command options.
	 */
	addComponent: function (name, options) {
		if (typeof(name) !== 'string') {
			return;
		}

		var preset = typeof(options.preset) === 'string' ?
				options.preset.toLowerCase() : null,
			parameters = {
				destination: options.dest || path.join(
					process.cwd(), DEFAULTS.COMPONENTS_ROOT
				),
				name: name,
				pascalName: toPascalCase(name)
			};

		if (!preset) {
			preset = 'handlebars';
		}

		preset = preset.toLowerCase();

		if (!COMPONENT_PRESETS.hasOwnProperty(preset)) {
			console.log('No such component preset. Presets are:\n');
			Object.keys(COMPONENT_PRESETS).forEach(function (name) {
				console.log('\t' + name);
			});
			console.log();
			return;
		}

		parameters.preset = COMPONENT_PRESETS[preset];

		if (!checkDestination(parameters.destination)) {
			return;
		}

		parameters.path = path.join(
			parameters.destination, name
		);

		if (fs.existsSync(parameters.path)) {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Store already exists, continue? (y/n): ',
				function (answer) {
					answer = (answer || 'n').toLowerCase();
					if (answer[0] === 'y') {
						createComponent(parameters);
					}
					rl.close();
				});
		} else {
			createComponent(parameters);
		}
	}
};

/**
 * Creates store from template.
 * @param {Object} parameters Creation parameters.
 */
function createStore(parameters) {
	var copyOptions = {
			clobber: false,
			transform: getTransform(parameters)
		},
		source = path.join(modulePresetsRoot, 'Store.js');

	mkdirp(parameters.path, function (error) {
		if (error) {
			return console.error(error);
		}

		ncp(source, parameters.filename, copyOptions, function (error) {
			if (error) {
				return console.error(error);
			}

			console.log(
				'\nStore "' + parameters.name + '" has been created ' +
				'at "' + parameters.filename + '"\n'
			);
		});
	});
}

/**
 * Creates store from template.
 * @param {Object} parameters Creation parameters.
 */
function createComponent(parameters) {
	var copyOptions = {
			clobber: false,
			transform: getTransform(parameters)
		},
		source = path.join(modulePresetsRoot, parameters.preset);

	mkdirp(parameters.destination, function (error) {
		if (error) {
			return console.error(error);
		}

		ncp(source, parameters.path, copyOptions, function (error) {
			if (error) {
				return console.error(error);
			}

			console.log(
				'\nComponent "' + parameters.name + '" has been created ' +
				'at "' + parameters.path + '"\n'
			);
		});
	});
}

/**
 * Copies project template to specified destination.
 * @param {string} template Name of template to copy.
 * @param {Object} parameters Parameters of copying.
 */
function copyTemplateTo(template, parameters) {
	var templateFolder = path.join(templatesRoot, template);
	if (!fs.existsSync(templateFolder)) {
		console.log('No such template. Templates are:\n');
		fs.readdirSync(templatesRoot).forEach(function (name) {
			if (name[0] === '.') {
				return;
			}
			console.log('\t' + name);
		});
		console.log();
		return;
	}

	ncp(templateFolder, parameters.destination, {
		transform: getTransform(parameters)
	}, function (error) {
		if (error) {
			return console.error(error);
		}
		console.log('\nProject template "' + template +
		'" has been deployed to "' + parameters.destination + '"');
		console.log(
			'\nNow install dependencies:\n\n\tnpm install --production\n'
		);
		var debugScript = 'npm run debug' + (isWindows() ? '-win' : '');
		console.log('Then to start in debug mode without code ' +
		'minification and with file watching:\n\n\t' + debugScript + '\n');
		console.log('To start in release mode with code ' +
		'minification and without file watching:\n\n\tnpm start\n');
	});
}

/**
 * Checks if destination exists.
 * @param {string} destination Path to destination folder.
 * @returns {boolean} If destination is valid.
 */
function checkDestination(destination) {
	if (!fs.existsSync(destination)) {
		console.log('Destination directory does not exist');
		return false;
	}

	if (!fs.statSync(destination).isDirectory()) {
		console.log('Destination is not a directory');
		return false;
	}

	return true;
}

/**
 * Get transformation for replacements.
 * @param {Object} variables Variables to replace.
 * @returns {Function} Transform function for replacements.
 */
function getTransform(variables) {
	var replacements = {},
		replacementNames = Object.keys(variables)
			.map(function (name) {
				var replacementName = '__' + name + '__';
				replacements[replacementName] = variables[name];
				return replacementName;
			});

	return function (read, write) {
		return read
			.pipe(split(function (string) {
				replacementNames.forEach(function (name) {
					string = string.replace(name, replacements[name]);
				});
				return string + '\n';
			}))
			.pipe(write)
			.on('error', console.error);
	};
}

/**
 * Converts module name to PascalCaseName for module constructor.
 * @param {string} name Module name.
 * @returns {string} Name in Pascal Case.
 */
function toPascalCase(name) {
	var parts = name.split(/[^a-z0-9]/i),
		pascalCaseName = '';

	parts.forEach(function (part) {
		if (!part) {
			return;
		}

		pascalCaseName += part[0].toUpperCase();
		pascalCaseName += part.substring(1);
	});

	return pascalCaseName;
}

/**
 * Determines is current platform windows.
 */
function isWindows() {
	return (/^win/i).test(os.platform());
}