'use strict';

// configuration
const isRelease = process.argv.length === 3 ?
	process.argv[2] === 'release' : undefined;

// catberry application
const catberry = require('catberry');
const cat = catberry.create({isRelease});

// register Catberry plugins needed for building process
const templateEngine = require('catberry-dust');
templateEngine.register(cat.locator);

const logger = require('catberry-logger');
logger.register(cat.locator);

// run the build
cat.build();
