'use strict';

var catberry = require('catberry'),
	isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined;

var http = require('http'),
	util = require('util'),
	path = require('path'),
	publicPath = path.join(__dirname, 'public'),
	connect = require('connect'),
	config = require('./config/environment.json'),
	templateEngine = require('catberry-dust'),
	cat = catberry.create(config),
	app = connect();

var READY_MESSAGE = 'Ready to handle incoming requests on port %d';

config.publicPath = publicPath;
config.server.port = config.server.port || 3000;
config.isRelease = isRelease === undefined ? config.isRelease : isRelease;

templateEngine.register(cat.locator);

var serveStatic = require('serve-static');
app.use(serveStatic(publicPath));

app.use(cat.getMiddleware());

var errorhandler = require('errorhandler');
app.use(errorhandler());

cat.events.on('ready', function () {
	var logger = cat.locator.resolve('logger');
	logger.info(util.format(READY_MESSAGE, config.server.port));
});

http
	.createServer(app)
	.listen(config.server.port);