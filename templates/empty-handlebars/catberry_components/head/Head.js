'use strict';

class Head {

	/**
	* Creates new instance of "head" component.
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
