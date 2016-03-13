'use strict';

class __pascalName__ {
	constructor(locator) {

		/**
		* Current universal HTTP request to do it in isomorphic way.
		* @type {UHR}
		* @private
		*/
		this._uhr = locator.resolve('uhr');

		/**
		* Current lifetime of data (in milliseconds) that is returned by this store.
		* @type {number} Lifetime in milliseconds.
		*/
		this.$lifetime = 60000;
	}

	load() {
		// Here you can do any HTTP requests using this._uhr.
		// Please read details here https://github.com/catberry/catberry-uhr.
	}

	handleSomeAction() {
		// Here you can call this.$context.changed() if you know
		// that remote data source has been changed.
		// Also you can have many handle methods for other actions.
	}
}

module.exports = __pascalName__;
