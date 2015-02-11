'use strict';

module.exports = Head;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of "head" component.
 * @param {Object} $config Catberry application config.
 * @constructor
 */
function Head($config) {
	this._config = $config;
}

/**
 * Current config.
 * @type {Object}
 * @private
 */
Head.prototype._config = null;

/**
 * Gets data for template.
 * @returns {Object} Data object.
 */
Head.prototype.render = function () {
	return this._config;
};