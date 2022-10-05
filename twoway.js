/**
 * Two Way
 *
 * Allows clients to connect to the backend via websocket so events can be
 * tracked in real time
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2019-03-29
 */

// NPM imports
import events from '@ouroboros/events';
import { empty, omap } from '@ouroboros/tools';

// Local imports
import rest from './rest.js';
import wshelper from './wshelper.js';

// Set to true to output debug info
const __debug = false;

// The ping timer
let __ping = null;

// The valid close flag
let __close = true;

// The cookie string
let __cookie = '';

// The websocket
let __socket = null;

// The URL to get the websocket
let __url = '';

/**
 * The service callbacks
 *
 * will contain a string for the service / key with callbacks for those keys,
 * e.g. {
 *	"service1": {
 *		"key1": [function1, function2],
 *		"key2": [function3]
 *	},
 *	"service2": {
 *		"key3": [function4]
 *	}
 * }
 */
let __services = {};

/**
 * Add Track
 *
 * Adds tracking for a specific service key
 *
 * @name _addTrack
 * @access private
 * @param {string} service The name of the service the key is associated with
 * @param {string} key The key to track
 * @param {function} callback The callback for any messages of the key value
 * @returns {void}
 */
function _addTrack(service, key, callback) {

	if(__debug) {
		console.log(`_addTrack(${service}, ${key})`);
	}

	// If we don't have the service, add it
	if(!(service in __services)) {
		__services[service] = {}
	}

	// If we don't have the key for the given service, add the list with
	//	the callback
	if(!(key in __services[service])) {
		__services[service][key] = [callback]
	}

	// Else, add the callback, to the given service/key
	else {
		__services[service][key].push(callback);
	}
}

/**
 * Handle Close
 *
 * Checks if it's a legitimate closed socket, or if we need to reconnect to
 * everything
 *
 * @name _handleClose
 * @access private
 * @returns {void}
 */
function _handleClose() {

	if(__debug) {
		console.log(`_handleClose()`);
	}

	// If we have a ping interval
	if(__ping) {
		clearInterval(__ping);
	}

	// If it's a valid close
	if(__close) {
		__socket = null;
	}

	// Else, wait 5 seconds, and reopen the socket
	else {
		__close = true;
		setTimeout(_openSocket, 5000);
	}
}

/**
 * Handle Messages
 *
 * Recieves messages from websockets and directs the data to the appropriate
 * callback
 *
 * @name _handleMessage
 * @access private
 * @param {WebSocket} sock The socket the message came on
 * @param {MessageEvent} ev The event message received
 * @returns {void}
 */
function _handleMessage(sock, ev) {

	if(__debug) {
		console.log(`_handleMessage(sock, ${ev.data})`);
	}

	// Init the message
	let oMsg;

	// If we got a string back
	if(typeof ev.data === 'string') {

		// If we're authorized
		if(ev.data === 'authorized') {

			// Reset the close flag
			__close = false;
			return;
		}

		// If it's pong
		if(ev.data === 'pong') {
			return;
		}

		// Decode it from JSON
		oMsg = JSON.parse(ev.data);
	}

	// Else we got bad data
	else {
		events.trigger('error', 'twoway: websocket failed, got unknown data: ' + typeof ev.data);
	}

	// If we got an error
	if(oMsg.error) {
		events.trigger('error', 'twoway: Websocket failed: ' + oMsg.error.msg + ' (' + oMsg.error.code + ')');
		return;
	}

	// If we have the service
	if(oMsg.service in __services) {

		// If we have the key
		if(oMsg.key in __services[oMsg.service]) {

			// Call each callback
			for(let f of __services[oMsg.service][oMsg.key]) {
				f(oMsg.data);
			}
		}
	}
}

/**
 * Open Socket
 *
 * Opens a new websocket by first sending a message to webpoll to start the
 * authentication handshake, then making the connection, and finally sending
 * all the track messages stored
 *
 * @name _openSocket
 * @access private
 * @returns {void}
 */
