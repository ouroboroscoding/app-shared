/**
 * Notifications
 *
 * Provides methods for registering and receiving push notifications
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-09-09
 */

// NPM imports
import * as Notifications from 'expo-notifications';

// Repo imports
import events from '../generic/events';

// Init handler
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: false,
		shouldSetBadge: false
	})
});

/**
 * Get Push Token
 *
 * Handles fetching the push token for the device
 *
 * @name fetchPushToken
 * @access public
 * @returns mixed
 */
export function fetchPushToken() {
	try {

		// Attemp to get permission, if successful, attempt to get token
		return Notifications.getPermissionsAsync().then(result => {
			return result.status !== 'granted' ?
					Notifications.requestPermissionsAsync() :
					result;
		}).then(result => {
			if(result.status !== 'granted') {
				console.error('Failed to get push token');
				events.trigger('error', 'Push token access was rejected');
			}
			return Notifications.getDevicePushTokenAsync();
		}).then(token => token.data);
	}

	// If the process failed at any point
	catch(error) {
		console.error(error);
		events.trigger('error', error);
		return Promise.reject('Failed to get push notification permissions');
	}
}

export function registerDevice() {

}