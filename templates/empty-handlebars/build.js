'use strict';

const isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined;
const templateEngine = require('catberry-handlebars');
const catberry = require('catberry');
const cat = catberry.create({isRelease});
const logger = require('catberry-logger');

logger.register(cat.locator);
templateEngine.register(cat.locator);
cat.build();
