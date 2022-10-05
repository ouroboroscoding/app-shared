/**
 * Web Socket Helper
 *
 * Simplifies using a websocket
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2017-05-17
 */

// Export the function
export default function wshelper(url, conf={}, debug=false) {

	// If we can't handle websockets
	if(typeof WebSocket !== 'function') {
		console.error('websocket: WebSockets not supported');
		return false;
	}

	// If conf is not an object, we have a problem
	if(typeof conf != 'object') {
		console.error('websocket: second argument must be an object');
		return false;
	}

	// Create the WebSocket
	let oSock;
	if('headers' in conf) {
		oSock = new WebSocket(url, null, {headers: conf['headers']});
	} else {
		oSock = new WebSocket(url);
	}

	// Set the open callback
	oSock.onopen = () => {

		// If an open callback is set
		if('open' in conf) {
			conf['open'](oSock);
		}

		// Else, just log the event
		else if(debug) {
			console.log('websocket: opened()');
		}
	}

	// Set the message callback
	oSock.onmessage	= ev => {

		// If a message callback is set
		if('message' in conf) {
			conf['message'](oSock, ev);
		}

		// Else, just log the event
		else if(debug) {
			console.log(`websocket: message(${JSON.stringify(ev.data)})`);
		}
	}

	// Set the error callback
	oSock.onerror = ev => {

		// If an error callback is set
		if('error' in conf) {
			conf['error'](oSock, ev);
		}

		// Else, just log the event
		else if(debug) {
			console.log(`websocket: error(${JSON.stringify(ev)})`);
		}
	}

	// Set the close callback
	oSock.onclose = ev => {

		// If a close callback is set
		if('close' in conf) {
			conf['close'](oSock);
		}

		// Else, just log the event
		else if(debug) {
			console.log(`websocket: closed(${JSON.stringify(ev)})`);
		}
	}

	// Return the socket
	return oSock;
}
