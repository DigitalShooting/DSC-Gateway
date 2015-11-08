# DSC-Gateway

Combine connections to multiple DSCs (sockets) to only one connection, to reduce system load.

## API

### Send
`setLine` run given method on one DSC client
```javascript
{
	method: "<method name>",
	line: "<line id>",
	data: {
		param: "<data object for DSC call>",
		param2: "",
	},
}
```

### Get
All calls from DSC to the gateway are redirected to this socket.
```javascript
{
	line: "<line id>",
	data: {
		param: "<data object for DSC call>",
		param2: "",
	}
}
```
