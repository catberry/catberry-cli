#!/usr/bin/env node

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
