/**
 * Navigator
 *
 * Navigator component for keeping track of current and previous screens
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-09-16
 */

// NPM imports
import { clone } from '@ouroboros/tools';

// Init the callback and screens lists
const _callbacks = [];
const _screens = [];

// Set the initial limit of screens to keep in history
const _limit = 10;

/**
 * Back
 *
 * Goes back in the history
 *
 * @name back
 * @access public
 * @returns {boolean}
 */
export function back() {

	// If we don't have any more screens
	if(_screens.length <= 1) {
		return false;
	}

	// Pull off the last screen
	_screens.pop();

	// Store the last index
	let iLast = _screens.length - 1;

	// Go through callbacks and notify anyone who wants to know of screen
	//	changes
	for(let f of _callbacks) {
		if(f(_screens[iLast]) === false) {
			return false;
		}
	}

	// Return OK
	return true;
}

/**
 * Clear
 *
 * Removes all screens from the list, resetting the history
 *
 * @name clear
 * @access public
 * @return {void}
 */
export function clear() {

	// Remove all screens
	_screens = [];

	// Go through callbacks and notify anyone who wants to know of screen
	//	changes
	for(let f of _callbacks) {
		if(f(null) === false) {
			return false;
		}
	}
}

/**
 * Current
 *
 * Returns the name and details of the current screen
 *
 * @name current
 * @access public
 * @returns {Object}
 */
export function current() {

	// Return null if there's no current screen, else return the last screen set
	return _screens.length === 0 ? null :
			clone(_screens[_screens.length-1]);
}

/**
 * Limit
 *
 * Sets or gets the current limit of history screens to keep
 *
 * @name limit
 * @access public
 * @param {number} count An unsigned number to indicate the maximum history
 * @returns {number}
 */
export function limit(count=null) {

	// If we got a count, set it
	if(count) {
		if(count < 2) {
			throw new Error('Navigator history limit must be at least 1, otherwise, what\'s the point?');
		}
		_limit = count;
	}

	// Else, return the current limit
	else {
		return _limit;
	}
}

/**
 * Set
 *
 * Set the screen to be displayed
 *
 * @name set
 * @access public
 * @param {string} name The name of the screen to set
 * @param {Object} details The additional props to pass to the screen
 * @returns {void}
 */
export function set(name, details={}) {

	// If the current history count is at max
	if(_screens.length === _limit) {

		// Cut out the oldest
		_screens.splice(0,1);
	}

	// Add the new screen data to the list
	_screens.push({
		name: name,
		details: details
	});

	// Go through callbacks and notify anyone who wants to know of screen
	//	changes
	for(let f of _callbacks) {
		f({name: name, details: details});
	}
}

/**
 * Subscribe
 *
 * Called to store a callback when the screen changes
 *
 * @name subscribe
 * @access public
 * @param {export function} callback The export function to call on screen changes
 * @returns {void}
 */
export function subscribe(callback) {

	// Add the callback to the list
	_callbacks.push(callback);
}

/**
 * Unsubscribe
 *
 * Called to remove a callback from being called when the screen changes
 *
 * @name unsubscribe
 * @access public
 * @param {export function} callback The export function to remove
 * @returns {boolean}
 */
export function unsubscribe(callback) {

	// Find the index of the callback
	let iIndex = _callbacks.indexOf(callback);

	// If it exists, remove it
	if(iIndex > -1) {
		_callbacks.splice(iIndex, 1);
		return true;
	} else {
		return false;
	}
}

// Default export
const navigator = {
	back, current, limit, set, subscribe, unsubscribe
};
export default navigator;