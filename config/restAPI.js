module.exports = {
	/**
		REST API Settings
		Settings for the HTTP module.
	*/


	/**
		Client settings
	*/
	client: {

		/**
		 List of server to push changes to
		 */
		servers: [
			// "http://127.0.0.1:5000",
		],

		/**
		 Time interval between each keepalive package
		 (ms)
		 */
		keepaliveInterval: 10 * 1000,

		auth: {
			user: "user",
			pass: "pass",
		},

	},



	/**
		Server settings
	*/
	server: {
		network: {
			/**
				Networking settings
				Settings for the REST Server.
			*/

			/**
				port
			*/
			port		:	5000,

			/**
				address
				IPv4/ IPv6 address to bin on. (BSP: "::1")
			*/
			address		: 	"0.0.0.0"
		},

		/**
		 Time interval after which we trigger a timeout
		 (use client.keepaliveInterval * 2)
		 (ms)
		 */
		keepaliveInterval: 20 * 1000,
	},
};
