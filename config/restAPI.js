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
			"http://127.0.0.1:5000",
		],

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
	},
};
