'use strict';

module.exports = CommitsDetails;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "commits-details" component.
 * @constructor
 */
function CommitsDetails() { }

/**
 * Set the entire details object for the commit.
 * @param {Object} details Commit details.
 * @param {number} details.stats.additions Count of additions.
 * @param {number} details.stats.deletions Count of deletions.
 * @param {number} details.stats.total Count of total changes.
 * @param {number} details.stats.commit.comment_count Count of comments.
 * @param {number} details.html_url Link to commit page.
 */
CommitsDetails.prototype.setDetails = function (details) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	this.setAdditions(details.stats.additions);
	this.setDeletions(details.stats.deletions);
	this.setTotal(details.stats.total);
	this.setCommentCount(details.commit.comment_count);
	this.setCommentLink(details.html_url);
};

/**
 * Set total addition count.
 * @param {number} count Count of addition changes.
 */
CommitsDetails.prototype.setAdditions = function (count) {
	this.$context.element
		.getElementsByClassName('additions')[0].innerHTML = count;
};

/**
 * Set total deletion count.
 * @param {number} count Count of deletion changes.
 */
CommitsDetails.prototype.setDeletions = function (count) {
	this.$context.element
		.getElementsByClassName('deletions')[0].innerHTML = count;
};

/**
 * Set total change count of the commit.
 * @param {number} count Count of total changes.
 */
CommitsDetails.prototype.setTotal = function (count) {
	this.$context.element
		.getElementsByClassName('total')[0].innerHTML = count;
};

/**
 * Sets comment count of the commit.
 * @param {number} count Comment count.
 */
CommitsDetails.prototype.setCommentCount = function (count) {
	this.$context.element
		.getElementsByClassName('comment-count')[0].innerHTML = count;
};

/**
 * Sets link to the comments page of the commit.
 * @param {string} link URL to comments page.
 */
CommitsDetails.prototype.setCommentLink = function (link) {
	this.$context.element
		.getElementsByClassName('comments-link')[0]
		.setAttribute('href', link);
};