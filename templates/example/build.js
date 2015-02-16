'use strict';

var isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined,
	catberry = require('catberry'),
	templateEngine = require('catberry-handlebars'),
	cat = catberry.create({isRelease: isRelease});

templateEngine.register(cat.locator);
cat.build();
