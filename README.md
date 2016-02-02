# DSC-Gateway

Combine connections to multiple DSCs (sockets) to only one connection, to reduce system load. Also pool add data from DSCs to central database.

## API

### Send
`setLine` run given method on DSC client with line id:
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
All calls from DSC to the gateway are redirected to the client, with original method name. The data is moved to .data, to add sender (line) var.
```javascript
{
	line: "<line id>",
	data: {
		param: "<data object for DSC call>",
		param2: "",
	}
}
```


## Data Pooling
On each `setSession` we ask the DSC API for all data, which was edited after the newes dataset in central database, and add it.
