'use strict';

const catberry = require('catberry');
const isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined;

const http = require('http');
const util = require('util');
const path = require('path');
const publicPath = path.join(__dirname, 'public');
const connect = require('connect');
const config = require('./config/environment.json');
const templateEngine = require('catberry-handlebars');
const cat = catberry.create(config);
const app = connect();

config.publicPath = publicPath;
config.server.port = config.server.port || 3000;
config.isRelease = isRelease === undefined ? config.isRelease : isRelease;

templateEngine.register(cat.locator);

const serveStatic = require('serve-static');
app.use(serveStatic(publicPath));

app.use(cat.getMiddleware());

const errorhandler = require('errorhandler');
app.use(errorhandler());

cat.events.on('ready', () => {
	const logger = cat.locator.resolve('logger');
	logger.info(`Ready to handle incoming requests on port ${config.server.port}`);
});

http
	.createServer(app)
	.listen(config.server.port);
