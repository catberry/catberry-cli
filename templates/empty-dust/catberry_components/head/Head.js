'use strict';

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * http://catberry.org/documentation#cat-components-interface
 */

class Head {

	/**
	* Creates a new instance of the "head" component.
	* @param {ServiceLocator} locator Catberry's service locator.
	*/
	constructor(locator) {

		/**
		* Current config.
		* @type {Object}
		* @private
		*/
		this._config = locator.resolve('config');
	}

	/**
	* Gets data for template.
	* @returns {Object} Data object.
	*/
	render() {
		return this._config;
	}
}

module.exports = Head;
