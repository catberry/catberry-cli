'use strict';

var isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined,
	templateEngine = require('catberry-jade'),
	catberry = require('catberry'),
	cat = catberry.create({
		isRelease: isRelease
	});

templateEngine.register(cat.locator);
cat.build();
