'use strict';

class HelloWorld {

	/**
	 * Gets data for template.
	 * @returns {Promise<Object>} Promise for data.
	 */
	render() {
		return this.$context.getStoreData();
	}
}

module.exports = HelloWorld;
