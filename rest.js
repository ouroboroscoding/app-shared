/**
 * Rest
 *
 * Handles connecting to and retrieving data from rest services
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-09-07
 */

// NPM imports
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global data
let _conf = {
	after: null,
	before: null,
	cookie: '',
	domain: '',
	error: null,
	errors: {},
	session: null,
	success: null,
	use_session: true
}

/**
 * Clear
 *
 * Clears the session from the conf and cookie
 *
 * @name clear
 * access private
 * @return void
 */
function clear() {

	// Clear the session
	_conf.session = null;

	// Delete the cookie
	AsyncStorage.removeItem('_session');
}

/**
 * Create
 *
 * Calls the create action on a specific service noune
 *
 * @name create
 * @access public
 * @param string service		The name of the service to call
 * @param string noun			The noun to call on the service
 * @param object data			The data to send to the service
 * @param object opts			Optional flags that can be set
 * @return xhr
 */
function create(service, noun, data, opts={}) {
	return request('POST', _conf.domain + service + '/' + noun, data, opts);
}

/**
 * Delete
 *
 * Calls the delete action on a specific service noune
 *
 * @name delete_
 * @access public
 * @param string service		The name of the service to call
 * @param string noun			The noun to call on the service
 * @param object data			The data to send to the service
 * @param object opts			Optional flags that can be set
 * @return xhr
 */
function delete_(service, noun, data, opts={}) {
	return request('DELETE', _conf.domain + service + '/' + noun, data, opts);
}

/**
 * Generic Error Message
 *
 * Returns an error message based on the errors passed to Rest at init
 *
 * @name
 * @access public
 * @param Object error The 'code' and 'msg'
 * @return String
 */
function errorMessage(error) {

	// Convert the code to a string
	let sCode = error.code.toString();

	// If the code is in the errors
	if(sCode in _conf.errors) {
		return _conf.errors[sCode];
	} else {
		return 'msg' in error ? error.msg + ' (' + sCode + ')' : sCode;
	}
}

/**
 * Init
 *
 * Initialises the modules
 *
 * @name init
 * @access public
 * @param string domain		The domain rest services can be reached through
 * @param string cookie		The domain to store the cookie on
 * @param Object opts		Optional settings
 *								after: optional callback to run after all requests
 *								before:	optional callback to run before all requests
 *								cookie: optional domain for storing the session cookie in
 *								error: optional callback for when http errors occur
 *								errors: optional object of error codes to messages
 *								success: optional callback for after successful requests
 *								use_session: optional flag to allow for never using sessions
 * @return Promise
 */
function init(domain, opts={}) {

	// Return new Promise
	return new Promise((resolve, reject) => {

		// Store the domains
		_conf.domain = domain + '/';

		// Store error codes/messages
		if('errors' in opts) {
			_conf.errors = opts.errors;
		}

		// Store callbacks
		if('error' in opts) {
			if(typeof opts['error'] === 'function') {
				_conf.error = opts['error'];
			} else {
				console.error('Rest.init \'error\' param must be a function');
			}
		}
		if('before' in opts) {
			if(typeof opts['before'] === 'function') {
				_conf.before = opts['before'];
			} else {
				console.error('Rest.init \'before\' param must be a function');
			}
		}
		if('after' in opts) {
			if(typeof opts['after'] === 'function') {
				_conf.after = opts['after'];
			} else {
				console.error('Rest.init \'after\' param must be a function');
			}
		}
		if('success' in opts) {
			if(typeof opts['success'] === 'function') {
				_conf.success = opts['success'];
			} else {
				console.error('Rest.init \'success\' param must be a function');
			}
		}

		// Check for use_session flag
		if(!('use_session' in opts)) {
			opts['use_session'] = true;
		}

		// If we are using sessions
		if(opts['use_session']) {

			// If we don't already have it
			if(!_conf.session) {

				// Is it in storage?
				AsyncStorage.getItem('_session').then(_session => {
					if(_session) {
						this.session(_session);
					}
					resolve();
				});
			} else {
				resolve();
			}
		} else {
			resolve();
		}
	});
}

/**
 * Read
 *
 * Calls the read action on a specific service noune
 *
 * @name read
 * @access public
 * @param string service		The name of the service to call
 * @param string noun			The noun to call on the service
 * @param object data			The data to send to the service
 * @param object opts			Optional flags that can be set
 * @return xhr
 */
function read(service, noun, data={}, opts={}) {
	return request('GET', _conf.domain + service + '/' + noun, data, opts);
}

