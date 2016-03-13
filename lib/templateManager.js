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

const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');
const split = require('split');
const mkdirp = require('mkdirp');
const ncp = require('ncp');
const templatesRoot = path.join(__dirname, '..', 'templates');
const modulePresetsRoot = path.join(__dirname, '..', 'module_presets');

const DEFAULTS = {
	DEFAULT_PATH: process.cwd(),
	STORES_ROOT: 'catberry_stores',
	COMPONENTS_ROOT: 'catberry_components'
};

const COMPONENT_PRESETS = {
	handlebars: 'component-handlebars',
	dust: 'component-dust',
	jade: 'component-jade'
};

module.exports = {

	/* eslint no-console: 0*/
	/* eslint no-sync: 0*/

	/**
	 * Initializes project template in current or specified directory.
	 * @param {string} templateName Template name.
	 * @param {Object} options Command options.
	 */
	initTemplate(templateName, options) {
		const parameters = {};
		parameters.destination = options.dest || process.cwd();

		if (!checkDestination(parameters.destination)) {
			return;
		}

		const isNotEmpty = fs.readdirSync(parameters.destination)
			.some(name => {
				return name && name[0] !== '.';
			});

		if (isNotEmpty) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Destination directory is not empty, continue? (y/n): ', answer => {
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
	 * @param {string} name Store name.
	 * @param {Object} options Command options.
	 */
	addStore(name, options) {
		if (typeof (name) !== 'string') {
			return;
		}

		const parameters = {
			destination: options.dest || path.join(
				process.cwd(), DEFAULTS.STORES_ROOT
			),
			name,
			pascalName: toPascalCase(path.basename(name))
		};

		parameters.path = path.join(
			parameters.destination, path.dirname(name)
		);
		parameters.filename = path.join(
			parameters.path,
			`${parameters.pascalName}.js`
		);

		if (fs.existsSync(parameters.filename)) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Store already exists, continue? (y/n): ', answer => {
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
	 * @param {string} name Component name.
	 * @param {Object} options Command options.
	 */
	addComponent(name, options) {
		if (typeof (name) !== 'string') {
			return;
		}

		let preset = typeof (options.preset) === 'string' ?
					options.preset.toLowerCase() : null;
		const parameters = {
			destination: options.dest || path.join(
				process.cwd(), DEFAULTS.COMPONENTS_ROOT
			),
			fullName: name,
			name: path.basename(name)
		};
		parameters.pascalName = toPascalCase(parameters.name);

		if (!preset) {
			preset = 'handlebars';
		}

		preset = preset.toLowerCase();

		if (!COMPONENT_PRESETS.hasOwnProperty(preset)) {
			console.log('No such component preset. Presets are:\n');
			Object.keys(COMPONENT_PRESETS).forEach(name => {
				console.log(`	${name}`);
			});
			console.log();
			return;
		}

		parameters.preset = COMPONENT_PRESETS[preset];
		parameters.path = path.join(
			parameters.destination, parameters.fullName
		);

		if (fs.existsSync(parameters.path)) {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Component already exists, continue? (y/n): ', answer => {
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
	const copyOptions = {
		clobber: false,
		transform: getTransform(parameters)
	};
	const source = path.join(modulePresetsRoot, 'Store.js');
	const directoryPath = path.dirname(parameters.filename);

	mkdirp(directoryPath, error => {
		if (error) {
			console.error(error);
			return;
		}

		ncp(source, parameters.filename, copyOptions, error => {
			if (error) {
				console.error(error);
				return;
			}

			console.log(`
Store "${parameters.name}" has been created at "${parameters.filename}"
`);
		});
	});
}

/**
 * Creates store from template.
 * @param {Object} parameters Creation parameters.
 */
function createComponent(parameters) {
	const copyOptions = {
		clobber: false,
		transform: getTransform(parameters)
	};
	const source = path.join(modulePresetsRoot, parameters.preset);

	mkdirp(path.dirname(parameters.path), error => {
		if (error) {
			console.error(error);
			return;
		}

		ncp(source, parameters.path, copyOptions, error => {
			if (error) {
				console.error(error);
				return;
			}

			console.log(`
Component "${parameters.name}" has been created at "${parameters.path}"
`);
		});
	});
}

/**
 * Copies project template to specified destination.
 * @param {string} template Name of template to copy.
 * @param {Object} parameters Parameters of copying.
 */
function copyTemplateTo(template, parameters) {
	const templateFolder = path.join(templatesRoot, template);
	if (!fs.existsSync(templateFolder)) {
		console.log('No such template. Templates are:\n');
		fs.readdirSync(templatesRoot).forEach(name => {
			if (name[0] === '.') {
				return;
			}
			console.log(`	${name}`);
		});
		console.log();
		return;
	}

	ncp(templateFolder, parameters.destination, {
		transform: getTransform(parameters)
	}, error => {
		if (error) {
			console.error(error);
			return;
		}
		console.log(`
Project template "${template}" has been deployed to "${parameters.destination}"`);
		console.log('\nNow install dependencies:\n\n\tnpm install --production\n');
		const debugScript = `npm run debug${isWindows() ? '-win' : ''}`;
		console.log(
			`Then to start in debug mode without code minification and with file watching:

	${debugScript}
`
		);
		console.log(
			`To start in release mode with code minification and without file watching:

	npm start
`
		);
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
	const replacements = {};
	const replacementNames = Object.keys(variables)
		.map(name => {
			const replacementName = `__${name}__`;
			replacements[replacementName] = variables[name];
			return replacementName;
		});

	return function(read, write) {
		return read
			.pipe(split(string => {
				replacementNames.forEach(name => {
					string = string.replace(name, replacements[name]);
				});
				return `${string}
`;
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
	const parts = name.split(/[^a-z0-9]/i);
	let pascalCaseName = '';

	parts.forEach(part => {
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
