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
import { Platform } from "react-native";

/**
 * Navigator
 *
 * Contains all details and
 */

// Init the callback and screens lists
const __callbacks = [];
const __screens = [];

// Set the initial limit of screens to keep in history
const __limit = 10;

/**
 * Back
 *
 * Goes back in the history
 *
 * @name _back
 * @access private
 * @returns Boolean
 */
function _back() {

	// If we don't have any more screens
	if(__screens.length <= 1) {
		return false;
	}

	// Pull off the last screen
	__screens.pop();

	// Store the last index
	let iLast = __screens.length - 1;

	// Go through callbacks and notify anyone who wants to know of screen
	//	changes
	for(let f of __callbacks) {
		if(f(__screens[iLast]) === false) {
			return false;
		}
	}

	// Return OK
	return true;
}

/**
 * Current
 *
 * Returns the name and details of the current screen
 *
 * @name _current
 * @access private
 * @returns Object
 */
function _current() {

	// Return null if there's no current screen, else return the last screen set
	return __screens.length === 0 ? null :
			clone(__screens[__screens.length-1]);
}

/**
 * Limit
 *
 * Sets or gets the current limit of history screens to keep
 *
 * @name _limit
 * @access private
 * @param {Number} count An unsigned number to indicate the maximum history
 * @returns Number
 */
function _limit(count=null) {

	// Do nothing on IOS
	if(Platform.OS === 'ios') {
		return false;
	}

	// If we got a count, set it
	if(count) {
		if(count < 2) {
			throw new Error('Navigator history limit must be at least 1, otherwise, what\'s the point?');
		}
		__limit = count;
	}

	// Else, return the current limit
	else {
		return __limit;
	}
}

/**
 * Set
 *
 * Set the screen to be displayed
 *
 * @name _set
 * @access private
 * @param {String} name The name of the screen to set
 * @param {Object} details The additional props to pass to the screen
 * @returns void
 */
function _set(name, details={}) {

	// If we're on android
	if(Platform.OS === 'android') {

		// If the current history count is at max
		if(__screens.length === __limit) {

			// Cut out the oldest
			__screens.splice(0,1);
		}

		// Add the new screen data to the list
		__screens.push({
			name: name,
			details: details
		});
	}

	// Go through callbacks and notify anyone who wants to know of screen
	//	changes
	for(let f of __callbacks) {
		f({name: name, details: details});
	}
}

/**
 * Subscribe
 *
 * Called to store a callback when the screen changes
 *
 * @name _subscribe
 * @access private
 * @param {Function} callback The function to call on screen changes
 * @returns void
 */
function _subscribe(callback) {

	// Add the callback to the list
	__callbacks.push(callback);
}

/**
 * Unsubscribe
 *
 * Called to remove a callback from being called when the screen changes
 *
 * @name _unsubscribe
 * @access private
 * @param {Function} callback The function to remove
 * @returns Boolean
 */
function _unsubscribe(callback) {

	// Find the index of the callback
	let iIndex = __callbacks.indexOf(callback);

	// If it exists, remove it
	if(iIndex > -1) {
		__callbacks.splice(iIndex, 1);
		return true;
	} else {
		return false;
	}
}

// Default export
const navigator = {
	back: _back,
	current: _current,
	limit: _limit,
	set: _set,
	subscribe: _subscribe,
	unsubscribe: _unsubscribe
};
export default navigator;