/**
 * Request
 *
 * Handles actual requests
 *
 * @name request
 * @access private
 * @param string method			The method used to send the request
 * @param string url			The full URL to the service/noun
 * @param object data			The data to send to the service
 * @param object opts			Optional flags that can be set
 * @return Promise
 */
function request(method, url, data, opts) {

	// Create and return a new promise
	return new Promise((resolve, reject) => {

		// Check network
		NetInfo.fetch().then(state => {

			// If we aren't connected
			if(!state.isConnected) {
				console.error('Not connected to internet');

				// Reject the request
				return reject({
					_handled: false,
					error: {code: -2}
				})
			}

			// Init the options
			let oOpts = {
				method: method,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json; charset=utf-8'
				}
			}

			// If we want to use the session
			if(!('session' in opts) || opts['session']) {

				// And it exists, add it to the headers
				if(_conf.session) {
					oOpts.headers.Authorization = _conf.session;
				}
			}

			// If it's a GET request
			if(method === 'GET') {
				url += '?d=' + encodeURIComponent(JSON.stringify(data));
			} else {
				oOpts.body = JSON.stringify(data);
			}

			// If we have a before callback
			if(_conf.before) {
				_conf.before(method, url, opts);
			}

			// Call fetch
			fetch(url, oOpts).then(response => {

				// If the response is not ok
				if(!response.ok) {
					console.error(method + ' ' + url + ' not OK:', response);
					alert(method + ' ' + url + ' not OK:\n' + JSON.stringify(response));

					// If the status is 401
					if(response.status === 401) {
						clear();
					}

					// Resolve as error
					return resolve({
						_handled: false,
						error: {code: -1}
					})
				}

				// Get the JSON
				let oResult = response.json();

				// Add the handled flag
				oResult._handled = false;

				// Call the success callback if there is one
				if(_conf.success) {
					_conf.success(oResult);
				}

				// Resolve
				return resolve(oResult);

			}).catch(error => {
				console.error(method + ' ' + url + ' error:', error);
				alert(method + ' ' + url + ' returned:\n' + JSON.stringify(error));

				/*
				// If we got an Authorization error
				if(xhr.status === 401) {

					// Clear the current token
					clear();
				}
				*/
				// Return the xhr to the error callback if there is one
				if(_conf.error) {
					_conf.error(error);
				}

			}).finally(() => {

				// If we have an after callback
				if(_conf.after) {
					_conf.after(method, url, data, opts);
				}
			})
		});
	});
}

/**
 * Session
 *
 * Set or get the session token
 *
 * @name session
 * @access public
 * @param string token			The token to store
 * @return void|str
 */
function session(token) {

	// If we are setting the session
	if(typeof token !== 'undefined') {

		// If null was passed, delete the session
		if(token == null) {
			clear();
		}

		// Else, set the session
		else {

			// Store the session
			_conf.session = token;

			// Set the session in a cookie
			AsyncStorage.setItem('_session', token);
		}
	}

	// Else we are returning the session
	else {
		return _conf.session;
	}
}

/**
 * Update
 *
 * Calls the update action on a specific service noune
 *
 * @name update
 * @access public
 * @param string service		The name of the service to call
 * @param string noun			The noun to call on the service
 * @param object data			The data to send to the service
 * @param object opts			Optional flags that can be set
 * @return xhr
 */
function update(service, noun, data, opts={}) {
	return request('PUT', _conf.domain + service + '/' + noun, data, opts);
}

/**
 * To Tree
 *
 * Converts array of rest field errors into a tree
 *
 * @name toTree
 * @access public
 * @param Array errors The list of errors
 * @return Object
 */
 function toTree(errors) {

	// Init the return
	let oRet = {}

	// Go through each error
	for(let i = 0; i < errors.length; ++i) {

		// If the error field has a period
		if(errors[i][0].includes('.')) {

			// Split it
			let lField = errors[i][0].split(/\.(.*)/)

			// If we don't have the field already
			if(!oRet[lField[0]]) {
				oRet[lField[0]] = []
			}

			// Add the rest
			oRet[lField[0]].push([lField[1], errors[i][1]]);
		}

		// Else it's a flat field
		else {
			if(errors[i][1] === 'is not a string') {
				errors[i][1] = 'missing';
			}
			oRet[errors[i][0]] = errors[i][1];
		}
	}

	// Go through all the errors we found
	for(let k in oRet) {

		// If we find an array
		if(Array.isArray(oRet[k])) {

			// Recurse
			oRet[k] = toTree(oRet[k]);
		}
	}

	// Return the Tree
	return oRet;
}

// Default export
const rest = {
	init: init,
	create: create,
	delete: delete_,
	errorMessage: errorMessage,
	read: read,
	session: session,
	toTree: toTree,
	update: update
};
export default rest;