function _openSocket() {

	// Notify the backend of a new ws connection
	rest.read('webpoll', 'websocket', {}).then(res => {

		if(__debug) {
			console.log(`   response: ${JSON.stringify(res)}`);
		}

		// Create the websocket
		__socket = wshelper(__url, {
			headers: {cookie: __cookie},
			open: function(sock) {

				// Init the message list
				let lMsgs = [];

				// Add the connect message
				lMsgs.push({
					_type: 'connect',
					key: res.data
				});

				// Add each track message
				for(let s in __services) {
					for(let k in __services[s]) {
						lMsgs.push({
							_type: 'track',
							service: s,
							key: k
						});
					}
				}

				// Send the messages
				sock.send(JSON.stringify(lMsgs))
			},
			message: _handleMessage,
			close: _handleClose
		}, true);

		// If we got false
		if(__socket === false) {
			events.trigger('error', 'twoway: Websockets not supported');
			return;
		}

		// If we haven't already setup the ping interval
		if(__ping === null) {
			__ping = setInterval(_ping, 300000);
		}
	});
}

/**
 * Ping
 *
 * Send a ping to keep the socket alive
 *
 * @name _ping
 * @access private
 * @returns {void}
 */
function _ping() {

	if(__debug) {
		console.log(`_ping()`);
	}

	// Send a ping message over the socket to keep it alive
	__socket.send(JSON.stringify({
		_type: 'ping'
	}));
}

/**
 * Cookies
 *
 * Sets the cookie values to be sent with websocket requests
 *
 * @name cookies
 * @access public
 * @param {Object} o Name value pairs to be turned into a cookie string
 * @returns {void}
 */
export function cookies(o) {

	// Go through each object and create a string, then combine them all, and
	//	save them to the module var
	__cookie = omap(o, (v, k) => {
		return `${k}=${encodeURIComponent(v)}`;
	}).join('; ');
}

/**
 * Init
 *
 * Initialises the module by setting the websocket URL
 *
 * @name init
 * @access public
 * @param {string} url The URL to connect to
 * @returns {void}
 */
export function init(url) {

	if(__debug) {
		console.log(`init(${url})`);
	}

	__url = url;
}

/**
 * Track
 *
 * Takes a URL and an event type and a) opens a new websocket or uses an
 * existing one, then b) sends a tracking message through the websocket so the
 * backend knowsn to send the key type to us
 *
 * @name track
 * @access public
 * @param {string} service The name of the service the key is associated with
 * @param {string} key The key to track
 * @param {function} callback The callback for any messages of the key value
 * @returns {void}
 */
export function track(service, key, callback) {

	if(__debug) {
		console.log(`track(${service}, ${key})`);
	}

	// Add the tracking callback
	_addTrack(service, key, callback);

	// If we have no socket
	if(!__socket) {

		// If it's null
		if(__socket === null) {

			// Set socket to false so we don't try to re-open
			__socket = false;

			// Open a new one
			_openSocket();
		}
	}

	// Else if it's open
	else if(__socket.readyState === 1) {

		// Send the tracking message through the websocket
		__socket.send(JSON.stringify({
			_type: 'track',
			service: service,
			key: key
		}));
	}

	// If we have no socket, or it's opening, then upon opening all services/
	//	keys in the tracking list will be sent as messages
}

/**
 * Untrack
 *
 * Removes a callback and notifies the websocket we are not tracking anymore
 *
 * @name _untrack
 * @access public
 * @param {string} service The name of the service the key is associated with
 * @param {string} key The key to untrack
 * @param {function} callback The callback associated with the track
 * @return {boolean}
 */
export function untrack(service, key, callback) {

	if(__debug) {
		console.log(`untrack(${service}, ${key})`);
	}

	// If we have the service
	if(service in __services) {

		// If we have the key
		if(key in __services[service]) {

			// Go through each callback
			for(let i = 0; i < __services[service][key].length; ++i) {

				// If the callback matches
				if(callback === __services[service][key][i]) {

					// Remove the callback
					__services[service][key].splice(i, 1);

					// If we have no more callbacks
					if(__services[service][key].length === 0) {

						// If we have a socket
						if(__socket && __socket.readyState === 1) {

							// Notify the websocket we aren't tracking the key
							//	anymore
							__socket.send(JSON.stringify({
								_type: 'untrack',
								service: service,
								key: key
							}));
						}

						// Remove the key
						delete __services[service][key];

						// If we have no more keys in the service
						if(empty(__services[service])) {

							// Remove the service
							delete __services[service];

							// If there's no more services
							if(empty(__services)) {

								// Turn off the ping interval
								clearInterval(__ping);
								__ping = null;

								// Close the socket
								__close = true;

								// If we have a socket
								if(__socket) {
									__socket.close(1000, 'nothing else to track');
								}
							}
						}
					}

					// Callback found and removed
					return true;
				}
			}
		}
	}

	// Callback not found
	return false;
}

// Default export
const twoway = { cookies, init, track, untrack };
export default twoway;
