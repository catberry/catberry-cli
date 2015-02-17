'use strict';

var catberry = require('catberry'),
	// this config will be replaced by `./config/browser.json` when building
	// because of `browser` field in `package.json`
	config = require('./config/environment.json'),
	templateEngine = require('catberry-handlebars'),
	cat = catberry.create(config);

// register template provider to Catberry Service Locator
templateEngine.register(cat.locator);

cat.startWhenReady();
