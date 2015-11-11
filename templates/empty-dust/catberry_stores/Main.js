'use strict';

module.exports = Main;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

/**
 * Creates new instance of "Main" store.
 * @constructor
 */
function Main() { }

/**
 * Loads data from somewhere.
 * @returns {Object} Data object.
 */
Main.prototype.load = function () {
	return {
		who: 'World'
	};
};