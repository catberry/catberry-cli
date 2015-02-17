'use strict';

module.exports = CommitsList;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "commits-list" component.
 * @constructor
 */
function CommitsList($serviceLocator) {
	// we can use window from the locator in a browser only
	if (this.$context.isBrowser) {
		this._window = $serviceLocator.resolve('window');
		this._handleScroll = this._handleScroll.bind(this);
	}
}

/**
 * Current window object.
 * @type {Window}
 * @private
 */
CommitsList.prototype._window = null;

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
CommitsList.prototype.render = function () {
	return this.$context.getStoreData()
		.then(function (result) {
			return {commits: result};
		});
};

/**
 * Returns event binding settings for the component.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
 */
CommitsList.prototype.bind = function () {
	// this listener is outside the component and we can add it like this
	this._window.addEventListener('scroll', this._handleScroll);

	// this one is inside the component, Catberry can manage this listener
	return {
		click: {
			'a.js-commit': this._handleClickDetails
		}
	};
};

/**
 * Unbinds all unmanaged event handlers.
 */
CommitsList.prototype.unbind = function () {
	// all managed listeners are removed automatically
	// but this one is unmanaged (see bind method)
	// we should remove it by ourselves
	this._window.removeEventListener('scroll', this._handleScroll);
};

/**
 * Handles window scroll for infinite scroll loading.
 * @private
 */
CommitsList.prototype._handleScroll = function () {
	var windowHeight = this._window.innerHeight,
		scrollTop = this._window.pageYOffset,
		doc = this._window.document.documentElement;
	try {
		// when scroll to the bottom of the page load more items
		if (scrollTop >= (doc.scrollHeight - windowHeight) ||
			doc.scrollHeight <= windowHeight) {
			this._loadMoreItems();
		}
	} catch (e) {
		// do nothing
	}
};

/**
 * Loads more items to feed.
 * @private
 */
CommitsList.prototype._loadMoreItems = function () {
	this.$context.sendAction('load-more');
};

/**
 * Handles click event when click on commit item.
 * @param {Event} event DOM event.
 * @private
 */
CommitsList.prototype._handleClickDetails = function (event) {
	event.preventDefault();
	event.stopPropagation();

	var self = this,
		commitElement = event.currentTarget,
		commitSha = commitElement.getAttribute('id');

	// remove all previous opened commit details
	this._clearAllDetails();

	var detailsId = 'details-' + commitSha;

	this._showDetailsLoader(commitElement)
		.then(function () {
			return self.$context.sendAction('get-details', {
				sha: commitSha
			});
		})
		.then(function (details) {
			return self.$context.createComponent(
				'cat-commits-details', {
					id: detailsId
				}
			)
				.then(function (element) {
					self.$context
						.getComponentById(detailsId)
						.setDetails(details);
					self._insertAfterCommit(commitElement, element);
					self._hideDetailsLoader(commitElement);
				});
		});
};

/**
 * Clears all details items from list.
 * @private
 */
CommitsList.prototype._clearAllDetails = function () {
	var details = this.$context.element
		.getElementsByTagName('cat-commits-details');
	for (var i = 0; i < details.length; i++) {
		details[i].parentNode.removeChild(details[i]);
	}
	// this call is required when you removed components from DOM
	// manually. Catberry checks existence for every component and unlink every
	// component that is not in the DOM at the moment.
	this.$context.collectGarbage();
};

/**
 * Creates and show loader component after commit item.
 * @param {Element} commitElement Commit DOM element.
 * @returns {Promise} Promise for done operation.
 * @private
 */
CommitsList.prototype._showDetailsLoader = function (commitElement) {
	var commitSha = commitElement.getAttribute('id'),
		loaderId = 'loader-' + commitSha,
		self = this;
	return this.$context.createComponent('cat-loader', {id: loaderId})
		.then(function (element) {
			self._insertAfterCommit(commitElement, element);
		});
};

/**
 * Hides loader from commit details.
 * @param {Element} commitElement Commit DOM element.
 * @private
 */
CommitsList.prototype._hideDetailsLoader = function (commitElement) {
	var commitSha = commitElement.getAttribute('id'),
		loaderId = 'loader-' + commitSha,
		element = this.$context.element.querySelector('#' + loaderId);

	element.parentNode.removeChild(element);
};

/**
 * Inserts element after commit item.
 * @param {Element} commitElement Commit DOM element.
 * @param {Element} element Element to insert after commit item.
 * @private
 */
CommitsList.prototype._insertAfterCommit = function (commitElement, element) {
	if (commitElement.nextSibling) {
		commitElement.parentNode.insertBefore(
			element, commitElement.nextSibling
		);
		return;
	}
	commitElement.parentNode.appendChild(element);
};