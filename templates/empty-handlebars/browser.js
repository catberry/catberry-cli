'use strict';

var catberry = require('catberry'),
	templateEngine = require('catberry-handlebars'),
	// this config will be replaced by `./config/browser.json` when building
	// because of `browser` field in `package.json`
	config = require('./config/environment.json'),
	cat = catberry.create(config);

templateEngine.register(cat.locator);
cat.startWhenReady();
