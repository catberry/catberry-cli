#!/usr/bin/env node

/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

const program = require('commander');
const templateManager = require('../lib/templateManager');
const packageInfo = require('../package.json');
const version = packageInfo.version;

program.version(version);

program
	.command('init <template>')
	.description('Initialize Catberry project template')
	.option('-D, --dest <path>', 'change destination directory')
	.action((templateName, options) => templateManager
		.initTemplate(templateName, options)
	);

program
	.command('addstore <store_name>')
	.description('Add Catberry store to current project')
	.option('-D, --dest <path>', 'change destination directory')
	.action((storeName, options) => templateManager
		.addStore(storeName, options)
	);

program
	.command('addcomp <component_name>')
	.description('Add Catberry components to current project')
	.option('-D, --dest <path>', 'change destination directory')
	.option('-P, --preset <name>', 'change default component preset')
	.action((componentName, options) => templateManager
		.addComponent(componentName, options)
	);

program.parse(process.argv);
